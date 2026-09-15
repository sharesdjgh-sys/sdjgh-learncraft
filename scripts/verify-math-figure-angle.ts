import assert from "node:assert/strict";
import { angleBinding, resizeAngle } from "../src/lib/math-figure-angle";
import { mathFigureSpecSchema, type MathFigureSpec } from "../src/lib/math-figure-lab";

const p = { color: "#111111", dashed: false };
const b = [2, Math.sqrt(12)];
const spec = mathFigureSpecSchema.parse({ title: "Angle", description: "Selected arc rotation", projection: "plane", xRange: [-5, 5], yRange: [-5, 5], notes: [], shapes: [
  { type: "line", ...p, from: [0, 0], to: [4, 0], arrow: false },
  { type: "line", ...p, from: [0, 0], to: b, arrow: false },
  { type: "line", ...p, from: [4, 0], to: b, arrow: false },
  { type: "arc", ...p, center: [0, 0], radius: 0.5, startAngle: 0, endAngle: 60 },
  { type: "point", ...p, at: b, label: "B", labelAt: [2.2, Math.sqrt(12) + 0.3], filled: true, fontSize: 22 },
  { type: "text", ...p, at: [0.7, 0.3], text: "25°", fontSize: 22, autoPosition: false },
] });
const close = (a: number[], expected: number[]) => a.forEach((n, i) => assert.ok(Math.abs(n - expected[i]) < 1e-8, `${a} != ${expected}`));
const original = JSON.stringify(spec);
const otherCorner = structuredClone(spec);
otherCorner.shapes.push({ type: "arc", ...p, center: [4, 0], radius: 0.4, startAngle: 120, endAngle: 180 });
const adjustedCorner = resizeAngle(otherCorner, 3, 90, "start").shapes.at(-1);
if (adjustedCorner?.type === "arc") { assert.ok(Math.abs(adjustedCorner.startAngle - 135) < 1e-8); assert.equal(adjustedCorner.endAngle, 180); }
const rotated = resizeAngle(spec, 3, 90, "start");
assert.equal(JSON.stringify(spec), original, "input and undo snapshot remain unchanged");
assert.deepEqual(rotated.shapes[0], spec.shapes[0], "fixed side does not move");
if (rotated.shapes[1].type === "line") close(rotated.shapes[1].to, [0, 4]);
if (rotated.shapes[2].type === "line") close(rotated.shapes[2].to, [0, 4]);
if (rotated.shapes[4].type === "point") { close(rotated.shapes[4].at, [0, 4]); close(rotated.shapes[4].labelAt!, [0.2, 4.3]); }
assert.deepEqual(rotated.shapes[5], spec.shapes[5], "nearby text cannot pick or control an angle");
if (rotated.shapes[3].type === "arc") { assert.equal(rotated.shapes[3].radius, 0.5); assert.equal(angleBinding(rotated, rotated.shapes[3])?.degrees, 90); }
const otherSide = resizeAngle(spec, 3, 30, "end");
assert.deepEqual(otherSide.shapes[1], spec.shapes[1]);
if (otherSide.shapes[0].type === "line") close(otherSide.shapes[0].to, [Math.sqrt(12), 2]);

const split = structuredClone(spec);
if (split.shapes[1].type === "line") split.shapes[1].to = b.map((n) => n / 2);
split.shapes.push({ type: "line", ...p, from: b.map((n) => n / 2), to: b, arrow: false });
const movedSplit = resizeAngle(split, 3, 90, "start");
if (movedSplit.shapes[1].type === "line") close(movedSplit.shapes[1].to, [0, 2]);
const last = movedSplit.shapes.at(-1);
if (last?.type === "line") { close(last.from, [0, 2]); close(last.to, [0, 4]); }

const unsplit = structuredClone(spec);
if (unsplit.shapes[0].type === "line") unsplit.shapes[0].from = [-4, 0];
const movedUnsplit = resizeAngle(unsplit, 3, 90, "end");
assert.equal(movedUnsplit.shapes[3].type, "arc", "selected arc index stays stable after splitting");
assert.equal(movedUnsplit.shapes.length, unsplit.shapes.length + 1);
if (movedUnsplit.shapes[0].type === "line") { close(movedUnsplit.shapes[0].from, [-4, 0]); close(movedUnsplit.shapes[0].to, [0, 0]); }

const clockwise: MathFigureSpec = structuredClone(spec);
if (clockwise.shapes[1].type === "line") clockwise.shapes[1].to = [2, -Math.sqrt(12)];
if (clockwise.shapes[3].type === "arc") clockwise.shapes[3].endAngle = -60;
const cw = resizeAngle(clockwise, 3, 90, "start");
if (cw.shapes[1].type === "line") close(cw.shapes[1].to, [0, -4]);
const outline = structuredClone(spec);
if (outline.shapes[3].type === "arc") { outline.shapes[3].radius = 4; assert.equal(angleBinding(outline, outline.shapes[3]), null); }
assert.throws(() => resizeAngle(outline, 3, 90, "start"));
const disconnected = structuredClone(spec);
if (disconnected.shapes[1].type === "line") disconnected.shapes[1].from = [1, 1];
assert.throws(() => resizeAngle(disconnected, 3, 90, "start"));
console.log("Selected-angle geometry checks passed: fixed sides, connected vertices, split rays, clockwise rotation, label independence, and disconnected/outline guards.");
