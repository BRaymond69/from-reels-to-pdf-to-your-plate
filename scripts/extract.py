#!/usr/bin/env python3
"""
Standalone extraction helper — useful for debugging outside of Next.js,
or as a drop-in replacement for lib/scraper.ts if you'd rather run
extraction as a Python microservice (e.g. alongside a WeasyPrint PDF service).

Usage:
    python scripts/extract.py "https://www.instagram.com/reel/XXXXXXXX/"

Requires: pip install yt-dlp
"""
import json
import sys

import yt_dlp


def extract(url: str) -> dict:
    ydl_opts = {
        "quiet": True,
        "skip_download": True,
        "noplaylist": True,
        "http_headers": {"User-Agent": "Mozilla/5.0"},
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)

    thumbnails = info.get("thumbnails") or []
    best_thumb = max(thumbnails, key=lambda t: t.get("width", 0), default={})

    return {
        "source_url": url,
        "author_handle": info.get("uploader") or info.get("channel") or "unknown",
        "caption_text": info.get("description") or info.get("title") or "",
        "thumbnail_url": best_thumb.get("url") or info.get("thumbnail"),
    }


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python extract.py <reel_or_tiktok_url>", file=sys.stderr)
        sys.exit(1)

    result = extract(sys.argv[1])
    print(json.dumps(result, indent=2))
