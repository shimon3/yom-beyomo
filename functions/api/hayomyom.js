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
    return Response.json({hayomYom: Array.isArray(json.hayomYom)?json.hayomYom:[]}, {
      headers:{"Cache-Control":"public, max-age=300"}
    });
  } catch {
    return Response.json({error:"upstream-unavailable"},{status:502});
  }
}
