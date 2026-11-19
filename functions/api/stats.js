import { requireStatsAccess } from "../_access.js";
const respond=(data,status=200)=>new Response(JSON.stringify(data),{
 status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"private, no-store","x-content-type-options":"nosniff"}
});
const needed={
 visits:["day","uid","lang","city","standalone"],
 feedback:["created","uid","rating","message","contact","lang","page"],
 ping_rejects:["day","reason","n"]
};
const israelDay=(ms=Date.now())=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jerusalem"}).format(new Date(ms));
export async function onRequestGet({request,env}) {
 const auth=await requireStatsAccess(request,env);
 if(auth) return auth;
 if(!env.DB) return respond({error:"D1 binding DB missing"},503);
 try {
   const schema={};
   for(const table of Object.keys(needed)) {
     const result=await env.DB.prepare("PRAGMA table_info("+table+")").all();
     const found=(result.results||[]).map(r=>r.name);
     schema[table]={exists:found.length>0,missing:needed[table].filter(k=>!found.includes(k))};
   }
   if(Object.values(schema).some(x=>!x.exists || x.missing.length))
     return respond({error:"D1 schema incomplete",schema},503);
   const d7=israelDay(Date.now()-6*86400000), d30=israelDay(Date.now()-29*86400000);
   const [totals,summary,daily,rejects,langs,cities,feedback,hours,pages,retention]=await Promise.all([
     env.DB.prepare("SELECT COUNT(*) AS visits, COUNT(DISTINCT uid) AS devices FROM visits").first(),
     env.DB.prepare(`SELECT
       (SELECT COUNT(DISTINCT uid) FROM visits WHERE day>=?1) AS active7,
       (SELECT COUNT(DISTINCT uid) FROM visits WHERE day>=?2) AS active30,
       (SELECT COUNT(DISTINCT uid) FROM visits WHERE day>=?2 AND standalone=1) AS installed30,
       (SELECT COUNT(*) FROM (SELECT uid FROM visits WHERE day>=?2 GROUP BY uid HAVING COUNT(*)>=2)) AS returning30`).bind(d7,d30).first(),
     /* "new" = first day this device appears in the 90 kept days */
     env.DB.prepare(`SELECT v.day, COUNT(*) AS devices,
       SUM(CASE WHEN EXISTS (SELECT 1 FROM visits w WHERE w.uid=v.uid AND w.day<v.day) THEN 0 ELSE 1 END) AS new_devices,
       SUM(v.standalone) AS installed
       FROM visits v GROUP BY v.day ORDER BY v.day DESC LIMIT 90`).all(),
     env.DB.prepare("SELECT day, reason, n FROM ping_rejects WHERE day>=?1 ORDER BY day DESC").bind(d30).all(),
     env.DB.prepare("SELECT COALESCE(NULLIF(lang,''),'unknown') AS name, COUNT(*) AS visits FROM visits GROUP BY name ORDER BY visits DESC LIMIT 20").all(),
     env.DB.prepare("SELECT COALESCE(NULLIF(city,''),'unknown') AS name, COUNT(*) AS visits FROM visits GROUP BY name ORDER BY visits DESC LIMIT 30").all(),
     env.DB.prepare("SELECT created,rating,message,contact,lang,page FROM feedback ORDER BY created DESC LIMIT 100").all(),
     env.DB.prepare("SELECT hour, COUNT(*) AS n FROM visit_details WHERE day>=?1 GROUP BY hour ORDER BY hour").bind(d30).all(),
     env.DB.prepare("SELECT page, COUNT(*) AS n FROM visit_details WHERE day>=?1 GROUP BY page ORDER BY n DESC LIMIT 20").bind(d30).all(),
     env.DB.prepare("SELECT COUNT(*) AS eligible, SUM(CASE WHEN EXISTS (SELECT 1 FROM visits v2 WHERE v2.uid=v.uid AND v2.day>v.day AND v2.day<=date(v.day,'+7 days')) THEN 1 ELSE 0 END) AS returned FROM visits v WHERE v.day>=?1 AND v.day<=?2 AND NOT EXISTS (SELECT 1 FROM visits older WHERE older.uid=v.uid AND older.day<v.day)").bind(israelDay(Date.now()-83*86400000),israelDay(Date.now()-7*86400000)).first()
   ]);
   return respond({totals,summary,daily:daily.results||[],rejects:rejects.results||[],languages:langs.results||[],cities:cities.results||[],feedback:feedback.results||[],hours:hours.results||[],pages:pages.results||[],retention:retention||{},schema});
 } catch(e) { console.error("Stats query failure",e); return respond({error:"Database query failed"},503); }
}
