/* 수학 교과 도구 · 확률과 통계(경우의 수·확률·확률분포·정규분포·통계적 추정)와 기하(이차곡선·접선·공간좌표·벡터)의 계산과 학습지를 확인합니다. npx tsx scripts/verify-math-probability-geometry.ts */
import assert from "node:assert/strict";
import { problemSheetHtml, problemSheetText, q, qEq, qNum, stripMath, texPlain, type SheetSection } from "../src/features/math/core";
import { comb, perm } from "../src/features/math/pg-common";
import { arrangements, binomialCoefficients, countingAsks, countingProblems, equationSolutions, pascalSvg, repComb, repPerm } from "../src/features/math/prob-counting";
import { bothRed, DEFAULT_TABLE, diceSumCount, multiplyCheck, probabilityAsks, probabilityProblems, tableStats, treeSvg } from "../src/features/math/probability";
import { binomial, binomialExact, distributionAsks, distributionProblems, distStats, distSvg, rowsFrom, sqrtQTex } from "../src/features/math/distribution";
import { normalAsks, normalProb, normalProblems, normalSvg, tableValue, zArea } from "../src/features/math/normal";
import { estimationAsks, estimationProblems, meanInterval, proportionInterval, sampleSizeFor } from "../src/features/math/estimation";
import { conicAsks, conicInfo, conicProblems, conicSvg, tangentAt, tangentsWithSlope, type Conic } from "../src/features/math/conic";
import { dist2, internal, mirror, spaceAsks, spaceProblems, spaceSvg, sphereFromGeneral, threePerpendicularSvg } from "../src/features/math/space";
import { divide, dot, specialAngle, vectorAsks, vectorProblems, vectorSvg } from "../src/features/math/vector";

