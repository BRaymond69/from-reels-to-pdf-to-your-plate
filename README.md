# Reel → Recipe Card

Paste an Instagram Reel or TikTok cooking video URL, and get back a single-page,
printable PDF recipe card — caption/transcript parsed into structured
ingredients + steps by a free-tier LLM, with the video's thumbnail embedded.

## Stack

- **Next.js 14 (App Router)** + Tailwind + Framer Motion + lucide-react
- **`yt-dlp-exec`** for metadata/thumbnail/caption extraction (Node wrapper
  around the `yt-dlp` binary); `scripts/extract.py` is an equivalent
  standalone Python version if you'd rather run extraction as a separate
  microservice
- **Groq (`llama-3.3-70b-versatile`)** or **Gemini (`gemini-1.5-flash`)**
  for turning raw caption text into structured JSON — toggle with
  `LLM_PROVIDER` in `.env`
- **Puppeteer** (`puppeteer-core` + `@sparticuz/chromium` in production,
  full `puppeteer` in dev) rendering an HTML template with a strict
  `@page` box to a single-page PDF

## Getting started

```bash
npm install
cp .env.example .env.local
# fill in GROQ_API_KEY (https://console.groq.com/keys) or GEMINI_API_KEY
npm run dev
```

Open http://localhost:3000, paste a Reel/TikTok URL, pick a card language
(**English / Français / 한국어**), hit **Extract**, then **Download PDF card**.

`yt-dlp-exec` will download the `yt-dlp` binary itself on first run. If your
environment blocks that, install `yt-dlp` on the host/container separately
(`pip install yt-dlp` or `brew install yt-dlp`) — `yt-dlp-exec` will use the
system binary if present on PATH.

## Output language

`/api/extract` accepts a `language` field (`"en" | "fr" | "ko"`, defaults to
`"en"`) alongside `url`. It's threaded through to the LLM system prompt, so
the model *generates* the recipe (title, ingredients, steps, notes) directly
in that language rather than translating after the fact — quantities are
also normalized to how that language's cooks usually write them (e.g. metric
for French unless the source is clearly US-only). The fixed card labels
(Ingredients/Method/Prep/Cook/etc.) are localized separately via the
`LABELS` map in `lib/pdf-template.ts`, which the UI reuses for the on-screen
preview so it matches the PDF exactly.

Korean needs an actual Hangul-capable font — Georgia/Courier have no glyphs
for it — so `lib/pdf-template.ts` pulls Noto Serif/Sans KR from Google Fonts
at render time. That means the machine generating the PDF (Puppeteer) needs
network access when `language: "ko"` is selected. If you're deploying
somewhere offline/air-gapped, swap the `@import url(...)` in
`FONT_IMPORTS.ko` for a self-hosted `@font-face` pointing at a bundled
`.woff2`.

## My Cookbook (saved recipe library)

Every generated card can be saved into a taxonomy-organized library instead
of (or in addition to) a one-off download:

```
public/library/
  asian/
    korean/
      vegan/
        gochujang-tofu-bowl.ko.pdf
  western/
    french/
      meat/
        coq-au-vin.fr.pdf
```

- **`POST /api/library/save`** takes a `Recipe`, renders the PDF (reusing
  the same Puppeteer path as `/api/generate-pdf`, factored into
  `lib/generate-pdf.ts`), writes it under `public/library/<region>/<cuisine>/<diet>/`,
  and records an entry in `data/library-index.json` (title, tags, language,
  path, thumbnail, source). PDFs live under `/public` so Next.js serves them
  as plain static files — no custom download route needed.
- **`GET /api/library?region=&cuisine=&diet=&language=`** filters that
  index.
- **`/library`** is a server-rendered page with a plain `<select>` filter
  form (no client JS required) that reads the same index and shows a grid
  of saved cards linking straight to their PDFs.
- The LLM now also classifies each recipe into `cuisine_region` /
  `cuisine_country` / `diet_type` from a fixed taxonomy in `lib/taxonomy.ts`
  (Asian/Western/South American/Caribbean/Other regions, each with a closed
  list of countries, plus Meat/Veggie/Vegan) — see that file to add more
  cuisines. A closed taxonomy keeps folder paths and filter dropdowns
  consistent instead of the LLM inventing new category names each time.

