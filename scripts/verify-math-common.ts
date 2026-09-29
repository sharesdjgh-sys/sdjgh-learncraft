/* 수학 교과 도구 · 공통수학 1·2(다항식, 이차방정식·이차함수, 방정식·부등식, 경우의 수, 행렬, 도형의 방정식, 집합과 명제, 함수)의 계산과 학습지를 확인합니다. npx tsx scripts/verify-math-common.ts */
import assert from "node:assert/strict";
import { problemSheetHtml, problemSheetText, q, qNum, stripMath, type SheetSection } from "../src/features/math/core";
import { divide, evaluate, factorRational, factorTex, linear, mul, poly, polyAsks, polyProblems, ptex, synthetic } from "../src/features/math/cm-poly";
import { cDiv, cMul, cTex, cx, extremaOn, functionAsks, functionProblems, quadAsks, quadProblems, quadraticInequality, solveQuadratic, standardTex, vertex } from "../src/features/math/cm-quadratic";
import { absoluteInequality, equationAsks, equationProblems, linearInequality, solveSystem } from "../src/features/math/cm-equation";
import { combination, countingAsks, countingProblems, divisorCount, factorial, matMul, matrixAsks, matrixProblems, permutation } from "../src/features/math/cm-counting";
import { contains, intersect, intervalTex, planeSvg, subsetOf, union } from "../src/features/math/cm-plane";
import { circleAsks, circleLine, circleProblems, internal, lineAsks, lineProblems, lineThrough, moveAsks, moveLine, moveProblems, movePoint, pointLineDistance, tangentAt, type Move } from "../src/features/math/cm2-geometry";
import { conditionKind, logicAsks, logicProblems, setAsks, setProblems, truthSet, vennSvg } from "../src/features/math/cm2-sets";
import { classify, compose, function2Asks, function2Problems, inverse, lin, linAt, mappingSvg, radicalSvg, rationalSvg } from "../src/features/math/cm2-functions";
import { josa } from "../src/features/math/cm-util";

