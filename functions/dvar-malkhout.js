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
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; frame-src blob: https://dvarmalchus.com; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
  };
  const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Yom Beyomo · לימוד יומי</title>
<style>
body{margin:0;background:#f6f7fa;color:#1a2133;font-family:system-ui,Arial,sans-serif}main{max-width:1150px;margin:2rem auto;padding:0 1rem}h1{font-size:2rem}.layout{display:grid;grid-template-columns:minmax(0,1fr) 235px;gap:1.2rem}.panel,aside{background:#fff;border:1px solid #dde1ea;border-radius:14px;padding:1.25rem}aside{align-self:start;position:sticky;top:1rem;direction:rtl}.button,button{display:inline-block;padding:.75rem 1rem;border-radius:8px;border:1px solid #89652a;background:#fff;color:#523900;font:inherit;cursor:pointer;text-decoration:none}.button[hidden]{display:none}button{width:100%;margin-top:.65rem}button:disabled{opacity:.5;cursor:default}.muted{color:#606b7d}#tanyaRef{font-weight:600}a{overflow-wrap:anywhere}@media(max-width:720px){.layout{grid-template-columns:1fr}aside{position:static}}
</style>
<main><h1>דבר מלכות · לימוד יומי</h1><div class="layout"><div class="panel">
<h2>Publication hebdomadaire · פרסום שבועי</h2>
<p id="weekly" role="status">Recherche de la brochure officielle…</p>
<p><a class="button" id="officialLink" target="_blank" rel="noopener noreferrer" hidden>Télécharger la brochure officielle · הורדת הקובץ</a></p>
<p class="muted">Le bouton mène directement au fichier hébergé chez l'éditeur. Aucun PDF n'est hébergé sur Yom Beyomo. Si le navigateur ouvre le document au lieu de le télécharger, utiliser son bouton Télécharger.</p>
<hr><h2>תניא · Tanya du jour</h2><p id="tanyaStatus" role="status">Consultation du calendrier…</p>
<p id="tanyaRef"></p><p><a id="tanyaLink" class="button" target="_blank" rel="noopener noreferrer" hidden>Lire le Tanya du jour sur Sefaria</a></p>
<p class="muted">Le Tanya est indépendant de la brochure PDF et s'ouvre sur Sefaria.</p>
</div><aside><strong>לימוד יומי · Menu</strong><p id="hebrewDate"></p>
<label><input type="checkbox" id="afterSunset"> Après le coucher du soleil (date suivante)</label>
<button type="button" id="tanyaNav">תניא · Tanya du jour</button>
<button type="button" id="downloadNav">דבר מלכות · Téléchargement</button>
<p class="muted">Israël · changement automatique de date civile à minuit. Après le coucher du soleil, cocher l'option pour passer au jour hébraïque suivant.</p>
</aside></div></main>
<script>
const el=id=>document.getElementById(id);
const sunset=el('afterSunset');
function israelDay(){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const val=k=>Number(parts.find(x=>x.type===k).value);
 return new Date(Date.UTC(val('year'),val('month')-1,val('day')+(sunset.checked?1:0),12));
}
let requestSerial=0;
async function refreshTanya(){
 const id=++requestSerial,d=israelDay(),iso=d.toISOString().slice(0,10);
 el('hebrewDate').textContent=new Intl.DateTimeFormat('he-u-ca-hebrew',{timeZone:'UTC',day:'numeric',month:'long',year:'numeric'}).format(d);
 el('tanyaStatus').textContent='Recherche du Tanya du '+iso+'…';
 el('tanyaLink').hidden=true;el('tanyaRef').textContent='';
 try{
  const response=await fetch('/api/daily-tanya?date='+encodeURIComponent(iso),{credentials:'same-origin',cache:'no-store'});
  const data=await response.json();
  if(id!==requestSerial)return;
  if(!response.ok||data.status!=='available')throw Error(data.error||data.status||'unavailable');
  const u=new URL(data.url);
  if(u.origin!=='https://www.sefaria.org')throw Error('invalid-url');
  el('tanyaRef').textContent=data.heRef||data.ref;
  el('tanyaLink').href=u.href;el('tanyaLink').hidden=false;
  el('tanyaStatus').textContent='Référence du jour identifiée.';
 }catch{if(id===requestSerial)el('tanyaStatus').textContent='Référence du Tanya indisponible : aucune page supposée.';}
}
sunset.addEventListener('change',refreshTanya);
el('tanyaNav').addEventListener('click',()=>el('tanyaStatus').scrollIntoView({behavior:'smooth',block:'center'}));
el('downloadNav').addEventListener('click',()=>el('weekly').scrollIntoView({behavior:'smooth',block:'center'}));
async function refreshWeekly(){
 try{
 const response=await fetch('/api/dvar-weekly',{credentials:'same-origin',cache:'no-store'});
 const data=await response.json();
 if(!response.ok||data.status!=='metadata-found')throw Error('source-unavailable');
 el('weekly').textContent='Édition détectée : '+(data.edition?.label||'date non identifiée')+(data.edition?.releaseDate?' · '+data.edition.releaseDate:'');
 if(!data.pdfUrl)return;
 const u=new URL(data.pdfUrl);
 if(u.protocol!=='https:'||u.hostname!=='dvarmalchus.com'||!(u.pathname.startsWith('/Download/')&&u.pathname.toLowerCase().endsWith('.pdf'))||u.search||u.hash)return;
 el('officialLink').href=u.href;el('officialLink').hidden=false;
 }catch{el('weekly').textContent='Impossible de confirmer la brochure officielle pour le moment.';}
}
refreshTanya();refreshWeekly();
</script></html>`;
  return new Response(html, { headers });
}
