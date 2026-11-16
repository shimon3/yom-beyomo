const fail=(status,error)=>Response.json({error},{status,headers:{"Cache-Control":"no-store"}});
const MODEL="@cf/google/gemma-4-26b-a4b-it";
const cacheHeaders={"Cache-Control":"public, max-age=1209600","Content-Type":"application/json; charset=utf-8"};

async function sha256(value){
  const bytes=new TextEncoder().encode(value);
  const digest=await crypto.subtle.digest("SHA-256",bytes);
  return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,"0")).join("");
}

export async function onRequestPost({request,env}){
  if(!request.headers.get("content-type")?.toLowerCase().includes("application/json"))
    return fail(415,"json-required");
  let raw,body;
  try{
    raw=await request.text();
    if(raw.length>12000)return fail(413,"text-too-long");
    body=JSON.parse(raw);
  }catch{return fail(400,"invalid-json");}
  const text=typeof body?.text==="string"?body.text.replace(/\\s+/g," ").trim():"";
  if(!text||text.length>2500)return fail(400,"invalid-text");
  if(!env.AI)return fail(503,"ai-binding-required");

  try{
    const key=await sha256(text);
    const cacheKey=new Request(new URL("/__paragraph-explanation-cache/"+key,request.url),{method:"GET"});
    const cached=await caches.default.match(cacheKey);
    if(cached)return cached;

    const result=await env.AI.run(MODEL,{
      messages:[
        {role:"system",content:"Tu aides un lecteur francophone à comprendre un paragraphe d’étude juive hassidique. En français simple, donne une explication brève en 2 à 4 phrases. Explique l’idée et les termes nécessaires sans présenter ton interprétation comme une traduction littérale. N’invente ni source ni citation; si le sens reste incertain, dis-le."},
        {role:"user",content:"Explique ce paragraphe : "+text}
      ],
      max_tokens:220,
      temperature:0.2
    });
    const explanation=typeof result?.response==="string"?result.response.trim():"";
    if(!explanation)return fail(502,"empty-explanation");
    const response=Response.json({explanation,model:MODEL},{headers:cacheHeaders});
    await caches.default.put(cacheKey,response.clone());
    return response;
  }catch{return fail(502,"explanation-unavailable");}
}
