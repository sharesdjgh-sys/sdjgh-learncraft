/* 사회 교과 도구 · 정치·법(선거·의석 배분, 정부 형태, 법원·헌법 재판, 상속, 근로·임금)의 계산과 학습지를 확인합니다. npx tsx scripts/verify-social-politics.ts */
import assert from "node:assert/strict";
import { allocate, DEFAULT_PARTIES, districtResults, divisorTable, electionAsks, electionProblems, hemicycleSvg, koreanMixed, largestRemainder, type Party } from "../src/features/social/election";
import { checksSvg, compareTableHtml, governmentAsks, governmentProblems } from "../src/features/social/government";
import { courtLevelsSvg, criminalFlowSvg, judiciaryAsks, judiciaryProblems, trialDecision, trialsTableHtml } from "../src/features/social/judiciary";
import { bequestResult, familySvg, heirsOf, inheritanceAsks, inheritanceProblems, krw, reserveOf, shareText } from "../src/features/social/inheritance";
import { DEFAULT_WORK, laborAsks, laborProblems, MINIMUM_WAGE, monthHours, weekPay, workChecks } from "../src/features/social/labor";
import { problemSheetHtml, problemSheetText, type SheetSection } from "../src/features/social/sheet";

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
  for (const section of sections) for (const problem of section.problems) assert.ok(problem.answerText.trim(), `${label}: 정답 글`);
}
const seeds = [1, 2, 3, 7, 11];

check("선거: 헤어-니마이어·동트·생트라게", () => {
  // 교과서 예: 득표 100·80·30·20, 8석
  assert.deepEqual(divisorTable([100, 80, 30, 20], 8, "dhondt").seats, [4, 3, 1, 0]);
  assert.deepEqual(largestRemainder([100, 80, 30, 20], 8).seats, [3, 3, 1, 1]);
  // 생트라게는 1, 3, 5로 나눕니다: 100, 80, 33.3, 30, 26.7, 20(A), 20(D) | 16 → A 3석, B 2석, C 1석, D 1석
  assert.deepEqual(divisorTable([100, 80, 30, 20], 7, "sainte").seats, [3, 2, 1, 1]);
  assert.ok(divisorTable([100, 80, 30, 20], 7, "sainte").tie === false);
  // 동률: 두 정당이 같은 표면 마지막 의석이 동률입니다.
  assert.equal(divisorTable([50, 50], 1, "dhondt").tie, true);
  assert.equal(largestRemainder([50, 50], 1).tie, true);
  // 봉쇄 조항 3%: 2.56%인 정당은 0석
  const parties: Party[] = [{ name: "A", votes: 970, districts: 0 }, { name: "B", votes: 26, districts: 0 }];
  assert.deepEqual(allocate(parties, 10, "hare", 3), [10, 0]);
  for (const method of ["hare", "dhondt", "sainte"] as const) assert.equal(allocate(DEFAULT_PARTIES, 46, method, 3).reduce((a, b) => a + b, 0), 46, method);
});

