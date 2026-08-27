import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown } from "../src/components/ui/markdown";

const graphMarkdown = [
  "```learncraft-graph",
  JSON.stringify({
    title: "이차함수 y = (x-3)^2",
    xRange: [-5, 7],
    yRange: [-6, 8],
    curves: [
      { expression: "2+3/(x-1)", label: "y = 2 + 3/(x-1)" },
      { expression: "(x-3)^2", label: "y = (x-3)^2" },
    ],
    points: [{ x: 0, y: -1, label: "(0, -1)" }],
    verticalAsymptotes: [{ x: 1, label: "x = 1" }],
    horizontalAsymptotes: [{ y: 2, label: "y = 2" }],
  }),
  "```",
].join("\n");

const html = renderToStaticMarkup(<Markdown>{graphMarkdown}</Markdown>);
const boldMathHtml = renderToStaticMarkup(
  <Markdown>{"**$\\cos\\theta$ (코사인): 점의 $x$, $y$좌표**"}</Markdown>,
);

assert.match(html, /<svg/);
assert.match(html, /<path/);
assert.match(html, /<circle/);
assert.match(html, /stroke-dasharray/);
assert.match(html, /graph-math-label/);
assert.match(html, /class="msupsub"/);
assert.doesNotMatch(html, /&quot;xRange&quot;/);
assert.match(boldMathHtml, /<strong[^>]*>.*class="katex".*<\/strong>/);

console.log("그래프 렌더 검증 완료: 곡선, 좌표점, 점근선, 위첨자 함수 라벨");
