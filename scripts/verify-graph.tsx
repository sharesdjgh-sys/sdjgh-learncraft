import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown } from "../src/components/ui/markdown";

const graphMarkdown = [
  "```learncraft-graph",
  JSON.stringify({
    title: "유리함수 그래프",
    xRange: [-5, 7],
    yRange: [-6, 8],
    curves: [{ expression: "2+3/(x-1)", label: "y = 2 + 3/(x-1)" }],
    points: [{ x: 0, y: -1, label: "(0, -1)" }],
    verticalAsymptotes: [{ x: 1, label: "x = 1" }],
    horizontalAsymptotes: [{ y: 2, label: "y = 2" }],
  }),
  "```",
].join("\n");

const html = renderToStaticMarkup(<Markdown>{graphMarkdown}</Markdown>);

assert.match(html, /<svg/);
assert.match(html, /<path/);
assert.match(html, /<circle/);
assert.match(html, /stroke-dasharray/);
assert.doesNotMatch(html, /&quot;xRange&quot;/);

console.log("그래프 렌더 검증 완료: 곡선, 좌표점, 수직·수평 점근선");
