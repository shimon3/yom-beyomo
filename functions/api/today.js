/* GET /api/today — number of devices that visited today (Israel day), public and anonymous.
   Returns a single rounded number, only above a threshold. No list, no per-device data. */
const THRESHOLD = 10; // below this, nothing is shown
const STEP = 10;      // the number is rounded down to this step
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
const roundCount = n => (n < THRESHOLD ? null : Math.floor(n / STEP) * STEP);

export async function onRequestGet({ env }) {
  const fresh = { "content-type": "application/json", "cache-control": "public, max-age=3600" };
  const hidden = { "content-type": "application/json", "cache-control": "no-store" };
  if (!env.DB) return new Response(JSON.stringify({ count: null }), { headers: hidden });
  try {
    const row = await env.DB.prepare("SELECT COUNT(DISTINCT uid) AS n FROM visits WHERE day = ?1").bind(today()).first();
    return new Response(JSON.stringify({ count: roundCount(Number(row && row.n) || 0) }), { headers: fresh });
  } catch {
    return new Response(JSON.stringify({ count: null }), { headers: hidden });
  }
}
