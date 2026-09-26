/* 사회 · 역사 도구(연표·동시대 비교·개헌 흐름·사료 탐구)의 자료와 학습지를 확인합니다. npx tsx scripts/verify-social-history.ts */
import assert from "node:assert/strict";
import { AMENDMENTS, amendmentLabel, constitutionAsks, constitutionProblems, constitutionSvg } from "../src/features/social/constitution";
import { aliveAt, dynastyAsks, dynastyProblems, dynastySvg, endYear, overlaps, rowByKey, ROWS, yearText, type RowKey } from "../src/features/social/dynasties";
import { parseBlanks, SOURCE_PRESETS, sourceAsks, sourceSheet, type SourceAsk } from "../src/features/social/source-reading";
import { problemSheetHtml, problemSheetText, type SheetSection } from "../src/features/social/sheet";
import { EVENT_SETS, timelineAsks, timelineProblems, timelineSvg } from "../src/features/social/timeline";

let checks = 0;
const check = (name: string, run: () => void) => { run(); checks += 1; console.log(`✓ ${name}`); };
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

check("연도 표기", () => {
  assert.equal(yearText(-108), "기원전 108년");
  assert.equal(yearText(1392), "1392년");
});

check("연표 자료: 모음마다 20개 이상, 이름 겹침 없음, 확정 연도", () => {
  for (const set of EVENT_SETS) {
    assert.ok(set.events.length >= 20 && set.events.length <= 40, `${set.label}: ${set.events.length}개`);
    assert.equal(new Set(set.events.map(event => event.name)).size, set.events.length, `${set.label}: 이름이 겹쳐요`);
    for (const event of set.events) assert.ok(Number.isInteger(event.year) && event.year > -3000 && event.year <= 2026, `${event.name} 연도`);
    // 목록은 연도 순으로 적어 두었어요.
    assert.deepEqual(set.events.map(event => event.year), [...set.events].map(event => event.year).sort((a, b) => a - b), `${set.label}: 연도 순서`);
  }
  const year = (name: string) => EVENT_SETS.flatMap(set => set.events).find(event => event.name === name)?.year;
  assert.equal(year("고려 건국"), 918); assert.equal(year("조선 건국"), 1392); assert.equal(year("갑신정변"), 1884);
  assert.equal(year("3·1 운동"), 1919); assert.equal(year("6월 민주 항쟁"), 1987); assert.equal(year("프랑스 혁명"), 1789);
  assert.equal(year("고조선 멸망"), -108); assert.equal(year("청일 전쟁"), 1894);
});