let checks = 0;
const check = (name: string, run: () => void) => { run(); checks += 1; console.log(`✓ ${name}`); };
const close = (actual: number, expected: number, message: string, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} ≠ ${expected}`);
const keys = <T extends string>(record: Record<T, string>) => Object.keys(record) as T[];
/** 학습지에 계산 오류(NaN 등)가 없고, 정답이 붙고, 한글 복사에는 그림·KaTeX·TeX 명령이 빠지는지 봅니다. */
function sheetOk(sections: SheetSection[], label: string) {
  assert.ok(sections.length && sections.some(section => section.problems.length), `${label}: 문항이 있어야 해요`);
  const html = problemSheetHtml(sections, { title: label, answers: true }, "screen");
  const clip = stripMath(problemSheetHtml(sections, { title: label, answers: true }, "clipboard"));
  const text = problemSheetText(sections, { title: label, answers: true });
  const bad = (html + text).match(/.{0,50}(NaN|undefined|Infinity|\[object).{0,50}/);
  assert.ok(!bad, `${label}: 계산이 비었어요 → ${bad?.[0]}`);
  assert.ok(html.includes("정답"), `${label}: 정답`);
  assert.ok(!clip.includes("<svg") && !clip.includes("katex"), `${label}: 한글 복사에는 SVG·KaTeX를 넣지 않아요`);
  for (const section of sections) for (const problem of section.problems) {
    assert.ok(!/\\[a-zA-Z]/.test(problem.text + problem.answerText), `${label}: 한글 복사 글에 TeX 명령이 남았어요 → ${problem.text} / ${problem.answerText}`);
    assert.ok(problem.answerText.trim().length > 0, `${label}: 빈 정답`);
    assert.ok(!/값를|범위를를|을를|를를/.test(problem.text), `${label}: 조사 → ${problem.text}`);
  }
}
const seeds = [1, 2, 3, 7, 11];
const grid = (from: number, to: number, step = 0.25) => Array.from({ length: Math.round((to - from) / step) + 1 }, (_, i) => from + i * step);

check("다항식: 조립제법·나머지 정리·인수분해", () => {
  const f = poly([6, -5, -2, 1]); // x³ − 2x² − 5x + 6 = (x − 1)(x + 2)(x − 3)
  const s = synthetic(f, q(1));
  assert.equal(ptex(s.quotient), "x^{2}-x-6");
  assert.equal(s.remainder.n, 0);
  assert.equal(factorTex(f), "(x-1)(x+2)(x-3)");
  assert.equal(factorTex(poly([-1, 0, 4])), "(2x-1)(2x+1)");
  assert.equal(factorTex(mul(mul(linear(2), linear(2)), linear(-1))), "(x+1)(x-2)^{2}");
  // 조립제법과 직접 나눗셈, 나머지 정리가 서로 맞는지 여러 식으로
  for (let a = -3; a <= 3; a += 1) for (const coeffs of [[5, -3, 0, 2], [-4, 6, -3, -1, 1], [7, 0, 1]]) {
    const p = poly(coeffs);
    const bySynthetic = synthetic(p, q(a));
    const byDivision = divide(p, linear(a));
    assert.equal(ptex(bySynthetic.quotient), ptex(byDivision.quotient));
    assert.equal(bySynthetic.remainder.n, evaluate(p, q(a)).n);
  }
  for (const seed of seeds) for (const coeffs of [[-6, 11, -6, 1], [8, -6, -3, 1], [-4, 0, 5, 0, -1]]) for (const root of factorRational(poly(coeffs)).roots) assert.equal(evaluate(poly(coeffs), root).n, 0, `근 ${seed}`);
  for (const seed of seeds) sheetOk(polyProblems(keys(polyAsks), 3, seed), `다항식 ${seed}`);
});

check("복소수·이차방정식·이차함수", () => {
  assert.equal(cTex(cMul(cx(2, 3), cx(1, -1))), "5+i");
  assert.equal(cTex(cDiv(cx(1, 5), cx(1, -1))), "-2+3i");
  assert.equal(solveQuadratic(1, -2, -2).rootsTex, "x=1\\pm \\sqrt{3}");
  assert.equal(solveQuadratic(1, 2, 5).rootsTex, "x=-1\\pm 2i");
  assert.equal(solveQuadratic(2, -1, -3).rootsTex, "x=-1\\ \\text{또는}\\ x=\\frac{3}{2}");
  assert.equal(solveQuadratic(1, 4, 4).D, 0);
  // 실근은 방정식에 대입해 0이 되는지 봅니다.
  for (let a = -3; a <= 3; a += 1) for (let b = -6; b <= 6; b += 1) for (let c = -6; c <= 6; c += 1) {
    if (!a) continue;
    for (const root of solveQuadratic(a, b, c).numeric) close(a * root * root + b * root + c, 0, `${a},${b},${c}`, 1e-6);
  }
  const parabola = { a: 1, b: -4, c: 1 };
  assert.equal(standardTex(parabola), "y=\\left(x-2\\right)^{2}-3");
  assert.equal(qNum(vertex(parabola).y), -3);
  // 제한된 범위의 최대·최소를 촘촘히 재어 본 값과 비교합니다.
  for (const [a, b, c, s, t] of [[1, -4, 1, -1, 3], [-1, 2, 3, 2, 5], [2, 0, -3, -2, 1], [-2, 8, 0, -1, 1]]) {
    const f = (x: number) => a * x * x + b * x + c;
    const values = grid(s, t, 0.001).map(f);
    const result = extremaOn({ a, b, c }, s, t);
    close(qNum(result.max.y), Math.max(...values), "최댓값", 1e-3);
    close(qNum(result.min.y), Math.min(...values), "최솟값", 1e-3);
  }
  // 이차부등식의 해는 여러 점에서 부호로 확인합니다.
  for (const [a, b, c] of [[1, -1, -6], [-1, 0, 4], [1, -2, 1], [1, 0, 1], [-2, 2, 4], [2, -3, 1]]) for (const sign of ["<", "<=", ">", ">="] as const) {
    const set = quadraticInequality({ a, b, c }, sign);
    for (const x of grid(-5, 5)) {
      const value = a * x * x + b * x + c;
      const want = sign === "<" ? value < 0 : sign === "<=" ? value <= 0 : sign === ">" ? value > 0 : value >= 0;
      assert.equal(contains(set, x), want, `${a}x²+${b}x+${c} ${sign} 0 at ${x}`);
    }
  }
  assert.equal(intervalTex(quadraticInequality({ a: 1, b: -2, c: 1 }, ">")), "x\\ne 1\\text{인 모든 실수}");
  assert.ok(planeSvg({ xMin: -5, xMax: 5, yMin: -5, yMax: 5, curves: [{ f: x => 1 / x }] }).startsWith("<svg"));
  for (const seed of seeds) { sheetOk(quadProblems(keys(quadAsks), 3, seed), `이차방정식 ${seed}`); sheetOk(functionProblems(keys(functionAsks), 3, seed), `이차함수 ${seed}`); }
});

check("방정식·부등식: 구간 계산과 문제", () => {
  for (const [a, b, sign, c] of [[2, -1, ">", 3], [-3, 2, "<=", 8], [1, 0, ">=", -2], [-1, 4, "<", 1]] as const) {
    const set = linearInequality(a, b, sign, c);
    for (const x of grid(-8, 8)) { const left = a * x + b; assert.equal(contains(set, x), sign === "<" ? left < c : sign === "<=" ? left <= c : sign === ">" ? left > c : left >= c); }
  }
  for (const [p, sign, k] of [[1, "<", 2], [-2, ">=", 3], [0, "<=", 1], [3, ">", 1]] as const) {
    const set = absoluteInequality(p, sign, k);
    for (const x of grid(-8, 8)) { const left = Math.abs(x - p); assert.equal(contains(set, x), sign === "<" ? left < k : sign === "<=" ? left <= k : sign === ">" ? left > k : left >= k); }
  }
  const system = solveSystem([{ a: 2, b: -1, sign: ">", c: 3 }, { a: 1, b: 3, sign: "<=", c: 8 }]);
  assert.equal(system.tex, "2<x\\le 5");
  assert.deepEqual(union([{ lo: 0, hi: 2, loIn: true, hiIn: false }], [{ lo: 2, hi: 4, loIn: true, hiIn: true }]), [{ lo: 0, hi: 4, loIn: true, hiIn: true }]);
  assert.equal(intersect([{ lo: 0, hi: 1, loIn: false, hiIn: false }], [{ lo: 1, hi: 2, loIn: true, hiIn: true }]).length, 0);
  for (const seed of seeds) sheetOk(equationProblems(keys(equationAsks), 3, seed), `방정식 ${seed}`);
});

check("경우의 수·행렬", () => {
  assert.equal(permutation(5, 3), 60);
  assert.equal(combination(10, 3), 120);
  assert.equal(combination(7, 7), 1);
  for (let n = 0; n <= 10; n += 1) for (let r = 0; r <= n; r += 1) assert.equal(combination(n, r) * factorial(r), permutation(n, r));
  for (const n of [36, 72, 97, 360, 1000]) { let brute = 0; for (let d = 1; d <= n; d += 1) if (n % d === 0) brute += 1; assert.equal(divisorCount(n).count, brute, `${n}의 약수`); }
  assert.deepEqual(matMul([[1, 2], [3, 4]], [[2, 0], [-1, 3]]), [[0, 6], [2, 12]]);
  assert.deepEqual(matMul([[1, 2, 3]], [[1], [0], [-1]]), [[-2]]);
  for (const seed of seeds) { sheetOk(countingProblems(keys(countingAsks), 2, seed), `경우의 수 ${seed}`); sheetOk(matrixProblems(keys(matrixAsks), 2, seed), `행렬 ${seed}`); }
});

check("도형의 방정식: 거리·직선·원·이동", () => {
  close(pointLineDistance({ x: 1, y: 2 }, { a: 3, b: 4, c: -1 }).value, 2, "점과 직선");
  assert.equal(pointLineDistance({ x: 0, y: 2 }, { a: 2, b: 1, c: 1 }).tex, "\\frac{3\\sqrt{5}}{5}");
  const p = internal({ x: -3, y: 4 }, { x: 3, y: -2 }, 2, 1);
  assert.deepEqual([qNum(p.x), qNum(p.y)], [1, 0]);
  const line = lineThrough({ x: 2, y: 3 }, { x: 3, y: -2 });
  assert.equal(line.a * 2 + line.b * 3 + line.c, 0);
  assert.equal(line.a * 3 + line.b * -2 + line.c, 0);
  // 원 위의 점에서의 접선은 그 점을 지나고 반지름에 수직입니다.
  for (const [cx, cy, x, y] of [[0, 0, 3, 4], [1, -1, 4, 3], [0, -3, 3, 1], [-2, 1, 0, 3]]) {
    const circle = { cx, cy, r2: (x - cx) ** 2 + (y - cy) ** 2 };
    const t = tangentAt(circle, { x, y });
    assert.equal(t.a * x + t.b * y + t.c, 0);
    assert.equal(t.a * -(y - cy) + t.b * (x - cx), 0);
    close(pointLineDistance({ x: cx, y: cy }, t).value, Math.sqrt(circle.r2), "접선과 중심의 거리");
    assert.equal(circleLine(circle, t).relation, "한 점에서 만난다(접한다)");
  }
  assert.equal(circleLine({ cx: 0, cy: 0, r2: 25 }, { a: 1, b: 1, c: -8 }).relation, "만나지 않는다");
  // 직선 위의 점을 옮긴 점은 옮긴 직선 위에 있습니다.
  for (const move of ["shift", "xAxis", "yAxis", "origin", "yx"] as Move[]) {
    const base = { a: 2, b: -3, c: 5 };
    const moved = moveLine(base, move, 3, -2);
    for (const x of [-2, 0, 1, 4]) { const point = movePoint({ x, y: (-base.c - base.a * x) / base.b }, move, 3, -2); close(moved.a * point.x + moved.b * point.y + moved.c, 0, move); }
  }
  for (const seed of seeds) { sheetOk(lineProblems(keys(lineAsks), 2, seed), `직선 ${seed}`); sheetOk(circleProblems(keys(circleAsks), 2, seed), `원 ${seed}`); sheetOk(moveProblems(keys(moveAsks), 2, seed), `이동 ${seed}`); }
});

check("집합과 명제·함수", () => {
  assert.deepEqual(truthSet({ kind: "divisor", k: 12 }, 12), [1, 2, 3, 4, 6, 12]);
  assert.deepEqual(truthSet({ kind: "prime", k: 0 }, 20), [2, 3, 5, 7, 11, 13, 17, 19]);
  assert.equal(conditionKind([{ lo: 2, hi: Infinity, loIn: false, hiIn: false }], [{ lo: 1, hi: Infinity, loIn: false, hiIn: false }]), "충분조건");
  assert.equal(conditionKind([{ lo: 1, hi: Infinity, loIn: false, hiIn: false }], [{ lo: 2, hi: Infinity, loIn: false, hiIn: false }]), "필요조건");
  assert.ok(subsetOf([{ lo: -1, hi: 1, loIn: false, hiIn: false }], [{ lo: -1, hi: 1, loIn: true, hiIn: true }]));
  assert.ok(vennSvg([{ name: "A", items: [1, 2] }, { name: "B", items: [2, 3] }, { name: "C", items: [3, 4] }], [1, 2, 3, 4, 5], { shade: ([a, b]) => a && b }).startsWith("<svg"));
  // 필요·충분조건 문제는 네 가지 답이 모두 나와야 합니다.
  const answers = new Set(seeds.concat([4, 5, 6, 8, 9, 10]).flatMap(seed => logicProblems(["condition"], 4, seed)[0].problems.map(problem => problem.answerText.split(" (")[0])));
  for (const name of ["충분조건", "필요조건", "필요충분조건", "필요조건도 충분조건도 아니다"]) assert.ok(answers.has(name), `조건 문제: ${name}`);
  assert.equal(classify({ from: [1, 2, 3], to: ["a", "b", "c"], arrows: [[1, "b"], [2, "c"], [3, "a"]] }).name, "일대일대응");
  assert.equal(classify({ from: [1, 2, 3], to: ["a", "b", "c", "d"], arrows: [[1, "b"], [2, "c"], [3, "a"]] }).name, "일대일함수(일대일대응은 아니다)");
  assert.ok(classify({ from: [1, 2, 3], to: ["a", "b"], arrows: [[1, "a"], [2, "b"]] }).name.startsWith("함수가 아니다"));
  assert.ok(mappingSvg({ from: [1, 2, 3], to: ["a", "b"], arrows: [[1, "a"], [1, "b"]] }).startsWith("<svg"));
  const f = lin(4, -4);
  for (const x of [-3, 0, 2, 5]) assert.equal(qNum(linAt(inverse(f), linAt(f, q(x)))), x);
  assert.equal(qNum(linAt(compose(lin(3, -3), lin(3, 3)), q(3))), 33);
  assert.ok(rationalSvg({ k: 2, p: 1, q: -1 }).startsWith("<svg") && radicalSvg({ sign: -1, a: -2, p: 1, q: 2 }).startsWith("<svg"));
  assert.deepEqual([josa("x-3", "으로"), josa("x-2", "으로"), josa("x-1", "으로"), josa("(3,\\ 4)", "을"), josa("x^{2}+1", "을"), josa("y=x+k", "이")], ["으로", "로", "로", "를", "을", "가"]);
  for (const seed of seeds) { sheetOk(setProblems(keys(setAsks), 2, seed), `집합 ${seed}`); sheetOk(logicProblems(keys(logicAsks), 2, seed), `명제 ${seed}`); sheetOk(function2Problems(keys(function2Asks), 2, seed), `함수 ${seed}`); }
});

console.log(`\n공통수학 1·2 검증 ${checks}개 항목 통과`);
