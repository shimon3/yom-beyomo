const reply=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
const sections=new Set(["chumash","tehillim","tanya","rambam","rambam3","rambam1","seferhamitzvot","mishnah","dafyomi","hayomyom"]);
const safeLabel=v=>typeof v==="string"&&/^[a-z][a-z0-9_-]{0,31}$/.test(v);
const israelDay=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jerusalem",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
export async function onRequestPost({request,env}){
 if(request.headers.get("DNT")==="1"||request.headers.get("Sec-GPC")==="1")return reply({ok:true,ignored:true});
 if(!env.DB)return reply({error:"db-unavailable"},503);
 const origin=request.headers.get("origin");
 if(origin&&origin!==new URL(request.url).origin)return reply({error:"origin"},403);
 const len=Number(request.headers.get("content-length")||0);
 if(len>500)return reply({error:"size"},413);
 let b;try{const raw=await request.text();if(raw.length>500)throw Error();b=JSON.parse(raw);}catch{return reply({error:"json"},400);}
 const category=b.category, label=b.label, device=b.device;
 if(!["section","load_error","device"].includes(category)||!["mobile","desktop","tablet","unknown"].includes(device)||!safeLabel(label))return reply({error:"invalid"},400);
 if(category==="section"&&!sections.has(label))return reply({error:"section"},400);
 if(category==="device"&&label!=="visit")return reply({error:"device"},400);
 if(category==="load_error"&&!sections.has(label)&&label!=="calendar")return reply({error:"load_error"},400);
 try{await env.DB.prepare("INSERT INTO analytics_events(day,category,label,device,count) VALUES(?1,?2,?3,?4,1) ON CONFLICT(day,category,label,device) DO UPDATE SET count=count+1").bind(israelDay(),category,label,device).run();return reply({ok:true});}
 catch(e){console.error("analytics write",e);return reply({error:"db-query"},503);}
}
