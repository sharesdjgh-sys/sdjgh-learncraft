import { existsSync } from "node:fs";
import { NextResponse } from "next/server";
import puppeteer, { type Browser } from "puppeteer-core";
import { z } from "zod";
import { requireLearner } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 120;

const requestSchema = z.object({
  html: z.string().min(1).max(12_000_000),
  styles: z.string().min(1).max(3_000_000),
  title: z.string().trim().min(1).max(160),
});

function htmlText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeHtmlFragment(value: string) {
  return value
    .replace(/<(script|style|iframe|object|embed|link|meta|base|form)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|style|iframe|object|embed|link|meta|base|form)\b[^>]*\/?>/gi, "")
    .replace(/\s(?:on\w+|srcdoc)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(?:href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\1/gi, "");
}

function localBrowserExecutable() {
  const candidates = [
    process.env.PDF_BROWSER_EXECUTABLE_PATH,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ];
  return candidates.find((candidate): candidate is string => Boolean(candidate && existsSync(candidate)));
}

async function browserLaunchOptions() {
  const localExecutable = localBrowserExecutable();
  if (localExecutable) {
    return {
      executablePath: localExecutable,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true as const,
    };
  }

  const { default: chromium } = await import("@sparticuz/chromium");
  chromium.setGraphicsMode = false;
  return {
    executablePath: await chromium.executablePath(),
    args: chromium.args,
    headless: true as const,
  };
}

export async function POST(request: Request) {
  const user = await requireLearner();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "PDF 문서 내용을 확인해 주세요." } }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const title = htmlText(parsed.data.title);
  const fragment = safeHtmlFragment(parsed.data.html);
  const stylesheet = parsed.data.styles.replace(/<\/style/gi, "<\\/style");
  const documentHtml = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8">
    <base href="${htmlText(origin)}/">
    <title>${title}</title>
    <style>${stylesheet}</style>
    <style>
      @page { size: A4 portrait; margin: 9mm 14mm 14mm; }
      html, body { margin: 0; padding: 0; background: #fff; }
      body { color: #262a3d; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .learncraft-pdf-native { width: auto !important; max-width: none !important; padding: 0 !important; }
      .learncraft-pdf-native .learncraft-pdf-document-header,
      .learncraft-pdf-native .learncraft-pdf-question,
      .learncraft-pdf-native figure,
      .learncraft-pdf-native pre,
      .learncraft-pdf-native blockquote,
      .learncraft-pdf-native details,
      .learncraft-pdf-native tr,
      .learncraft-pdf-native .katex-display { break-inside: avoid-page; page-break-inside: avoid; }
      .learncraft-pdf-native :is(h1, h2, h3, h4) { break-after: avoid-page; page-break-after: avoid; }
      .learncraft-pdf-native thead { display: table-header-group; }
      .learncraft-pdf-native tfoot { display: table-footer-group; }
      .learncraft-pdf-native table { break-inside: auto; page-break-inside: auto; }
    </style>
  </head>
  <body>${fragment}</body>
</html>`;

  let browser: Browser | null = null;
  try {
    browser = await puppeteer.launch(await browserLaunchOptions());
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on("request", (resourceRequest) => {
      const url = resourceRequest.url();
      if (url.startsWith("data:") || url.startsWith("about:")) {
        void resourceRequest.continue();
        return;
      }
      try {
        if (new URL(url).origin === origin) {
          void resourceRequest.continue();
          return;
        }
      } catch {
        // Invalid and cross-origin URLs are intentionally blocked.
      }
      void resourceRequest.abort();
    });
    await page.setContent(documentHtml, { waitUntil: "load", timeout: 45_000 });
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 45_000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images, (image) => image.complete ? undefined : image.decode().catch(() => undefined)));
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: '<div style="box-sizing:border-box;width:100%;padding:0 8mm;color:#777a8c;font-family:Arial,sans-serif;font-size:8px;text-align:center"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
      tagged: true,
      outline: true,
    });

    return new Response(Buffer.from(pdf), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": 'attachment; filename="LearnCraft.pdf"',
        "Content-Type": "application/pdf",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[LearnCraft 텍스트 PDF 생성 실패]", error);
    return NextResponse.json({ error: { code: "PDF_RENDER_FAILED", message: "PDF 파일을 만들지 못했어요. 잠시 후 다시 시도해 주세요." } }, { status: 500 });
  } finally {
    await browser?.close();
  }
}
