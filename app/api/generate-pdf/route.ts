import { NextRequest, NextResponse } from "next/server";
import { renderRecipePdfBuffer } from "@/lib/generate-pdf";
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
    const filename = `${recipe.recipe_title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error("[generate-pdf] failed:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "PDF generation failed." },
      { status: 500 }
    );
  }
}
