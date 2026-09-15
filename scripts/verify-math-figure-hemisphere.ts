import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { hemisphereBinding, hemisphereGeometry, resizeHemisphereSection } from "../src/lib/math-figure-hemisphere";
import { mathFigureSpecSchema } from "../src/lib/math-figure-lab";

async function main() {
  const model = { center: [0, 0], radius: 4, axis: [1, 0], depthRatio: 0.3 };
  const old = hemisphereGeometry(model, 30), paint = { color: "#111111", dashed: false };
  const spec = mathFigureSpecSchema.parse({ title: "Hemisphere", description: "Section through B", projection: "spatial", xRange: [-5, 5], yRange: [-2, 5], notes: [], shapes: [
    { type: "ellipse", ...paint, center: [0, 0], radiusX: 4, radiusY: 1.2, rotation: 0, fill: "none" },
    { type: "arc", ...paint, center: [0, 0], radius: 4, startAngle: 0, endAngle: 180 },
    { type: "line", ...paint, from: [-4, 0], to: [0, 0], arrow: false },
    { type: "line", ...paint, from: [0, 0], to: [4, 0], arrow: false },
    { type: "line", ...paint, from: old.b, to: old.top, arrow: false },
    { type: "line", ...paint, from: [0, 0], to: old.center, arrow: false },
    { type: "ellipse", ...paint, center: old.center, radiusX: old.radiusX, radiusY: old.radiusY, rotation: old.rotation, fill: "none" },
    { type: "arc", ...paint, center: [4, 0], radius: 0.25, startAngle: 180, endAngle: Math.atan2(old.top[1], old.top[0] - 4) * 180 / Math.PI },
    { type: "point", ...paint, at: old.center, label: "H", filled: false, fontSize: 22 },
    { type: "rightAngle", ...paint, vertex: old.center, from: [0, 0], to: old.b, size: 0.15 },
  ] });
  const binding = hemisphereBinding(spec, 7);
  assert.ok(binding, "identify the base and complete section ellipse");
  assert.ok(Math.abs(binding.degrees - 30) < 1e-8);
  const snapshot = JSON.stringify(spec);
  const changed = resizeHemisphereSection(spec, binding, 60);
  assert.equal(JSON.stringify(spec), snapshot);
  for (const index of [0, 1, 2, 3]) assert.deepEqual(changed.shapes[index], spec.shapes[index], "hemisphere and base must stay fixed");
  assert.equal(hemisphereBinding(changed, 7)?.degrees, 60, "retain physical angle, not projected screen angle");
  assert.notDeepEqual(changed.shapes[6], spec.shapes[6], "section ellipse changes with the angle");
  assert.notDeepEqual(changed.shapes[5], spec.shapes[5], "perpendicular foot follows the new section center");
  const back = resizeHemisphereSection(changed, hemisphereBinding(changed, 7)!, 30);
  if (back.shapes[6].type === "ellipse") assert.ok(Math.abs(back.shapes[6].radiusX - old.radiusX) < 1e-8);

  const split = structuredClone(spec);
  split.shapes[6] = { type: "ellipticArc", ...paint, center: old.center, radiusX: old.radiusX, radiusY: old.radiusY, rotation: old.rotation, startAngle: old.phase, endAngle: old.phase + 180 };
  split.shapes.push({ ...split.shapes[6], dashed: true, startAngle: old.phase + 180, endAngle: old.phase + 360 });
  const splitBinding = hemisphereBinding(split, 7);
  assert.ok(splitBinding);
  const splitChanged = resizeHemisphereSection(split, splitBinding, 60);
  assert.equal(splitChanged.shapes[6].dashed, false);
  assert.equal(splitChanged.shapes.at(-1)?.dashed, true);
  assert.equal(splitChanged.shapes[6].type, "ellipticArc");

  const panels: string[] = [];
  for (const [index, degrees] of [30, 45, 60].entries()) {
    const geometry = hemisphereGeometry(model, degrees), theta = degrees * Math.PI / 180;
    assert.ok(Math.abs(geometry.sectionRadius - 4 * Math.cos(theta)) < 1e-10);
    assert.ok(Math.abs(geometry.radiusX * geometry.radiusY - 16 * 0.3 * Math.cos(theta) ** 3) < 1e-8);
    for (let step = 0; step <= 72; step++) {
      const [x, y, z] = geometry.point3d(step * Math.PI / 36);
      assert.ok(Math.abs(x * x + y * y + z * z - 16) < 1e-8, "all section points lie on the sphere");
      assert.ok(Math.abs(Math.sin(theta) * x + Math.cos(theta) * z - 4 * Math.sin(theta)) < 1e-8, "all section points lie in the cutting plane");
      assert.ok(z >= -1e-10, "section stays in the upper hemisphere");
      const projectedY = 0.3 * y + Math.sqrt(1 - 0.09) * z;
      assert.ok(x * x + projectedY * projectedY <= 16 + 1e-8, "projection stays inside the fixed sphere silhouette");
    }
    const rim = Array.from({ length: 73 }, (_, i) => `${4 * Math.cos(i * Math.PI / 72)},${4 * Math.sin(i * Math.PI / 72)}`).join(" ");
    panels.push(`<g transform="translate(${170 + index * 340} 235) scale(34 -34)" fill="none" stroke="#111" stroke-width="0.035"><polyline points="${rim}"/><ellipse cx="0" cy="0" rx="4" ry="1.2" stroke-dasharray="0.12 0.10"/><path d="M-4 0 H4 L${geometry.top.join(" ")} M0 0 L${geometry.center.join(" ")}"/><ellipse cx="${geometry.center[0]}" cy="${geometry.center[1]}" rx="${geometry.radiusX}" ry="${geometry.radiusY}" transform="rotate(${geometry.rotation} ${geometry.center.join(" ")})" stroke="#6550bd" stroke-width="0.05"/></g>`);
  }
  await mkdir(".next/math-figure-export-check", { recursive: true });
  await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1020" height="310"><rect width="1020" height="310" fill="white"/>${panels.join("")}</svg>`)).png().toFile(".next/math-figure-export-check/hemisphere-30-45-60.png");
  console.log("Hemisphere checks passed: sphere/plane intersection, section scaling, fixed base, projected ellipse, connected foot, split strokes, and repeat edits.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
