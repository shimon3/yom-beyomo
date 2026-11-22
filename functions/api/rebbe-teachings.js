// Preview-only metadata search. Do not redistribute copyrighted texts.
const json=(body,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"public, max-age=120","X-Content-Type-Options":"nosniff"}});
const ALLOWED=/^[\p{L}\p{M}\p{N}\s'"״׳-]{2,80}$/u;
export async function onRequestGet({request}){
  const u=new URL(request.url),q=(u.searchParams.get("q")||"").trim();
  if(!ALLOWED.test(q))return json({error:"invalid-query"},400);
  try{
    const upstream=new URL("https://api.chassidushub.org/v1/search");
    upstream.searchParams.set("q",q);upstream.searchParams.set("limit","30");
    const res=await fetch(upstream,{headers:{Accept:"application/json"},signal:AbortSignal.timeout(9000)});
    if(!res.ok)return json({error:"upstream-unavailable"},502);
    const body=await res.json();
    const items=Array.isArray(body.results)?body.results:[];
    const safe=items.filter(x=>x&&typeof x==="object").map(x=>{
      const data=x.data||{},title=data.title||data.label||x.title||{};
      const id=typeof x.id==="string"&&/^rh-[a-z0-9-]{4,60}$/i.test(x.id)?x.id:null;
      const path=typeof x.path==="string"&&x.path.startsWith("/")?x.path:null;
      const name=typeof title==="string"?{he:title}:title;
      return {id,kind:String(data.kind||x.type||"").slice(0,50),title:{he:String(name?.he||"").slice(0,180),en:String(name?.en||"").slice(0,180)},source:id?"https://chassidushub.org/entities/"+encodeURIComponent(id):path?"https://chassidushub.org"+path:null,rights:String(data.rights||x.rights||"unknown"),machine:Boolean(x.machine||data.machine),checked: x.checked===true||data.checked===true};
    }).filter(x=>x.id&&x.source);
    return json({query:q,results:safe,rightsNotice:"Metadata and source links only. Full text is not redistributed."});
  }catch{return json({error:"upstream-unavailable"},502)}
}
