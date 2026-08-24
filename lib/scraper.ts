import ytdlp from "yt-dlp-exec";
import type { RawExtraction } from "./types";

/**
 * Detects whether a URL is an Instagram Reel or a TikTok video.
 */
export function detectPlatform(url: string): "instagram" | "tiktok" | null {
  const u = url.toLowerCase();
  if (u.includes("instagram.com")) return "instagram";
  if (u.includes("tiktok.com") || u.includes("vm.tiktok.com")) return "tiktok";
  return null;
}

export function isValidSocialUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return detectPlatform(parsed.toString()) !== null;
  } catch {
    return false;
  }
}

/**
 * Fetches an image URL and returns it as a base64 data URI.
 * Falls back gracefully to null if the fetch fails (e.g. hotlink protection).
 */
async function toBase64DataUri(imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Runs yt-dlp (via yt-dlp-exec) against a Reel/TikTok URL and pulls out
 * the caption/description, author handle, and best-quality thumbnail.
 * Auto-generated subtitles (if present) are used as a transcript fallback
 * when the caption text looks too short to contain a full recipe.
 *
 * Requires the `yt-dlp` binary to be installed on the host/container
 * (yt-dlp-exec will download it on first run if missing).
 */
export async function extractFromUrl(url: string): Promise<RawExtraction> {
  const platform = detectPlatform(url);
  if (!platform) {
    throw new Error("URL must be an Instagram Reel or TikTok video link.");
  }

  const info: any = await ytdlp(url, {
    dumpSingleJson: true,
    noWarnings: true,
    noCheckCertificates: true,
    preferFreeFormats: true,
    skipDownload: true,
    writeAutoSub: false,
    addHeader: ["referer:youtube.com", "user-agent:googlebot"],
  });

  const captionText: string =
    info.description || info.title || info.fulltitle || "";

  const authorHandle: string =
    info.uploader ?? info.channel ?? info.uploader_id ?? "unknown";

  // yt-dlp returns a `thumbnails` array sorted worst -> best in most extractors.
  const thumbnails: Array<{ url: string; width?: number }> = info.thumbnails ?? [];
  const bestThumbnail =
    thumbnails.length > 0
      ? thumbnails.reduce((best, t) => ((t.width ?? 0) > (best.width ?? 0) ? t : best))
      : { url: info.thumbnail ?? "" };

  const thumbnailUrl = bestThumbnail.url ?? info.thumbnail ?? "";
  const thumbnailBase64 = thumbnailUrl ? await toBase64DataUri(thumbnailUrl) : null;

  // Optional transcript fallback: if the platform embedded a subtitle/caption
  // track (common for TikTok auto-captions), yt-dlp exposes it under
  // `subtitles` / `automatic_captions`. We only bother fetching it if the
  // caption text is thin, since downloading+parsing VTT is extra latency.
  let transcript: string | null = null;
  if (captionText.trim().length < 60) {
    transcript = await tryFetchAutoCaptionTrack(info);
  }

  return {
    sourceUrl: url,
    platform,
    authorHandle,
    captionText,
    transcript,
    thumbnailUrl,
    thumbnailBase64,
  };
}

async function tryFetchAutoCaptionTrack(info: any): Promise<string | null> {
  const tracks =
    info.automatic_captions?.en ?? info.subtitles?.en ?? undefined;
  if (!tracks || tracks.length === 0) return null;

  const vttTrack = tracks.find((t: any) => t.ext === "vtt") ?? tracks[0];
  try {
    const res = await fetch(vttTrack.url);
    if (!res.ok) return null;
    const vtt = await res.text();
    return vttToPlainText(vtt);
  } catch {
    return null;
  }
}

/** Strips VTT timing/cue markup down to plain spoken text. */
function vttToPlainText(vtt: string): string {
  return vtt
    .split("\n")
    .filter(
      (line) =>
        line.trim() &&
        !line.startsWith("WEBVTT") &&
        !/^\d{2}:\d{2}:\d{2}/.test(line) &&
        !/-->/.test(line) &&
        !/^\d+$/.test(line.trim())
    )
    .join(" ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
