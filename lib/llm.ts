import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { RawExtraction, Recipe, OutputLanguage } from "./types";
import {
  CUISINE_TAXONOMY,
  CUISINE_REGIONS,
  DIET_TYPES,
  isValidRegion,
  isValidCuisine,
  isValidDiet,
} from "./taxonomy";

const LANGUAGE_NAMES: Record<OutputLanguage, string> = {
  en: "English",
  fr: "French",
  ko: "Korean",
};

function taxonomyBlock(): string {
  const lines = CUISINE_REGIONS.map(
    (region) => `  - ${region}: ${CUISINE_TAXONOMY[region].join(", ")}`,
  );
  return lines.join("\n");
}

function buildSystemInstruction(language: OutputLanguage): string {
  const languageName = LANGUAGE_NAMES[language];
  return `You are a professional culinary AI assistant. Parse the provided raw social media caption/transcript into a structured JSON recipe object. Infer missing units or reasonable estimated values if not explicitly detailed. If a value truly cannot be inferred, use "N/A" (or its natural equivalent in the target language). Respond with ONLY raw JSON — no markdown fences, no commentary, no preamble.
  Write every text value — recipe_title, category, prep_time, cook_time, total_time, servings, calories, ingredients, steps, and notes — in ${languageName}, regardless of what language the source caption/transcript is written in. Translate naturally like a native-speaking cookbook editor would, not word-for-word. Keep numeric quantities and units as commonly used by ${languageName}-speaking cooks (e.g. convert to metric for French if the source uses US cups/oz, unless the recipe is clearly meant to stay in US units). Recipe titles should read like real cookbook headings in ${languageName} (for Korean, use natural Korean phrasing rather than a transliteration).

  Additionally classify the dish for filing into a cookbook library. Pick the SINGLE closest match at each level from this fixed taxonomy — do not invent new categories. cuisine_region and cuisine_country stay in English regardless of the output language chosen above, since they're used as folder/filter keys, not display text.

  Regions and their allowed cuisine_country values:
  ${taxonomyBlock()}

  If nothing fits well, use region "Other" and cuisine_country "Other". diet_type must be exactly one of: ${DIET_TYPES.join(", ")} — classify by the dish's actual ingredients (a dish with any meat/fish/poultry/gelatin is "Meat"; dairy/egg but no meat is "Veggie"; fully plant-based is "Vegan").

  Return an object matching exactly this shape:
  {
    "recipe_title": "string, e.g. EASY FLUFFY AMERICAN PANCAKES",
    "category": "string, e.g. BREAKFAST, DINNER, DESSERT",
    "prep_time": "string, e.g. 5 minutes",
    "cook_time": "string, e.g. 15 minutes",
    "total_time": "string, e.g. 20 minutes",
    "servings": "string, e.g. 8-10 pancakes or 4 servings",
    "calories": "string, e.g. 390 Kcal or N/A",
    "cuisine_region": "string, one of the region names in the taxonomy list above",
    "cuisine_country": "string, one of that region's allowed values",
    "diet_type": "string, one of Meat, Veggie, Vegan",
    "ingredients": [ { "amount_and_name": "string, e.g. 1 cup (120g) all-purpose flour" } ],
    "steps": [ "string, one detailed instruction per array entry" ],
    "notes": "string — foolproof tips, serving suggestions, or topping options"
  }`;
}

function buildUserPrompt(raw: RawExtraction): string {
  const parts = [
    `Caption/description:\n${raw.captionText || "(none provided)"}`,
  ];
  if (raw.transcript) {
    parts.push(
      `Spoken transcript (use to fill gaps the caption misses):\n${raw.transcript}`,
    );
  }
  return parts.join("\n\n");
}

function stripJsonFences(text: string): string {
  return text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

function toRecipe(
  parsed: any,
  raw: RawExtraction,
  language: OutputLanguage,
): Recipe {
  const region = isValidRegion(parsed.cuisine_region)
    ? parsed.cuisine_region
    : "Other";
  const country =
    typeof parsed.cuisine_country === "string" &&
    isValidCuisine(region, parsed.cuisine_country)
      ? parsed.cuisine_country
      : "Other";
  const diet = isValidDiet(parsed.diet_type) ? parsed.diet_type : "Veggie";

  return {
    recipe_title: parsed.recipe_title ?? "Untitled Recipe",
    category: parsed.category ?? "N/A",
    prep_time: parsed.prep_time ?? "N/A",
    cook_time: parsed.cook_time ?? "N/A",
    total_time: parsed.total_time ?? "N/A",
    servings: parsed.servings ?? "N/A",
    calories: parsed.calories ?? "N/A",
    source_author: `${raw.platform === "instagram" ? "Instagram" : "TikTok"} @${raw.authorHandle}`,
    source_url: raw.sourceUrl,
    thumbnail_base64: raw.thumbnailBase64,
    language,
    cuisine_region: region,
    cuisine_country: country,
    diet_type: diet,
    ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
    steps: Array.isArray(parsed.steps) ? parsed.steps : [],
    notes: parsed.notes ?? "",
  };
}

async function parseWithGroq(
  raw: RawExtraction,
  language: OutputLanguage,
): Promise<Recipe> {
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const completion = await client.chat.completions.create({
    model: "openai/gpt-oss-120b",
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSystemInstruction(language) },
      { role: "user", content: buildUserPrompt(raw) },
    ],
  });

  const text = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(stripJsonFences(text));
  return toRecipe(parsed, raw, language);
}

async function parseWithGemini(
  raw: RawExtraction,
  language: OutputLanguage,
): Promise<Recipe> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: buildSystemInstruction(language),
    generationConfig: { responseMimeType: "application/json" },
  });

  const result = await model.generateContent(buildUserPrompt(raw));
  const text = result.response.text();
  const parsed = JSON.parse(stripJsonFences(text));
  return toRecipe(parsed, raw, language);
}

/**
 * Parses raw caption/transcript text into a structured Recipe, generated
 * directly in the requested output language (not translated after the fact).
 * Provider is chosen via LLM_PROVIDER env var ("groq" | "gemini"),
 * defaulting to Groq since it has the more generous free tier.
 */
export async function parseRecipe(
  raw: RawExtraction,
  language: OutputLanguage = "en",
): Promise<Recipe> {
  const provider = (process.env.LLM_PROVIDER || "groq").toLowerCase();

  if (provider === "gemini") {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set in the environment.");
    }
    return parseWithGemini(raw, language);
  }

  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set in the environment.");
  }
  return parseWithGroq(raw, language);
}
