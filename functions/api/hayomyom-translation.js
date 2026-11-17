// Fetch an EXISTING Hebrew translation of Hayom Yom from Chabadpedia on demand.
// Never generate or paraphrase a translation. The original Yiddish remains on the page.
const plain=s=>String(s||"").replace(/<[^>]*>/g,"").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").trim();
const fail=(status,error)=>Response.json({error},{status,headers:{"Cache-Control":"no-store"}});
function wikiDay(label){
  const match=plain(label).replace(/[׳״]/g,"").match(/^([א-ת]{1,3})\s+([א-ת]+)$/);
  if(!match) return null;
  const day=match[1].length===1 ? match[1]+"'" : match[1].slice(0,-1)+'"'+match[1].slice(-1);
  return day+" "+match[2];
}
function extractTranslation(raw){
  // MediaWiki wikitext often contains links inside headings (מ[[יידיש]]).
  const cleaned=String(raw||"")
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g,"$1")
    .replace(/\{\{[^{}]*\}\}/g,"")
    .replace(/<noinclude>[\s\S]*$/i,"");
  const m=cleaned.match(/'{0,5}\s*תרגום\s+(?:מיידיש|ללשון\s+הקודש)\s*'{0,5}\s*:\s*([\s\S]*?)(?=\n\s*(?:----|==|'''|\[\[קטגוריה)|$)/);
  if(!m) return null;
  const t=m[1].replace(/'{2,5}/g,"").replace(/<[^>]+>/g,"").trim();
  return t.length>=12&&t.length<=6000 ? t : null;
}
export async function hebrewTranslationForLabel(label, timeout=11000){
  const day=wikiDay(label);
  if(!day)return fail(404,"date-not-supported");
  const title="תבנית:היום יום/"+day;
  const url="https://chabadpedia.co.il/index.php/"+encodeURIComponent(title).replace(/%2F/gi,"/");
  const api="https://chabadpedia.co.il/api.php?action=parse&prop=wikitext&format=json&page="+encodeURIComponent(title);
  const upstream=await fetch(api,{headers:{"Accept":"application/json"},signal:AbortSignal.timeout(timeout)});
  if(!upstream.ok)return fail(502,"translation-source-unavailable");
  const page=await upstream.json();
  const translation=extractTranslation(page?.parse?.wikitext?.["*"]);
  if(!translation)return fail(404,"translation-not-found");
  return Response.json({translation,language:"he",source:"חב״דפדיה",url,license:"CC BY-SA",generated:false},{headers:{"Cache-Control":"public, max-age=3600"}});
}
export async function onRequestGet({request}){
  const date=new URL(request.url).searchParams.get("date");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date||"") || !Number.isFinite(Date.parse(date+"T00:00:00Z")))
    return fail(400,"invalid-date");
  try{
    const daily=await fetch("https://api.chassidushub.org/v1/daily?date="+encodeURIComponent(date),{signal:AbortSignal.timeout(11000)});
    if(!daily.ok)return fail(502,"daily-source-unavailable");
    const json=await daily.json();
    const entry=(Array.isArray(json.hayomYom)?json.hayomYom:[])[0];
    return await hebrewTranslationForLabel(entry?.data?.label?.he||entry?.label?.he||"");
  }catch{return fail(502,"translation-source-unavailable");}
}
