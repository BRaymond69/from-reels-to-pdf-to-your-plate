import type { Recipe, OutputLanguage } from "./types";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export const LABELS: Record<OutputLanguage, {
  recipeFallback: string;
  prep: string;
  cook: string;
  total: string;
  serves: string;
  cal: string;
  ingredients: string;
  method: string;
}> = {
  en: {
    recipeFallback: "RECIPE",
    prep: "PREP",
    cook: "COOK",
    total: "TOTAL",
    serves: "SERVES",
    cal: "CAL",
    ingredients: "Ingredients",
    method: "Method",
  },
  fr: {
    recipeFallback: "RECETTE",
    prep: "PRÉPA",
    cook: "CUISSON",
    total: "TOTAL",
    serves: "PORTIONS",
    cal: "CAL",
    ingredients: "Ingrédients",
    method: "Préparation",
  },
  ko: {
    recipeFallback: "레시피",
    prep: "준비",
    cook: "조리",
    total: "총",
    serves: "인분",
    cal: "칼로리",
    ingredients: "재료",
    method: "만드는 법",
  },
};

/**
 * Font stacks per language. Korean needs an actual CJK-capable face —
 * Georgia/Courier have no Hangul glyphs — so we pull Noto Sans/Serif KR
 * from Google Fonts. This requires the PDF-rendering environment to have
 * network access at render time (true for Puppeteer in dev and on most
 * serverless hosts); see README for the offline/self-hosted-font fallback.
 */
const FONT_IMPORTS: Record<OutputLanguage, string> = {
  en: "",
  fr: "",
  ko: `@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;700&family=Noto+Sans+KR:wght@400;500;700&display=swap');`,
};

const DISPLAY_FONT: Record<OutputLanguage, string> = {
  en: "Georgia, 'Times New Roman', serif",
  fr: "Georgia, 'Times New Roman', serif",
  ko: "'Noto Serif KR', Georgia, serif",
};

const MONO_FONT: Record<OutputLanguage, string> = {
  en: "'Courier New', monospace",
  fr: "'Courier New', monospace",
  ko: "'Noto Sans KR', 'Courier New', monospace",
};

const BODY_FONT: Record<OutputLanguage, string> = {
  en: "Georgia, 'Times New Roman', serif",
  fr: "Georgia, 'Times New Roman', serif",
  ko: "'Noto Serif KR', Georgia, serif",
};

/**
 * Renders a single-page, print-ready cookbook card as standalone HTML.
 * Designed for a US Letter / A4 @page box via Puppeteer's PDF printing —
 * everything is sized in CSS so `page-break` never splits a section.
 */
export function renderCookbookCardHtml(recipe: Recipe): string {
  const language: OutputLanguage = recipe.language ?? "en";
  const labels = LABELS[language];

  const ingredientsHtml = recipe.ingredients
    .map((i) => `<li>${esc(i.amount_and_name)}</li>`)
    .join("\n");

  const stepsHtml = recipe.steps
    .map((s, idx) => `<li><span class="step-num">${idx + 1}</span><p>${esc(s)}</p></li>`)
    .join("\n");

  const thumbBlock = recipe.thumbnail_base64
    ? `<img class="thumb" src="${recipe.thumbnail_base64}" alt="${esc(recipe.recipe_title)}" />`
    : "";

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="UTF-8" />
<title>${esc(recipe.recipe_title)}</title>
<style>
  ${FONT_IMPORTS[language]}
  @page {
    size: Letter;
    margin: 0;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: ${BODY_FONT[language]};
    color: #1C1A17;
    background: #F6F1E4;
  }
  .card {
    width: 8.5in;
    height: 11in;
    padding: 0.55in;
    display: flex;
    flex-direction: column;
    position: relative;
  }
  .card::before {
    content: "";
    position: absolute;
    inset: 0.28in;
    border: 1.5px solid #D9A02A;
    pointer-events: none;
  }
  .eyebrow {
    font-family: ${MONO_FONT[language]};
    font-size: 10pt;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #B8452E;
    margin-bottom: 6px;
  }
  h1 {
    font-size: 30pt;
    line-height: 1.05;
    letter-spacing: -0.01em;
    margin-bottom: 10px;
    max-width: 5.2in;
  }
  .meta-row {
    display: flex;
    gap: 18px;
    flex-wrap: wrap;
    font-family: ${MONO_FONT[language]};
    font-size: 9pt;
    color: #4b4638;
    border-top: 1px dashed #8A8272;
    border-bottom: 1px dashed #8A8272;
    padding: 8px 0;
    margin-bottom: 14px;
  }
  .meta-row span b { color: #42633F; }
  .layout {
    display: flex;
    gap: 0.4in;
    flex: 1;
    min-height: 0;
  }
  .thumb-col { width: 2.3in; flex-shrink: 0; }
  .thumb {
    width: 100%;
    height: 2.3in;
    object-fit: cover;
    border: 1px solid #1C1A17;
  }
  .source {
    margin-top: 8px;
    font-family: ${MONO_FONT[language]};
    font-size: 8pt;
    color: #8A8272;
    word-break: break-word;
  }
  h2 {
    font-family: ${MONO_FONT[language]};
    font-size: 11pt;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #42633F;
    border-bottom: 1.5px solid #42633F;
    padding-bottom: 4px;
    margin-bottom: 8px;
    margin-top: 14px;
  }
  h2:first-child { margin-top: 0; }
  ul.ingredients {
    list-style: none;
    columns: 1;
    font-size: 10.5pt;
    line-height: 1.55;
  }
  ul.ingredients li {
    padding-left: 16px;
    position: relative;
  }
  ul.ingredients li::before {
    content: "–";
    position: absolute;
    left: 0;
    color: #D9A02A;
  }
  .steps-col { flex: 1; min-width: 0; }
  ol.steps { list-style: none; font-size: 10.5pt; line-height: 1.4; }
  ol.steps li {
    display: flex;
    gap: 10px;
    margin-bottom: 9px;
  }
  .step-num {
    font-family: ${MONO_FONT[language]};
    font-weight: bold;
    color: #B8452E;
    flex-shrink: 0;
    width: 18px;
  }
  .notes {
    margin-top: auto;
    padding-top: 10px;
    border-top: 1px dashed #8A8272;
    font-size: 9.5pt;
    font-style: italic;
    color: #4b4638;
  }
</style>
</head>
<body>
  <div class="card">
    <div class="eyebrow">${esc(recipe.category || labels.recipeFallback)}</div>
    <h1>${esc(recipe.recipe_title)}</h1>
    <div class="meta-row">
      <span><b>${labels.prep}</b> ${esc(recipe.prep_time)}</span>
      <span><b>${labels.cook}</b> ${esc(recipe.cook_time)}</span>
      <span><b>${labels.total}</b> ${esc(recipe.total_time)}</span>
      <span><b>${labels.serves}</b> ${esc(recipe.servings)}</span>
      <span><b>${labels.cal}</b> ${esc(recipe.calories)}</span>
    </div>
    <div class="layout">
      <div class="thumb-col">
        ${thumbBlock}
        <div class="source">${esc(recipe.source_author)}<br/>${esc(recipe.source_url)}</div>
        <h2>${labels.ingredients}</h2>
        <ul class="ingredients">${ingredientsHtml}</ul>
      </div>
      <div class="steps-col">
        <h2>${labels.method}</h2>
        <ol class="steps">${stepsHtml}</ol>
        ${recipe.notes ? `<div class="notes">${esc(recipe.notes)}</div>` : ""}
      </div>
    </div>
  </div>
</body>
</html>`;
}
