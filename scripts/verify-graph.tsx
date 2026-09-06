import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown } from "../src/components/ui/markdown";
import { FunctionGraph } from "../src/components/ui/function-graph";

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

for (const [xRange, yRange] of [
  [[-5, 5], [-5, 5]],
  [[-10, 10], [-5, 5]],
  [[-5, 5], [-10, 10]],
  [[-3, 7], [-4, 8]],
]) {
  const circleHtml = renderToStaticMarkup(<FunctionGraph source={JSON.stringify({
    xRange, yRange,
    curves: [
      { expression: "sqrt(4-x^2)", domain: [[-2, 2]] },
      { expression: "-sqrt(4-x^2)", domain: [[-2, 2]] },
    ],
  })} />);
  const paths = [...circleHtml.matchAll(/<path[^>]* d="([^"]+)"[^>]*stroke="#(?:6847e8|e0783f)"/g)];
  assert.equal(paths.length, 2);
  const coordinates = paths.flatMap((path) => [...path[1].matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)]);
  const xs = coordinates.map((point) => Number(point[1]));
  const ys = coordinates.map((point) => Number(point[2]));
  assert.ok(Math.abs((Math.max(...xs) - Math.min(...xs)) - (Math.max(...ys) - Math.min(...ys))) < 0.03,
    "Circle must have equal horizontal and vertical diameters, including unequal axis ranges");

  const gridLines = [...circleHtml.matchAll(/<line x1="([^"]+)" x2="([^"]+)" y1="([^"]+)" y2="([^"]+)" stroke="#e8ebf2"/g)];
  const vertical = gridLines.filter((line) => line[1] === line[2]).map((line) => Number(line[1]));
  const horizontal = gridLines.filter((line) => line[3] === line[4]).map((line) => Number(line[3]));
  const cellWidth = Math.abs(vertical[1] - vertical[0]);
  const cellHeight = Math.abs(horizontal[1] - horizontal[0]);
  assert.ok(Math.abs(cellWidth - cellHeight) < 1e-8, "Grid cells must be square");
  assert.ok(cellWidth >= 24 && cellWidth <= 48, "Grid cells should stay compact");
  assert.match(circleHtml, /preserveAspectRatio="xMidYMid meet"/);
  const svgSize = circleHtml.match(/viewBox="0 0 ([\d.]+) ([\d.]+)" width="[^"]+" height="[^"]+" preserveAspectRatio/)!;
  assert.ok(Number(svgSize[1]) <= 640 && Number(svgSize[2]) <= 406);
  assert.ok(circleHtml.includes(`max-width:${svgSize[1]}px`), "Prevent enlarging the graph on wide screens");
}

console.log("그래프 렌더 검증 완료: 곡선, 좌표점, 점근선, 수식 라벨, 원의 비율, 정사각형 눈금과 크기 제한");
