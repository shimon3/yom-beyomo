/* POST /api/ping — counts one anonymous visit per device per day (no IP, no cookie) */
const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const clip = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : null);
const validUid = (u) => typeof u === "string" && /^[a-z0-9-]{8,40}$/i.test(u);
/* Day in Israel time, YYYY-MM-DD */
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
async function readBody(request, max = 8000) {
  const len = Number(request.headers.get("content-length") || 0);
  if (len > max) return null;
  const text = await request.text();
  if (text.length > max) return null;
  try { return JSON.parse(text); } catch { return null; }
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no-db" }, 503);
  const b = await readBody(request, 1000);
  if (!b || !validUid(b.uid)) return json({ ok: false }, 400);
  await env.DB.prepare(
    "INSERT OR IGNORE INTO visits (day, uid, lang, city, standalone) VALUES (?1, ?2, ?3, ?4, ?5)"
  ).bind(today(), b.uid, clip(b.lang, 5), clip(b.city, 10), b.standalone ? 1 : 0).run();
  return json({ ok: true });
}
