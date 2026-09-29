/* 과학 교과 도구(물리·화학·생명과학·지구과학)의 계산과 학습지를 확인합니다. npm run test:science */
import assert from "node:assert/strict";
import { circuitSheet, circuitSvg, fracValue, randomCircuit, solveCircuit, topologyKeys } from "../src/features/science/circuit";
import { dnaSheet, express, peptideText, randomGene, CODONS } from "../src/features/science/dna";
import { bohrSvg, configText, ELEMENTS, elementBySymbol, position, shells, valenceElectrons } from "../src/features/science/elements";
import { electronSheet, periodicSheetHtml, periodicTableHtml } from "../src/features/science/elements-sheet";
import { atomCounts, balance, equationSheet, molarMass, parseSpecies, REACTIONS, reactionGroups } from "../src/features/science/equation";
import { calendarDate, ERAS, geologicSheet, CALENDAR_EVENTS } from "../src/features/science/geologic";
import { geneticsSheet, genePresets, presetGene, randomCross, solveCross, type Gene } from "../src/features/science/genetics";
import { motionBoundaries, motionPresets, motionSheet, motionTotals } from "../src/features/science/motion";
import { ageFromRemaining, datingProblems, ISOTOPES, remainingFromRatio } from "../src/features/science/radiometric";
import { problemSheetHtml, problemSheetText, ratio, seededRandom } from "../src/features/science/sheet";
import { absoluteMagnitude, luminosity, peakWavelength, spectralClass, starProblems } from "../src/features/science/stars";

