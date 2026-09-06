import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown } from "../src/components/ui/markdown";
import { parseLearningFigure } from "../src/lib/learning-figure";
import { LEARNING_FIGURE_GUIDE } from "../src/features/tutor/figure-prompt";

const triangle = {
  kind: "diagram", title: "삼각형 ABC", description: "B에서 직각이며 AB는 3, BC는 4인 삼각형이다.",
  xRange: [-1, 5], yRange: [-1, 4],
  shapes: [
    { type: "polygon", points: [[0, 3], [0, 0], [4, 0]] },
    { type: "rightAngle", vertex: [0, 0], from: [0, 3], to: [4, 0], size: 0.25 },
    { type: "point", at: [0, 3], label: "A" }, { type: "point", at: [0, 0], label: "B" }, { type: "point", at: [4, 0], label: "C" },
    { type: "text", at: [-0.4, 1.5], text: "3" }, { type: "text", at: [2, -0.4], text: "4" },
  ],
};
const circle = {
  kind: "diagram", title: "원과 중심각", description: "반지름 2인 원에서 중심각 AOB가 60도이다.", xRange: [-4, 4], yRange: [-3, 3],
  shapes: [
    { type: "circle", center: [0, 0], radius: 2 },
    { type: "line", from: [0, 0], to: [2, 0] }, { type: "line", from: [0, 0], to: [1, Math.sqrt(3)] },
    { type: "arc", center: [0, 0], radius: 0.5, startAngle: 0, endAngle: 60 },
    { type: "text", at: [0.85, 0.45], text: "60°" },
    { type: "point", at: [0, 0], label: "O" }, { type: "point", at: [2, 0], label: "A" }, { type: "point", at: [1, Math.sqrt(3)], label: "B" },
  ],
};
const science = {
  kind: "line", title: "가열 시간에 따른 온도", description: "같은 조건에서 두 시료를 가열하며 1분 간격으로 온도를 측정했다.",
  xLabel: "시간 (분)", yLabel: "온도 (°C)", labels: ["0", "1", "2", "3", "4"],
  series: [{ name: "시료 A", values: [20, 25, 30, 35, 40] }, { name: "시료 B", values: [20, 22, 24, 26, 28] }], dataNote: "학습용 가상 실험 자료",
};
const social = {
  kind: "bar", title: "지역별 교통수단 이용률", description: "가상 지역 가, 나, 다의 버스와 지하철 이용률이다.",
  xLabel: "지역", yLabel: "이용률 (%)", labels: ["가", "나", "다"],
  series: [{ name: "버스", values: [40, 25, 30] }, { name: "지하철", values: [20, 45, 35] }], dataNote: "학습용 가상 자료",
};
const mechanism = {
  kind: "diagram", title: "힘의 방향 모식도", description: "수평면 위 물체에 오른쪽으로 힘 F가 작용한다.",
  shapes: [{ type: "line", from: [0.5, 1], to: [9, 1] }, { type: "polygon", points: [[2, 1], [4, 1], [4, 3], [2, 3]], fill: "#e9edf5" }, { type: "line", from: [4, 2], to: [7, 2], arrow: true }, { type: "text", at: [5.5, 2.5], text: "F" }],
};
const block = (spec: unknown) => `\n\n\`\`\`learncraft-figure\n${JSON.stringify(spec)}\n\`\`\`\n\n`;
const render = (spec: unknown) => renderToStaticMarkup(<Markdown collapseHints>{block(spec)}</Markdown>);
const examples = [triangle, circle, science, social, mechanism];
for (const spec of examples) {
  parseLearningFigure(JSON.stringify(spec));
  const html = render(spec);
  assert.match(html, /<svg/);
  assert.match(html, /preserveAspectRatio="xMidYMid meet"/);
  assert.match(html, /<desc/);
  assert.doesNotMatch(html, /language-learncraft-figure|&quot;shapes&quot;|NaN|Infinity/);
}
const triangleSvg = render(triangle);
const vertices = triangleSvg.match(/<polygon points="([^"]+)"/)![1].split(" ").map((p) => p.split(",").map(Number));
assert.ok(Math.abs(Math.abs(vertices[0][1] - vertices[1][1]) / 3 - Math.abs(vertices[2][0] - vertices[1][0]) / 4) < 1e-8, "Equal coordinate scale");
assert.match(render(circle), /<circle[^>]* r="/);
assert.match(render(circle), / A[\d.]+,[\d.]+ 0 0 0 /);
assert.equal((render(social).match(/<rect /g) ?? []).length, 6);
assert.match(render(science), /<table/);
assert.match(render(science), /학습용 가상 실험 자료/);
for (const values of [[0, 0, 0], [-5, 0, 5], [-10, -5, -1], [0.00001, 0.00002, 0.00003]]) {
  assert.doesNotMatch(render({ ...social, series: [{ name: "자료", values }] }), /NaN|Infinity|height="-/);
}
const folded = renderToStaticMarkup(<Markdown collapseHints>{`## 문제\n빗변의 길이를 구하세요.${block(triangle)}## 힌트\n보조선을 확인하세요.${block(circle)}`}</Markdown>);
const hidden = folded.match(/<details\b[^>]*>[\s\S]*?<\/details>/)![0];
assert.match(hidden, /원과 중심각/);
assert.doesNotMatch(hidden, /<details[^>]* open/);
assert.match(folded.replace(hidden, ""), /삼각형 ABC/);
assert.doesNotMatch(folded.replace(hidden, ""), /원과 중심각/);
for (const bad of [
  { ...triangle, shapes: [{ type: "script", text: "alert(1)" }] },
  { ...triangle, xRange: [5, 1] },
  { ...triangle, shapes: [{ type: "circle", center: [0, 0], radius: -1 }] },
  { ...triangle, shapes: [{ type: "rightAngle", vertex: [0, 0], from: [1, 1], to: [2, 0] }] },
  { ...social, series: [{ name: "불일치", values: [1] }] },
  { ...social, dataNote: "" },
]) {
  assert.throws(() => parseLearningFigure(JSON.stringify(bad)));
  assert.doesNotMatch(render(bad), /<svg|<script/);
}
const unsafe = render({ ...triangle, shapes: [{ type: "text", at: [1, 1], text: "<script>alert(1)</script>", color: "url(https://example.com)" }] });
assert.doesNotMatch(unsafe, /<script|url\(/);
assert.match(unsafe, /&lt;script&gt;/);
assert.doesNotMatch(renderToStaticMarkup(<Markdown>{'```learncraft-figure\n{"kind":'}</Markdown>), /<svg|&quot;kind&quot;/);
// Keep the model-facing examples in sync with the renderer schema.
for (const line of LEARNING_FIGURE_GUIDE.split("\n").filter((line) => line.startsWith('{"kind"'))) parseLearningFigure(line);
console.log("그림 검증 완료: 기하 비율, 직각·호·화살표, 과학·사회 그래프, 수치 표, 힌트 접기, 입력 검증, 프롬프트 예시");

async function preview() {
  const sharp = (await import("sharp")).default;
  await mkdir(".next", { recursive: true });
  const pages = examples.map((spec) => render(spec));
  await writeFile(".next/learning-figures-preview.html", `<!doctype html><html lang="ko"><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;max-width:640px;margin:24px auto;color:#334155}figure{border:1px solid #ddd;border-radius:12px;padding:16px;margin:20px 0}figcaption{font-weight:bold;padding-bottom:10px}svg{display:block;max-width:100%;height:auto}table{border-collapse:collapse}td,th{padding:8px;border:1px solid #ddd}</style>${pages.join("")}</html>`);
  for (const [i, html] of pages.entries()) {
    const svg = html.match(/<svg[\s\S]*?<\/svg>/)![0].replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
    await sharp(Buffer.from(svg)).flatten({ background: "white" }).png().toFile(`.next/learning-figure-${i}.png`);
  }
  console.log("미리보기: .next/learning-figures-preview.html");
}

if (process.argv.includes("--preview")) void preview().catch((error) => { console.error(error); process.exitCode = 1; });
