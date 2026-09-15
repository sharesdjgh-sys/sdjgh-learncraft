import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { MathFigureSvg } from "../src/components/admin/math-figure-lab";
import { mathFigureSpecSchema } from "../src/lib/math-figure-lab";
import { mathMlToSvg } from "../src/lib/math-figure-export";

async function main() {
  for (const label of ["O_1", "O_{12}", "A_i", "O_1^2", "O", "O_{"]) {
    const spec = mathFigureSpecSchema.parse({
      title: "Point labels", description: "Subscript regression", projection: "plane", xRange: [-2, 2], yRange: [-2, 2],
      shapes: [{ type: "point", at: [0, 0], label, filled: true, color: "#222222", dashed: false }], notes: [],
    });
    const markup = renderToStaticMarkup(<MathFigureSvg spec={spec} onSelect={() => {}} />);
    assert.match(markup, /data-editable-label="true"/);
    if (label === "O" || label === "O_{") {
      assert.doesNotMatch(markup, /foreignObject/);
      assert.ok(markup.includes(`>${label}</text>`));
      continue;
    }
    assert.match(markup, /data-math-render="true"/);
    assert.match(markup, /<msub(?:sup)?>/);
    assert.match(markup, /<mi mathvariant="normal">O<\/mi>|<mi mathvariant="normal">A<\/mi>/);
    const mathml = markup.match(/<math[\s\S]*?<\/math>/)?.[0];
    assert.ok(mathml);
    const svg = mathMlToSvg(mathml);
    assert.match(svg, /data-mml-node="msub(?:sup)?"/);
    assert.doesNotMatch(svg, /foreignObject|merror/);
    const sized = svg.replace(/width="[^"]+"/, 'width="160"').replace(/height="[^"]+"/, 'height="100"');
    const png = await sharp(Buffer.from(sized)).flatten({ background: "white" }).png().toBuffer();
    const stats = await sharp(png).stats();
    assert.ok(stats.channels.some(channel => channel.min < 100));
  }
  console.log("Point labels: 6 preview cases and 4 vector/PNG subscript cases passed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