let checks = 0;
const check = (name: string, run: () => void) => { run(); checks += 1; console.log(`✓ ${name}`); };
const close = (actual: number, expected: number, message: string, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} ≠ ${expected}`);
const sheetOk = (sections: ReturnType<typeof motionSheet>, label: string) => {
  const html = problemSheetHtml(sections, { title: label, answers: true }, "screen");
  const clip = problemSheetHtml(sections, { title: label, answers: true }, "clipboard");
  const text = problemSheetText(sections, { title: label, answers: true });
  assert.ok(html.includes("정답"), `${label}: 정답이 있어야 해요`);
  assert.ok(!/NaN|undefined|Infinity/.test(html + text), `${label}: 계산이 비었어요\n${(html + text).match(/.{0,60}(NaN|undefined|Infinity).{0,60}/)?.[0]}`);
  assert.ok(!clip.includes("<svg"), `${label}: 한글 복사에는 그림(SVG)을 넣지 않아요`);
  return { html, text };
};

check("운동 그래프: 경계값·변위·이동 거리", () => {
  const motion = { v0: 0, segments: [{ duration: 2, a: 3 }, { duration: 3, a: 0 }, { duration: 3, a: -2 }] };
  const points = motionBoundaries(motion);
  assert.deepEqual(points.map(point => point.t), [0, 2, 5, 8]);
  assert.deepEqual(points.map(point => point.v), [0, 6, 6, 0]);
  close(points[3].x, 6 + 18 + 9, "가속→등속→감속 변위");
  // 되돌아오는 운동: v0 = 6, a = −2, 6초 → 3초에 멈추고 되돌아옴. 변위 0, 이동 거리 18
  const back = motionTotals({ v0: 6, segments: [{ duration: 6, a: -2 }] });
  close(back.displacement, 0, "되돌아오는 운동 변위");
  close(back.distance, 18, "되돌아오는 운동 이동 거리");
  // 위로 던진 물체 20 m/s, 4초: 최고점 20 m, 제자리
  const up = motionTotals(motionPresets.find(preset => preset.name.startsWith("위로"))!.motion);
  close(up.distance, 40, "위로 던진 물체 이동 거리");
  for (const preset of motionPresets) sheetOk(motionSheet(preset.motion, { given: "v", ask: ["accel", "distance", "average", "draw"] }), preset.name);
  const { html } = sheetOk(motionSheet(motion, { given: "x", ask: ["accel", "draw"] }), "x-t");
  assert.ok(html.includes("속도-시간 그래프") && html.includes("가속도-시간 그래프"));
});

check("저항 회로: 합성 저항·전류·전압 분배", () => {
  // 4 Ω + (6 Ω ∥ 3 Ω) = 6 Ω, 12 V → 2 A. 병렬부 4 V → 6 Ω 2/3 A, 3 Ω 4/3 A
  const result = solveCircuit({ topology: "sp", voltage: 12, resistors: [4, 6, 3] });
  close(fracValue(result.total), 6, "합성 저항");
  close(fracValue(result.current), 2, "전체 전류");
  close(fracValue(result.resistors[0].v), 8, "R1 전압");
  close(fracValue(result.resistors[1].i), 2 / 3, "R2 전류");
  close(fracValue(result.resistors[2].i), 4 / 3, "R3 전류");
  const parallel = solveCircuit({ topology: "ps", voltage: 12, resistors: [2, 4, 6] });
  close(fracValue(parallel.total), 3, "(2+4)∥6");
  // 모든 연결에서 저항별 전력의 합 = 전체 전력, 전압 합(직렬 경로) 확인
  for (const topology of topologyKeys) for (let seed = 1; seed <= 25; seed += 1) {
    const circuit = randomCircuit(topology, seed);
    const solved = solveCircuit(circuit);
    close(solved.resistors.reduce((sum, item) => sum + fracValue(item.p), 0), fracValue(solved.power), `${topology} 전력 합`, 1e-9);
    assert.ok(circuitSvg(circuit).startsWith("<svg"));
  }
  assert.deepEqual(randomCircuit("pp", 3), randomCircuit("pp", 3), "같은 seed면 같은 회로");
  sheetOk(circuitSheet(topologyKeys, 7, ["total", "current", "each", "power"], 1), "회로");
});

check("원소 118개·주기율표 자리·전자 배치", () => {
  assert.equal(ELEMENTS.length, 118);
  assert.equal(new Set(ELEMENTS.map(element => element.symbol)).size, 118);
  const at = (symbol: string) => position(elementBySymbol.get(symbol)!.z);
  assert.deepEqual([at("H").group, at("He").group, at("B").group, at("Ne").group, at("K").group, at("Fe").group, at("Hf").group, at("Og").group], [1, 18, 13, 18, 1, 8, 4, 18]);
  assert.equal(at("La").fRow, true);
  assert.equal(at("Lu").fRow, true);
  assert.equal(at("Og").period, 7);
  // 칸이 겹치지 않아야 합니다.
  const cells = new Set(ELEMENTS.map(element => { const place = position(element.z); return `${place.row}-${place.column}`; }));
  assert.equal(cells.size, 118);
  assert.equal(configText(8), "1s² 2s² 2p⁴");
  assert.equal(configText(24), "1s² 2s² 2p⁶ 3s² 3p⁶ 4s¹ 3d⁵", "크로뮴 예외");
  assert.equal(configText(29), "1s² 2s² 2p⁶ 3s² 3p⁶ 4s¹ 3d¹⁰", "구리 예외");
  assert.deepEqual(shells(20), [2, 8, 8, 2]);
  assert.deepEqual(shells(17), [2, 8, 7]);
  for (const element of ELEMENTS) assert.equal(shells(element.z).reduce((a, b) => a + b, 0), element.z, `${element.symbol} 전자 수`);
  assert.deepEqual([1, 2, 4, 6, 10, 11, 17, 18].map(valenceElectrons), [1, 0, 2, 4, 0, 1, 7, 0], "He·18족은 0");
  assert.equal(valenceElectrons(26), null, "전이 금속은 따로 셈");
  assert.equal(elementBySymbol.get("Tc")!.massNumber, true);
  assert.equal(elementBySymbol.get("U")!.massNumber, false);
  assert.ok(bohrSvg(11).split('fill="#2563eb"').length - 1 === 11, "원자 모형 전자 점 11개");
  const html = periodicTableHtml({ range: 118, blank: "none", color: "category", mass: true, seed: 1, answers: false });
  for (const element of ELEMENTS) assert.ok(html.includes(`>${element.symbol}<`), `${element.symbol} 칸`);
  const blank = periodicSheetHtml("", { range: 20, blank: "symbol", color: "metal", mass: false, seed: 1, answers: true }, "screen");
  assert.ok(blank.includes("정답"));
  sheetOk(electronSheet([1, 6, 8, 11, 17, 20, 26], ["config", "shells", "valence", "bohr"]), "전자 배치");
});

check("화학식 읽기·계수 맞추기", () => {
  assert.deepEqual([...parseSpecies("Ca(OH)2").atoms], [["Ca", 1], ["O", 2], ["H", 2]]);
  assert.deepEqual(Object.fromEntries(parseSpecies("CuSO4·5H2O").atoms), { Cu: 1, S: 1, O: 9, H: 10 });
  assert.deepEqual(Object.fromEntries(parseSpecies("Fe₂(SO₄)₃").atoms), { Fe: 2, S: 3, O: 12 });
  assert.equal(parseSpecies("SO4^2-").charge, -2);
  assert.equal(parseSpecies("Fe³⁺").charge, 3);
  assert.equal(parseSpecies("Co").atoms.get("Co"), 1);
  assert.throws(() => parseSpecies("Xy2"));
  const expect = (equation: string, coefficients: number[]) => {
    const result = balance(equation);
    assert.ok(result.ok, `${equation}: ${!result.ok && result.reason}`);
    assert.deepEqual(result.coefficients, coefficients, equation);
  };
  expect("H2 + O2 -> H2O", [2, 1, 2]);
  expect("C3H8 + O2 → CO2 + H2O", [1, 5, 3, 4]);
  expect("2Al + HCl = AlCl3 + H2", [2, 6, 2, 3]);
  expect("Cu + HNO3 -> Cu(NO3)2 + NO + H2O", [3, 8, 3, 2, 4]);
  expect("KMnO4 + HCl -> KCl + MnCl2 + Cl2 + H2O", [2, 16, 2, 2, 5, 8]);
  expect("MnO4^- + H^+ + Fe^2+ -> Mn^2+ + Fe^3+ + H2O", [1, 8, 5, 1, 5, 4]);
  expect("Cu + Ag⁺ → Cu²⁺ + Ag", [1, 2, 1, 2]);
  expect("Fe^3+ + e- -> Fe^2+", [1, 1, 1]);
  assert.ok(equationSheet({ groups: ["이온 반응식"], count: 7, stoichiometry: false, seed: 1, answers: true })[0].problems.every(problem => /[⁺⁻]/.test(problem.text)), "이온 전하가 글에도 남음");
  assert.equal(balance("H2 + O2 -> H2O2 + H2O").ok, false, "두 반응이 섞이면 알려 줌");
  assert.equal(balance("H2 -> O2").ok, false);
  for (const reaction of REACTIONS) {
    const result = balance(reaction.equation);
    assert.ok(result.ok, `${reaction.equation}: ${!result.ok && result.reason}`);
    for (const row of atomCounts(result.equation, result.coefficients)) assert.equal(row.left, row.right, `${reaction.equation} ${row.symbol}`);
  }
  close(molarMass("H2O", "textbook").total, 18, "물 몰 질량(어림)");
  close(molarMass("C6H12O6", "textbook").total, 180, "포도당");
  close(molarMass("NaCl", "textbook").total, 58.5, "염화 나트륨");
  close(molarMass("H2O", "precise").total, 18.015, "물 몰 질량(정밀)", 1e-3);
  const sections = equationSheet({ groups: [...reactionGroups], count: 12, stoichiometry: true, seed: 3, answers: true });
  assert.ok(sections.length === 2 && sections[1].problems.length >= 2);
  // CH4 16 g → CO2 44 g
  const { html } = sheetOk(sections, "반응식");
  assert.ok(html.includes("<sub>"));
});

check("유전: 단성·양성 잡종, 불완전 우성, ABO", () => {
  const [round, yellow] = genePresets;
  const genes: Gene[] = [presetGene(round, "a"), presetGene(yellow, "b")];
  const dihybrid = solveCross({ genes, mother: ["Rr", "Yy"], father: ["Rr", "Yy"] });
  assert.equal(dihybrid.total, 16);
  assert.deepEqual(dihybrid.phenotypes.map(item => item.count), [9, 3, 3, 1]);
  assert.equal(dihybrid.genotypes.length, 9);
  assert.equal(dihybrid.square.length, 4);
  const pink = genePresets.find(preset => preset.kind === "incomplete")!;
  const incomplete = solveCross({ genes: [presetGene(pink, "c")], mother: ["Rr"], father: ["Rr"] });
  assert.deepEqual(incomplete.phenotypes.map(item => [item.phenotype, item.count]), [["분홍색", 2], ["빨간색", 1], ["흰색", 1]]);
  const abo = genePresets.find(preset => preset.kind === "abo")!;
  const blood = solveCross({ genes: [presetGene(abo, "d")], mother: ["AO"], father: ["BO"] });
  assert.deepEqual(blood.phenotypes.map(item => item.phenotype).sort(), ["AB형", "A형", "B형", "O형"]);
  assert.ok(blood.genotypes.some(item => item.genotype === "AB"), "대립유전자 순서 A·B·O");
  const test = solveCross({ genes: [genes[0]], mother: ["Rr"], father: ["rr"] });
  assert.deepEqual(ratio(test.phenotypes.map(item => item.count)), [1, 1], "검정 교배");
  const random = seededRandom(5);
  for (let index = 0; index < 30; index += 1) {
    const cross = randomCross(random, index % 2 ? 2 : 1, ["complete", "incomplete", "abo"]);
    assert.equal(cross.genes.length, index % 2 ? 2 : 1);
    assert.equal(new Set(cross.genes.map(gene => gene.letter || gene.kind)).size, cross.genes.length, "형질 글자 겹치지 않음");
  }
  sheetOk(geneticsSheet({ count: 6, geneCount: 2, kinds: ["complete", "incomplete", "abo"], asks: ["gametes", "square", "genotypeRatio", "phenotypeRatio", "probability"], seed: 2, answers: true }, null), "유전");
});

check("DNA: 상보 가닥·전사·번역", () => {
  assert.equal(CODONS.size, 64);
  assert.equal([...CODONS.values()].filter(value => value === "Stop").length, 3);
  const result = express("TACAAACCGATT", "template");
  assert.equal(result.mrna, "AUGUUUGGCUAA");
  assert.equal(result.coding, "ATGTTTGGCTAA");
  assert.deepEqual(result.codons.map(item => item.amino), ["Met", "Phe", "Gly", "Stop"]);
  assert.equal(peptideText(result), "메싸이오닌 - 페닐알라닌 - 글리신");
  const fromCoding = express("GGATGAAATAGC", "coding");
  assert.equal(fromCoding.mrna, "GGAUGAAAUAGC");
  assert.deepEqual(fromCoding.codons.map(item => item.amino), ["Met", "Lys", "Stop"]);
  const random = seededRandom(9);
  for (let index = 0; index < 30; index += 1) {
    const gene = express(randomGene(random, 5), "template");
    assert.equal(gene.codons.length, 7, "개시 + 5 + 종결");
    assert.ok(gene.stopped);
    assert.equal(gene.codons.filter(item => item.amino === "Stop").length, 1);
  }
  sheetOk(dnaSheet({ count: 4, length: 4, given: "template", asks: ["complement", "mrna", "peptide", "codonCount"], table: true, seed: 1, answers: true }, null), "DNA");
});

check("지질 시대·지구 달력", () => {
  for (const era of ERAS) {
    assert.equal(era.periods[0].start, era.start, `${era.name} 시작`);
    assert.equal(era.periods[era.periods.length - 1].end, era.end, `${era.name} 끝`);
    era.periods.forEach((period, index) => { if (index) assert.equal(era.periods[index - 1].end, period.start, `${period.name} 이어짐`); });
  }
  assert.deepEqual(calendarDate(4600), { month: 1, day: 1, hour: 0, minute: 0, seconds: 0, text: "1월 1일" });
  assert.equal(calendarDate(66).text, "12월 26일");
  assert.ok(calendarDate(0.3).text.startsWith("12월 31일 23시"));
  sheetOk(geologicSheet({ blank: "some", bar: true, calendar: true, calendarBlank: true, fossils: true, seed: 1, answers: true }, CALENDAR_EVENTS), "지질 시대");
});

check("방사성 연대·별의 물리량", () => {
  close(ageFromRemaining(0.25, 5730).age, 11460, "¹⁴C 25%");
  close(remainingFromRatio(1, 7), 1 / 8, "1:7");
  for (let seed = 1; seed <= 20; seed += 1) {
    const text = problemSheetText(datingProblems(["remaining", "ratio"], 3, seed, ISOTOPES), { title: "", answers: true });
    for (const match of text.matchAll(/(\d[\d,.]*)억 년 \(반감기/g)) assert.ok(Number(match[1].replace(/,/g, "")) <= 46, `지구 나이보다 오래된 답: ${match[0]}`);
  }
  sheetOk(datingProblems(["remaining", "ratio", "after", "graph"], 2, 1, ISOTOPES), "방사성");
  close(peakWavelength(5800), 499.66, "태양 최대 파장", 0.01);
  close(luminosity(2, 11600), 64, "R 2배, T 2배 → 64배");
  close(absoluteMagnitude(5, 100), 0, "100 pc");
  assert.equal(spectralClass(5800).type, "G");
  assert.equal(spectralClass(3000).type, "M");
  sheetOk(starProblems(["wien", "luminosity", "magnitude", "brightness"], 3, 1), "별");
  for (let seed = 1; seed <= 20; seed += 1) {
    const text = problemSheetText(starProblems(["luminosity"], 3, seed), { title: "", answers: true });
    assert.ok(!/\d\.\d+배 \(L/.test(text), `광도 비는 분수로: ${text}`);
  }
  const circuitHtml = problemSheetHtml(circuitSheet(["sp"], 1, ["each"], 1), { title: "", answers: false }, "screen");
  assert.ok(circuitHtml.indexOf("<svg") < circuitHtml.indexOf("<table"), "회로도가 표보다 먼저");
});

console.log(`\n과학 교과 도구 확인 ${checks}개 통과`);
