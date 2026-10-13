import { requireStatsAccess } from "../_access.js";

const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"private,no-store","x-robots-tag":"noindex","x-content-type-options":"nosniff"}});
export async function onRequestGet({request,env}){
 if(env.DVAR_PRIVATE_PREVIEW_ENABLED!=="true")return json({error:"preview-disabled"},503);
 const denied=await requireStatsAccess(request,{ACCESS_TEAM_DOMAIN:env.ACCESS_TEAM_DOMAIN,ACCESS_AUD:env.DVAR_PRIVATE_ACCESS_AUD});
 if(denied)return denied;
 const u=new URL(request.url),date=u.searchParams.get("date");
 if(!date||!/^20[0-9]{2}-[0-9]{2}-[0-9]{2}$/.test(date)||!Number.isFinite(Date.parse(date+"T12:00:00Z")))return json({error:"invalid-date"},400);
 const [year,month,day]=date.split("-").map(Number);
 const endpoint=new URL("https://www.sefaria.org/api/calendars");
 for(const [k,v] of Object.entries({year,month,day,timezone:"Asia/Jerusalem",diaspora:0}))endpoint.searchParams.set(k,String(v));
 try{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),6500);
  let response;
  try{response=await fetch(endpoint.toString(),{redirect:"manual",signal:controller.signal,headers:{"accept":"application/json"}});}
  finally{clearTimeout(timer);}
  if(!response.ok)return json({error:"sefaria-unavailable",upstreamStatus:response.status},502);
  const data=await response.json();
  const entry=(data.calendar_items||[]).find(item=>item.title?.en==="Tanya Yomi"||item.title?.he==="תניא יומי");
  if(!entry?.ref||typeof entry.url!=="string")return json({status:"not-listed",date});
  const sefariaUrl="https://www.sefaria.org/"+entry.url.replace(/^\/+/, "");
  if(!sefariaUrl.startsWith("https://www.sefaria.org/"))return json({error:"invalid-source"},502);
  return json({status:"available",date,title:entry.displayValue?.he||entry.displayValue?.en||"תניא יומי",ref:entry.ref,heRef:entry.heRef||null,url:sefariaUrl,source:"Sefaria Calendar API"});
 }catch{return json({error:"sefaria-unavailable"},502);}
}
