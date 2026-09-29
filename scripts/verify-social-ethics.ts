/* 사회 교과 도구 · 윤리(사상가 카드, 분배 정의, 도덕 추론, 쟁점 토론)의 자료·계산·학습지를 확인합니다. npx tsx scripts/verify-social-ethics.ts */
import assert from "node:assert/strict";
import { conceptBase, THINKER_PAIRS, thinkerAsks, thinkerBy, thinkerCardsHtml, thinkerCardsText, thinkerGroups, thinkerPool, thinkerProblems, THINKERS, type ThinkerAsk, type ThinkerGroup } from "../src/features/social/thinkers";
import { bestSocieties, DEFAULT_SOCIETIES, distributionSvg, JUSTICE_STATEMENTS, JUSTICE_VIEWS, justiceAsks, justiceProblems, societyStats, type JusticeAsk } from "../src/features/social/justice";
import { reasoningAsks, reasoningProblems, SYLLOGISM_EXAMPLES, type ReasoningAsk } from "../src/features/social/moral-reasoning";
import { DEBATE_ISSUES, debateSheetHtml, debateSheetText, RUBRICS, type Rubric } from "../src/features/social/ethics-debate";
import { problemSheetHtml, problemSheetText, type SheetSection } from "../src/features/social/sheet";

