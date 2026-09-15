import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import katex from "katex";
import sharp from "sharp";
import { mathMlToSvg } from "../src/lib/math-figure-export";

async function main() {
  const expressions = [String.raw`\sqrt{3}`, String.raw`2\sqrt{12345}`, String.raw`\sqrt{1+\sqrt{3}}`, String.raw`\frac{\sqrt{3}}{2}`, String.raw`60^{\circ}`, String.raw`\alpha`, String.raw`\log_2 8`];
  const previews: { input: Buffer; top: number; left: number }[] = [];
  for (const [index, expression] of expressions.entries()) {
    const markup = katex.renderToString(expression, { output: "mathml", throwOnError: true });
    const mathml = markup.match(/<math[\s\S]*<\/math>/)?.[0];
    assert.ok(mathml);
    const svg = mathMlToSvg(mathml);
    assert.ok(svg.includes("<path"), `${expression}: must contain vector glyphs`);
    assert.doesNotMatch(svg, /foreignObject|<image|<use|href=|merror/);
    if (expression.includes("sqrt")) {
      assert.match(svg, /data-c="221A"/, "radical glyph must be preserved");
      assert.match(svg, /<rect\b/, "radical overbar must be preserved");
    }
    if (expression.includes("circ")) assert.match(svg, /data-c="2218"/, "degree superscript must be preserved");
    const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1].split(/\s+/).map(Number);
    assert.ok(viewBox && viewBox.length === 4 && viewBox.every(Number.isFinite));
    const width = Math.ceil(viewBox[2] * 48 / 1000);
    const height = Math.ceil(viewBox[3] * 48 / 1000);
    const sized = svg.replace(/ width="[^"]+"/, ` width="${width}"`).replace(/ height="[^"]+"/, ` height="${height}"`);
    const png = await sharp(Buffer.from(sized)).extend({ top: 18, bottom: 18, left: 18, right: 18, background: "white" }).flatten({ background: "white" }).png().toBuffer();
    const { data } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.ok(data.some((channel) => channel < 100), `${expression}: raster must contain visible ink`);
    previews.push({ input: png, left: 20, top: index * 140 + 10 });
  }
  await mkdir(".next/math-figure-export-check", { recursive: true });
  await sharp({ create: { width: 500, height: expressions.length * 140, channels: 3, background: "white" } })
    .composite(previews).png().toFile(".next/math-figure-export-check/formulas.png");
  console.log("Math figure export: 7 vector and PNG regression cases passed.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
