import { requireStatsAccess } from "../_access.js";

// Reads public publication metadata only. No PDF downloads or mirroring.
const reply=(body,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"private, no-store","x-robots-tag":"noindex","x-content-type-options":"nosniff"}
});
let metadataCache=null;
let metadataCacheExpiry=0;
export async function onRequestGet({request,env}){
 if(env.DVAR_PRIVATE_PREVIEW_ENABLED!=="true")return reply({error:"preview-disabled"},503);
 const denied=await requireStatsAccess(request,{
  ACCESS_TEAM_DOMAIN:env.ACCESS_TEAM_DOMAIN,ACCESS_AUD:env.DVAR_PRIVATE_ACCESS_AUD
 });
 if(denied)return denied;
 if(metadataCache && Date.now()<metadataCacheExpiry) return reply(metadataCache);
 try{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),4500);
  let source;
  try{
   source=await fetch("https://dvarmalchus.com/",{
     signal:controller.signal,redirect:"manual",headers:{"accept":"text/html"}
   });
  }finally{clearTimeout(timeout);}
  if(source.status>=300 && source.status<400) return reply({status:"source-redirect",upstreamStatus:source.status},502);
  if(!source.ok) return reply({status:"source-http-error",upstreamStatus:source.status},502);
  if(!(source.headers.get("content-type")||"").toLowerCase().includes("text/html"))
   return reply({status:"source-not-html"},502);
  const length=Number(source.headers.get("content-length")||0);
  if(length>750000)return reply({status:"source-too-large"},502);
  const html=await source.text();
  if(html.length>750000)return reply({status:"source-too-large"},502);
  const clean=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
   .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
   .replace(/<[^>]*>/g," ").replace(/&(?:nbsp|#160);/gi," ")
   .replace(/&quot;/gi,'"').replace(/&amp;/gi,"&")
   .replace(/\s+/g," ");
  // Detect publication mention without guessing a PDF URL, page or region.
  const dateMatch=clean.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(20\d{2})/);
  const titleMatch=clean.match(/(?:###\s*)?([א-ת״"'\s]{2,28}תשפ[״"׳']?[א-ת])/);
  const weeklyTitle=clean.match(/([א-ת]{2,15}\s+תשפ[״"׳\x27]?[א-ת])/);
  const englishDate=clean.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+20\d{2}/i);
  // Extract only a publisher-hosted PDF URL associated with the current edition.
  // The reader makes a direct browser request to the publisher; we never proxy or store PDF bytes.
  const candidates=[...html.matchAll(/<a\b[^>]*href=["']([^"']+\.pdf(?:\?[^"']*)?)["'][^>]*>/gi)];
  let pdfUrl=null;
  for(const candidate of candidates){
   try{
    const u=new URL(candidate[1].replace(/&amp;/g,"&"),"https://dvarmalchus.com/");
    if(u.protocol==="https:" && u.hostname==="dvarmalchus.com" &&
       /^\/Download\/[0-9a-f-]+\.pdf$/i.test(u.pathname) && !u.search && !u.hash) {
      pdfUrl=u.href;break;
    }
   }catch{}
  }
  const edition=(dateMatch||englishDate)?{
   label:weeklyTitle?.[1]?.trim()||titleMatch?.[1]?.trim()||null,
   publishedDateRange:dateMatch?.[0]||null,
   releaseDate:englishDate?.[0]||null,
   source:"https://dvarmalchus.com/"
  }:null;
  const result={status:edition?"metadata-found":"not-confirmed",edition,
   pdfPreviewEnabled:Boolean(edition&&pdfUrl),pdfUrl:edition?pdfUrl:null,checkedAt:new Date().toISOString()};
  if(edition&&pdfUrl){metadataCache=result;metadataCacheExpiry=Date.now()+600000;}
  return reply(result);
 }catch(err){
  const name = String(err?.name || "UnknownError").slice(0,48);
  const message = String(err?.message || "").slice(0,180);
  // Diagnostic only for authenticated Preview visitors. Do not leak request secrets.
  return reply({status:name==="AbortError"?"source-timeout":"source-fetch-failed",errorType:name,detail:message},502);
 }
}
