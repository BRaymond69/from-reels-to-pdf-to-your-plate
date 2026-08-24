import { NextRequest, NextResponse } from "next/server";
import { extractFromUrl, isValidSocialUrl } from "@/lib/scraper";
import { parseRecipe } from "@/lib/llm";
import type { ExtractApiResponse, OutputLanguage } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const SUPPORTED_LANGUAGES: OutputLanguage[] = ["en", "fr", "ko"];

export async function POST(req: NextRequest): Promise<NextResponse<ExtractApiResponse>> {
  let url: string | undefined;
  let language: OutputLanguage = "en";
  try {
    const body = await req.json();
    url = body?.url;
    if (body?.language && SUPPORTED_LANGUAGES.includes(body.language)) {
      language = body.language;
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request body." }, { status: 400 });
  }

  if (!url || typeof url !== "string") {
    return NextResponse.json({ ok: false, error: "Missing `url` field." }, { status: 400 });
  }

  if (!isValidSocialUrl(url)) {
    return NextResponse.json(
      { ok: false, error: "Please paste a valid Instagram Reel or TikTok video URL." },
      { status: 400 }
    );
  }

  try {
    const raw = await extractFromUrl(url);
    const recipe = await parseRecipe(raw, language);
    return NextResponse.json({ ok: true, recipe });
  } catch (err: any) {
    console.error("[extract] failed:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Extraction failed. The post may be private or unavailable." },
      { status: 502 }
    );
  }
}
