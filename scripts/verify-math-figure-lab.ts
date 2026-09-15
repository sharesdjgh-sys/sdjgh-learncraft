import assert from "node:assert/strict";
import { normalizeAiMathFigureSpec, reconcileVariationGeometry } from "../src/lib/math-figure-lab";

const spec = normalizeAiMathFigureSpec({
  title: "구간 분할 검사",
  description: "중간점이 있는 지름과 경계점이 있는 타원을 분할한다.",
  projection: "spatial",
  xRange: [-6, 6],
  yRange: [-4, 4],
  points: [
    { id: "A", at: [-5, 0], label: "A", filled: false },
    { id: "O", at: [0, 0], label: "O", filled: true },
    { id: "B", at: [5, 0], label: "B", filled: false },
    { id: "P1", at: [0, 3], label: "", filled: false },
  ],
  shapes: [
    { type: "line", from: "A", to: "B", arrow: false },
    { type: "ellipse", center: [0, 0], radiusX: 5, radiusY: 3, rotation: 0, fill: "none" },
  ],
  notes: [],
});

const lines = spec.shapes.filter((shape) => shape.type === "line");
const ellipticArcs = spec.shapes.filter((shape) => shape.type === "ellipticArc");

assert.equal(lines.length, 2, "AB는 중간점 O에서 AO와 OB로 분리되어야 합니다.");
assert.deepEqual(lines.map((line) => [line.from, line.to]), [
  [[-5, 0], [0, 0]],
  [[0, 0], [5, 0]],
]);
assert.equal(ellipticArcs.length, 3, "타원은 A, B, P1 경계점에서 세 개의 호로 분리되어야 합니다.");
assert.ok(ellipticArcs.every((arc) => arc.endAngle > arc.startAngle), "분리된 각 호는 독립적인 양의 각도 구간이어야 합니다.");

const angleSpec = reconcileVariationGeometry({
  title: "각도 변형",
  description: "30도 도형의 표시값을 60도로 바꾼 결과",
  projection: "plane",
  xRange: [-1, 3],
  yRange: [-1, 3],
  shapes: [
    { type: "line", color: "#1f2937", dashed: false, from: [0, 0], to: [2, 0], arrow: false },
    { type: "line", color: "#1f2937", dashed: false, from: [0, 0], to: [Math.sqrt(3), 1], arrow: false },
    { type: "arc", color: "#1f2937", dashed: false, center: [0, 0], radius: 0.4, startAngle: 0, endAngle: 30 },
    { type: "text", color: "#1f2937", dashed: false, at: [0.6, 0.35], text: "60°", fontSize: 22, autoPosition: true },
  ],
  notes: [],
});
const adjustedArc = angleSpec.shapes.find((shape) => shape.type === "arc");
const adjustedRay = angleSpec.shapes.filter((shape) => shape.type === "line")[1];
assert.equal(adjustedArc?.endAngle, 60, "변형 결과의 각도 호는 표시된 60도와 일치해야 합니다.");
assert.ok(adjustedRay?.type === "line" && Math.abs(Math.atan2(adjustedRay.to[1], adjustedRay.to[0]) * 180 / Math.PI - 60) < 0.01, "각도와 연결된 변도 60도로 회전해야 합니다.");

const lengthSpec = reconcileVariationGeometry({
  title: "길이 변형",
  description: "길이 4를 6으로 바꾼 결과",
  projection: "plane",
  xRange: [-1, 8],
  yRange: [-2, 2],
  shapes: [
    { type: "line", color: "#1f2937", dashed: false, from: [0, 0], to: [4, 0], arrow: false },
    { type: "dimension", color: "#1f2937", dashed: true, from: [0, 0], to: [4, 0], offset: -0.5, text: "6", fontSize: 22 },
  ],
  notes: [],
});
const adjustedLine = lengthSpec.shapes.find((shape) => shape.type === "line");
assert.ok(adjustedLine?.type === "line" && Math.abs(Math.hypot(adjustedLine.to[0] - adjustedLine.from[0], adjustedLine.to[1] - adjustedLine.from[1]) - 6) < 0.01, "길이 보조표시가 6이면 연결 선분도 길이 6으로 조정되어야 합니다.");

console.log("Math figure segment splitting verification passed.");
