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
<style nonce="stats2026">:root{font-family:system-ui,Arial,sans-serif;color-scheme:light;background:#f6f4ef;color:#263632}body{max-width:1100px;margin:2rem auto;padding:0 1rem}h1{font-size:1.8rem}p{line-height:1.5}.muted{color:#61736b}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1rem;margin:1.5rem 0}.card,section{background:white;border:1px solid #ddd;border-radius:12px;padding:1rem}strong.number{font-size:2rem;display:block;margin-top:.5rem}section{margin:1.25rem 0}.chart-controls{display:flex;gap:.5rem;flex-wrap:wrap;margin:.75rem 0}.chart-controls button{padding:.5rem .8rem;border:1px solid #b6c8bf;background:white;border-radius:8px;cursor:pointer}.chart-controls button[aria-pressed=true]{background:#246b56;color:white}.chart-wrap{width:100%;overflow-x:auto}.chart-wrap svg{display:block;min-width:520px;width:100%;height:auto}.legend{display:flex;gap:1rem;flex-wrap:wrap;font-size:.85rem}.legend span:before{content:' ';display:inline-block;width:12px;height:3px;background:var(--line);vertical-align:middle;margin-right:5px}table{width:100%;border-collapse:collapse}th,td{padding:.55rem;text-align:left;border-bottom:1px solid #e5e5e5;vertical-align:top;overflow-wrap:anywhere}th{font-size:.9rem} .scroll{overflow-x:auto}a{color:#135a70}#status{padding:.5rem 0} .bar{height:12px;background:#d2e3dc;border-radius:6px;overflow:hidden}.bar span{display:block;height:100%;background:#367766} .note{font-size:.85rem;color:#61736b}</style></head><body>
<header><a href="/">← Retour au site</a><h1>Statistiques privées · יום ביומו</h1><p class="muted">Visites anonymes et retours utilisateurs enregistrés dans D1</p></header>
<p id="status" role="status">Chargement des données…</p>
<div class="cards"><div class="card">Actifs · 7 jours<strong class="number" id="active7">—</strong></div><div class="card">Actifs · 30 jours<strong class="number" id="active30">—</strong></div><div class="card">Fidèles · 30 jours<span class="note"> (venus 2 jours ou plus)</span><strong class="number" id="returning30">—</strong></div><div class="card">App installée · 30 jours<strong class="number" id="installed30">—</strong></div></div>
<div class="cards"><div class="card">Visites enregistrées · 90 j<strong class="number" id="visits">—</strong></div><div class="card">Appareils uniques · 90 j<strong class="number" id="devices">—</strong></div><div class="card">Pings refusés · 30 j<strong class="number" id="rejected">—</strong></div><div class="card">Avis reçus (100 derniers affichés)<strong class="number" id="feedback-count">—</strong></div></div>
<p class="note">Une visite au maximum par appareil et par jour (si le navigateur l'autorise). Un même utilisateur sur deux appareils compte deux fois. Le refus DNT et les bloqueurs peuvent réduire les comptes.</p>
<section><h2>Évolution des visites</h2><p class="note">Appareils comptés une fois par jour, pas sessions. Les jours sans enregistrement sont indiqués à zéro (aucune mesure enregistrée). Horaires indisponibles dans les données actuelles.</p><div class="chart-controls" id="chart-controls"><button type="button" data-days="10">10 jours</button><button type="button" data-days="20" aria-pressed="true">20 jours</button><button type="button" data-days="30">30 jours</button><button type="button" data-days="90">90 jours</button></div><div class="legend"><span style="--line:#246b56">Appareils</span><span style="--line:#d28b35">Nouveaux</span><span style="--line:#6684bd">Habitués</span></div><div class="chart-wrap"><svg id="visits-chart" viewBox="0 0 760 280" role="img" aria-label="Courbes des appareils quotidiens"></svg></div></section><section><h2>Visites quotidiennes · 90 derniers jours enregistrés</h2><div class="scroll"><table><thead><tr><th>Date</th><th>Appareils</th><th>Nouveaux</th><th>Habitués</th><th>App installée</th><th>Volume</th></tr></thead><tbody id="daily"></tbody></table></div></section>
<section><h2>Pings refusés · 30 jours</h2><p class="note">bot = robot ou aperçu de lien · foreign = appel venu d'un autre site · quota = plus de 20 nouveaux appareils par réseau et par jour.</p><div class="scroll"><table><thead><tr><th>Date</th><th>Raison</th><th>Nombre</th></tr></thead><tbody id="rejects"></tbody></table></div></section>
<section><h2>Langues</h2><div class="scroll"><table><thead><tr><th>Langue</th><th>Visites</th></tr></thead><tbody id="languages"></tbody></table></div></section>
<section><h2>Villes sélectionnées dans les réglages</h2><p class="note">Ce ne sont pas des données de géolocalisation.</p><div class="scroll"><table><thead><tr><th>Ville</th><th>Visites</th></tr></thead><tbody id="cities"></tbody></table></div></section>
<section><h2>Avis (100 plus récents)</h2><div class="scroll"><table><thead><tr><th>Date</th><th>Note</th><th>Message</th><th>Contact (privé)</th><th>Langue</th><th>Page</th></tr></thead><tbody id="feedback"></tbody></table></div></section>
<script nonce="stats2026">
const $=id=>document.getElementById(id);
const add=(id,cells)=>{const tr=document.createElement("tr");cells.forEach(v=>{const td=document.createElement("td");td.textContent=String(v??"—");tr.append(td)});$(id).append(tr)};
const fill=(id,rows,map)=>{if(!rows.length){add(id,["Aucune donnée"]);return;}rows.forEach(x=>add(id,map(x)))};
function drawChart(rows,days){
 const svg=$("visits-chart"), ns="http://www.w3.org/2000/svg";svg.replaceChildren();
 const make=(tag,attrs,text)=>{const el=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));if(text!==undefined)el.textContent=text;svg.append(el);return el};
 const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jerusalem"}).format(new Date());
 const dayMs=Date.parse(today+"T12:00:00Z"), byDay=new Map(rows.map(r=>[r.day,r]));
 const series=Array.from({length:days},(_,i)=>{const day=new Date(dayMs-(days-1-i)*86400000).toISOString().slice(0,10);const r=byDay.get(day);return {day,total:Number(r?.devices||0),newCount:Number(r?.new_devices||0),returning:Math.max(0,Number(r?.devices||0)-Number(r?.new_devices||0))}});
 const top=Math.max(1,...series.map(r=>r.total)), left=43,right=740,upper=16,bottom=234;
 const x=i=>left+i*(right-left)/Math.max(1,days-1),y=n=>bottom-n/top*(bottom-upper);
 for(let i=0;i<=4;i++){const n=Math.round(top*i/4),yy=y(top*i/4);make("line",{x1:left,x2:right,y1:yy,y2:yy,stroke:"#e1e8e4"});make("text",{x:35,y:yy+4,"text-anchor":"end",fill:"#52665d","font-size":12},String(n))}
 const labelStep=Math.max(1,Math.ceil(days/8));
 series.forEach((r,i)=>{if(i%labelStep===0||i===days-1)make("text",{x:x(i),y:254,"text-anchor":"middle",fill:"#52665d","font-size":11},r.day.slice(8)+"/"+r.day.slice(5,7))});
 [["total","#246b56"],["newCount","#d28b35"],["returning","#6684bd"]].forEach(([key,color])=>{const points=series.map((r,i)=>x(i)+","+y(r[key])).join(" ");make("polyline",{points,fill:"none",stroke:color,"stroke-width":2.5,"stroke-linejoin":"round","stroke-linecap":"round"})});
 series.forEach((r,i)=>{const hit=make("circle",{cx:x(i),cy:y(r.total),r:Math.max(4,Math.min(9,180/days)),fill:"#246b56"});const title=document.createElementNS(ns,"title");title.textContent=r.day+" : "+r.total+" appareils, "+r.newCount+" nouveaux, "+r.returning+" habitués";hit.append(title)});
}
async function run(){
 try{
 const response=await fetch("/api/stats",{credentials:"same-origin",cache:"no-store"});
 const data=await response.json();if(!response.ok)throw Error(data.error||"HTTP "+response.status);
 $("visits").textContent=data.totals.visits??0;$("devices").textContent=data.totals.devices??0;
 $("feedback-count").textContent=data.feedback.length+(data.feedback.length===100?" +":"");
 const s=data.summary||{};["active7","active30","returning30","installed30"].forEach(k=>$(k).textContent=s[k]??0);
 $("rejected").textContent=data.rejects.reduce((a,x)=>a+x.n,0);
 const max=Math.max(1,...data.daily.map(x=>x.devices));
 let chartDays=20;const controls=$("chart-controls");const redraw=()=>drawChart(data.daily,chartDays);controls.querySelectorAll("button").forEach(button=>button.addEventListener("click",()=>{chartDays=Number(button.dataset.days);controls.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b===button)));redraw()}));redraw();
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
