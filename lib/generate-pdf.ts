import { renderCookbookCardHtml } from "./pdf-template";
import type { Recipe } from "./types";

/**
 * Launches Puppeteer with @sparticuz/chromium in serverless/production
 * environments (Vercel, Lambda, etc.) and falls back to a locally
 * installed full Puppeteer/Chrome during `next dev`.
 */
async function launchBrowser() {
  const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

  if (isServerless) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteer = await import("puppeteer-core");
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const puppeteer = await import("puppeteer");
  return puppeteer.launch({ headless: true });
}

/** Renders a Recipe to a single-page cookbook-card PDF and returns the raw bytes. */
export async function renderRecipePdfBuffer(recipe: Recipe): Promise<Buffer> {
  const html = renderCookbookCardHtml(recipe);
  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      width: "8.5in",
      height: "11in",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0in", bottom: "0in", left: "0in", right: "0in" },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser?.close();
  }
}
