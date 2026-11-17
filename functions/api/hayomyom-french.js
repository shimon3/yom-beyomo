import { onRequestGet as readHayomYom } from "./hayomyom.js";
import { hebrewTranslationForLabel } from "./hayomyom-translation.js";

const model = "@cf/meta/m2m100-1.2b";
const yiddishWords = new Set(["איז", "זענען", "אזוי", "אזױ", "נישט",
  "נאך", "אויף", "זאל", "אויך", "אבער", "וואס", "ווער", "יעצט", "אויס", "אויפטאן",
  "געווען", "געווארן", "יעדער", "שוין", "זייער", "פאר", "פונעם", "צוליב", "טאקע"]);
const fail = (status, error) => Response.json({ error }, {
  status, headers: { "Cache-Control": "no-store" },
});

function appearsYiddish(paragraphs) {
  const words = paragraphs.join(" ").normalize("NFKD").replace(/\p{M}/gu, "").match(/\p{L}+/gu) || [];
  const distinct = new Set(words.filter(word => yiddishWords.has(word)));
  return distinct.size >= 2;
}

async function savedFrench(date) {
  try {
    const url = new URL("/api/translations/" + date, "https://hayom-yom-api.shmouel6.workers.dev");
    url.searchParams.set("lang", "fr");
    const response = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.date === date && data.language === "fr" && typeof data.translation === "string"
      && data.translation.trim() ? data : null;
  } catch {
    return null;
  }
}

async function translateParagraph({ AI, TRANSLATION_CACHE: db }, paragraph) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(paragraph));
  const key = "m2m100-he-fr-v1:" + Array.from(new Uint8Array(hash),
    byte => byte.toString(16).padStart(2, "0")).join("");
  const lookup = () => db.prepare("SELECT translation FROM translations WHERE cache_key = ?")
    .bind(key).first("translation");
  const cached = await lookup();
  if (cached) return cached;

  const owner = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const day = new Date(now * 1000).toISOString().slice(0, 10);
  // Reserving the paragraph and charging the daily allowance are one transaction.
  const [claim] = await db.batch([
    db.prepare(`INSERT INTO translations (cache_key, lease_until, lease_owner)
      VALUES (?, ?, ?) ON CONFLICT(cache_key) DO UPDATE
      SET lease_until = excluded.lease_until, lease_owner = excluded.lease_owner
      WHERE translations.translation IS NULL AND translations.lease_until <= ?`)
      .bind(key, now + 90, owner, now),
    db.prepare(`INSERT INTO translation_daily_usage (day, characters)
      SELECT ?, ? WHERE changes() = 1
      ON CONFLICT(day) DO UPDATE SET characters = characters + excluded.characters`)
      .bind(day, Array.from(paragraph).length),
  ]);
  if (!claim.meta.changes) {
    const completed = await lookup();
    if (completed) return completed;
    throw new Error("translation-in-progress");
  }

  const result = await AI.run(model, { text: paragraph, source_lang: "he", target_lang: "fr" });
  const translation = result?.translated_text?.trim();
  if (!translation || !/[a-zà-ÿ]/i.test(translation)) throw new Error("invalid-model-output");

  await db.prepare("UPDATE translations SET translation = ? WHERE cache_key = ? AND lease_owner = ?")
    .bind(translation, key, owner).run();
  return translation;
}

export async function onRequestGet(context) {
  const date = new URL(context.request.url).searchParams.get("date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return fail(400, "invalid-date");
  const parsed = new Date(date + "T00:00:00Z");
  if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) {
    return fail(400, "invalid-date");
  }

  const existing = await savedFrench(date);
  if (existing) return Response.json(existing, { headers: { "Cache-Control": "public, max-age=300" } });
  if (!context.env.AI || !context.env.TRANSLATION_CACHE) return fail(503, "translation-unavailable");

  try {
    const source = await readHayomYom(context);
    if (!source.ok) return fail(502, "daily-source-unavailable");
    const { readings } = await source.json();
    if (!readings.length || readings.some(reading => !reading.studyParagraphs.length)) {
      return fail(404, "translation-not-found");
    }

    const sources = await Promise.all(readings.map(async reading => {
      const hebrew = await hebrewTranslationForLabel(reading.label, 5000).catch(() => null);
      if (hebrew?.ok) {
        const { translation, source: name, url, license } = await hebrew.json();
        return { paragraphs: translation.split(/\n+/).map(line => line.trim()).filter(Boolean),
          attribution: { name, url, license } };
      }
      // The source feed sometimes labels the original Yiddish as Hebrew.
      if (appearsYiddish(reading.studyParagraphs)) return null;
      return { paragraphs: reading.studyParagraphs };
    }));
    if (sources.some(source => !source)) return fail(404, "hebrew-version-unavailable");

    const sourceParagraphs = sources.flatMap(source => source.paragraphs);
    const results = await Promise.allSettled([...new Set(sourceParagraphs)]
      .map(async paragraph => [paragraph, await translateParagraph(context.env, paragraph)]));
    const failed = results.find(result => result.status === "rejected");
    if (failed) throw failed.reason;
    const translations = new Map(results.map(result => result.value));
    const paragraphs = sourceParagraphs.map(paragraph => translations.get(paragraph));
    return Response.json({
      date, language: "fr", translation: paragraphs.join("\n\n"), paragraphs, machine: true,
      attributions: sources.flatMap(source => source.attribution ? [source.attribution] : []),
    }, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch (error) {
    if (String(error).includes("daily_translation_character_limit")) return fail(429, "translation-daily-limit");
    if (error?.message === "translation-in-progress") return fail(409, "translation-in-progress");
    return fail(502, "translation-unavailable");
  }
}
