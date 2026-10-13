import { requireStatsAccess } from "./_access.js";

// Private preview. Requires a separate Cloudflare Access application and a valid signed JWT.
// Fails closed when private-preview credentials or feature flags are absent.
export async function onRequestGet({ request, env }) {
  const accessEnv = {
    ACCESS_TEAM_DOMAIN: env.ACCESS_TEAM_DOMAIN,
    ACCESS_AUD: env.DVAR_PRIVATE_ACCESS_AUD
  };
  if (env.DVAR_PRIVATE_PREVIEW_ENABLED !== "true") {
    return new Response("Private reader unavailable", { status: 503, headers: { "cache-control": "no-store" } });
  }
  const denied = await requireStatsAccess(request, accessEnv);
  if (denied) return denied;
  const headers = {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "private, no-store",
    "x-robots-tag": "noindex, nofollow, noarchive",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; frame-src blob:; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
  };
  const html = `<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>דבר מלכות · בדיקה פרטית</title>
<style>body{font-family:system-ui,Arial,sans-serif;max-width:950px;margin:2rem auto;padding:1rem;background:#f6f7fa;color:#1a2133}section{background:white;padding:1rem;border:1px solid #dde1ea;border-radius:12px}iframe{width:100%;height:70vh;border:1px solid #ddd}p{line-height:1.6}input{max-width:100%}</style>
<h1>דבר מלכות · Prévisualisation privée</h1><section>
<p>Test personnel du lecteur PDF. Le fichier choisi reste uniquement dans ce navigateur et n'est jamais publié.</p>
<p lang="fr" dir="ltr">La détection automatique des brochures et leur diffusion restent désactivées avant autorisation de l'éditeur.</p>
<input id="pdf" type="file" accept="application/pdf,.pdf" aria-label="Choisir un PDF"><button id="clear" type="button">Effacer</button>
<p id="status" role="status">Aucun PDF sélectionné</p><hr><h2>Publication hebdomadaire · פרסום שבועי</h2><p id="weekly" role="status">Vérification de la publication en cours…</p><p>Le PDF officiel n'est ni récupéré ni affiché automatiquement sans autorisation.</p><iframe id="viewer" title="PDF local" hidden></iframe></section>
<script>
let url=null;
const weekly=document.getElementById('weekly');
fetch('/api/dvar-weekly',{credentials:'same-origin',cache:'no-store'}).then(async r=>{const d=await r.json().catch(()=>null);if(!d)return {status:'http-'+r.status};return d;}).then(d=>{weekly.textContent=d.status==='metadata-found' ? 'Publication détectée : '+d.edition.publishedDateRange+(d.edition.label?' · '+d.edition.label:'') : 'Détection non confirmée ('+String(d.status||'unknown')+(d.upstreamStatus?' : '+d.upstreamStatus:'')+').';}).catch(()=>{weekly.textContent='La vérification n’a pas pu aboutir (network-error).';});
const input=document.getElementById('pdf'),frame=document.getElementById('viewer'),status=document.getElementById('status');
function clear(){frame.removeAttribute('src');frame.hidden=true;if(url){URL.revokeObjectURL(url);url=null;}input.value='';status.textContent='Aucun PDF sélectionné'}
document.getElementById('clear').addEventListener('click',clear);
input.addEventListener('change',()=>{const file=input.files&&input.files[0];if(url){URL.revokeObjectURL(url);url=null;}frame.removeAttribute('src');frame.hidden=true;
if(!file)return;if(!/\\.pdf$/i.test(file.name)||file.size>50*1024*1024||!file.size||(file.type&&file.type!=='application/pdf')){status.textContent='Fichier PDF invalide';return;}
url=URL.createObjectURL(file);frame.src=url;frame.hidden=false;status.textContent='PDF local ouvert : '+file.name;
});
addEventListener('pagehide',()=>{if(url)URL.revokeObjectURL(url)});
</script></html>`;
  return new Response(html, { headers });
}
