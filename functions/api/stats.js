import { requireStatsAccess } from "../_access.js";
const respond=(data,status=200)=>new Response(JSON.stringify(data),{
 status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"private, no-store","x-content-type-options":"nosniff"}
});
const needed={
 visits:["day","uid","lang","city","standalone"],
 feedback:["created","uid","rating","message","contact","lang","page"]
};
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
   const [totals,daily,langs,cities,feedback]=await Promise.all([
     env.DB.prepare("SELECT COUNT(*) AS visits, COUNT(DISTINCT uid) AS devices FROM visits").first(),
     env.DB.prepare("SELECT day, COUNT(*) AS visits, COUNT(DISTINCT uid) AS devices FROM visits GROUP BY day ORDER BY day DESC LIMIT 90").all(),
     env.DB.prepare("SELECT COALESCE(NULLIF(lang,''),'unknown') AS name, COUNT(*) AS visits FROM visits GROUP BY name ORDER BY visits DESC LIMIT 20").all(),
     env.DB.prepare("SELECT COALESCE(NULLIF(city,''),'unknown') AS name, COUNT(*) AS visits FROM visits GROUP BY name ORDER BY visits DESC LIMIT 30").all(),
     env.DB.prepare("SELECT created,rating,message,contact,lang,page FROM feedback ORDER BY created DESC LIMIT 100").all()
   ]);
   let analytics={ready:false,sections:[],errors:[],devices:[]};
   const check=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='analytics_events'").first();
   if(check){
     const [sections,errors,devices]=await Promise.all([
       env.DB.prepare("SELECT label, SUM(count) AS visits FROM analytics_events WHERE category='section' AND day>=date('now','-29 days') GROUP BY label ORDER BY visits DESC LIMIT 20").all(),
       env.DB.prepare("SELECT label, SUM(count) AS failures FROM analytics_events WHERE category='load_error' AND day>=date('now','-29 days') GROUP BY label ORDER BY failures DESC LIMIT 20").all(),
       env.DB.prepare("SELECT device, SUM(count) AS visits FROM analytics_events WHERE category='device' AND day>=date('now','-29 days') GROUP BY device ORDER BY visits DESC").all()
     ]);
     analytics={ready:true,sections:sections.results||[],errors:errors.results||[],devices:devices.results||[]};
   }
   return respond({totals,daily:daily.results||[],languages:langs.results||[],cities:cities.results||[],feedback:feedback.results||[],analytics,schema});
 } catch(e) { console.error("Stats query failure",e); return respond({error:"Database query failed"},503); }
}
