/* POST /api/feedback — stores a rating (1-5) and/or a message */
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
  const b = await readBody(request, 8000);
  if (!b || !validUid(b.uid)) return json({ ok: false, error: "bad-request" }, 400);
  const rating = Number.isInteger(b.rating) && b.rating >= 1 && b.rating <= 5 ? b.rating : null;
  const message = clip(b.message, 2000) || null;
  if (!rating && !message) return json({ ok: false, error: "empty" }, 400);

  /* at most 5 messages per device per day */
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM feedback WHERE uid = ?1 AND substr(created, 1, 10) = ?2"
  ).bind(b.uid, new Date().toISOString().slice(0, 10)).first();
  if (row && row.n >= 5) return json({ ok: false, error: "too-many" }, 429);

  await env.DB.prepare(
    "INSERT INTO feedback (uid, rating, message, contact, lang, page) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
  ).bind(b.uid, rating, message, clip(b.contact, 120) || null, clip(b.lang, 5), clip(b.page, 40)).run();
  return json({ ok: true });
}
