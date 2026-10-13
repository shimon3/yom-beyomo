import { requireStatsAccess } from "../_access.js";

// Reads public publication metadata only. No PDF downloads or mirroring.
const reply=(body,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"private, no-store","x-robots-tag":"noindex","x-content-type-options":"nosniff"}
});
export async function onRequestGet({request,env}){
 if(env.DVAR_PRIVATE_PREVIEW_ENABLED!=="true")return reply({error:"preview-disabled"},503);
 const denied=await requireStatsAccess(request,{
  ACCESS_TEAM_DOMAIN:env.ACCESS_TEAM_DOMAIN,ACCESS_AUD:env.DVAR_PRIVATE_ACCESS_AUD
 });
 if(denied)return denied;
 try{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),4500);
  let source;
  try{
   source=await fetch("https://dvarmalchus.org/",{
     signal:controller.signal,redirect:"error",headers:{"accept":"text/html"}
   });
  }finally{clearTimeout(timeout);}
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
  const edition=dateMatch?{
   label:titleMatch?.[1]?.trim()||null,
   publishedDateRange:dateMatch[0],
   source:"https://dvarmalchus.org/"
  }:null;
  return reply({status:edition?"metadata-found":"not-confirmed",edition,
   pdfPreviewEnabled:false,pdfUrl:null,checkedAt:new Date().toISOString()});
 }catch(err){return reply({status:err?.name==="AbortError"?"source-timeout":"source-fetch-failed"},502);}
}
