import { NextRequest, NextResponse } from "next/server";
import { buildPrintableDocument } from "@/lib/exportHtml";

// Minimal structural types for the optional `puppeteer` dependency. Puppeteer
// ships its own types, but it may be absent from the deploy image, so we type
// only the surface we touch instead of depending on `@types/puppeteer`.
interface PuppeteerPage {
  setContent(html: string, opts: { waitUntil: string }): Promise<void>;
  pdf(opts: Record<string, unknown>): Promise<Uint8Array>;
}
interface PuppeteerBrowser {
  newPage(): Promise<PuppeteerPage>;
  close(): Promise<void>;
}
interface PuppeteerModule {
  launch(opts: Record<string, unknown>): Promise<PuppeteerBrowser>;
}

// Detect whether the server-side PDF engine (Puppeteer) is available in this
// deployment. Puppeteer is an optional dependency: self-hosters on a minimal
// image may not have it. We probe once and cache the result.
let cachedPuppeteer: unknown = null;
let probed = false;

async function loadPuppeteer(): Promise<unknown | null> {
  if (probed) return cachedPuppeteer;
  probed = true;
  try {
    // @ts-expect-error puppeteer is an optional dependency
    const mod = await import("puppeteer");
    cachedPuppeteer = mod.default ?? mod;
  } catch {
    cachedPuppeteer = null;
  }
  return cachedPuppeteer;
}

// GET is a capability probe. The UI calls it to decide whether to advertise
// "server PDF" or "browser print", so the user is told the truth up front.
export async function GET() {
  const puppeteer = await loadPuppeteer();
  return NextResponse.json({
    puppeteer: puppeteer !== null,
    engine: puppeteer !== null ? "puppeteer" : "browser",
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { html, title } = body as { html: string; title?: string };

    if (!html) {
      return NextResponse.json(
        { error: "Missing HTML content" },
        { status: 400 },
      );
    }

    const puppeteer = await loadPuppeteer();

    // Graceful degradation: when Puppeteer is absent we do NOT 501. We tell the
    // client to render the same document via the browser's own print-to-PDF.
    // A missing server dependency never blocks a user from getting a PDF.
    if (!puppeteer) {
      return NextResponse.json(
        {
          fallback: "browser-print",
          message:
            "Server-side PDF rendering is unavailable on this deployment. " +
            'Use your browser\'s print dialog and choose "Save as PDF".',
        },
        { status: 200 },
      );
    }

    const fullHtml = buildPrintableDocument(html, { title });

    const browser = await (puppeteer as PuppeteerModule).launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(fullHtml, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({
        format: "A5",
        margin: {
          top: "2cm",
          bottom: "2.5cm",
          left: "2cm",
          right: "2cm",
        },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: "<div></div>",
        footerTemplate: `
          <div style="font-size: 9pt; font-family: Georgia, serif; color: #999; text-align: center; width: 100%;">
            <span class="pageNumber"></span>
          </div>
        `,
      });

      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="manuscript.pdf"',
        },
      });
    } finally {
      await browser.close();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