check("연표 그림과 학습지", () => {
  for (const set of EVENT_SETS) for (const scale of ["even", "linear"] as const) {
    const svg = timelineSvg(set.events, { scale, band: set.band });
    assert.ok(svg.startsWith("<svg") && !/NaN|undefined/.test(svg), `${set.label} ${scale}`);
    for (const seed of seeds) {
      const sections = timelineProblems(keys(timelineAsks), 3, seed, set.events, { scale, band: set.band });
      sheetOk(sections, `${set.label} 연표 ${seed}`);
      assert.equal(sections.length, 3, `${set.label}: 빈칸 둘 + 순서 문제`);
      assert.equal(sections[2].problems.length, 6, `${set.label}: 순서·사이 문제 3개씩`);
    }
  }
  // ‘(가)와 (나) 사이’ 정답이 정말 사이에 있는지 확인합니다.
  const events = EVENT_SETS[1].events;
  for (const seed of seeds) {
    const [section] = timelineProblems(["between"], 3, seed, events, { scale: "even" });
    for (const item of section.problems) {
      const names = [...item.text.matchAll(/\(가\) (.+?) → \(나\) (.+?) \(가\)/g)][0];
      const answer = item.answerText.match(/^[①-⑤] (.+?) \(/)![1];
      const y = (name: string) => events.find(event => event.name === name)!.year;
      assert.ok(y(names[1]) < y(answer) && y(answer) < y(names[2]), `${answer}는 ${names[1]}와 ${names[2]} 사이`);
    }
  }
  assert.ok(timelineSvg([], { scale: "even" }).includes("사건을 더해"));
});

check("동시대 비교: 통설 연도와 겹침 계산", () => {
  const find = (key: RowKey, name: string) => rowByKey(key).items.find(item => item.name === name)!;
  assert.equal(find("korea", "고려").start, 918); assert.equal(find("korea", "조선").end, 1897);
  assert.equal(find("china", "당").start, 618); assert.equal(find("china", "명").end, 1644);
  assert.equal(find("japan", "에도 막부").start, 1603); assert.equal(find("japan", "에도 막부").end, 1868);
  assert.deepEqual(aliveAt(rowByKey("china"), 1392).map(item => item.name), ["명"]);
  assert.deepEqual(aliveAt(rowByKey("japan"), 1603).map(item => item.name), ["에도 막부"]);
  assert.ok(overlaps(find("korea", "고려"), find("china", "송")) && !overlaps(find("korea", "조선"), find("china", "송")));
  // 같은 칸(lane)에서는 나라가 겹치지 않아야 막대가 겹치지 않아요.
  for (const row of ROWS) for (const a of row.items) for (const b of row.items) {
    if (a !== b && a.lane === b.lane) assert.ok(!overlaps(a, b), `${row.label}: ${a.name}·${b.name} 같은 칸에서 겹쳐요`);
    assert.ok(endYear(a) > a.start, `${a.name} 기간`);
  }
  const rows: RowKey[] = ["korea", "china", "japan", "west"];
  assert.ok(dynastySvg(rows, -800, 2026, { mark: 1392 }).startsWith("<svg"));
  for (const seed of seeds) for (const [from, to] of [[-800, 700], [500, 1500], [1300, 1950], [-800, 2026]]) {
    const sections = dynastyProblems(keys(dynastyAsks), 3, seed, rows, from, to);
    sheetOk(sections, `동시대 ${from}~${to} ${seed}`);
    // ‘세워질 무렵’ 정답은 그해에 정말 있던 나라예요.
    for (const item of sections[0].problems.filter(p => p.text.includes("무렵"))) {
      const [, answer] = item.answerText.match(/^[①-⑤] (.+?) — /)!;
      assert.ok(ROWS.some(row => row.items.some(entry => entry.name === answer)), answer);
    }
  }
});

check("개헌: 9차례 개정과 선출 방법", () => {
  assert.equal(AMENDMENTS.length, 10);
  assert.deepEqual(AMENDMENTS.map(item => item.year), [1948, 1952, 1954, 1960, 1960, 1962, 1969, 1972, 1980, 1987]);
  assert.equal(AMENDMENTS[7].election, "indirect"); assert.equal(AMENDMENTS[9].term, "5년 단임"); assert.equal(AMENDMENTS[8].term, "7년 단임");
  assert.equal(amendmentLabel(AMENDMENTS[1]), "1차 발췌 개헌"); assert.equal(amendmentLabel(AMENDMENTS[9]), "9차 개헌(현행 헌법)");
  for (const hide of [null, "election", "term"] as const) assert.ok(constitutionSvg({ hide }).startsWith("<svg"));
  for (const seed of seeds) sheetOk(constitutionProblems(keys(constitutionAsks), 3, seed), `개헌 ${seed}`);
});

check("사료 탐구: [낱말] 빈칸과 학습지", () => {
  assert.deepEqual(parseBlanks("가 [나] 다 [라]").map(part => part.blank), [false, true, false, true]);
  for (const source of SOURCE_PRESETS) {
    assert.ok(parseBlanks(source.body).some(part => part.blank), `${source.title}: 빈칸`);
    const sections = sourceSheet(source, { blanks: true, asks: keys(sourceAsks) as SourceAsk[], custom: ["직접 쓴 질문", ""], space: 20 });
    sheetOk(sections, source.title);
    assert.equal(sections[0].problems.length, 1 + keys(sourceAsks).length + 1);
    const plain = sourceSheet(source, { blanks: false, asks: ["summary"], custom: [], space: 20 });
    assert.ok(!problemSheetHtml(plain, { title: "", answers: false }, "screen").includes("["), `${source.title}: [ ] 표시가 남지 않아요`);
  }
  // 교사가 넣은 글의 태그는 이스케이프됩니다.
  const html = problemSheetHtml(sourceSheet({ title: "<b>x</b>", origin: "", body: "<script>1</script> [a]", time: "", author: "", background: "" }, { blanks: true, asks: ["who"], custom: ["<i>q</i>"], space: 20 }), { title: "t", answers: true }, "screen");
  assert.ok(!html.includes("<script>") && !html.includes("<i>q"), "이스케이프");
});

console.log(`\n역사 도구 검증 ${checks}개 통과`);
