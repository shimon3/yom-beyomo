const json=(body,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}});

export async function onRequestPost({request,env}){
  const key=String(env.AZURE_TRANSLATOR_KEY||"").trim();
  if(!key)return json({error:"translator-not-configured"},503);
  let payload;
  try{payload=await request.json();}catch{return json({error:"invalid-json"},400);}
  const text=typeof payload?.text==="string"?payload.text.trim():"";
  if(!text)return json({error:"empty-text"},400);
  if(text.length>5000)return json({error:"text-too-long"},413);
  const endpoint=String(env.AZURE_TRANSLATOR_ENDPOINT||"https://api.cognitive.microsofttranslator.com").replace(/\/+$/,"");
  const url=new URL(endpoint+"/translate");
  url.searchParams.set("api-version","3.0");
  url.searchParams.set("from","he");
  url.searchParams.set("to","fr");
  const headers={"Content-Type":"application/json","Ocp-Apim-Subscription-Key":key,"Accept":"application/json"};
  const region=String(env.AZURE_TRANSLATOR_REGION||"").trim();
  if(region)headers["Ocp-Apim-Subscription-Region"]=region;
  try{
    const response=await fetch(url.toString(),{
      method:"POST",headers,body:JSON.stringify([{Text:text}]),signal:AbortSignal.timeout(12000)
    });
    if(response.status===429)return json({error:"translator-quota"},429);
    if(!response.ok)return json({error:"translator-upstream",status:response.status},502);
    const result=await response.json();
    const translation=result?.[0]?.translations?.find(item=>item.to==="fr")?.text;
    if(typeof translation!=="string"||!translation.trim())return json({error:"empty-translation"},502);
    return json({translation});
  }catch{
    return json({error:"translator-unavailable"},502);
  }
}
