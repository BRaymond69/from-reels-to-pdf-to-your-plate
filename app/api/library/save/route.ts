import { NextRequest, NextResponse } from "next/server";
import { renderRecipePdfBuffer } from "@/lib/generate-pdf";
import { saveToLibrary } from "@/lib/library";
import type { Recipe } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let recipe: Recipe;
  try {
    recipe = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request body." }, { status: 400 });
  }

  if (!recipe?.recipe_title) {
    return NextResponse.json({ ok: false, error: "Missing recipe payload." }, { status: 400 });
  }

  try {
    const pdfBuffer = await renderRecipePdfBuffer(recipe);
    const entry = await saveToLibrary(recipe, pdfBuffer);
    return NextResponse.json({ ok: true, entry });
  } catch (err: any) {
    console.error("[library/save] failed:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Could not save to the library." },
      { status: 500 }
    );
  }
}
