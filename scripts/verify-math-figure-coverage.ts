import assert from "node:assert/strict";
import { compileMathExpression, evaluateMeasurement } from "../src/lib/math-expression";
import { mathFigureSpecSchema, reconcileVariationGeometry } from "../src/lib/math-figure-lab";
import { enforceFigureConstraints, constraintError } from "../src/lib/math-figure-constraints";
import { buildFigureConstruction, binomialProbability, normalDensity, sampleFunction } from "../src/lib/math-figure-construction";
import type { FigureConstruction } from "../src/lib/math-figure-construction-schema";

let checks = 0;
function close(a: number | null, b: number, tolerance = 1e-7) { assert.ok(a !== null && Math.abs(a-b) < tolerance, `${a} != ${b}`); checks++; }
const paint = { color: "#000000", dashed: false };
const base = { title: "coverage", description: "coverage", projection: "plane" as const, xRange: [-10,10], yRange: [-10,10], notes: [] };
for (const [expression, expected] of [
  [String.raw`\sqrt{3}`,Math.sqrt(3)], [String.raw`\frac{1}{2}`,0.5], [String.raw`\log_{2}8`,3],
  [String.raw`\sqrt{\frac{9}{4}}`,1.5], [String.raw`2\sqrt{3}`,2*Math.sqrt(3)],
  ["60°",60], [String.raw`60^\circ`,60], [String.raw`60^{\circ}`,60],
  ["log10(100)",2], ["2^3^2",512], ["-2^2",-4], ["(-2)^2",4], ["1e-3",.001],
  [String.raw`\frac{\sqrt{9}}{2}`,1.5], ["√3",Math.sqrt(3)], ["sin(pi/2)",1],
  [String.raw`\log_2 8`,3],
] as const) close(evaluateMeasurement(expression).value, expected);
for (const expression of ["a", "3a", "x+2", "4cm", "1/0", "sqrt(-1)", "log(0)", "3+", "globalThis.alert(1)", String.raw`\log_{1}8`, "(".repeat(70)]) {
  assert.equal(evaluateMeasurement(expression).value, null, expression); checks++;
}
for (const [expression, x, expected] of [["2x+1",3,7],["(x+1)(x-1)",3,8],["x^2-2x+1",3,4],["2^x",3,8],["sqrt(x)",4,2],["ln(x)",Math.E,1],["1/x",2,.5]] as const) close(compileMathExpression(expression)(x), expected);

for (const [text, expected] of [[String.raw`\sqrt{3}`,Math.sqrt(3)],[String.raw`\frac{1}{2}`,.5],[String.raw`\log_{2}8`,3],["3a",5]] as const) {
  const spec = mathFigureSpecSchema.parse({ ...base, shapes: [{ type: "dimension", ...paint, from: [0,0], to: [5,0], offset: 1, text, fontSize: 22 }] });
  const before = JSON.stringify(spec), result = reconcileVariationGeometry(spec);
  assert.equal(result.shapes[0].type, "dimension");
  if (result.shapes[0].type === "dimension") close(result.shapes[0].to[0],expected);
  assert.equal(JSON.stringify(spec), before);
  if (text === "3a") assert.ok(result.notes.length);
}
for (const text of ["60°",String.raw`60^\circ`,String.raw`60^{\circ}`]) {
  const spec = mathFigureSpecSchema.parse({ ...base, shapes: [
    { type:"line",...paint,from:[0,0],to:[4,0],arrow:false },
    { type:"line",...paint,from:[0,0],to:[4*Math.cos(Math.PI/6),2],arrow:false },
    { type:"arc",...paint,center:[0,0],radius:.5,startAngle:0,endAngle:30 },
    { type:"text",...paint,at:[.6,.2],text,fontSize:22 },
  ] });
  const result = reconcileVariationGeometry(spec);
  if (result.shapes[2].type === "arc") close(result.shapes[2].endAngle,60); else assert.fail();
}

