import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { html } = body as { html: string };

    if (!html) {
      return NextResponse.json(
        { error: "Missing HTML content" },
        { status: 400 },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let puppeteer: any;
    try {
      // @ts-expect-error puppeteer is an optional dependency
      puppeteer = await import("puppeteer");
    } catch {
      return NextResponse.json(
        {
          error:
            "Puppeteer is not installed. Run: npm install puppeteer to enable PDF export.",
        },
        { status: 501 },
      );
    }

    const browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Literata:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap');

          body {
            font-family: 'Literata', Georgia, 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.8;
            color: #2C2C2C;
            max-width: 100%;
            margin: 0;
            padding: 0;
          }
          h1 { font-size: 24pt; font-weight: 800; text-align: center; margin-top: 3rem; margin-bottom: 1.5rem; page-break-after: avoid; }
          h2 { font-size: 18pt; font-weight: 700; margin-top: 2rem; margin-bottom: 1rem; page-break-after: avoid; }
          h3 { font-size: 14pt; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.8rem; page-break-after: avoid; }
          p { margin-bottom: 1rem; text-indent: 1.5em; orphans: 3; widows: 3; }
          p:first-child { text-indent: 0; }
          blockquote {
            border-left: 2pt solid #B8860B;
            padding-left: 1rem;
            font-style: italic;
            color: #555;
            margin: 1rem 0;
          }
          img { max-width: 100%; display: block; margin: 1.5rem auto; page-break-inside: avoid; }
          hr { border: none; text-align: center; margin: 2rem 0; }
          hr::after { content: '· · ·'; color: #999; letter-spacing: 0.5em; }
          .chapter { page-break-before: always; }
          .chapter:first-child { page-break-before: auto; }
          code { font-family: monospace; font-size: 0.9em; background: #f5f5f5; padding: 1px 4px; border-radius: 2px; }
          pre { background: #f5f5f5; padding: 0.8rem; border-radius: 4px; overflow-x: auto; }
          a { color: #B8860B; text-decoration: none; }
          figure { margin: 1.5rem auto; text-align: center; }
          figcaption { font-size: 10pt; color: #666; font-style: italic; margin-top: 0.5rem; }
        </style>
      </head>
      <body>
        ${html}
      </body>
      </html>
    `;

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

    await browser.close();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="manuscript.pdf"',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