check("선거: 준연동형(공직선거법 제189조)", () => {
  const result = koreanMixed(DEFAULT_PARTIES);
  assert.deepEqual(result.eligible, [true, true, true, true, false]);
  assert.equal(result.nonEligible, 3);
  assert.deepEqual(result.linked, [0, 6, 25, 7, 0]);
  assert.equal(result.kind, "residual");
  // 남은 8석을 득표 비율로: 3.44, 2.77, 1.37, 0.42 → 3, 2, 1, 0 + 소수 큰 순서 B, A
  assert.deepEqual(result.extra, [4, 3, 1, 0, 0]);
  assert.equal(result.proportional.reduce((a, b) => a + b, 0), 46);
  assert.deepEqual(result.total, [164, 99, 26, 8, 0]);
  // 연동 배분 합이 46석을 넘으면 조정 의석으로 줄입니다.
  // A: 300 × 0.4 ÷ 2 = 60, B: 52.5 → 53, C: 0 → 합 113 → 46 × 60/113 = 24.4, 46 × 53/113 = 21.6 → 24, 22
  const many: Party[] = [{ name: "A", votes: 400, districts: 0 }, { name: "B", votes: 350, districts: 0 }, { name: "C", votes: 250, districts: 254 }];
  const adjusted = koreanMixed(many);
  assert.deepEqual(adjusted.linked, [60, 53, 0]);
  assert.equal(adjusted.kind, "adjusted");
  assert.deepEqual(adjusted.proportional, [24, 22, 0]);
  // 반올림: 정확히 x.5면 올립니다. (300 × 0.25 − 0) ÷ 2 = 37.5 → 38
  const half = koreanMixed([{ name: "A", votes: 1, districts: 0 }, { name: "B", votes: 3, districts: 254 }], { seats: 300, proportional: 46 });
  assert.equal(half.linked[0], 38);
});

check("선거: 사표와 반원 그림", () => {
  const result = districtResults([{ name: "1", votes: [40, 35, 25] }, { name: "2", votes: [30, 45, 25] }], 3);
  assert.deepEqual(result.rows.map(row => row.winner), [0, 1]);
  assert.equal(result.wasted, 60 + 55);
  close(result.wastedRate, 115 / 200, "사표율");
  const svg = hemicycleSvg([{ label: "A", seats: 164, color: "#000" }, { label: "B", seats: 136, color: "#f00" }]);
  assert.equal((svg.match(/<circle/g) ?? []).length, 300);
  assert.equal((hemicycleSvg([{ label: "A", seats: 7, color: "#000" }]).match(/<circle/g) ?? []).length, 7);
  for (const seed of seeds) sheetOk(electionProblems(keys(electionAsks), 2, seed), `선거 ${seed}`);
});

check("정부 형태·법원·헌법 재판", () => {
  assert.ok(compareTableHtml().includes("의원 내각제") && checksSvg().startsWith("<svg") && courtLevelsSvg().includes("대법원") && criminalFlowSvg().includes("기소"));
  assert.ok(trialsTableHtml().includes("권한 쟁의"));
  assert.equal(trialDecision("review", 9, 5).ok, false);
  assert.equal(trialDecision("review", 9, 6).ok, true);
  assert.equal(trialDecision("impeachment", 8, 6).ok, true);
  assert.equal(trialDecision("competence", 9, 5).ok, true);
  assert.equal(trialDecision("competence", 8, 4).ok, false);
  assert.equal(trialDecision("competence", 7, 4).ok, true);
  assert.equal(trialDecision("complaint", 6, 6).ok, false);
  for (const seed of seeds) {
    sheetOk(governmentProblems(keys(governmentAsks), 2, seed), `정부 형태 ${seed}`);
    sheetOk(judiciaryProblems(keys(judiciaryAsks), 3, seed), `법원 ${seed}`);
  }
});

