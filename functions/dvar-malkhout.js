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
  const html = `<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>דבר מלכות · בדיקה פרטית</title>
<style>body{font-family:system-ui,Arial,sans-serif;max-width:950px;margin:2rem auto;padding:1rem;background:#f6f7fa;color:#1a2133}section{background:white;padding:1rem;border:1px solid #dde1ea;border-radius:12px}iframe{width:100%;height:70vh;border:1px solid #ddd}
.study-layout{display:grid;grid-template-columns:minmax(0,1fr) 190px;gap:1rem;direction:ltr}
.study-main{min-width:0;direction:rtl}
.study-menu{direction:rtl;border:1px solid #dde1ea;border-radius:10px;padding:12px;align-self:start;position:sticky;top:12px}
.study-menu button{display:block;width:100%;text-align:right;margin:.4rem 0;padding:.65rem;border:1px solid #dde1ea;background:white;border-radius:8px;cursor:pointer}
.study-menu button:disabled{opacity:.55;cursor:not-allowed}
.study-menu button.active{border-color:#80612e;background:#f8f2e8}
@media(max-width:740px){.study-layout{grid-template-columns:1fr}.study-menu{position:static;display:flex;flex-wrap:wrap;gap:.4rem}.study-menu button{width:auto}}
p{line-height:1.6}input{max-width:100%}</style>
<h1>דבר מלכות · Prévisualisation privée</h1><section>
<p>Test personnel du lecteur PDF. Le fichier choisi reste uniquement dans ce navigateur et n'est jamais publié.</p>
<p lang="fr" dir="ltr">La vérification des annonces hebdomadaires est en test privé. Lecture personnelle depuis le serveur officiel en test privé. Aucune copie n'est hébergée ni redistribuée par ce site.</p>
<input id="pdf" type="file" accept="application/pdf,.pdf" aria-label="Choisir un PDF"><button id="clear" type="button">Effacer</button>
<p id="status" role="status">Aucun PDF sélectionné</p><hr><h2>Publication hebdomadaire · פרסום שבועי</h2><p id="weekly" role="status">Vérification de la publication en cours…</p><p>La brochure officielle est demandée directement au site éditeur, sans stockage sur Yom Beyomo. L'affichage intégré dépend des autorisations du navigateur et du serveur officiel.</p><div class="study-layout"><div class="study-main"><p id="officialStatus" role="status"></p><iframe id="officialViewer" title="PDF officiel · lecture privée" hidden></iframe></div><aside class="study-menu"><strong>לימוד יומי · Études</strong><p id="hebrewDate" aria-live="polite">Date hébraïque…</p><label><input id="afterSunset" type="checkbox"> Après le coucher du soleil</label><button id="tanyaDaily" type="button" disabled>תניא · Tanya du jour</button><button id="pdfStart" type="button" disabled>חוברת · Début du PDF</button><p id="studyStatus" role="status"></p></aside></div><p><a id="officialLink" target="_blank" rel="noopener noreferrer" hidden>Ouvrir directement le document officiel</a></p><iframe id="viewer" title="PDF local" hidden></iframe></section>
<script>
let url=null;
const hebrewDate=document.getElementById('hebrewDate');
const tanyaButton=document.getElementById('tanyaDaily');
const pdfStartButton=document.getElementById('pdfStart');
const studyStatus=document.getElementById('studyStatus');
const sunset=document.getElementById('afterSunset');
let currentOfficialUrl=null;
function selectedCivilDate(){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const part=k=>parts.find(x=>x.type===k)?.value;
 const day=new Date(Date.UTC(Number(part('year')),Number(part('month'))-1,Number(part('day'))+(sunset.checked?1:0),12));
 return day;
}
function refreshStudy(){
 const date=selectedCivilDate();
 const iso=date.toISOString().slice(0,10);
 const h=new Intl.DateTimeFormat('he-u-ca-hebrew',{timeZone:'UTC',day:'numeric',month:'long',year:'numeric'}).format(date);
 hebrewDate.textContent=h+' · '+iso;
 const knownPages={'2026-10-11':77,'2026-10-12':78,'2026-10-13':78};
 const supported=currentOfficialUrl&&currentOfficialUrl.includes('069BA5D2-B1B3-40A9-8814-7FCE07D8A1EE.pdf');
 const page=supported?knownPages[iso]:null;
 tanyaButton.disabled=!page;
 studyStatus.textContent=page?'Tanya du jour : page PDF '+page+' (édition vérifiée)':'Page du Tanya non vérifiée pour cette date/édition.';
 return page;
}
sunset.addEventListener('change',refreshStudy);
tanyaButton.addEventListener('click',()=>{const page=refreshStudy();if(!page||!currentOfficialUrl)return;const viewer=document.getElementById('officialViewer');viewer.src=currentOfficialUrl+'#page='+page;studyStatus.textContent='תניא · Page PDF '+page;tanyaButton.classList.add('active');});
pdfStartButton.addEventListener('click',()=>{if(!currentOfficialUrl)return;document.getElementById('officialViewer').src=currentOfficialUrl+'#page=1';tanyaButton.classList.remove('active');});
refreshStudy();

const weekly=document.getElementById('weekly');
fetch('/api/dvar-weekly',{credentials:'same-origin',cache:'no-store'}).then(async r=>{const d=await r.json().catch(()=>null);if(!d)return {status:'http-'+r.status};return d;}).then(d=>{if(d.pdfPreviewEnabled && d.pdfUrl) {try {const u=new URL(d.pdfUrl);if(u.protocol==='https:' && u.hostname==='dvarmalchus.com' && /^\\/Download\\/[0-9a-f-]+\\.pdf$/i.test(u.pathname)) {const viewer=document.getElementById('officialViewer'), link=document.getElementById('officialLink');currentOfficialUrl=u.href;refreshStudy();pdfStartButton.disabled=false;viewer.src=u.href;viewer.hidden=false;link.href=u.href;link.hidden=false;link.textContent='Ouvrir sur le site officiel';document.getElementById('officialStatus').textContent='Tentative de lecture directe du PDF officiel (usage personnel).';}}catch{}}weekly.textContent=d.status==='metadata-found' ? 'Publication détectée : '+(d.edition.label||'Édition non identifiée')+(d.edition.publishedDateRange?' · '+d.edition.publishedDateRange:'')+(d.edition.releaseDate?' · '+d.edition.releaseDate:'') : 'Détection non confirmée ('+String(d.status||'unknown')+(d.upstreamStatus?' : '+d.upstreamStatus:'')+(d.errorType?' · '+d.errorType:'')+(d.detail?' · '+d.detail:'')+').';}).catch(()=>{weekly.textContent='La vérification n’a pas pu aboutir (network-error).';});
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