**Why the index + folders combo, not folders alone:** a strict single-path
folder (as originally sketched — Region → Country → Diet → file) works
great for browsing, but plenty of real dishes don't sort cleanly into one
box (a dish with both a meat and a veggie version, a fusion recipe, etc).
Backing the folder tree with a small JSON index means the physical file
still lives in one primary location, but filtering/search isn't limited to
that one path — and it's a straightforward swap to a real database +
object storage (S3/R2) later without touching the folder convention.

**Important limitation — this only persists on a filesystem you control.**
`public/library/` and `data/library-index.json` are written to local disk.
That's fine for local dev or a self-hosted VPS/Docker deployment, but on
serverless hosts (Vercel, Lambda, etc.) the filesystem is ephemeral/read-only
at runtime — anything saved there will vanish between invocations and won't
be shared across instances. If you deploy there, swap `lib/library.ts` for
S3/R2 (files) + a real database (Postgres/SQLite via Turso, etc. for the
index) instead of local disk.

## How it works

1. **`POST /api/extract`** — validates the URL, runs `lib/scraper.ts`
   (`yt-dlp`) to pull the caption, uploader handle, and best-resolution
   thumbnail (converted to a base64 data URI so the PDF has no external
   image dependency). If the caption looks too short to be a full recipe,
   it also tries to pull an auto-generated caption track as a transcript
   fallback. The raw text and chosen `language` are then sent to
   `lib/llm.ts`, which prompts Groq or Gemini with the schema from the
   spec and returns strict JSON already written in that language.
2. **`POST /api/generate-pdf`** — takes the structured `Recipe` object,
   renders it through `lib/pdf-template.ts` (a self-contained HTML/CSS
   string using `@page { size: Letter; margin: 0 }` and a `.card` div sized
   to exactly fill it), and prints that to PDF with Puppeteer.

## Known limitations / things to harden before shipping

- **Scraping is inherently fragile.** Instagram and TikTok both change
  markup and rate-limit aggressively; `yt-dlp` is the most maintained
  option but private posts, age-gated content, and some TikTok regions
  will fail extraction. Wrap `extractFromUrl` calls with retries/backoff
  in production.
- **Terms of service.** Scraping Instagram/TikTok content programmatically
  sits in a legal gray area and may violate those platforms' terms of
  service, independent of technical feasibility — check your use case
  (personal tool vs. hosted product for other users) against their current
  terms before deploying this publicly.
- **Transcripts** currently only fall back to auto-generated caption
  tracks when present. For videos with no on-screen captions and a thin
  description, you'd want to pipe the downloaded audio through a
  speech-to-text model (e.g. Groq's free Whisper endpoint) — the
  `transcript` field in `RawExtraction` is already wired for this, you'd
  just add an `audio -> whisper -> transcript` step in `scraper.ts`.
- **Puppeteer in serverless.** `@sparticuz/chromium` keeps cold starts
  and bundle size manageable on Vercel/Lambda, but you may still need to
  bump `maxDuration` / function memory depending on your host's limits.
- **No auth/rate limiting** is included — add both before exposing this
  publicly, since every extract+generate call spends LLM and headless
  browser time.

## Project structure

```
app/
  page.tsx                  UI: URL input + recipe card preview
  layout.tsx / globals.css
  library/page.tsx          "My Cookbook" filterable grid
  api/extract/route.ts      caption/thumbnail scrape -> LLM parse
  api/generate-pdf/route.ts render -> Puppeteer -> PDF (direct download)
  api/library/save/route.ts render -> Puppeteer -> PDF -> saved into library
  api/library/route.ts      GET filtered library index
lib/
  scraper.ts                yt-dlp wrapper
  llm.ts                    Groq / Gemini prompt + JSON parsing + classification
  pdf-template.ts           printable HTML/CSS card
  generate-pdf.ts           shared Puppeteer render helper
  library.ts                library folder writes + JSON index
  taxonomy.ts                region/cuisine/diet taxonomy (single source of truth)
  types.ts
data/library-index.json     saved-recipe metadata index (gitignored content)
public/library/              saved PDFs, organized by region/cuisine/diet
scripts/extract.py          optional standalone Python extractor
```
# from-reels-to-pdf-to-your-plate