check("상속: 법정 상속분과 유류분", () => {
  // 배우자 + 자녀 2명: 1.5 : 1 : 1 → 3/7, 2/7, 2/7
  const a = heirsOf({ spouse: true, children: 2, parents: 1, siblings: 2 }).heirs;
  assert.deepEqual(a.map(shareText), ["3/7", "2/7", "2/7"]);
  // 배우자 + 부모 2명(자녀 없음): 3/7, 2/7, 2/7
  assert.deepEqual(heirsOf({ spouse: true, children: 0, parents: 2, siblings: 1 }).heirs.map(heir => heir.kind), ["spouse", "parent", "parent"]);
  // 배우자만(형제자매는 상속하지 못함)
  assert.deepEqual(heirsOf({ spouse: true, children: 0, parents: 0, siblings: 3 }).heirs.map(shareText), ["1"]);
  // 배우자 없이 형제자매 3명: 1/3씩
  assert.deepEqual(heirsOf({ spouse: false, children: 0, parents: 0, siblings: 3 }).heirs.map(shareText), ["1/3", "1/3", "1/3"]);
  // 배우자 + 자녀 1명: 3/5, 2/5
  assert.deepEqual(heirsOf({ spouse: true, children: 1, parents: 0, siblings: 0 }).heirs.map(shareText), ["3/5", "2/5"]);
  assert.equal(heirsOf({ spouse: false, children: 0, parents: 0, siblings: 0 }).heirs.length, 0);
  // 유류분: 자녀 2/7 × 1/2 = 1/7, 부모 × 1/3, 형제자매 0
  assert.deepEqual(reserveOf(a[1]), { top: 1, bottom: 7 });
  const parent = heirsOf({ spouse: false, children: 0, parents: 2, siblings: 0 }).heirs[0];
  assert.deepEqual(reserveOf(parent), { top: 1, bottom: 6 });
  assert.equal(reserveOf(heirsOf({ spouse: false, children: 0, parents: 0, siblings: 2 }).heirs[0]).top, 0);
  // 전 재산 7억 원 유증 → 자녀의 유류분 1억 원 부족
  const rows = bequestResult({ spouse: true, children: 2, parents: 0, siblings: 0 }, 7e8, 7e8);
  close(rows[1].shortfall, 1e8, "자녀 유류분 부족액");
  close(rows[0].shortfall, 1.5e8, "배우자 유류분 부족액");
  assert.equal(krw(350_000_000), "3억 5,000만 원");
  assert.equal(krw(12_345), "1만 2,345원");
  assert.ok(familySvg({ spouse: true, children: 6, parents: 2, siblings: 6 }, 7e8).startsWith("<svg"));
  for (const seed of seeds) sheetOk(inheritanceProblems(keys(inheritanceAsks), 3, seed), `상속 ${seed}`);
});

check("근로: 주휴·가산 수당과 최저 임금", () => {
  assert.equal(MINIMUM_WAGE[2026] * 209, 2_156_880);
  assert.equal(monthHours(48), 209);
  // 주 5일 4시간(20시간), 개근 → 주휴 4시간분
  const part = weekPay(DEFAULT_WORK);
  close(part.weeklyRestHours, 4, "주휴 시간");
  close(part.total, 24 * 10_320, "1주 임금");
  // 14시간은 주휴 없음
  assert.equal(weekPay({ ...DEFAULT_WORK, days: 2, hoursPerDay: 7 }).weeklyRest, 0);
  // 하루 10시간 × 5일: 연장 10시간, 주휴 8시간, 가산 50%
  const long = weekPay({ ...DEFAULT_WORK, age: 30, hoursPerDay: 10 });
  assert.equal(long.contract, 40);
  assert.equal(long.overtime, 10);
  close(long.total, (50 + 8 + 5) * 10_320, "연장 가산 포함");
  // 5명 미만은 가산 없음, 휴일 8시간 초과는 100%
  close(weekPay({ ...DEFAULT_WORK, hoursPerDay: 10, fivePlus: false }).premium, 0, "5명 미만");
  close(weekPay({ ...DEFAULT_WORK, holiday: 8, holidayOver: 2 }).premiums.holidayOver, 2 * 10_320, "휴일 초과");
  assert.equal(workChecks({ ...DEFAULT_WORK, wage: 10_000 })[0].ok, false);
  assert.ok(workChecks({ ...DEFAULT_WORK, night: 2 }).some(item => !item.ok && item.text.includes("인가")));
  assert.ok(workChecks({ ...DEFAULT_WORK, age: 14 }).some(item => item.text.includes("취직 인허증")));
  for (const seed of seeds) for (const year of [2025, 2026]) sheetOk(laborProblems(keys(laborAsks), 3, seed, year), `근로 ${seed} ${year}`);
});

console.log(`\n정치·법 ${checks}개 항목 통과`);