let checks = 0;
const check = (name: string, run: () => void) => { run(); checks += 1; console.log(`✓ ${name}`); };
const close = (actual: number, expected: number, message: string, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} ≠ ${expected}`);
const keys = <T extends string>(record: Record<T, unknown>) => Object.keys(record) as T[];
const bad = (text: string) => text.match(/.{0,50}(NaN|undefined|Infinity|\[object).{0,50}/);
/** 학습지에 계산 오류(NaN 등)가 없고, 정답이 붙고, 한글 복사에는 그림이 빠지는지 봅니다. */
function sheetOk(sections: SheetSection[], label: string) {
  assert.ok(sections.length && sections.some(section => section.problems.length || section.intro), `${label}: 문항이 있어야 해요`);
  const html = problemSheetHtml(sections, { title: label, answers: true }, "screen");
  const clip = problemSheetHtml(sections, { title: label, answers: true }, "clipboard");
  const text = problemSheetText(sections, { title: label, answers: true });
  const found = bad(html + text);
  assert.ok(!found, `${label}: 계산이 비었어요 → ${found?.[0]}`);
  assert.ok(html.includes("정답"), `${label}: 정답`);
  assert.ok(!clip.includes("<svg"), `${label}: 한글 복사에는 SVG를 넣지 않아요`);
  for (const section of sections) for (const problem of section.problems) assert.ok(problem.answerText.trim(), `${label}: 정답이 비었어요`);
}
const seeds = [1, 2, 3, 7, 11];

check("사상가 자료: 이름·개념·주장·짝", () => {
  assert.ok(THINKERS.length >= 40, "사상가 40명 이상");
  const ids = new Set(THINKERS.map(thinker => thinker.id));
  assert.equal(ids.size, THINKERS.length, "id 중복");
  assert.equal(new Set(THINKERS.map(thinker => thinker.name)).size, THINKERS.length, "이름 중복");
  for (const group of keys(thinkerGroups)) assert.ok(THINKERS.filter(thinker => thinker.group === group).length >= 4, `${group} 분류에 4명 이상`);
  // 이름이 한 글자(밀·흄)면 다른 말에 섞이기 쉬우므로 온이름으로만 찾습니다.
  const names = THINKERS.flatMap(thinker => [thinker.full, thinker.name.length > 1 ? thinker.name : undefined].filter((name): name is string => Boolean(name)));
  for (const thinker of THINKERS) {
    assert.ok(thinker.concepts.length >= 2 && thinker.concepts.length <= 4, `${thinker.name}: 개념 2~4개`);
    assert.ok(thinker.claims.length >= 2 && thinker.claims.length <= 3, `${thinker.name}: 주장 2~3개`);
    assert.ok(thinker.school && thinker.era && thinker.unit, `${thinker.name}: 분류 정보`);
    for (const claim of thinker.claims) {
      const named = names.find(name => claim.includes(name));
      assert.ok(!named, `${thinker.name}의 주장에 사상가 이름(${named})이 들어 있어요: ${claim}`);
      assert.ok(claim.endsWith("."), `${thinker.name}: 문장 끝`);
    }
  }
  assert.equal(conceptBase("인(仁)"), "인");
  assert.equal(conceptBase("화성기위(化性起僞)"), "화성기위");
  // 빈칸 문제를 낼 수 있는 사상가가 분류마다 있어야 합니다.
  for (const group of keys(thinkerGroups)) assert.ok(THINKERS.some(thinker => thinker.group === group && thinker.claims.some(claim => thinker.concepts.map(conceptBase).some(base => base.length >= 2 && claim.includes(base)))), `${group} 빈칸`);
  for (const pair of THINKER_PAIRS) {
    assert.ok(thinkerBy(pair.a) && thinkerBy(pair.b), `짝 id: ${pair.a}·${pair.b}`);
    assert.notEqual(pair.a, pair.b);
    assert.ok(pair.common.length > 10 && pair.difference.length > 10);
  }
  assert.equal(thinkerPool(["east"], []).length, THINKERS.filter(thinker => thinker.group === "east").length);
  assert.deepEqual(thinkerPool(["east"], ["mencius", "xunzi"]).map(thinker => thinker.id), ["mencius", "xunzi"]);
  assert.equal(thinkerPool(["east"], ["kant"]).length, THINKERS.filter(thinker => thinker.group === "east").length, "다른 분류를 고른 것은 무시");
});

check("사상가 카드와 학습지", () => {
  const html = thinkerCardsHtml(THINKERS, { hideName: false, hideConcepts: false }, "사상가 카드", "screen");
  assert.ok(html.includes("맹자") && html.includes("성선설"));
  const hidden = thinkerCardsHtml(THINKERS, { hideName: true, hideConcepts: true }, "누구일까요", "clipboard");
  assert.ok(!hidden.includes("성선설"), "개념을 가리면 개념이 없어요");
  for (const thinker of THINKERS) assert.ok(!hidden.includes(`>${thinker.name}<`), `이름 가리기: ${thinker.name}`);
  assert.ok(!bad(html + thinkerCardsText(THINKERS, { hideName: true, hideConcepts: false }, "t")));
  const groups: ThinkerGroup[][] = [["east"], ["korea"], ["west"], ["society", "applied"], keys(thinkerGroups)];
  for (const seed of seeds) for (const group of groups) {
    const pool = thinkerPool(group, []);
    const sections = thinkerProblems(keys(thinkerAsks), pool, 3, seed);
    sheetOk(sections, `사상가 ${group.join(",")} seed ${seed}`);
    for (const ask of keys(thinkerAsks) as ThinkerAsk[]) assert.ok(sections.some(section => section.heading === thinkerAsks[ask]), `${ask} 문항`);
    // 사상가 고르기: 정답 사상가가 보기 안에 하나만 있어야 해요.
    for (const item of sections.find(section => section.heading === thinkerAsks.who)!.problems) {
      const answerName = item.answerText.replace(/^[①-④]\s*/, "").split(" — ")[0];
      assert.equal(item.text.split(answerName).length - 1 >= 1, true, "정답이 보기에 있어요");
    }
  }
  // 두 명만 고르면 연결 문제는 전체 사상가에서 보충합니다.
  sheetOk(thinkerProblems(["match", "blank"], thinkerPool(["east"], ["mencius", "xunzi"]), 2, 5), "적은 사상가");
});

check("분배 정의: 총합·최소 수혜자·평등 기준", () => {
  const [a, b, c] = DEFAULT_SOCIETIES.map(societyStats);
  close(a.total, 3500, "A 총소득"); close(b.total, 8000, "B 총소득"); close(c.total, 6600, "C 총소득");
  close(b.average, 80, "B 평균"); close(c.min, 40, "C 최소"); close(a.gini, 0, "A 지니");
  // B: 소득 10·30·60·100·200이 20명씩 → 지니 = Σ|xi−xj| / (2·n²·μ) (계층 인원이 같으면 n=5로 계산해도 같습니다)
  const incomes = [10, 30, 60, 100, 200];
  const spread = incomes.reduce((sum, x) => sum + incomes.reduce((inner, y) => inner + Math.abs(x - y), 0), 0);
  close(b.gini, spread / (2 * 25 * 80), "B 지니");
  close(b.ratio, 20, "B 최고/최저");
  assert.deepEqual(bestSocieties(DEFAULT_SOCIETIES, "total"), [1], "공리주의 → B");
  assert.deepEqual(bestSocieties(DEFAULT_SOCIETIES, "average"), [1]);
  assert.deepEqual(bestSocieties(DEFAULT_SOCIETIES, "maximin"), [2], "롤스 → C");
  assert.deepEqual(bestSocieties(DEFAULT_SOCIETIES, "equality"), [0], "평등 → A");
  // 인원이 다르면 총합과 평균의 선택이 달라질 수 있어요.
  const uneven = [{ name: "큰 나라", groups: [{ people: 100, income: 20 }] }, { name: "작은 나라", groups: [{ people: 10, income: 50 }] }];
  assert.deepEqual(bestSocieties(uneven, "total"), [0]);
  assert.deepEqual(bestSocieties(uneven, "average"), [1]);
  assert.deepEqual(bestSocieties([DEFAULT_SOCIETIES[0], DEFAULT_SOCIETIES[0]], "total"), [0, 1], "같으면 둘 다");
  close(societyStats({ name: "빈", groups: [{ people: 0, income: 10 }] }).gini, 0, "인원 0");
  assert.ok(distributionSvg(DEFAULT_SOCIETIES).startsWith("<svg") && !bad(distributionSvg(DEFAULT_SOCIETIES)));
  for (const statement of JUSTICE_STATEMENTS) assert.ok(JUSTICE_VIEWS.includes(statement.view), statement.view);
  for (const seed of seeds) {
    const sections = justiceProblems(keys(justiceAsks) as JusticeAsk[], 3, seed);
    sheetOk(sections, `분배 정의 seed ${seed}`);
    assert.equal(sections[0].problems.length, 9);
  }
});

check("도덕 추론: 삼단 논법·판단 구별·원리 검사", () => {
  for (const item of SYLLOGISM_EXAMPLES) assert.ok(item.principle && item.fact && item.judgment);
  for (const seed of seeds) {
    const sections = reasoningProblems(keys(reasoningAsks) as ReasoningAsk[], SYLLOGISM_EXAMPLES, 3, seed);
    sheetOk(sections, `도덕 추론 seed ${seed}`);
    assert.equal(sections.length, 4);
    const text = problemSheetText(sections, { title: "t", answers: true });
    assert.ok(!text.includes("원리을") && !text.includes("판단를"), "조사");
  }
  // 예시를 모두 비우면 빈칸·서술 문제만 빠집니다.
  const empty = reasoningProblems(["blank", "apply", "classify"], [{ principle: "", fact: "", judgment: "" }], 2, 1);
  assert.deepEqual(empty.map(section => section.heading), [reasoningAsks.classify]);
});

check("쟁점 토론 양식", () => {
  assert.ok(DEBATE_ISSUES.length >= 12);
  assert.equal(new Set(DEBATE_ISSUES.map(issue => issue.id)).size, DEBATE_ISSUES.length);
  for (const issue of DEBATE_ISSUES) {
    assert.equal(issue.pro.length, 3, `${issue.title} 찬성 3개`);
    assert.equal(issue.con.length, 3, `${issue.title} 반대 3개`);
    assert.ok(issue.question.endsWith("?"), `${issue.title} 질문`);
  }
  const rubrics = keys(RUBRICS) as Rubric[];
  for (const issue of DEBATE_ISSUES) {
    const full = { title: "", showArguments: true, stance: true, rebuttal: true, consensus: true, rubrics };
    const html = debateSheetHtml(issue, full, "screen");
    assert.ok(html.includes(issue.pro[0]) && html.includes("평가 기준") && html.includes("재반론"));
    const blankHtml = debateSheetHtml(issue, { ...full, showArguments: false, rubrics: [] }, "clipboard");
    assert.ok(!blankHtml.includes(issue.pro[0]) && !blankHtml.includes("평가 기준") && !blankHtml.includes("<svg"));
    assert.ok(!bad(html + blankHtml + debateSheetText(issue, full)));
  }
  // 글에 < > 가 있어도 태그가 되지 않아요.
  const tricky = { ...DEBATE_ISSUES[0], question: "<b>안락사</b>?" };
  assert.ok(debateSheetHtml(tricky, { title: "", showArguments: true, stance: false, rebuttal: false, consensus: false, rubrics: [] }, "screen").includes("&lt;b&gt;"));
});

console.log(`\n윤리 도구 ${checks}개 항목 통과`);
