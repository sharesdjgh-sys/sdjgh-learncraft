import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { decodeHTMLStrict } from "entities";
import { InlineMarkdown, Markdown } from "../src/components/ui/markdown";
import { subjectRenderingCases } from "./fixtures/subject-rendering-cases";

function visibleMarkup(html: string) {
  // KaTeX annotations intentionally retain TeX source; they are not visible output.
  return html.replace(/<annotation\b[^>]*>[\s\S]*?<\/annotation>/gi, "")
    .replace(/<math\b[^>]*>[\s\S]*?<\/math>/gi, "");
}

function visibleText(html: string) {
  return decodeHTMLStrict(visibleMarkup(html).replace(/<[^>]*>/g, ""));
}

const failures: string[] = [];
let checked = 0;
for (const test of subjectRenderingCases) {
  for (const [renderer, html] of [
    ["block", renderToStaticMarkup(<Markdown>{test.source}</Markdown>)],
    ["inline", renderToStaticMarkup(<InlineMarkdown>{test.source}</InlineMarkdown>)],
  ] as const) {
    try {
      const context = `${test.subject}/${test.id}/${renderer}`;
      const visible = visibleMarkup(html);
      assert.doesNotMatch(visible, /katex-error|data-render-error=/, `${context}: valid input must render without fallback`);
      assert.doesNotMatch(visible, /color\s*:\s*(?:#(?:cc0000|c00|ff0000|f00)\b|red\b|rgb\(\s*204\s*,\s*0\s*,\s*0\s*\))/i, `${context}: KaTeX may render unknown commands as red text without katex-error`);
      const prose = visibleText(html.replace(/<pre\b[^>]*>[\s\S]*?<\/pre>|<code\b[^>]*>[\s\S]*?<\/code>/gi, ""));
      assert.doesNotMatch(prose, /\\[A-Za-z]+\b|\*\*[^*\n]+\*\*/, `${context}: TeX or emphasis source must not leak into displayed prose`);
      assert((html.match(/class="katex"/g) ?? []).length >= (test.minMath ?? 0), `${context}: missing rendered math`);
      assert((html.match(/<strong\b/g) ?? []).length >= (test.minStrong ?? 0), `${context}: missing emphasis`);
      if (test.table && renderer === "block") assert.match(html, /<table\b/, `${context}: missing table`);
      checked++;
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }
}

const malformed = [
  { name: "unknown command", source: String.raw`$\notARealCommand{1}$`, forbidden: "notARealCommand" },
  { name: "unclosed fraction", source: String.raw`$\frac{1}{$`, forbidden: "\\frac" },
  { name: "unknown environment", source: String.raw`$$\begin{notAnEnvironment}x\end{notAnEnvironment}$$`, forbidden: "notAnEnvironment" },
];
for (const test of malformed) {
  for (const html of [renderToStaticMarkup(<Markdown>{test.source}</Markdown>), renderToStaticMarkup(<InlineMarkdown>{test.source}</InlineMarkdown>)]) {
    try {
      assert.match(html, /data-render-error="math"/, `${test.name}: invalid math needs a readable fallback`);
      assert(!visibleText(html).includes(test.forbidden), `${test.name}: invalid TeX must not leak as visible text`);
      assert.doesNotMatch(visibleMarkup(html), /katex-error|color\s*:\s*#cc0000/i);
      checked++;
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }
}

const rawMermaid = '```mermaid\nflowchart TB\nRAW_NODE["RAW_LABEL"] --> OTHER_NODE\n```';
try {
  const html = renderToStaticMarkup(<Markdown>{rawMermaid}</Markdown>);
  assert.doesNotMatch(visibleText(html), /flowchart TB|RAW_NODE|RAW_LABEL|OTHER_NODE/, "unsupported raw Mermaid must not expose diagram source to learners");
  assert.doesNotMatch(html, /language-mermaid/, "unsupported raw Mermaid must not become a raw code block");
  checked++;
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
}

// Completion must stop indefinite placeholders; streaming input must not flash errors.
const partialVisual = '```learncraft-visual\n{"kind":"flow"';
assert.match(visibleText(renderToStaticMarkup(<Markdown>{partialVisual}</Markdown>)), /표시하지 못했어요/);
assert.match(visibleText(renderToStaticMarkup(<Markdown streaming>{partialVisual}</Markdown>)), /준비하고 있어요/);
assert.doesNotMatch(renderToStaticMarkup(<Markdown streaming>{malformed[1].source}</Markdown>), /data-render-error/);
assert.doesNotMatch(renderToStaticMarkup(<Markdown streaming>{rawMermaid}</Markdown>), /RAW_NODE|data-render-error/);
checked += 4;

const invalidGraphLabel = '```learncraft-graph\n' + JSON.stringify({
  title: "그래프", xRange: [-2, 2], yRange: [-1, 4],
  curves: [{ expression: "x^2", label: String.raw`\notARealCommand{1}` }],
}) + '\n```';
const graphHtml = renderToStaticMarkup(<Markdown>{invalidGraphLabel}</Markdown>);
assert.match(graphHtml, /data-render-error="math"/);
assert.doesNotMatch(visibleText(graphHtml), /notARealCommand/);
checked++;

assert.equal(failures.length, 0, failures.join("\n\n"));
console.log(`Subject rendering passed: ${subjectRenderingCases.length} fixtures across both renderers; ${checked} checks including malformed math and raw Mermaid.`);
