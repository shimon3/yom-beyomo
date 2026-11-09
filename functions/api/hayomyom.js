// Labels arrive as HTML fragments (e.g. "<h3>כט חשון</h3>"): keep the text only.
const plain=s=>String(s||"").replace(/<[^>]*>/g,"").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g," ").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").trim();

export async function onRequestGet({request}) {
  const date=new URL(request.url).searchParams.get("date");
  if(!date||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)||!Number.isFinite(Date.parse(date+"T00:00:00Z")))
    return Response.json({error:"invalid-date"},{status:400});
  try {
    const upstream=await fetch("https://api.chassidushub.org/v1/daily?date="+encodeURIComponent(date),{
      headers:{"Accept":"application/json"},signal:AbortSignal.timeout(12000)
    });
    if(!upstream.ok)return Response.json({error:"upstream",status:upstream.status},{status:502});
    const json=await upstream.json(),readings=[];
    for(const item of (Array.isArray(json.hayomYom)?json.hayomYom:[])){
      const source=item.bodySource||{},versions=item.data?.body?.versions||[];
      const version=versions.find(v=>v.language==="he"||v.id==="he");
      const url=source.url||version?.url||"";
      if(!/^https:\/\//.test(url))continue;
      // ChassidusHub rights documentation: chabadlibrary.org texts are 'credit'.
      // Do not relay unknown or link-only source texts.
      // An explicit rights state wins (a takedown moves a text to "preserved"); only when
      // it is absent do we fall back to the Chabad Library profile/edition markers.
      const fromLibrary=item.data?.body?.profile==="chabad-library"||item.editions?.some(e=>e.source==="chabadlibrary");
      const creditAllowed=/^https:\/\/(?:www\.)?chabadlibrary\.org\//.test(url)&&
        (source.rights?(source.rights==="credit"||source.rights==="open"):fromLibrary);
      const paragraphs=[];
      if(creditAllowed&&version&&Array.isArray(version.segments)){
        for(const segment of version.segments){
          const lines=Array.isArray(segment.text)?segment.text:[segment.text];
          const paragraph=lines.map(part=>typeof part==="string"?part:(part&&typeof part.text==="string"?part.text:(part&&part.br?" ":""))).join("").replace(/\s+/g," ").trim();
          if(paragraph)paragraphs.push(paragraph);
        }
      }
      readings.push({
        label:plain(item.data?.label?.he||item.label?.he),paragraphs,
        credit:source.credit||version?.credit||"ספריית ליובאוויטש",
        licence:source.licence||version?.licence||"unspecified",
        url,external:!paragraphs.length,
        machine:version?.machine===true||item.data?.body?.machine===true||version?.segments?.some(segment=>String(segment.origin?.by||"").startsWith("ocr:"))===true,
        checked:version?.checked===true
      });
    }
    return Response.json({readings,count:readings.length},{headers:{"Cache-Control":"public, max-age=300"}});
  }catch{return Response.json({error:"upstream-unavailable"},{status:502});}
}
