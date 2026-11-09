export async function onRequestGet({request}) {
  const date = new URL(request.url).searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date+"T00:00:00Z"))) {
    return Response.json({error:"invalid-date"}, {status:400});
  }
  try {
    const upstream = await fetch("https://api.chassidushub.org/v1/daily?date="+encodeURIComponent(date), {
      headers:{"Accept":"application/json"},
      signal:AbortSignal.timeout(12000)
    });
    if (!upstream.ok) return Response.json({error:"upstream",status:upstream.status},{status:502});
    const json = await upstream.json();
    const readings = [];
    for (const item of (Array.isArray(json.hayomYom) ? json.hayomYom : [])) {
      const source = item.bodySource || {};
      if (!["credit", "open"].includes(source.rights)) continue;
      const versions = item.data?.body?.versions || [];
      const version = versions.find(v => v.language === "he" || v.id === "he");
      if (!version || !Array.isArray(version.segments)) continue;
      const paragraphs = version.segments
        .filter(seg => !seg.kind || seg.kind === "paragraph")
        .map(seg => (Array.isArray(seg.text) ? seg.text : [])
          .map(part => typeof part === "string" ? part : (part?.text || "")).join(""))
        .filter(Boolean);
      if (!paragraphs.length) continue;
      const url = source.url || version.url || "";
      readings.push({
        label: item.label?.he || "",
        paragraphs,
        credit: source.credit || version.credit || "ChassidusHub",
        licence: source.licence || version.licence || "",
        url: /^https:\/\//.test(url) ? url : "",
        machine: version.segments.some(seg => String(seg.origin?.by || "").startsWith("ocr:"))
      });
    }
    return Response.json({readings, count: readings.length, ...(readings.length ? {} : {diagnostic:{rootKeys:Object.keys(json||{}), hayomYomType:typeof json?.hayomYom, hayomYomIsArray:Array.isArray(json?.hayomYom), itemCount:Array.isArray(json?.hayomYom)?json.hayomYom.length:null, firstItemKeys:Array.isArray(json?.hayomYom)&&json.hayomYom[0]?Object.keys(json.hayomYom[0]):[], firstRights:json?.hayomYom?.[0]?.bodySource?.rights||null, versionCount:json?.hayomYom?.[0]?.data?.body?.versions?.length||0}})}, {
      headers:{"Cache-Control":"public, max-age=300"}
    });
  } catch {
    return Response.json({error:"upstream-unavailable"},{status:502});
  }
}
