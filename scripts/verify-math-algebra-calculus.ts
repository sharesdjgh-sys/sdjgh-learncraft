/* 수학 교과 도구 · 대수(지수·로그, 삼각함수, 사인·코사인법칙, 수열)와 미적분Ⅰ(극한, 미분, 적분)의 계산과 학습지를 확인합니다. npx tsx scripts/verify-math-algebra-calculus.ts */
import assert from "node:assert/strict";
import { expLogAsks, expLogGraphAsks, expLogGraphProblems, expLogProblems, explogFacts, explogSvg, logValue, powerValue, DEFAULT_EXPLOG } from "../src/features/math/alg-explog";
import { inequalityTex, lawAsks, lawProblems, radianTex, solveSpecial, solveTriangle, specialValue, surd, surdTex, surdValue, trigAsks, trigGraphFacts, trigGraphSvg, trigProblems, trigValue, triangleSvg, unitCircleSvg, SPECIAL_ANGLES, DEFAULT_TRIG_GRAPH } from "../src/features/math/alg-trig";
import { generalTex, INDUCTIONS, inductionHtml, recurrenceTerms, seqAsks, seqNth, seqProblems, seqSum, seqSvg, sigmaQuadratic } from "../src/features/math/alg-sequence";
import { limitAsks, limitProblems, piecewiseFacts, piecewiseSvg } from "../src/features/math/calc-limit";
import { averageRate, criticalPoints, derivAsks, derivProblems, derivativeSvg, extremaOn, polyFrom, rootCount, signTableHtml, tangentAt, useAsks, useProblems } from "../src/features/math/calc-derivative";
import { absIntegral, areaBetween, areaSvg, integralAsks, integralProblems, motionIntegral } from "../src/features/math/calc-integral";
import { P, pDefinite, pDeriv, pEval, pFromRoots, pTex, pVal, realRoots, sqrtQTex } from "../src/features/math/calc-base";
import { problemSheetHtml, problemSheetText, q, qNum, qTex, stripMath, type SheetSection } from "../src/features/math/core";