const line = (from: number[], to: number[]) => ({ type: "line" as const, ...paint, from, to, arrow: false });
for (const kind of ["parallel","perpendicular"] as const) for (const slope of [-2,0,2]) {
  const spec = mathFigureSpecSchema.parse({ ...base, shapes: [line([0,0],[2,slope]),line([4,4],[5,5])], constraints: [{kind,target:1,reference:0}] });
  const snapshot = JSON.stringify(spec), solved = enforceFigureConstraints(spec);
  close(constraintError(solved),0); assert.equal(JSON.stringify(spec),snapshot);
  const target = solved.shapes[1]; if (target.type === "line") close(Math.hypot(target.to[0]-4,target.to[1]-4),Math.sqrt(2));
}
for (const radius of [1,2,5]) for (const kind of ["onCircle","tangent"] as const) {
  const spec = mathFigureSpecSchema.parse({ ...base, shapes: [
    { type:"circle",...paint,center:[0,0],radius,fill:"none" },
    kind === "onCircle" ? {type:"point",...paint,at:[3,4],label:"P",filled:true,fontSize:22} : line([3,4],[6,5]),
  ], constraints:[{kind,target:1,reference:0}] });
  const solved = enforceFigureConstraints(spec); close(constraintError(solved),0);
  const target = solved.shapes[1];
  if (target.type === "point") close(Math.hypot(...target.at),radius);
  if (target.type === "line") { close(Math.hypot(...target.from),radius); close(target.from[0]*(target.to[0]-target.from[0])+target.from[1]*(target.to[1]-target.from[1]),0); }
}
const conflict = mathFigureSpecSchema.parse({ ...base, shapes: [line([0,0],[2,0]),line([4,4],[5,5])], constraints: [{kind:"parallel",target:1,reference:0},{kind:"perpendicular",target:1,reference:0}] });
const marked = mathFigureSpecSchema.parse({ ...base, shapes: [line([0,0],[4,0]),line([1,2],[3,4]),line([1,2],[1,5]),{type:"arc",...paint,center:[1,2],radius:.3,startAngle:45,endAngle:90}],constraints:[{kind:"parallel",target:1,reference:0}] });
const markedResult = enforceFigureConstraints(marked).shapes[3];
assert.ok(markedResult.type === "arc"); close(markedResult.endAngle-markedResult.startAngle,90);
assert.throws(() => enforceFigureConstraints(conflict), /조건/); checks++;
assert.throws(() => enforceFigureConstraints({ ...conflict, projection:"spatial" }), /평면/); checks++;
assert.throws(() => enforceFigureConstraints({ ...conflict, constraints:[{kind:"parallel",target:99,reference:0}] })); checks++;

const models: FigureConstruction[] = [
  ...["x^2", "x^3-x", "1/x", "sqrt(x)", "2^x", "log(x)", "sin(x)", "tan(x)", "abs(x)"].map(expression => ({kind:"function" as const, expressions:[expression],xRange:[-5,5],yRange:[-5,5]})),
  {kind:"function",expressions:["x^2","x+1"],xRange:[-5,5],yRange:[-5,5]},
];
for (const scale of [.5,1,2]) {
  models.push({kind:"cuboid",width:4*scale,depth:3*scale,height:5*scale}, {kind:"cylinder",radius:2*scale,height:5*scale}, {kind:"cone",radius:2*scale,height:5*scale}, {kind:"sphereSection",radius:5,offset:scale}, {kind:"normal",mean:scale,sigma:scale,lower:-1,upper:3}, {kind:"binomial",n:10,p:scale/2});
}
for (const model of models) {
  const spec = buildFigureConstruction(model);
  assert.ok(spec.shapes.length > 0 && spec.shapes.length <= 240); assert.equal(spec.construction?.kind,model.kind);
  assert.ok(mathFigureSpecSchema.safeParse(spec).success); checks++;
  if (model.kind === "sphereSection") { const ellipse = spec.shapes.find(s => s.type === "ellipse"); assert.ok(ellipse?.type === "ellipse"); close(ellipse.radiusX ** 2 + model.offset ** 2,model.radius ** 2); }
}
for (const p of [0,.1,.5,.9,1]) close(Array.from({length:41},(_,k) => binomialProbability(40,p,k)).reduce((a,b) => a+b,0),1);
for (const sigma of [.1,1,10]) {
  const dx = sigma * 12 / 2000;
  const area = Array.from({length:2000},(_,i) => normalDensity(-6*sigma+(i+.5)*dx,0,sigma)*dx).reduce((a,b) => a+b,0);
  close(area,1,1e-7);
}
assert.throws(() => buildFigureConstruction({kind:"sphereSection",radius:2,offset:3}));
assert.throws(() => buildFigureConstruction({kind:"normal",mean:0,sigma:0,lower:-1,upper:1}));
assert.throws(() => buildFigureConstruction({kind:"function",expressions:["unknown(x)"],xRange:[-5,5],yRange:[-5,5]}));
assert.throws(() => buildFigureConstruction({kind:"function",expressions:["x"],xRange:[0,1e-300],yRange:[-5,5]}));
// A reciprocal graph must never bridge its vertical asymptote.
const reciprocal = sampleFunction("1/x",[-5,5],[-5,5]);
for (const s of reciprocal) if (s.type === "line") assert.ok(!(s.from[0] < 0 && s.to[0] > 0));
console.log(`Math figure coverage: ${checks} numerical checks passed; ${models.length} representative constructions, safe formulas, constraints, distributions, and discontinuities.`);
