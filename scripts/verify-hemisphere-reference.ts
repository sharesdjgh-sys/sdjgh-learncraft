import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { MathFigureSvg } from "../src/components/admin/math-figure-lab";
import { mathFigureSpecSchema, type MathFigureShape } from "../src/lib/math-figure-lab";
import { hemisphereBinding, hemisphereGeometry, resizeHemisphereSection } from "../src/lib/math-figure-hemisphere";

async function main() {
  assert.ok(process.argv[2], "Pass the exported hemisphere SVG path");
  const svg = await readFile(process.argv[2], "utf8");
  const number = (tag: string, key: string) => Number(tag.match(new RegExp(`${key}="([^"]+)"`))?.[1]);
  const lines = [...svg.matchAll(/<line\s([^>]+)\/>/g)].map((m) => ({ from: [number(m[1], "x1"), number(m[1], "y1")], to: [number(m[1], "x2"), number(m[1], "y2")] }));
  const paths = [...svg.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]).filter((path) => /[AQ]/.test(path));
  const values = (path: string) => (path.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) ?? []).map(Number);
  assert.equal(lines.length, 5, "this regression fixture has five straight segments");
  const origin = lines[1].from, radius = values(paths[0])[2], scale = radius / 10;
  const at = (p: number[]) => [(p[0] - origin[0]) / scale, (origin[1] - p[1]) / scale];
  const paint = { color: "#1f2937", dashed: false };
  const baseB = [origin[0] + radius, origin[1]];
  console.log(`Input B mismatch: ${Math.hypot(lines[1].to[0] - baseB[0], lines[1].to[1] - baseB[1]).toFixed(3)} SVG pixels`);
  const shapes: MathFigureShape[] = [
    { type: "arc", ...paint, center: [0, 0], radius: 10, startAngle: 0, endAngle: 180 },
    { type: "ellipticArc", ...paint, center: [0, 0], radiusX: 10, radiusY: values(paths[2])[3] / scale, rotation: 0, startAngle: 180, endAngle: 360 },
    { type: "ellipticArc", ...paint, dashed: true, center: [0, 0], radiusX: 10, radiusY: values(paths[2])[3] / scale, rotation: 0, startAngle: 0, endAngle: 180 },
    ...lines.map((line) => ({ type: "line" as const, ...paint, from: at(line.from), to: at(line.to), arrow: false })),
  ];
  const curveIndices: number[] = [];
  for (const path of paths.filter((path) => path.includes(" Q "))) {
    const v = values(path), from = at(v.slice(0, 2)), control = at(v.slice(2, 4)), to = at(v.slice(4, 6));
    const dx = to[0] - from[0], dy = to[1] - from[1], length = Math.hypot(dx, dy);
    const mid = [(from[0] + 2 * control[0] + to[0]) / 4, (from[1] + 2 * control[1] + to[1]) / 4];
    const bend = (mid[0] - (from[0] + to[0]) / 2) * dy / length - (mid[1] - (from[1] + to[1]) / 2) * dx / length;
    curveIndices.push(shapes.length);
    shapes.push({ type: "curve", ...paint, from, to, bend });
  }
  const angleIndex = shapes.length, anglePath = values(paths.at(-1)!);
  const b = at(lines[1].to), top = at(lines[3].from), foot = at(lines[2].to);
  const angleOf = (p: number[]) => Math.atan2(p[1] - b[1], p[0] - b[0]) * 180 / Math.PI;
  shapes.push({ type: "arc", ...paint, center: b, radius: anglePath[2] / scale, startAngle: angleOf(at(anglePath.slice(0, 2))), endAngle: angleOf(at(anglePath.slice(-2))) });
  const footIndex = shapes.length;
  shapes.push({ type: "rightAngle", ...paint, vertex: foot, from: [0, 0], to: top, size: 0.7 });
  const dimensionIndex = shapes.length;
  shapes.push({ type: "dimension", ...paint, from: [0, 0], to: b, text: "4", fontSize: 25, offset: -0.6 });
  for (const [label, position] of [["O", [0, 0]], ["A", [-10, 0]], ["B", b]] as const) shapes.push({ type: "point", ...paint, at: [...position], label, labelAt: [position[0] + (label === "B" ? 0.8 : label === "A" ? -0.8 : 0), position[1] - (label === "O" ? 0.9 : 0)], filled: false, fontSize: 25 });
  const spec = mathFigureSpecSchema.parse({ title: "반구와 단면", description: "사용자 SVG 좌표 재현", projection: "spatial", xRange: [-12, 12], yRange: [-4, 12], notes: [], shapes });
  const snapshot = JSON.stringify(spec);
  const binding = hemisphereBinding(spec, angleIndex);
  assert.ok(binding, "recognize the user's almost-coincident B/top and two quadratic section curves");
  assert.deepEqual(binding.pieces.map((p) => p.index), curveIndices);
  const changed = resizeHemisphereSection(spec, binding, 60), geometry = hemisphereGeometry(binding, 60);
  assert.equal(JSON.stringify(spec), snapshot);
  for (let i = 0; i < 3; i++) assert.deepEqual(changed.shapes[i], spec.shapes[i], "outline and base are unchanged");
  assert.equal(changed.shapes[4].type, "line");
  if (changed.shapes[4].type === "line") assert.deepEqual(changed.shapes[4].to, geometry.b, "OB ends at the real base endpoint");
  if (changed.shapes[footIndex].type === "rightAngle") assert.deepEqual(changed.shapes[footIndex].vertex, geometry.center, "old foot is moved to the computed section center");
  if (changed.shapes[dimensionIndex].type === "dimension") assert.deepEqual(changed.shapes[dimensionIndex].to, geometry.b);
  for (const index of curveIndices) assert.equal(changed.shapes[index].type, "ellipticArc", "general quadratic curves become a single coherent section ellipse");
  assert.ok(hemisphereBinding(changed, angleIndex));
  await mkdir(".next/math-figure-export-check", { recursive: true });
  const markup = renderToStaticMarkup(createElement(MathFigureSvg, { spec: changed }));
  await sharp(Buffer.from(markup)).resize(1440, 960).png().toFile(".next/math-figure-export-check/user-hemisphere-corrected.png");
  console.log("User SVG regression passed: shared B, section conversion, perpendicular foot, fixed hemisphere, and linked dimension.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
