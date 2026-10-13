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
   return respond({totals,daily:daily.results||[],languages:langs.results||[],cities:cities.results||[],feedback:feedback.results||[],schema});
 } catch(e) { console.error("Stats query failure",e); return respond({error:"Database query failed"},503); }
}
