/* 과학 교과 도구 2차(통합·탐구, 물리 7종, 화학 7종, 생명과학 5종, 지구과학 6종)의 계산과 학습지를 확인합니다. npm run test:science */
import assert from "node:assert/strict";
import { dataGraphSvg, dataPresets, linearFit, reportHtml } from "../src/features/science/datagraph";
import { convert, plainNumber, roundSig, scientific, sigFigs, unitAsks, unitProblems } from "../src/features/science/units";
import { quantize, signalAsks, signalProblems } from "../src/features/science/signal";
import { collide, momentumAsks, momentumProblems } from "../src/features/science/momentum";
import { image, opticKinds, opticProblems, opticSvg } from "../src/features/science/optics";
import { spectrumAsks, spectrumProblems, wavelength } from "../src/features/science/spectrum";
import { launch, motion2dAsks, motion2dProblems, resultant } from "../src/features/science/projectile";
import { escapeSpeed, gravityAsks, gravityProblems, PLANETS } from "../src/features/science/gravity";
import { nextState, processEnergy, rectangleCycle, thermoAsks, thermoProblems } from "../src/features/science/thermo";
import { harmonic, waveAsks, waveProblems } from "../src/features/science/waves";
import { lewisSvg, moleculeAsks, moleculeBy, MOLECULES, moleculeSheet, pairCounts } from "../src/features/science/molecules";
import { acidAsks, acidProblems, colligative, solutionAsks, solutionProblems, titrationPH } from "../src/features/science/solution";
import { constantText, direction, EQUILIBRIA, equilibriumAsks, equilibriumProblems, leChatelier } from "../src/features/science/equilibrium";
import { balance } from "../src/features/science/equation";
import { gasAsks, gasProblems, idealGas } from "../src/features/science/gas";
import { bondEnthalpy, BOND_REACTIONS, HESS_SETS, hessTotal, thermochemAsks, thermochemProblems } from "../src/features/science/thermochem";
import { firstOrder, kineticsAsks, kineticsProblems, randomRateLaw } from "../src/features/science/kinetics";
import { DEFAULT_CURVE, nervePotentials, neuronAsks, neuronProblems, potentialAt } from "../src/features/science/neuron";
import { meiosisAsks, meiosisProblems, STAGES } from "../src/features/science/meiosis";
import { DEFAULT_SURVEY, ecologyAsks, ecologyProblems, surveyResult } from "../src/features/science/ecology";
import { enzymeAsks, enzymeProblems, rate } from "../src/features/science/enzyme";
import { metabolismSheet } from "../src/features/science/metabolism";
import { randomStrata, strataOrder, strataProblems, strataSvg, unitAt } from "../src/features/science/strata";
import { EXTRA_STARS, hrAsks, hrProblems, starType } from "../src/features/science/hr";
import { maxElongation, planetAsks, planetProblems, synodic } from "../src/features/science/planets";
import { earthSystemAsks, earthSystemProblems, foehn, psDistance, tideTimes } from "../src/features/science/earth-system";
import { STAR_PRESETS } from "../src/features/science/stars";
import { problemSheetHtml, problemSheetText, seededRandom, type SheetSection } from "../src/features/science/sheet";

