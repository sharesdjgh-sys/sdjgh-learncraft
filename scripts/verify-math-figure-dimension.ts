import assert from "node:assert/strict";
import { dimensionStrokes, type DimensionCurve } from "../src/lib/math-figure-dimension";
import { mathFigureSpecSchema } from "../src/lib/math-figure-lab";

const curve: DimensionCurve = [{ x: 0, y: 0 }, { x: 100, y: 80 }, { x: 200, y: 0 }];
const centered = dimensionStrokes(curve, { x: 90, y: 30, width: 20, height: 20 });
assert.equal(centered.length, 2, "a centered label splits the curve into two strokes");
assert.ok(centered[0].end < 0.5 && centered[1].start > 0.5);
const moved = dimensionStrokes(curve, { x: 90, y: 100, width: 20, height: 20 });
assert.equal(moved.length, 1, "moving the label away restores the whole curve");
assert.equal(moved[0].start, 0);
assert.equal(moved[0].end, 1);
for (const width of [8, 20, 55, 130, 198]) {
  for (const shape of [curve, [{ x: 0, y: 0 }, { x: 80, y: 100 }, { x: 0, y: 200 }] as DimensionCurve]) {
    for (const stroke of dimensionStrokes(shape, { x: 100 - width / 2, y: 30, width, height: 20 })) {
      const [dash, gap] = stroke.dasharray.split(" ").map(Number);
      assert.ok(Math.abs(stroke.count * dash + (stroke.count - 1) * gap - 1) < 1e-10, "both ends must finish with complete dashes");
      assert.ok(stroke.count >= 1);
      assert.doesNotMatch(stroke.d, /NaN|Infinity/);
    }
  }
}
const parsed = mathFigureSpecSchema.parse({ title: "Test", description: "Dimension drag", projection: "plane", xRange: [0, 10], yRange: [0, 10], notes: [], shapes: [{ type: "dimension", color: "#111111", dashed: true, from: [1, 1], to: [9, 1], offset: 1, text: "4", fontSize: 22, labelAt: [5, 4] }] });
assert.equal(parsed.shapes[0].type, "dimension");
if (parsed.shapes[0].type === "dimension") assert.deepEqual(parsed.shapes[0].labelAt, [5, 4], "dragged label position survives validation and undo snapshots");
console.log("Dimension label movement and whole-dash regression checks passed.");
