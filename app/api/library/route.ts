import { NextRequest, NextResponse } from "next/server";
import { listLibrary } from "@/lib/library";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const entries = await listLibrary({
    region: params.get("region") ?? undefined,
    cuisine: params.get("cuisine") ?? undefined,
    diet: params.get("diet") ?? undefined,
    language: params.get("language") ?? undefined,
  });
  return NextResponse.json({ ok: true, entries });
}
