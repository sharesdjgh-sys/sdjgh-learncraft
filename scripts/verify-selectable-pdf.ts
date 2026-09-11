import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { extractTextItems, getDocumentProxy } from "unpdf";

async function main() {
  const browserPath = process.env.PDF_BROWSER_EXECUTABLE_PATH
    ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const outputDirectory = path.join(process.cwd(), "tmp", "pdfs", "selectable-renderer");
  const outputPath = path.join(outputDirectory, "selectable-text-check.pdf");

  await mkdir(outputDirectory, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: browserPath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 12mm; }
    body { font-family: Arial, sans-serif; color: #262a3d; }
    h1 { font-size: 24px; } table { width: 100%; border-collapse: collapse; }
    td, th { border: 1px solid #bbb; padding: 8px; }
  </style></head><body>
    <h1>1. Selectable PDF verification</h1>
    <p>LearnCraft creates searchable study documents.</p>
    <table><thead><tr><th>Concept</th><th>Meaning</th></tr></thead>
    <tbody><tr><td>Second</td><td>Atomic vibration</td></tr></tbody></table>
  </body></html>`, { waitUntil: "load" });
    await page.pdf({ path: outputPath, format: "A4", printBackground: true, tagged: true, outline: true });
  } finally {
    await browser.close();
  }

  const document = await getDocumentProxy(new Uint8Array(await readFile(outputPath)));
  const { items } = await extractTextItems(document);
  const extracted = items.flat().map((item) => item.str).join(" ");
  assert.match(extracted, /Selectable PDF verification/);
  assert.match(extracted, /Atomic vibration/);
  console.log(`선택 가능한 텍스트 PDF 검증 완료: ${outputPath}`);
}

void main();
