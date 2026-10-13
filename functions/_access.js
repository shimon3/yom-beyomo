// Fail-closed Cloudflare Access JWT verification for private reporting endpoints.
const deny = (status, error) => new Response(JSON.stringify({error}), {
  status, headers: {"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
});
const decode = s => {
  const b = atob(s.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(s.length/4)*4,"="));
  return Uint8Array.from(b, c=>c.charCodeAt(0));
};
export async function requireStatsAccess(request, env) {
  const domain = String(env.ACCESS_TEAM_DOMAIN||"").trim().toLowerCase();
  const aud = String(env.ACCESS_AUD||"").trim();
  if (!/^https:\/\/[a-z0-9.-]+\.cloudflareaccess\.com$/.test(domain) || !aud)
    return deny(503,"stats-access-not-configured");
  const jwt = request.headers.get("cf-access-jwt-assertion");
  if (!jwt) return deny(403,"access-required");
  try {
    const parts = jwt.split(".");
    if(parts.length!==3) return deny(403,"invalid-access-token");
    const header=JSON.parse(new TextDecoder().decode(decode(parts[0])));
    const claims=JSON.parse(new TextDecoder().decode(decode(parts[1])));
    const now=Math.floor(Date.now()/1000);
    if(header.alg!=="RS256" || typeof header.kid!=="string" ||
       claims.iss!==domain || !Array.isArray(claims.aud) || !claims.aud.includes(aud) ||
       typeof claims.exp!=="number" || claims.exp<=now ||
       typeof claims.iat!=="number" || claims.iat>now+60 ||
       (typeof claims.nbf==="number" && claims.nbf>now+60))
      return deny(403,"invalid-access-token");
    const res=await fetch(domain+"/cdn-cgi/access/certs", {cf:{cacheTtl:300}});
    if(!res.ok) return deny(503,"access-key-unavailable");
    const jwks=await res.json();
    const jwk=(jwks.keys||[]).find(k=>k.kid===header.kid && k.kty==="RSA");
    if(!jwk) return deny(403,"invalid-access-token");
    const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
    const ok=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,decode(parts[2]),new TextEncoder().encode(parts[0]+"."+parts[1]));
    if(!ok) return deny(403,"invalid-access-token");
    return null;
  } catch { return deny(403,"invalid-access-token"); }
}
