import assert from "node:assert/strict";
import { build } from "esbuild";
import puppeteer from "puppeteer-core";
import { PDF_PAYLOAD_ENCODING_HEADER, PDF_PAYLOAD_LIMIT_BYTES } from "../src/lib/pdf-payload";
import { readPdfPayload } from "../src/lib/pdf-payload-server";

// 실제 브라우저에서 그림이 많은 답변의 PDF 요청을 만들어, Vercel 요청 한도 안으로 줄어드는지 확인합니다.
async function main() {
  const bundle = await build({ entryPoints: ["src/lib/pdf-payload-browser.ts"], bundle: true, write: false, format: "iife", globalName: "PdfPayload", platform: "browser" });
  const browser = await puppeteer.launch({
    executablePath: process.env.PDF_BROWSER_EXECUTABLE_PATH ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setContent("<!doctype html><html><body></body></html>");
    // tsx가 함수 이름을 지키려고 넣는 __name 도우미를 브라우저에도 둡니다.
    await page.addScriptTag({ content: "window.__name = (target) => target;" });
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    const result = await page.evaluate(async () => {
      // 압축이 거의 되지 않는 노이즈 그림 3장(최악의 경우)
      const noise = (width: number, height: number) => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d")!;
        const pixels = context.createImageData(width, height);
        for (let index = 0; index < pixels.data.length; index += 65_536) crypto.getRandomValues(pixels.data.subarray(index, index + 65_536));
        for (let index = 3; index < pixels.data.length; index += 4) pixels.data[index] = 255;
        context.putImageData(pixels, 0, 0);
        return canvas.toDataURL("image/webp", 0.95);
      };
      const root = document.createElement("section");
      root.innerHTML = "<h1>전기장과 전위차</h1><p>전기장이 셀수록 전위차가 커져요.</p>";
      for (let index = 0; index < 3; index += 1) {
        const image = document.createElement("img");
        image.src = noise(2400, 1800);
        image.alt = `그림 ${index + 1}`;
        root.append(image);
      }
      document.body.append(root);
      const originalBytes = JSON.stringify({ html: root.outerHTML, styles: "", title: "물리학" }).length;
      const { PdfPayload } = window as unknown as { PdfPayload: typeof import("../src/lib/pdf-payload-browser") };
      const request = await PdfPayload.preparePdfRequest(root, "body{color:#222}".repeat(2_000), "물리학");
      const body = request.body instanceof Blob ? request.body : new Blob([request.body]);
      const encoded = await new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.readAsDataURL(body);
      });
      return { originalBytes, headers: request.headers, encoded, widths: Array.from(root.querySelectorAll("img"), image => image.getAttribute("width")) };
    });

    const bytes = Buffer.from(result.encoded, "base64");
    assert.ok(result.originalBytes > 4.5 * 1024 * 1024, `시험 답변이 원래 한도를 넘어야 함 (${result.originalBytes})`);
    assert.ok(bytes.length <= PDF_PAYLOAD_LIMIT_BYTES, `압축한 요청이 한도 안 (${bytes.length})`);
    assert.equal(result.headers[PDF_PAYLOAD_ENCODING_HEADER], "gzip");
    assert.deepEqual(result.widths, ["2400", "2400", "2400"], "보이는 크기는 원래 폭 유지");

    // 서버 쪽 풀기: 브라우저가 보낸 그대로 읽어 요청 형식을 되살립니다.
    const decoded = await readPdfPayload(new Request("http://localhost/api/pdf", { method: "POST", headers: result.headers, body: bytes })) as { html: string; styles: string; title: string };
    assert.equal(decoded.title, "물리학");
    assert.ok(decoded.html.length <= 12_000_000, "서버 HTML 한도 안");
    assert.equal(decoded.html.match(/<img\b/g)?.length, 3);
    assert.equal(await readPdfPayload(new Request("http://localhost/api/pdf", { method: "POST", headers: result.headers, body: bytes.subarray(0, 1000) })), null, "잘린 본문은 거절");

    // 줄인 그림이 실제로 그려지는지 확인합니다.
    await page.setContent(`<!doctype html><html><body>${decoded.html}</body></html>`);
    const loaded = await page.evaluate(async () => Promise.all(Array.from(document.images, async image => { await image.decode(); return image.naturalWidth; })));
    assert.ok(loaded.every(width => width > 0 && width <= 1600), `줄인 그림 ${loaded.join(", ")}px`);
    console.log(`PDF 요청 브라우저 검증 완료: ${result.originalBytes.toLocaleString()} → ${bytes.length.toLocaleString()}바이트(한도 ${PDF_PAYLOAD_LIMIT_BYTES.toLocaleString()}), 그림 ${loaded.join("·")}px`);
  } finally {
    await browser.close();
  }
}

void main();