let checks = 0;
const check = (name: string, run: () => void) => { run(); checks += 1; console.log(`✓ ${name}`); };
const close = (actual: number, expected: number, message: string, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} ≠ ${expected}`);
const keys = <T extends string>(record: Record<T, string>) => Object.keys(record) as T[];
/** 학습지에 계산 오류(NaN 등)가 없고, 정답이 붙고, 한글 복사에는 그림이 빠지는지 봅니다. */
function sheetOk(sections: SheetSection[], label: string) {
  assert.ok(sections.length && sections.some(section => section.problems.length || section.intro), `${label}: 문항이 있어야 해요`);
  const html = problemSheetHtml(sections, { title: label, answers: true }, "screen");
  const clip = problemSheetHtml(sections, { title: label, answers: true }, "clipboard");
  const text = problemSheetText(sections, { title: label, answers: true });
  const bad = (html + text).match(/.{0,50}(NaN|undefined|Infinity|\[object).{0,50}/);
  assert.ok(!bad, `${label}: 계산이 비었어요 → ${bad?.[0]}`);
  assert.ok(html.includes("정답"), `${label}: 정답`);
  assert.ok(!clip.includes("<svg"), `${label}: 한글 복사에는 SVG를 넣지 않아요`);
}
const seeds = [1, 2, 3, 7, 11];

check("통합·탐구: 추세선·단위·유효숫자·신호", () => {
  const fit = linearFit([[0, 1], [1, 3], [2, 5], [3, 7]])!;
  close(fit.slope, 2, "기울기"); close(fit.intercept, 1, "절편"); close(fit.r2, 1, "R²");
  close(linearFit([[1, 2], [2, 4.2], [3, 5.8]], true)!.intercept, 0, "원점 직선");
  for (const preset of dataPresets) assert.ok(dataGraphSvg(preset.data, { kind: "line", fit: "linear" })?.startsWith("<svg"), preset.name);
  assert.ok(reportHtml({ kind: "report", title: "", question: "", hypothesis: "", independent: "a", dependent: "b", controlled: "", materials: "", steps: "", safety: "", trials: 3, rows: 5 }, null, null, "screen").includes("통제 변인"));
  assert.deepEqual(["0.00340", "12.050", "1002", "350.0", "0.5", "2.30×10⁴"].map(sigFigs), [3, 5, 4, 4, 1, 3]);
  assert.equal(roundSig(26.25, 2), "26");
  close(convert(72, "speed", "km/h", "m/s"), 20, "72 km/h"); close(convert(1, "density", "g/cm³", "kg/m³"), 1000, "밀도");
  assert.equal(scientific(299792458, 3), "2.998×10⁸");
  assert.equal(plainNumber(0.0000000016), "0.0000000016");
  assert.equal(quantize({ samples: 8, bits: 3, wave: "sine" }).every(sample => sample.code.length === 3 && sample.level < 8), true);
  for (const seed of seeds) { sheetOk(unitProblems(keys(unitAsks), 3, seed, ["length", "mass", "speed", "volume", "density", "pressure", "time"]), "단위"); sheetOk(signalProblems(keys(signalAsks), 2, seed), "신호"); }
});

check("물리: 충돌·렌즈·스펙트럼·포물선·중력·열역학·파동", () => {
  const swap = collide({ m1: 2, v1: 5, m2: 2, v2: 0, e: 1 });
  close(swap.after1, 0, "탄성 A"); close(swap.after2, 5, "탄성 B"); close(swap.loss, 0, "탄성 에너지 보존");
  const stick = collide({ m1: 2, v1: 6, m2: 1, v2: 0, e: 0 });
  close(stick.after1, 4, "한 덩어리"); close(stick.after2, 4, "한 덩어리 B"); close(stick.loss, 36 - 24, "줄어든 에너지");
  const real = image({ kind: "convexLens", focal: 10, distance: 30, height: 4 })!;
  close(real.b, 15, "볼록 렌즈 상 거리"); assert.equal(real.real, true); assert.equal(real.upright, false); close(real.magnification, -0.5, "배율");
  const virtual = image({ kind: "convexLens", focal: 10, distance: 5, height: 4 })!;
  close(virtual.b, -10, "허상"); assert.equal(virtual.upright, true);
  const mirror = image({ kind: "convexMirror", focal: 10, distance: 10, height: 4 })!;
  assert.equal(mirror.real, false); assert.ok(Math.abs(mirror.magnification) < 1, "볼록 거울은 축소 허상");
  assert.equal(image({ kind: "concaveLens", focal: 10, distance: 20, height: 4 })!.real, false, "오목 렌즈는 늘 허상");
  assert.equal(image({ kind: "convexLens", focal: 10, distance: 10, height: 4 }), null, "초점에서는 상이 없음");
  for (const kind of keys(opticKinds)) assert.ok(opticSvg({ kind, focal: 12, distance: 30, height: 4 }).startsWith("<svg"));
  close(wavelength({ from: 3, to: 2 }), 656.4, "Hα", 0.5);
  close(launch({ speed: 10, angle: 0, height: 20 }).time, 2, "수평 던지기 2 s");
  close(launch({ speed: 20, angle: 45, height: 0 }).range, 40, "45° 수평 거리", 1e-6);
  close(resultant([{ magnitude: 3, angle: 0 }, { magnitude: 4, angle: 90 }]).magnitude, 5, "3-4-5");
  const earth = PLANETS[2];
  close(escapeSpeed(earth.mass, earth.radius) / 1000, 11.2, "지구 탈출 속력", 0.1);
  for (const planet of PLANETS) close(planet.period ** 2 / planet.a ** 3, 1, `${planet.name} T²/a³`, 0.02);
  const start = { p: 200, v: 2 };
  const iso = processEnergy(start, nextState(start, "isobaric", 6), "isobaric");
  close(iso.work, 800, "등압 일"); close(iso.deltaU, 1200, "ΔU"); close(iso.heat, 2000, "Q");
  const adiabatic = processEnergy(start, nextState(start, "adiabatic", 4), "adiabatic");
  close(adiabatic.heat, 0, "단열 Q = 0", 1e-9);
  const cycle = rectangleCycle(300, 100, 1, 4);
  close(cycle.net, 600, "순환 알짜 일");
  assert.ok(cycle.efficiency > 0 && cycle.efficiency < 1);
  close(harmonic("closed", 0.85, 1).wavelength, 3.4, "닫힌 관 기본 진동"); close(harmonic("open", 1, 2).wavelength, 1, "열린 관 2배 진동");
  for (const seed of seeds) {
    sheetOk(momentumProblems(keys(momentumAsks), 2, seed), "운동량"); sheetOk(opticProblems(keys(opticKinds), 4, seed), "렌즈");
    sheetOk(spectrumProblems(keys(spectrumAsks), 2, seed), "스펙트럼"); sheetOk(motion2dProblems(keys(motion2dAsks), 2, seed), "평면 운동");
    sheetOk(gravityProblems(keys(gravityAsks), 2, seed), "중력"); sheetOk(thermoProblems(keys(thermoAsks), 2, seed), "열역학"); sheetOk(waveProblems(keys(waveAsks), 2, seed), "파동");
  }
});

check("화학: 분자 구조·용액·적정·평형·기체·엔탈피·속도", () => {
  const water = moleculeBy.get("H2O")!;
  assert.deepEqual([pairCounts(water).bonding, pairCounts(water).lone], [2, 2]);
  assert.equal(pairCounts(moleculeBy.get("CO2")!).bonding, 4);
  for (const molecule of MOLECULES) {
    const svg = lewisSvg(molecule, "line");
    const dots = (svg.match(/<circle/g) ?? []).length;
    const lone = molecule.centerLone + molecule.terminals.reduce((sum, item) => sum + item.lone, 0);
    assert.equal(dots, lone * 2, `${molecule.formula} 비공유 전자 점`);
    const dotStyle = (lewisSvg(molecule, "dot").match(/<circle/g) ?? []).length;
    assert.equal(dotStyle, lone * 2 + molecule.terminals.reduce((sum, item) => sum + item.bond, 0) * 2, `${molecule.formula} 전자점식 전자 수`);
  }
  close(titrationPH(0.1, 20, 0.1, 0, 1e8), 1, "0.1 M HCl pH", 0.01);
  close(titrationPH(0.1, 20, 0.1, 20, 1e8), 7, "강산 중화점 pH 7", 0.05);
  const weak = titrationPH(0.1, 20, 0.1, 20, 1.8e-5);
  assert.ok(weak > 8.5 && weak < 9, `약산 중화점 ${weak}`);
  close(titrationPH(0.1, 20, 0.1, 10, 1.8e-5), 4.74, "반중화점 pH = pKa", 0.02);
  const glucose = colligative(18, "C6H12O6", 1, 1);
  close(glucose.boilRise, 0.052, "끓는점 오름"); close(glucose.freezeDrop, 0.186, "어는점 내림");
  const decomposition = balance(EQUILIBRIA[5].equation);
  assert.ok(decomposition.ok && constantText(decomposition.equation, decomposition.coefficients) === "K = [CO₂] / 1", "고체는 평형 상수식에서 뺌");
  const haber = balance(EQUILIBRIA[0].equation);
  assert.ok(haber.ok && constantText(haber.equation, haber.coefficients) === "K = [NH₃]^2 / [N₂][H₂]^3");
  assert.equal(leChatelier(EQUILIBRIA[0]).find(row => row.change.startsWith("압력"))?.shift, "정반응 쪽", "하버: 압력 높이면 정반응");
  assert.equal(leChatelier(EQUILIBRIA[1]).find(row => row.change.startsWith("온도를 높"))?.shift, "정반응 쪽", "흡열 반응: 온도 높이면 정반응");
  assert.equal(direction(2, 4), "정반응 쪽으로 진행");
  close(idealGas({ v: 22.4, n: 1, t: 273 }).p!, 1, "표준 상태", 0.01);
  const known = [-221, -74.8, -136.8, -791.4, 66.4];
  HESS_SETS.forEach((set, index) => close(hessTotal(set), known[index], set.name, 0.05));
  HESS_SETS.forEach(set => set.steps.forEach(step => assert.ok(balance(step.equation).ok, step.equation)));
  assert.deepEqual(BOND_REACTIONS.map(bondEnthalpy), [-185, -482, -802, -93, -539]);
  close(firstOrder(1.6, 20, 40), 0.4, "반감기 두 번");
  const random = seededRandom(3);
  for (let index = 0; index < 20; index += 1) {
    const law = randomRateLaw(random);
    close(law.runs[1].rate / law.runs[0].rate, 2 ** law.m, "속도 법칙 m"); close(law.runs[2].rate / law.runs[0].rate, 2 ** law.n, "속도 법칙 n");
  }
  for (const seed of seeds) {
    sheetOk(moleculeSheet(["H2O", "NH3", "CH4", "CO2", "BF3", "HCN"], keys(moleculeAsks), "line"), "분자"); sheetOk(solutionProblems(keys(solutionAsks), 2, seed), "용액");
    sheetOk(acidProblems(keys(acidAsks), 2, seed), "산 염기"); sheetOk(equilibriumProblems(keys(equilibriumAsks), 2, seed), "평형");
    sheetOk(gasProblems(keys(gasAsks), 2, seed), "기체"); sheetOk(thermochemProblems(keys(thermochemAsks), 2, seed), "엔탈피"); sheetOk(kineticsProblems(keys(kineticsAsks), 2, seed), "반응 속도");
  }
});

check("생명과학: 흥분 전도·세포 분열·군집·효소·물질대사", () => {
  for (const [t, v] of DEFAULT_CURVE) close(potentialAt(DEFAULT_CURVE, t), t === 0 || t === 5 ? -70 : v, `${t} ms`);
  const values = nervePotentials({ speed: 2, points: [{ name: "Ⅰ", distance: 2 }, { name: "Ⅱ", distance: 4 }, { name: "Ⅲ", distance: 10 }] }, 4);
  assert.deepEqual(values.map(value => value.potential), [-70, 30, -70], "도달 뒤 3 ms, 2 ms, 아직 도달 안 함");
  assert.deepEqual(STAGES.meiosis.map(stage => [stage.ploidy, stage.chromosomes(2), stage.dna]), [["2n", 4, 2], ["2n", 4, 4], ["n", 2, 2], ["n", 2, 1]]);
  const survey = surveyResult(DEFAULT_SURVEY);
  close(survey.rows.reduce((sum, row) => sum + row.importance, 0), 300, "중요치 합 300");
  close(rate(1, 1, 1, "none"), 0.5, "[S] = Km이면 ½Vmax");
  assert.ok(rate(100, 1, 1, "competitive") > 0.95, "경쟁적 저해: 기질이 많으면 Vmax에 가까움");
  assert.ok(rate(100, 1, 1, "noncompetitive") < 0.55, "비경쟁적 저해: Vmax 자체가 낮음");
  for (const seed of seeds) {
    sheetOk(neuronProblems(keys(neuronAsks), 2, seed), "흥분 전도"); sheetOk(meiosisProblems(keys(meiosisAsks), seed), "세포 분열");
    sheetOk(ecologyProblems(keys(ecologyAsks), 2, seed, seed === 1 ? DEFAULT_SURVEY : null), "군집"); sheetOk(enzymeProblems(keys(enzymeAsks), seed), "효소");
  }
  sheetOk(metabolismSheet(["respiration", "photosynthesis"], { respiration: ["glycolysis", "citrate"], photosynthesis: ["rubp"] }, true), "물질대사");
});

check("지구과학: 지층 단면·H-R도·행성·지진파·대기·해양", () => {
  const random = seededRandom(5);
  for (let index = 0; index < 12; index += 1) {
    const options = { tilt: index % 2 === 0, fault: index % 3 !== 0, intrusion: index % 2 === 1, unconformity: index % 4 !== 3, late: index % 5 === 0 };
    const events = randomStrata(random, options);
    // 단면 아래쪽은 모두 암석이어야 합니다(빈틈 없음).
    for (let x = 5; x < 480; x += 40) for (let y = 5; y < 140; y += 30) assert.ok(unitAt(events, x, y), `빈틈 (${x}, ${y})`);
    const names = events.flatMap(event => event.type === "deposit" || event.type === "intrusion" ? [event.name] : []);
    assert.equal(new Set(names).size, names.length, "이름이 겹치지 않음");
    const order = strataOrder(events).join(" ");
    for (const name of names) assert.ok(order.includes(name), `${name}이 순서에 있음`);
    assert.ok(strataSvg(events).startsWith("<svg"));
  }
  const all = [...STAR_PRESETS, ...EXTRA_STARS];
  const type = (name: string) => { const star = all.find(item => item.name === name)!; return starType(star.radius, star.temperature); };
  assert.deepEqual(["태양", "시리우스 A", "시리우스 B", "베텔게우스", "리겔", "알데바란", "프록시마 센타우리"].map(type), ["주계열성", "주계열성", "백색 왜성", "초거성", "초거성", "거성", "주계열성"]);
  close(synodic(0.615), 1.6, "금성 회합 주기", 0.01); close(synodic(1.881), 2.135, "화성 회합 주기", 0.01);
  close(maxElongation(0.723), 46.3, "금성 최대 이각", 0.1);
  close(psDistance(20, 8, 4), 160, "PS시 20 s");
  const air = foehn(20, 12, 1500);
  close(air.lcl, 1000, "응결 고도"); close(air.atTop, 7.5, "산꼭대기"); close(air.leeward, 22.5, "푄");
  const tides = tideTimes(3);
  close(tides[1].hour - tides[0].hour, (12 + 25 / 60) / 2, "만조·간조 간격");
  for (const seed of seeds) {
    sheetOk(strataProblems(2, seed, { tilt: true, fault: true, intrusion: true, unconformity: true, late: true }, true), "지층");
    sheetOk(hrProblems(keys(hrAsks), seed, all), "H-R도"); sheetOk(planetProblems(keys(planetAsks), 2, seed), "행성");
    sheetOk(earthSystemProblems(keys(earthSystemAsks), 2, seed), "지구 시스템");
  }
});

console.log(`\n과학 교과 도구(추가) 확인 ${checks}개 통과`);
