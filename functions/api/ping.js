/* POST /api/ping — counts one anonymous visit per device per day (no stored IP, no cookie).
   Guards against inflated numbers:
   - robots and link-preview fetchers are refused by User-Agent;
   - the call must come from the site itself (Origin / Sec-Fetch-Site);
   - at most MAX_NEW_PER_IP new devices per network per day. The IP is only kept as a
     salted SHA-256 hash that changes every day, so it cannot be traced back.
   Every refusal is tallied in ping_rejects so /stats can show what was filtered. */
const MAX_NEW_PER_IP = 20; // shared networks (family, synagogue, mobile carrier NAT) stay counted
const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|whatsapp|telegram|embedly|quora|bingpreview|phantom|puppeteer|playwright|selenium|curl|wget|python|httpclient|okhttp|axios|node-fetch|go-http|java\//i;

const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const clip = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : null);
const validUid = (u) => typeof u === "string" && /^[a-z0-9-]{8,40}$/i.test(u);
/* Day in Israel time, YYYY-MM-DD */
const israelDay = (ms = Date.now()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date(ms));
async function readBody(request, max = 8000) {
  const len = Number(request.headers.get("content-length") || 0);
  if (len > max) return null;
  const text = await request.text();
  if (text.length > max) return null;
  try { return JSON.parse(text); } catch { return null; }
}
async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
const reject = (env, day, reason) =>
  env.DB.prepare("INSERT INTO ping_rejects (day, reason, n) VALUES (?1, ?2, 1) ON CONFLICT (day, reason) DO UPDATE SET n = n + 1")
    .bind(day, reason).run().catch(() => {});

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no-db" }, 503);
  const day = israelDay();
  const hour = Number(new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Jerusalem",hour:"2-digit",hourCycle:"h23"}).format(new Date()));
  const ua = request.headers.get("user-agent") || "";

  // A — robots: answer "ok" so they do not retry, but count nothing.
  if (!ua || BOT_UA.test(ua)) { await reject(env, day, "bot"); return json({ ok: true }); }

  // B — only the site's own pages may ping.
  const site = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if ((origin && origin !== site) || (fetchSite && fetchSite !== "same-origin") || (!origin && !fetchSite)) {
    await reject(env, day, "foreign"); return json({ ok: false }, 403);
  }

  const b = await readBody(request, 1000);
  if (!b || !validUid(b.uid)) return json({ ok: false }, 400);

  // Already counted today: nothing else to do (keeps the per-network quota for new devices).
  const seen = await env.DB.prepare("SELECT 1 FROM visits WHERE day = ?1 AND uid = ?2").bind(day, b.uid).first();
  if (seen) return json({ ok: true });

  // B — per-network quota of new devices per day.
  const ip = request.headers.get("cf-connecting-ip") || "";
  if (ip) {
    const h = await sha256(`${env.PING_SALT || "yb-ping"}|${day}|${ip}`);
    const row = await env.DB.prepare(
      "INSERT INTO ping_ip (day, h, n) VALUES (?1, ?2, 1) ON CONFLICT (day, h) DO UPDATE SET n = n + 1 RETURNING n"
    ).bind(day, h).first();
    if (row && row.n > MAX_NEW_PER_IP) { await reject(env, day, "quota"); return json({ ok: true }); }
  }

  await env.DB.prepare("CREATE TABLE IF NOT EXISTS visit_details (day TEXT NOT NULL, uid TEXT NOT NULL, hour INTEGER NOT NULL, page TEXT NOT NULL, PRIMARY KEY(day,uid))").run();
  const page = typeof b.page==="string" && /^[a-z0-9_-]{1,40}$/i.test(b.page) ? b.page : "accueil";
  await env.DB.prepare("INSERT OR IGNORE INTO visit_details (day,uid,hour,page) VALUES (?1,?2,?3,?4)").bind(day,b.uid,hour,page).run();
  await env.DB.prepare(
    "INSERT OR IGNORE INTO visits (day, uid, lang, city, standalone) VALUES (?1, ?2, ?3, ?4, ?5)"
  ).bind(day, b.uid, clip(b.lang, 5), clip(b.city, 10), b.standalone ? 1 : 0).run();

  /* Occasionally drop data older than 90 days (the stats page shows 90 days). */
  if (Math.random() < 0.02) {
    const cutoff = israelDay(Date.now() - 90 * 86400000);
    await env.DB.batch([
      env.DB.prepare("DELETE FROM visits WHERE day < ?1").bind(cutoff),
      env.DB.prepare("DELETE FROM visit_details WHERE day < ?1").bind(cutoff),
      env.DB.prepare("DELETE FROM ping_ip WHERE day < ?1").bind(israelDay(Date.now() - 2 * 86400000)),
      env.DB.prepare("DELETE FROM ping_rejects WHERE day < ?1").bind(cutoff),
    ]);
  }
  return json({ ok: true });
}
