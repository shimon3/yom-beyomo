/* Study together: each device posts its own reading position in a shared session.
   Positions only (date, section, verse, word). No text, no account, no IP.
   GET  /api/session/:id?uid=...  -> other participants' recent positions
   POST /api/session/:id          -> store this device's position */
const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const SID = /^[a-f0-9]{32}$/;
const UID = /^[a-z0-9-]{8,40}$/i;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const SEC = /^[a-z0-9]{1,30}$/;
const POS = /^[^\u0000-\u001f]{1,30}$/;
const FRESH = 90 * 1000;          // a participant silent for 90 s is considered gone
const TTL = 6 * 3600 * 1000;      // rows older than 6 h are removed
const MAX_PEERS = 3;              // up to 4 people in one session
let ready = false;

async function init(db) {
  if (ready) return;
  await db.prepare(
    "CREATE TABLE IF NOT EXISTS study_presence (session TEXT NOT NULL, uid TEXT NOT NULL, name TEXT, iso TEXT, sec TEXT, pos TEXT, w INTEGER, updated INTEGER NOT NULL, PRIMARY KEY (session, uid))"
  ).run();
  ready = true;
}
async function readBody(request, max = 1000) {
  const len = Number(request.headers.get("content-length") || 0);
  if (len > max) return null;
  const text = await request.text();
  if (text.length > max) return null;
  try { return JSON.parse(text); } catch { return null; }
}

export async function onRequestGet({ params, request, env }) {
  const sid = params.id;
  if (!SID.test(sid)) return json({ error: "bad-id" }, 400);
  if (!env.DB) return json({ error: "no-db" }, 503);
  await init(env.DB);
  const me = new URL(request.url).searchParams.get("uid") || "";
  const rows = (await env.DB.prepare(
    "SELECT uid, name, iso, sec, pos, w, updated FROM study_presence WHERE session = ?1 AND updated > ?2 ORDER BY updated DESC LIMIT 8"
  ).bind(sid, Date.now() - FRESH).all()).results || [];
  const peers = rows.filter(r => r.uid !== me).slice(0, MAX_PEERS)
    .map(r => ({ name: r.name, iso: r.iso, sec: r.sec, pos: r.pos, w: r.w, updated: r.updated }));
  return json({ peers });
}

export async function onRequestPost({ params, request, env }) {
  const sid = params.id;
  if (!SID.test(sid)) return json({ error: "bad-id" }, 400);
  if (!env.DB) return json({ error: "no-db" }, 503);
  await init(env.DB);
  const b = await readBody(request, 1000);
  if (!b || !UID.test(b.uid)) return json({ ok: false, error: "bad-request" }, 400);
  const iso = typeof b.iso === "string" && ISO.test(b.iso) && !isNaN(Date.parse(b.iso + "T00:00:00Z")) ? b.iso : null;
  const sec = typeof b.sec === "string" && SEC.test(b.sec) ? b.sec : null;
  if (!iso || !sec) return json({ ok: false, error: "bad-request" }, 400);
  const pos = typeof b.pos === "string" && POS.test(b.pos) ? b.pos : null;
  const w = Number.isInteger(b.w) && b.w >= 0 && b.w < 5000 ? b.w : null;
  const name = typeof b.name === "string" ? b.name.trim().slice(0, 20) : "";
  const now = Date.now();

  // Refuse a fifth device: count other fresh participants first.
  const others = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM study_presence WHERE session = ?1 AND uid <> ?2 AND updated > ?3"
  ).bind(sid, b.uid, now - FRESH).first();
  if (others && others.n >= MAX_PEERS + 1) return json({ ok: false, error: "full" }, 409);

  await env.DB.prepare(
    "INSERT INTO study_presence (session, uid, name, iso, sec, pos, w, updated) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8) " +
    "ON CONFLICT (session, uid) DO UPDATE SET name = excluded.name, iso = excluded.iso, sec = excluded.sec, pos = excluded.pos, w = excluded.w, updated = excluded.updated"
  ).bind(sid, b.uid, name, iso, sec, pos, w, now).run();

  // Occasional cleanup of old rows, to keep the table small.
  if (Math.random() < 0.02) {
    await env.DB.prepare("DELETE FROM study_presence WHERE updated < ?1").bind(now - TTL).run();
  }
  return json({ ok: true });
}
