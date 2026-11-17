import { requireStatsAccess } from "./_access.js";
export async function onRequestGet({request,env}) {
 const auth=await requireStatsAccess(request,env);
 if(auth) return auth;
 return new Response(PAGE,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"private, no-store",
 "content-security-policy":"default-src 'none'; script-src 'nonce-stats2026'; style-src 'nonce-stats2026'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
 "x-content-type-options":"nosniff","referrer-policy":"no-referrer"}});
}
const PAGE=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Statistiques privées – יום ביומו</title>
<style nonce="stats2026">:root{font-family:system-ui,Arial,sans-serif;color-scheme:light;background:#f6f4ef;color:#263632}body{max-width:1100px;margin:2rem auto;padding:0 1rem}h1{font-size:1.8rem}p{line-height:1.5}.muted{color:#61736b}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1rem;margin:1.5rem 0}.card,section{background:white;border:1px solid #ddd;border-radius:12px;padding:1rem}strong.number{font-size:2rem;display:block;margin-top:.5rem}section{margin:1.25rem 0}table{width:100%;border-collapse:collapse}th,td{padding:.55rem;text-align:left;border-bottom:1px solid #e5e5e5;vertical-align:top;overflow-wrap:anywhere}th{font-size:.9rem} .scroll{overflow-x:auto}a{color:#135a70}#status{padding:.5rem 0} .bar{height:12px;background:#d2e3dc;border-radius:6px;overflow:hidden}.bar span{display:block;height:100%;background:#367766} .note{font-size:.85rem;color:#61736b}</style></head><body>
<header><a href="/">← Retour au site</a><h1>Statistiques privées · יום ביומו</h1><p class="muted">Visites anonymes et retours utilisateurs enregistrés dans D1</p></header>
<p id="status" role="status">Chargement des données…</p>
<div class="cards"><div class="card">Actifs · 7 jours<strong class="number" id="active7">—</strong></div><div class="card">Actifs · 30 jours<strong class="number" id="active30">—</strong></div><div class="card">Fidèles · 30 jours<span class="note"> (venus 2 jours ou plus)</span><strong class="number" id="returning30">—</strong></div><div class="card">App installée · 30 jours<strong class="number" id="installed30">—</strong></div></div>
<div class="cards"><div class="card">Visites enregistrées · 90 j<strong class="number" id="visits">—</strong></div><div class="card">Appareils uniques · 90 j<strong class="number" id="devices">—</strong></div><div class="card">Pings refusés · 30 j<strong class="number" id="rejected">—</strong></div><div class="card">Avis reçus (100 derniers affichés)<strong class="number" id="feedback-count">—</strong></div></div>
<p class="note">Une visite au maximum par appareil et par jour (si le navigateur l'autorise). Un même utilisateur sur deux appareils compte deux fois. Le refus DNT et les bloqueurs peuvent réduire les comptes.</p>
<section><h2>Visites quotidiennes · 90 derniers jours enregistrés</h2><div class="scroll"><table><thead><tr><th>Date</th><th>Appareils</th><th>Nouveaux</th><th>Habitués</th><th>App installée</th><th>Volume</th></tr></thead><tbody id="daily"></tbody></table></div></section>
<section><h2>Pings refusés · 30 jours</h2><p class="note">bot = robot ou aperçu de lien · foreign = appel venu d'un autre site · quota = plus de 20 nouveaux appareils par réseau et par jour.</p><div class="scroll"><table><thead><tr><th>Date</th><th>Raison</th><th>Nombre</th></tr></thead><tbody id="rejects"></tbody></table></div></section>
<section><h2>Langues</h2><div class="scroll"><table><thead><tr><th>Langue</th><th>Visites</th></tr></thead><tbody id="languages"></tbody></table></div></section>
<section><h2>Villes sélectionnées dans les réglages</h2><p class="note">Ce ne sont pas des données de géolocalisation.</p><div class="scroll"><table><thead><tr><th>Ville</th><th>Visites</th></tr></thead><tbody id="cities"></tbody></table></div></section>
<section><h2>Avis (100 plus récents)</h2><div class="scroll"><table><thead><tr><th>Date</th><th>Note</th><th>Message</th><th>Contact (privé)</th><th>Langue</th><th>Page</th></tr></thead><tbody id="feedback"></tbody></table></div></section>
<script nonce="stats2026">
const $=id=>document.getElementById(id);
const add=(id,cells)=>{const tr=document.createElement("tr");cells.forEach(v=>{const td=document.createElement("td");td.textContent=String(v??"—");tr.append(td)});$(id).append(tr)};
const fill=(id,rows,map)=>{if(!rows.length){add(id,["Aucune donnée"]);return;}rows.forEach(x=>add(id,map(x)))};
async function run(){
 try{
 const response=await fetch("/api/stats",{credentials:"same-origin",cache:"no-store"});
 const data=await response.json();if(!response.ok)throw Error(data.error||"HTTP "+response.status);
 $("visits").textContent=data.totals.visits??0;$("devices").textContent=data.totals.devices??0;
 $("feedback-count").textContent=data.feedback.length+(data.feedback.length===100?" +":"");
 const s=data.summary||{};["active7","active30","returning30","installed30"].forEach(k=>$(k).textContent=s[k]??0);
 $("rejected").textContent=data.rejects.reduce((a,x)=>a+x.n,0);
 const max=Math.max(1,...data.daily.map(x=>x.devices));
 fill("daily",data.daily,x=>[x.day,x.devices,x.new_devices,x.devices-x.new_devices,x.installed,("▰".repeat(Math.max(1,Math.round(x.devices/max*16))))]);
 fill("rejects",data.rejects,x=>[x.day,x.reason,x.n]);
 fill("languages",data.languages,x=>[x.name,x.visits]);
 fill("cities",data.cities,x=>[x.name,x.visits]);
 fill("feedback",data.feedback,x=>[x.created,x.rating,x.message,x.contact,x.lang,x.page]);
 $("status").textContent="Données chargées.";
 }catch(e){$("status").textContent="Erreur de chargement : "+e.message;}
}
run();
</script></body></html>`;