let checks = 0;
const check = (name: string, run: () => void) => { run(); checks += 1; console.log(`✓ ${name}`); };
const close = (actual: number, expected: number, message: string, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} ≠ ${expected}`);
const keys = <T extends string>(record: Record<T, string>) => Object.keys(record) as T[];
const seeds = [1, 2, 3, 7, 11];
/** 학습지에 계산 오류가 없고, 정답이 붙고, 한글 복사에는 그림·KaTeX가 빠지고 TeX 명령이 남지 않는지 봅니다. */
function sheetOk(sections: SheetSection[], label: string) {
  assert.ok(sections.some(section => section.problems.length), `${label}: 문항이 있어야 해요`);
  const options = { title: label, answers: true };
  const html = problemSheetHtml(sections, options, "screen");
  const clip = stripMath(problemSheetHtml(sections, options, "clipboard"));
  const text = problemSheetText(sections, options);
  const bad = (html + text).match(/.{0,50}(NaN|undefined|Infinity|\[object).{0,50}/);
  assert.ok(!bad, `${label}: 계산이 비었어요 → ${bad?.[0]}`);
  assert.ok(html.includes("정답") && html.includes("katex"), `${label}: 정답·수식`);
  assert.ok(!clip.includes("<svg") && !clip.includes("katex"), `${label}: 한글 복사에는 SVG·KaTeX를 넣지 않아요`);
  const tex = text.match(/.{0,30}\\[a-zA-Z].{0,30}/);
  assert.ok(!tex, `${label}: 한글 복사 글에 TeX 명령이 남았어요 → ${tex?.[0]}`);
}

check("경우의 수: 중복순열·같은 것이 있는 순열·중복조합·이항정리", () => {
  assert.equal(repPerm(3, 4), 81);
  assert.equal(repComb(3, 5), 21);
  assert.equal(arrangements("BANANA").total, 60);
  assert.equal(arrangements("SUCCESS").total, 420);
  // 음이 아닌 정수해·자연수해를 전수 조사와 비교
  for (const [k, n] of [[3, 6], [4, 7], [3, 9]]) {
    let all = 0; let positive = 0;
    const walk = (left: number, rest: number, allPositive: boolean) => {
      if (left === 1) { all += 1; if (allPositive && rest > 0) positive += 1; return; }
      for (let v = 0; v <= rest; v += 1) walk(left - 1, rest - v, allPositive && v > 0);
    };
    walk(k, n, true);
    assert.equal(equationSolutions(k, n, false), all, `음이 아닌 정수해 ${k},${n}`);
    assert.equal(equationSolutions(k, n, true), positive, `자연수해 ${k},${n}`);
  }
  // (2x + 1)⁵를 직접 곱해 계수 비교
  let poly = [1];
  for (let i = 0; i < 5; i += 1) poly = [...poly.map(c => c * 1), 0].map((c, index) => c + (index ? poly[index - 1] * 2 : 0));
  assert.deepEqual(binomialCoefficients(2, 1, 5), poly);
  assert.equal(comb(10, 3), 120); assert.equal(perm(5, 2), 20);
  assert.ok(pascalSvg(8, { highlight: 5, pick: [5, 2] }).startsWith("<svg"));
  for (const seed of seeds) sheetOk(countingProblems(keys(countingAsks), 3, seed), `경우의 수 ${seed}`);
});

check("확률: 분할표·조건부확률·독립·수형도", () => {
  const stats = tableStats(DEFAULT_TABLE);
  assert.equal(stats.total, 80);
  assert.ok(qEq(stats.bGivenA!, q(18, 30)));
  assert.ok(multiplyCheck(DEFAULT_TABLE), "곱셈정리");
  assert.equal(tableStats({ ...DEFAULT_TABLE, counts: [[10, 20], [30, 60]] }).independent, true);
  assert.equal(stats.independent, false);
  assert.equal([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].reduce((sum, s) => sum + diceSumCount(s), 0), 36);
  assert.ok(qEq(bothRed(4, 4, false), q(3, 14)));
  assert.ok(qEq(bothRed(3, 2, true), q(9, 25)));
  assert.ok(treeSvg(3, 2, false).startsWith("<svg"));
  for (const seed of seeds) sheetOk(probabilityProblems(keys(probabilityAsks), 3, seed), `확률 ${seed}`);
});

check("확률분포: 평균·분산·이항분포", () => {
  const stats = distStats(rowsFrom([0, 1, 2, 3], [1, 3, 3, 1], 8));
  assert.ok(stats.valid && qEq(stats.mean, q(3, 2)) && qEq(stats.variance, q(3, 4)));
  // B(3, 1/2)와 같아야 합니다.
  const b = binomial(3, q(1, 2));
  close(qNum(b.mean), 1.5, "np"); close(qNum(b.variance), 0.75, "npq");
  close(b.probs.reduce((sum, p) => sum + p, 0), 1, "이항분포 확률의 합");
  assert.ok(qEq(binomialExact(5, q(2, 3), 3), q(80, 243)));
  assert.equal(sqrtQTex(q(3, 4)), "\\frac{\\sqrt{3}}{2}");
  assert.equal(sqrtQTex(q(1, 4)), "\\frac{1}{2}");
  assert.equal(sqrtQTex(q(9)), "3");
  assert.ok(distSvg([0, 1, 2], [0.25, 0.5, 0.25], { mean: 1 }).startsWith("<svg"));
  for (const seed of seeds) sheetOk(distributionProblems(keys(distributionAsks), 3, seed), `확률분포 ${seed}`);
});

check("정규분포: 표준정규분포표 값·확률", () => {
  // 교과서 표 값
  const expected: [number, number][] = [[0.5, 0.1915], [1, 0.3413], [1.5, 0.4332], [2, 0.4772], [2.5, 0.4938], [3, 0.4987], [1.96, 0.475], [2.58, 0.4951]];
  for (const [z, value] of expected) assert.equal(tableValue(z), value, `z=${z}`);
  close(zArea(-1), -0.3413447, "대칭", 1e-6);
  close(normalProb(50, 70, 60, 10), 0.6826895, "±1σ", 1e-6);
  close(normalProb(-Infinity, Infinity, 0, 1), 1, "전체 넓이");
  assert.ok(normalSvg(60, 10, 50, 80).startsWith("<svg"));
  for (const seed of seeds) sheetOk(normalProblems(keys(normalAsks), 3, seed), `정규분포 ${seed}`);
});

check("통계적 추정: 신뢰구간·표본 크기", () => {
  const interval = meanInterval(64.8, 10, 25, 95);
  close(interval.low, 60.88, "하한", 1e-9); close(interval.high, 68.72, "상한", 1e-9);
  close(proportionInterval(0.8, 400, 95).se, 0.02, "표준오차", 1e-12);
  assert.equal(sampleSizeFor(4, 0.98, 95), 256);
  assert.equal(sampleSizeFor(10, 1.96, 95), 400);
  for (const seed of seeds) sheetOk(estimationProblems(keys(estimationAsks), 3, seed), `통계적 추정 ${seed}`);
});

check("이차곡선: 초점과 접선", () => {
  const ellipse: Conic = { kind: "ellipse", A: 25, B: 9, m: 0, n: 0 };
  assert.deepEqual(conicInfo(ellipse).foci, [[4, 0], [-4, 0]]);
  const hyperbola: Conic = { kind: "hyperbola", A: 9, B: 16, sign: 1, m: 0, n: 0 };
  assert.deepEqual(conicInfo(hyperbola).foci, [[5, 0], [-5, 0]]);
  // 접선은 접점을 지나고, 곡선과 한 점에서만 만나야 합니다(판별식 0).
  const touches = (conic: Conic, x1: number, y1: number) => {
    const line = tangentAt(conic, x1, y1);
    assert.ok(!("vertical" in line));
    const m = qNum(line.slope); const k = qNum(line.intercept);
    close(m * x1 + k, y1, "접점을 지남");
    if (conic.kind === "parabola") { // y² = 4p x 에 y = mx + k: m²x² + (2mk − 4p)x + k² = 0
      close((2 * m * k - 4 * conic.p) ** 2 - 4 * m * m * k * k, 0, "포물선 판별식", 1e-9);
    } else {
      const s = conic.kind === "ellipse" ? 1 : -1;
      const rhs = conic.kind === "hyperbola" ? conic.sign : 1;
      // x²/A + s(mx + k)²/B = rhs → (1/A + s m²/B)x² + (2 s m k/B)x + (s k²/B − rhs) = 0
      const a2 = 1 / conic.A + (s * m * m) / conic.B; const b1 = (2 * s * m * k) / conic.B; const c0 = (s * k * k) / conic.B - rhs;
      close(b1 * b1 - 4 * a2 * c0, 0, `${conic.kind} 판별식`, 1e-9);
    }
  };
  touches({ kind: "parabola", axis: "x", p: 3, m: 0, n: 0 }, 3, 6);
  touches({ kind: "ellipse", A: 8, B: 2, m: 0, n: 0 }, 2, 1);
  touches({ kind: "ellipse", A: 20, B: 5, m: 0, n: 0 }, 4, 1);
  touches({ kind: "hyperbola", A: 4, B: 3, sign: 1, m: 0, n: 0 }, 4, 3);
  touches({ kind: "hyperbola", A: 12, B: 3, sign: 1, m: 0, n: 0 }, 4, 1);
  assert.deepEqual(tangentsWithSlope({ kind: "ellipse", A: 4, B: 5, m: 0, n: 0 }, 1)?.intercepts, [3, -3]);
  assert.equal(tangentsWithSlope({ kind: "hyperbola", A: 4, B: 9, sign: 1, m: 0, n: 0 }, 1), null, "점근선보다 완만하면 접선 없음");
  for (const conic of [ellipse, hyperbola, { kind: "parabola", axis: "y", p: -2, m: 1, n: 2 } as Conic]) assert.ok(conicSvg(conic).startsWith("<svg"));
  for (const seed of seeds) sheetOk(conicProblems(keys(conicAsks), 3, seed), `이차곡선 ${seed}`);
});

check("공간좌표·벡터", () => {
  assert.equal(dist2([1, 2, 3], [4, 6, 3]), 25);
  assert.deepEqual(internal([0, 0, 0], [3, 6, 9], 1, 2).map(qNum), [1, 2, 3]);
  assert.deepEqual(mirror([1, 2, 3], "xy"), [1, 2, -3]);
  assert.deepEqual(mirror([1, 2, 3], "x"), [1, -2, -3]);
  assert.deepEqual(mirror([1, 2, 3], "o"), [-1, -2, -3]);
  const sphere = sphereFromGeneral(-2, 4, 0, -4);
  assert.deepEqual(sphere.center.map(qNum), [1, -2, 0]); assert.equal(qNum(sphere.r2), 9);
  assert.equal(specialAngle([1, 0], [1, 1]), 45);
  assert.equal(specialAngle([1, 2], [-3, -1]), 135);
  assert.equal(specialAngle([3, 1], [-1, 3]), 90);
  assert.equal(specialAngle([2, 0], [-3, 0]), 180);
  // 각을 수치로 다시 계산
  for (const [a, b] of [[[1, 2], [3, 1]], [[1, 3], [2, 1]], [[2, 1], [-1, -3]]] as [[number, number], [number, number]][]) {
    close((Math.acos(dot(a, b) / Math.sqrt(dot(a, a) * dot(b, b))) * 180) / Math.PI, specialAngle(a, b)!, "각", 1e-9);
  }
  assert.deepEqual(divide([1, 3], [4, 2], 2, 3).map(qNum), [2.2, 2.6]);
  assert.ok(spaceSvg([{ name: "A", at: [2, -1, 3] }], { sphere: { center: [0, 0, 0], r: 2 } }).startsWith("<svg"));
  assert.ok(threePerpendicularSvg().startsWith("<svg"));
  for (const figure of ["sum", "difference", "scalar"] as const) assert.ok(vectorSvg([3, 1], [1, 2], figure).startsWith("<svg"));
  assert.equal(texPlain("\\bar{X}"), "X̄");
  for (const seed of seeds) { sheetOk(spaceProblems(keys(spaceAsks), 3, seed), `공간좌표 ${seed}`); sheetOk(vectorProblems(keys(vectorAsks), 3, seed), `벡터 ${seed}`); }
});

console.log(`\n확률과 통계·기하 검증 ${checks}개 항목 통과`);
