const model = "@cf/meta/m2m100-1.2b";

export async function onRequestGet({ env, request, waitUntil }) {
  if (!env.AI) {
    return Response.json({ error: "workers_ai_binding_missing" }, { status: 503 });
  }

  const cacheKey = new URL(request.url);
  cacheKey.search = "";
  const cached = await caches.default.match(cacheKey);
  if (cached) {
    return cached;
  }

  const result = await env.AI.run(model, {
    text: "בוקר טוב, היום אנחנו לומדים ביחד.",
    source_lang: "he",
    target_lang: "fr",
  });

  const response = Response.json(result, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
  waitUntil(caches.default.put(cacheKey, response.clone()));
  return response;
}