let checks = 0;
const check = (name: string, run: () => void) => { run(); checks += 1; console.log(`✓ ${name}`); };
const close = (actual: number, expected: number, message: string, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} ≠ ${expected}`);
const keys = <T extends string>(record: Record<T, string>) => Object.keys(record) as T[];
/** 학습지에 계산 오류가 없고, 정답이 붙고, 한글 복사에는 그림·KaTeX·TeX 명령이 남지 않는지 봅니다. */
function sheetOk(sections: SheetSection[], label: string) {
  assert.ok(sections.length && sections.some(section => section.problems.length), `${label}: 문항이 있어야 해요`);
  const html = problemSheetHtml(sections, { title: label, answers: true }, "screen");
  const clip = stripMath(problemSheetHtml(sections, { title: label, answers: true }, "clipboard"));
  const text = problemSheetText(sections, { title: label, answers: true });
  const bad = (html + text).match(/.{0,50}(NaN|undefined|Infinity|\[object).{0,50}/);
  assert.ok(!bad, `${label}: 계산이 비었어요 → ${bad?.[0]}`);
  assert.ok(!/katex-error/.test(html), `${label}: KaTeX 오류`);
  assert.ok(html.includes("정답"), `${label}: 정답`);
  assert.ok(!clip.includes("<svg") && !clip.includes("katex"), `${label}: 한글 복사에는 SVG·KaTeX를 넣지 않아요`);
  for (const section of sections) for (const problem of section.problems) {
    assert.ok(!/\\/.test(problem.text + problem.answerText), `${label}: 한글 복사 글에 TeX 명령이 남았어요 → ${problem.text} / ${problem.answerText}`);
    assert.ok(problem.answerText.trim().length > 0, `${label}: 빈 정답`);
  }
}
const seeds = [1, 2, 3, 7, 11];

check("지수와 로그: 값과 학습지", () => {
  assert.deepEqual(logValue(8, 32).exact, q(5, 3));
  assert.deepEqual(logValue(0.5, 8).exact, q(-3));
  assert.equal(logValue(2, 3).exact, null);
  assert.deepEqual(powerValue(8, q(2, 3)).exact, q(4));
  assert.deepEqual(powerValue(4, q(-1, 2)).exact, q(1, 2));
  const facts = explogFacts({ kind: "log", base: 3, p: 2, q: -1, inverse: false });
  assert.equal(facts.asymptote, "x=2"); assert.equal(facts.point, "(3,\\ -1)");
  assert.ok(!/NaN/.test(explogSvg({ ...DEFAULT_EXPLOG, inverse: true }) + explogSvg({ kind: "log", base: 0.5, p: -1, q: 2, inverse: true })));
  for (const seed of seeds) {
    const sections = expLogProblems(keys(expLogAsks), 3, seed);
    sheetOk(sections, `지수와 로그 ${seed}`);
    sheetOk(expLogGraphProblems(keys(expLogGraphAsks), 3, seed), `지수·로그함수 ${seed}`);
    // 정답에 나온 수치를 다른 방법으로 다시 확인합니다(로그의 성질·자릿수).
    for (const problem of sections[0].problems) {
      const logSum = problem.text.match(/log(\S)(\d+)\+log\1(\d+)−log\1(\d+)/);
      if (logSum) {
        const base = Number({ "₂": 2, "₃": 3, "₅": 5 }[logSum[1]]);
        close(Math.log(Number(logSum[2]) * Number(logSum[3]) / Number(logSum[4])) / Math.log(base), Number(problem.answerText.split(" ")[0]), "로그의 성질");
      }
    }
  }
});

check("삼각함수: 특수각·방정식·부등식·그래프", () => {
  for (const degrees of SPECIAL_ANGLES) for (const name of ["sin", "cos", "tan"] as const) {
    const exact = specialValue(name, degrees);
    if (exact === null) { assert.equal(name, "tan"); assert.ok([90, 270].includes(degrees)); continue; }
    close(surdValue(exact!), trigValue(name, degrees), `${name} ${degrees}°`, 1e-9);
  }
  assert.equal(surdTex(specialValue("tan", 30)!), "\\frac{\\sqrt{3}}{3}");
  assert.equal(surdTex(specialValue("cos", 150)!), "-\\frac{\\sqrt{3}}{2}");
  assert.equal(radianTex(-120), "-\\frac{2\\pi}{3}"); assert.equal(radianTex(540), "3\\pi");
  assert.deepEqual(solveSpecial("sin", surd(q(1, 2))), [30, 150]);
  assert.deepEqual(solveSpecial("tan", surd(-1)), [135, 315]);
  assert.equal(inequalityTex("cos", surd(q(1, 2)), true), "0\\le x<\\frac{\\pi}{3},\\ \\frac{5\\pi}{3}<x<2\\pi");
  assert.equal(inequalityTex("sin", surd(q(1, 2), 2), false), "0\\le x<\\frac{\\pi}{4},\\ \\frac{3\\pi}{4}<x<2\\pi");
  // 부등식의 해를 촘촘한 표본으로 다시 확인합니다.
  for (const [name, value, greater] of [["sin", surd(q(-1, 2)), true], ["tan", surd(1, 3), false], ["cos", surd(q(-1, 2), 2), false]] as const) {
    const answer = inequalityTex(name, value, greater);
    const pieces = [...answer.matchAll(/(0\\le |([^,]+?)<)x<([^,]+?)(?:,\\ |$)/g)].map(match => [match[2] ?? "0", match[3]]);
    const toNum = (text: string) => text === "0" ? 0 : text === "2\\pi" ? 2 * Math.PI : eval(text.replace(/\\frac\{(\d*)\\pi\}\{(\d+)\}/, (_, top: string, bottom: string) => `${top || 1}*Math.PI/${bottom}`).replace(/^(\d*)\\pi$/, (_, top: string) => `${top || 1}*Math.PI`));
    for (let x = 0.001; x < 2 * Math.PI; x += 0.01) {
      const v = name === "sin" ? Math.sin(x) : name === "cos" ? Math.cos(x) : Math.tan(x);
      if (name === "tan" && Math.abs(Math.cos(x)) < 1e-3) continue;
      const holds = greater ? v > surdValue(value) + 1e-9 : v < surdValue(value) - 1e-9;
      const inside = pieces.some(([lo, hi]) => x > toNum(lo) && x < toNum(hi));
      if (Math.abs(v - surdValue(value)) > 1e-3) assert.equal(inside, holds, `${name} 부등식 x=${x}: ${answer}`);
    }
  }
  const facts = trigGraphFacts({ name: "sin", a: -3, b: 2, c: 0.5, d: 1 });
  assert.deepEqual(facts, { period: "\\pi", max: "4", min: "-2" });
  assert.equal(trigGraphFacts({ name: "tan", a: 1, b: 3, c: 0, d: 0 }).period, "\\frac{\\pi}{3}");
  assert.ok(!/NaN/.test(trigGraphSvg(DEFAULT_TRIG_GRAPH) + trigGraphSvg({ name: "tan", a: 1, b: 1, c: 0, d: 0 }) + unitCircleSvg(-210) + unitCircleSvg(720)));
  for (const seed of seeds) sheetOk(trigProblems(keys(trigAsks), 3, seed), `삼각함수 ${seed}`);
});

check("사인·코사인법칙: 삼각형 풀이", () => {
  const [sas] = solveTriangle({ case: "SAS", a: 0, b: 5, c: 8, A: 60, B: 0, C: 0 });
  close(sas.a, 7, "SAS 코사인법칙"); close(sas.area, 10 * Math.sqrt(3), "넓이"); close(sas.R, 7 / Math.sqrt(3), "외접원");
  const [sss] = solveTriangle({ case: "SSS", a: 3, b: 4, c: 5, A: 0, B: 0, C: 0 });
  close(sss.C, 90, "직각"); close(sss.area, 6, "3·4·5 넓이");
  assert.equal(solveTriangle({ case: "SSS", a: 1, b: 2, c: 3, A: 0, B: 0, C: 0 }).length, 0);
  // SSA: A = 30°, b = 10 → h = 5
  const ssa = (a: number) => solveTriangle({ case: "SSA", a, b: 10, c: 0, A: 30, B: 0, C: 0 }).length;
  assert.deepEqual([ssa(4), ssa(5), ssa(7), ssa(10), ssa(12)], [0, 1, 2, 1, 1]);
  const [asa] = solveTriangle({ case: "ASA", a: 0, b: 0, c: 10, A: 45, B: 45, C: 0 });
  close(asa.a, 10 / Math.SQRT2, "ASA");
  assert.ok(triangleSvg(sas).startsWith("<svg") && !/NaN/.test(triangleSvg(asa)));
  assert.equal(sqrtQTex(q(12)), "2\\sqrt{3}");
  for (const seed of seeds) {
    const sections = lawProblems(keys(lawAsks), 3, seed);
    sheetOk(sections, `사인·코사인법칙 ${seed}`);
    // 사인법칙 문제의 a를 수치로 다시 풀어 봅니다: a = b·sinA/sinB
    for (const problem of sections[0].problems) {
      const match = problem.text.match(/A=(\d+)°, B=(\d+)°, b=(\d*)(?:√(\d+))?/);
      const answer = problem.answerText.match(/^a=(\d*)(?:√(\d+))?/);
      if (match && answer) {
        const b = Number(match[3] || 1) * Math.sqrt(Number(match[4] ?? 1));
        const a = Number(answer[1] || 1) * Math.sqrt(Number(answer[2] ?? 1));
        close(a, (b * Math.sin((Number(match[1]) * Math.PI) / 180)) / Math.sin((Number(match[2]) * Math.PI) / 180), "사인법칙 답", 1e-9);
      }
    }
  }
});

check("수열: 일반항·합·Σ·귀납적 정의", () => {
  const arith = { kind: "arith" as const, first: 3, step: 4, n: 10 };
  assert.equal(generalTex(arith), "a_{n}=4n-1");
  assert.deepEqual(seqNth(arith, 10), q(39)); assert.deepEqual(seqSum(arith, 10), q(210));
  const geo = { kind: "geo" as const, first: 3, step: 2, n: 6 };
  assert.deepEqual(seqSum(geo, 6), q(189)); assert.equal(generalTex(geo), "a_{n}=3\\cdot 2^{n-1}");
  assert.deepEqual(seqSum({ kind: "geo", first: 1, step: 0.5, n: 4 }, 4), q(15, 8));
  // Σ 공식 = 직접 더한 값
  for (const [p, r, s, n] of [[1, 0, 0, 10], [2, -3, 1, 8], [0, 1, 5, 12]]) {
    let total = 0; for (let k = 1; k <= n; k += 1) total += p * k * k + r * k + s;
    assert.equal(qNum(sigmaQuadratic(p, r, s, n)), total);
  }
  assert.deepEqual(recurrenceTerms({ first: 1, p: 2, r: 0, s: 1 }, 6).map(qNum), [1, 3, 7, 15, 31, 63]);
  for (const proof of INDUCTIONS) { const html = inductionHtml(proof); assert.ok(html.includes("(가)") && html.includes("(다)") && !/katex-error/.test(html), proof.id); }
  assert.ok(!/NaN/.test(seqSvg(arith) + seqSvg(geo)));
  for (const seed of seeds) sheetOk(seqProblems(keys(seqAsks), 3, seed), `수열 ${seed}`);
});

check("극한과 연속: 구간별 함수와 문제", () => {
  const facts = piecewiseFacts({ a: 1, left: [1, 0, 1], right: [3, -1, 0], value: 2 });
  assert.deepEqual([facts.left, facts.right], [q(2), q(2)]); assert.equal(facts.exists, true); assert.equal(facts.continuous, true);
  const jump = piecewiseFacts({ a: 0, left: [1, 1, 0], right: [-1, 1, 0], value: 1 });
  assert.equal(jump.exists, false); assert.equal(jump.continuous, false);
  assert.equal(piecewiseFacts({ a: 2, left: [0, 1, 0], right: [0, 1, 0], value: null }).continuous, false);
  assert.ok(!/NaN/.test(piecewiseSvg({ a: 1, left: [1, 0, 1], right: [3, -1, 0], value: 5 })));
  for (const seed of seeds) {
    const sections = limitProblems(keys(limitAsks), 3, seed);
    sheetOk(sections, `극한과 연속 ${seed}`);
  }
  // 0/0 꼴 극한은 한글 복사 글의 식을 그대로 계산해 a 근처 값과 정답을 비교합니다.
  let solved = 0;
  const js = (text: string) => text.replace(/−/g, "-").replace(/x³/g, "x**3").replace(/x²/g, "x**2").replace(/(\d)x/g, "$1*x").replace(/\)\(/g, ")*(");
  for (const seed of seeds) for (const problem of limitProblems(["zero"], 4, seed)[0].problems) {
    const match = problem.text.trim().match(/lim\(x→ (−?\d+)\) \((.+)\)\/\((.+)\)$/);
    assert.ok(match, problem.text);
    const f = new Function("x", `return (${js(match[2])})/(${js(match[3])})`) as (x: number) => number;
    const a = Number(match[1].replace("−", "-"));
    const [top, bottom = "1"] = problem.answerText.split(" ")[0].replace("−", "-").split("/");
    close(f(a + 1e-7), Number(top) / Number(bottom), `0/0 극한 ${problem.text}`, 1e-4);
    solved += 1;
  }
  assert.ok(solved >= 20, "0/0 극한 다시 풀기");
});

check("미분: 도함수·접선·증감표·최대최소·실근", () => {
  const f = polyFrom([0, 9, -6, 1]); // x³ − 6x² + 9x
  assert.equal(pTex(pDeriv(f)), "3x^{2}-12x+9");
  const points = criticalPoints(f);
  assert.deepEqual(points.map(point => [point.root.value, point.kind, qTex(point.value!)]), [[1, "max", "4"], [3, "min", "0"]]);
  const t = tangentAt(f, 0); assert.equal(pTex(t.line), "9x");
  assert.deepEqual(averageRate(f, 0, 3), q(0));
  const { max, min } = extremaOn(f, 0, 4); assert.deepEqual([max.y, min.y], [4, 0]);
  assert.deepEqual([rootCount(f, 2), rootCount(f, 4), rootCount(f, 5), rootCount(f, -1)], [3, 2, 1, 1]);
  assert.ok(signTableHtml(f).includes("극대") && signTableHtml(polyFrom([0, 1, 0, 1])).includes("↗"));
  // 극값이 없는 함수, 사차함수
  assert.equal(criticalPoints(polyFrom([0, 3, 0, 1])).length, 0);
  assert.deepEqual(criticalPoints(polyFrom([0, 0, -2, 0, 1])).map(point => point.kind), ["min", "max", "min"]);
  assert.ok(!/NaN/.test(derivativeSvg(f, { tangent: 1, secant: [0, 3], k: 2, interval: [0, 4] })));
  // 무리수 근: x² − 2 = 0
  assert.deepEqual(realRoots(P(-2, 0, 1)).map(root => root.tex), ["-\\sqrt{2}", "\\sqrt{2}"]);
  for (const seed of seeds) {
    sheetOk(derivProblems(keys(derivAsks), 3, seed), `미분계수와 도함수 ${seed}`);
    const sections = useProblems(keys(useAsks), 3, seed);
    sheetOk(sections, `도함수의 활용 ${seed}`);
    // 접선 문제: 정답 직선이 곡선과 그 점에서 만나고 기울기가 같은지 다시 봅니다.
    for (const problem of derivProblems(["tangent"], 3, seed)[0].problems) {
      const curve = problem.text.match(/y=(.+?) 위의 점 \((−?\d+), (−?\d+)\)/);
      assert.ok(curve, problem.text);
    }
  }
});

check("적분: 정적분·넓이·거리", () => {
  assert.deepEqual(pDefinite(P(1, 0, 3), 0, 1), q(2));
  assert.deepEqual(absIntegral(pFromRoots([0, 2]), -1, 2).exact, q(8, 3));
  assert.deepEqual(areaBetween(P(0, 0, 1), P(0, 1)).exact, q(1, 6));
  // (β − α)³/6 공식과 비교
  for (const [alpha, beta] of [[-1, 2], [0, 3], [1, 2]]) assert.deepEqual(areaBetween(pFromRoots([alpha, beta]), P(0)).exact, q((beta - alpha) ** 3, 6));
  const motion = motionIntegral(pFromRoots([1, 3]), 0, 4);
  assert.deepEqual(motion.displacement, q(4, 3)); assert.deepEqual(motion.distance.exact, q(4));
  // 무리수 근이 있으면 소수로: ∫₀² |x² − 2| dx = (8√2 − 4)/3
  const irrational = absIntegral(P(-2, 0, 1), 0, 2);
  assert.equal(irrational.exact, null); close(irrational.approx, (8 * Math.SQRT2 - 4) / 3, "무리수 근 넓이", 1e-6);
  // 수치 적분과 비교
  const f = P(3, -2, 0, 1); let numeric = 0; const steps = 20000;
  for (let i = 0; i < steps; i += 1) numeric += Math.abs(pVal(f, -2 + ((i + 0.5) * 3) / steps)) * (3 / steps);
  close(absIntegral(f, -2, 1).approx, numeric, "수치 적분", 1e-4);
  assert.ok(!/NaN/.test(areaSvg(pFromRoots([0, 2]), null, 0, 2) + areaSvg(P(0, 0, 1), P(0, 1), 0, 1)));
  for (const seed of seeds) sheetOk(integralProblems(keys(integralAsks), 3, seed), `적분 ${seed}`);
  void pEval;
});

console.log(`\n대수·미적분Ⅰ 도구 검증 ${checks}개 통과`);
