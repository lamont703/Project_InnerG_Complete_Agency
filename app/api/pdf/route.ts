import { NextRequest, NextResponse } from "next/server";
import { isMarkdownEligible } from "@/lib/public-routes";
import { protectionBypassHeaders } from "@/lib/site";

/**
 * Server-rendered PDF download.
 *
 * The print buttons on the kit lists and insights articles call window.print(),
 * which hands the job to the visitor's own browser and OS print pipeline. That
 * works until it doesn't — a wedged print backend or an extension hooking print
 * leaves the dialog spinning on "Saving" forever, with nothing the site can do
 * about it. This renders the PDF here instead and streams a real file, so the
 * result is identical for every visitor regardless of their machine.
 *
 * GET /api/pdf?path=/texas-cosmetology-practical-exam-kit-list
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Rendering a page costs a browser launch, so this is not an open proxy: only
// paths that are already public get rendered. isMarkdownEligible is the same
// gate the .md layer uses — one definition of "public", so a page can never be
// private for one exporter and public for the other.
function resolvePath(raw: string | null): string | null {
  if (!raw) return null;
  let path = raw.trim();
  if (!path.startsWith("/")) return null;
  // Strip query/hash: they'd let one page be rendered under unlimited distinct
  // cache keys, and nothing here needs them.
  path = path.split(/[?#]/)[0];
  if (path.length > 200) return null;
  return isMarkdownEligible(path) ? path : null;
}

function originOf(request: NextRequest): string {
  const host = request.headers.get("host") || "agency.innergcomplete.com";
  return `${host.includes("localhost") ? "http" : "https"}://${host}`;
}

/** Same branch as app/api/events/extract — the Lambda-optimized binary only
 *  resolves on Vercel, so local dev uses the full puppeteer package. */
async function launchBrowser(): Promise<any> {
  if (process.env.VERCEL) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteerCore = await import("puppeteer-core");
    return puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  const puppeteer = await import("puppeteer");
  return puppeteer.launch({ headless: true });
}

/** "/texas-cosmetology-practical-exam-kit-list" → a sane download filename. */
function filenameFor(path: string): string {
  const base = path.replace(/^\/+|\/+$/g, "").replace(/\//g, "-") || "page";
  return `${base.slice(0, 80)}.pdf`;
}

export async function GET(request: NextRequest) {
  const path = resolvePath(request.nextUrl.searchParams.get("path"));
  if (!path) {
    return NextResponse.json({ error: "Invalid or non-public path" }, { status: 400 });
  }

  const url = `${originOf(request)}${path}`;
  let browser: any;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();

    // Marks the render in logs and lets a page suppress anything it shouldn't
    // export. Not a security boundary — resolvePath is.
    //
    // The bypass header rides along for the same reason as the .md renderer:
    // on a Deployment-Protection-guarded host this navigation lands on Vercel's
    // login screen, and we would export a PDF of it. No-op on production.
    await page.setExtraHTTPHeaders({ "X-PDF-Render": "1", ...protectionBypassHeaders(url) });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });

    // Print styles are what strip the navbar and restore the checklist items;
    // rendering in screen media would bake the whole app shell into the file.
    await page.emulateMediaType("print");
    // Fonts resolve after layout — printing early yields fallback glyphs.
    await page.evaluate(() => (document as any).fonts?.ready);

    const pdf = await page.pdf({
      format: "letter",
      printBackground: true,
      margin: { top: "0.6in", bottom: "0.6in", left: "0.5in", right: "0.5in" },
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `
        <div style="width:100%;font-size:8px;color:#666;padding:0 0.5in;display:flex;justify-content:space-between;">
          <span>agency.innergcomplete.com</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>`,
      timeout: 45000,
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filenameFor(path)}"`,
        // These pages change rarely; a CDN hit avoids a browser launch.
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err) {
    console.error(`PDF render failed for ${path}:`, err);
    return NextResponse.json({ error: "Could not generate the PDF" }, { status: 500 });
  } finally {
    // A leaked browser on a serverless instance is a memory leak that outlives
    // the request, so this closes even when the render threw.
    try {
      await browser?.close();
    } catch {
      /* already gone */
    }
  }
}
