/* 국어 문법: 문법 요소(높임 표현, 시간 표현, 피동·사동, 부정 표현)의 참고표와 예문 분석 문제입니다. 예문은 학교 문법으로 답이 하나로 정해지는 것만 넣었습니다. */
import { circled, escapeHtml, problem, seededRandom, sheetTable, shuffled, type SheetProblem, type SheetSection } from "./sheet";

/* ───── 높임 표현 ───── */
export type Honor = "주체 높임" | "객체 높임" | "상대 높임";
export const HONOR_TABLE: { kind: Honor; target: string; means: string }[] = [
  { kind: "주체 높임", target: "문장의 주체(주어)", means: "선어말 어미 ‘-(으)시-’, 주격 조사 ‘께서’, 특수 어휘(계시다, 잡수시다, 주무시다 등)" },
  { kind: "객체 높임", target: "문장의 객체(목적어·부사어가 가리키는 대상)", means: "부사격 조사 ‘께’, 특수 어휘(드리다, 모시다, 여쭈다, 뵙다 등)" },
  { kind: "상대 높임", target: "말을 듣는 사람", means: "종결 어미(하십시오체·하오체·하게체·해라체 / 해요체·해체)" },
];
export const SPEECH_LEVELS: { name: string; formal: boolean; level: string; examples: string[] }[] = [
  { name: "하십시오체", formal: true, level: "아주 높임", examples: ["안녕히 가십시오.", "회의를 시작하겠습니다."] },
  { name: "하오체", formal: true, level: "예사 높임", examples: ["어서 오시오.", "이리 앉으시오."] },
  { name: "하게체", formal: true, level: "예사 낮춤", examples: ["이리 오게.", "자네도 같이 가세."] },
  { name: "해라체", formal: true, level: "아주 낮춤", examples: ["빨리 가라.", "밥을 먹어라."] },
  { name: "해요체", formal: false, level: "두루 높임", examples: ["어서 오세요.", "저는 지금 가요."] },
  { name: "해체", formal: false, level: "두루 낮춤", examples: ["밥 먹어.", "나도 갈래."] },
];
/** 높임 분석 예문: 쓰인 높임 종류와 근거 */
export const HONOR_SENTENCES: { text: string; kinds: Honor[]; why: string }[] = [
  { text: "할머니께서 방에 계신다.", kinds: ["주체 높임"], why: "‘께서’, 특수 어휘 ‘계시다’로 주체인 할머니를 높였어요(해라체)." },
  { text: "아버지께서 신문을 읽으신다.", kinds: ["주체 높임"], why: "‘께서’, ‘-시-’로 주체인 아버지를 높였어요(해라체)." },
  { text: "나는 선생님께 책을 드렸다.", kinds: ["객체 높임"], why: "‘께’, 특수 어휘 ‘드리다’로 객체인 선생님을 높였어요(해라체)." },
  { text: "동생이 할아버지를 모시고 병원에 갔다.", kinds: ["객체 높임"], why: "특수 어휘 ‘모시다’로 객체인 할아버지를 높였어요(해라체)." },
  { text: "제가 할머니께 선물을 드렸습니다.", kinds: ["객체 높임", "상대 높임"], why: "‘께’·‘드리다’로 할머니를 높이고, 하십시오체 ‘-습니다’로 듣는 사람을 높였어요." },
  { text: "선생님께서 교실로 들어오셨어요.", kinds: ["주체 높임", "상대 높임"], why: "‘께서’·‘-시-’로 선생님을 높이고, 해요체로 듣는 사람을 높였어요." },
  { text: "어머니께서 할머니께 전화를 드리셨습니다.", kinds: ["주체 높임", "객체 높임", "상대 높임"], why: "‘께서’·‘-시-’(주체), ‘께’·‘드리다’(객체), ‘-습니다’(상대)를 모두 썼어요." },
  { text: "민수가 동생에게 책을 주었다.", kinds: [], why: "높임 표현이 없어요(해라체)." },
];

/* ───── 시간 표현 ───── */
export type Tense = "과거" | "현재" | "미래";
export const TENSE_TABLE: { tense: Tense; ending: string; adnominal: string; example: string }[] = [
  { tense: "과거", ending: "-았-/-었-, -더-(회상)", adnominal: "동사 -(으)ㄴ, -던 / 형용사 -던", example: "어제 비가 왔다. / 어제 읽은 책" },
  { tense: "현재", ending: "동사 -는-/-ㄴ-, 형용사는 기본형", adnominal: "동사 -는 / 형용사 -(으)ㄴ", example: "지금 비가 온다. / 지금 읽는 책" },
  { tense: "미래", ending: "-겠-, -(으)리-", adnominal: "-(으)ㄹ", example: "내일은 비가 오겠다. / 내일 읽을 책" },
];
export const TENSE_SENTENCES: { text: string; tense: Tense; clue: string }[] = [
  { text: "어제 친구와 영화를 보았다.", tense: "과거", clue: "선어말 어미 ‘-았-’, 부사어 ‘어제’" },
  { text: "지난주에 산 옷이 작다.", tense: "현재", clue: "‘작다’(형용사 기본형)로 문장은 현재, 관형절 ‘지난주에 산’(-(으)ㄴ)은 과거의 일" },
  { text: "동생이 지금 책을 읽는다.", tense: "현재", clue: "선어말 어미 ‘-는-’, 부사어 ‘지금’" },
  { text: "하늘이 참 맑다.", tense: "현재", clue: "형용사 기본형으로 현재를 나타내요" },
  { text: "내일은 눈이 오겠다.", tense: "미래", clue: "선어말 어미 ‘-겠-’, 부사어 ‘내일’" },
  { text: "다음 주에 읽을 책을 골랐다.", tense: "과거", clue: "‘골랐다’(-았-)로 문장은 과거, ‘읽을’(-(으)ㄹ)은 미래의 일" },
];

/* ───── 피동·사동 ───── */
export type Voice = "피동" | "사동";
export const VOICE_TABLE: { voice: Voice; suffix: string; words: string; syntactic: string }[] = [
  { voice: "피동", suffix: "-이-, -히-, -리-, -기-", words: "보이다, 먹히다, 잡히다, 물리다, 들리다, 안기다, 쫓기다", syntactic: "-아지다/-어지다, -게 되다" },
  { voice: "사동", suffix: "-이-, -히-, -리-, -기-, -우-, -구-, -추-", words: "먹이다, 입히다, 앉히다, 울리다, 알리다, 웃기다, 맡기다, 깨우다, 비우다, 달구다, 늦추다, 낮추다", syntactic: "-게 하다" },
];
export const VOICE_SENTENCES: { text: string; voice: Voice | "능동·주동"; how: string; base?: string }[] = [
  { text: "쥐가 고양이에게 잡혔다.", voice: "피동", how: "‘잡- + -히-’(피동 접미사)", base: "고양이가 쥐를 잡았다." },
  { text: "도둑이 경찰에게 쫓겼다.", voice: "피동", how: "‘쫓- + -기-’(피동 접미사)", base: "경찰이 도둑을 쫓았다." },
  { text: "멀리서 종소리가 들렸다.", voice: "피동", how: "‘듣- + -리-’(피동 접미사)" },
  { text: "이 다리는 1990년에 만들어졌다.", voice: "피동", how: "‘-어지다’(통사적 피동)" },
  { text: "어머니가 아이에게 옷을 입혔다.", voice: "사동", how: "‘입- + -히-’(사동 접미사)", base: "아이가 옷을 입었다." },
  { text: "형이 동생을 웃겼다.", voice: "사동", how: "‘웃- + -기-’(사동 접미사)", base: "동생이 웃었다." },
  { text: "나는 알람으로 동생을 깨웠다.", voice: "사동", how: "‘깨- + -우-’(사동 접미사)", base: "동생이 깼다." },
  { text: "선생님께서 학생들에게 책을 읽게 하셨다.", voice: "사동", how: "‘-게 하다’(통사적 사동)" },
  { text: "고양이가 쥐를 잡았다.", voice: "능동·주동", how: "주어가 제 힘으로 행동해요" },
];

/* ───── 부정 표현 ───── */
export const NEGATION_TABLE: { kind: string; short: string; long: string; meaning: string }[] = [
  { kind: "‘안’ 부정문", short: "안 + 용언(안 먹었다)", long: "-지 않다(먹지 않았다)", meaning: "의지 부정(하지 않으려 함) 또는 단순 부정" },
  { kind: "‘못’ 부정문", short: "못 + 용언(못 갔다)", long: "-지 못하다(가지 못했다)", meaning: "능력 부정 또는 외부 원인으로 할 수 없음" },
  { kind: "명령문·청유문", short: "—", long: "-지 마라, -지 말자", meaning: "명령문·청유문은 ‘말다’로 부정해요" },
];
export const NEGATION_SENTENCES: { text: string; kind: string }[] = [
  { text: "나는 아침을 안 먹었다.", kind: "‘안’ 부정문 · 짧은 부정문" },
  { text: "그는 약속 장소에 가지 않았다.", kind: "‘안’ 부정문 · 긴 부정문" },
  { text: "다리를 다쳐서 축구를 못 했다.", kind: "‘못’ 부정문 · 짧은 부정문" },
  { text: "비가 많이 와서 산에 오르지 못했다.", kind: "‘못’ 부정문 · 긴 부정문" },
  { text: "복도에서 뛰지 마라.", kind: "명령문의 부정(-지 말다)" },
  { text: "오늘은 게임을 하지 말자.", kind: "청유문의 부정(-지 말다)" },
];

/* ───── 문제 ───── */
export type ElementAsk = "honor" | "level" | "tense" | "voice" | "negation";
export const elementAsks: Record<ElementAsk, string> = { honor: "높임 표현 분석", level: "상대 높임 등급", tense: "시간 표현", voice: "피동·사동", negation: "부정 표현" };

export function elementProblems(asks: ElementAsk[], count: number, seed: number): SheetSection[] {
  const random = seededRandom(seed * 43 + 17);
  const shuffle = <T,>(items: T[]) => shuffled(items, Math.floor(random() * 1e9));
  const sections: SheetSection[] = [];
  for (const ask of asks) {
    const problems: SheetProblem[] = [];
    if (ask === "honor") {
      for (const item of shuffle(HONOR_SENTENCES).slice(0, count)) {
        problems.push(problem(`다음 문장에 쓰인 높임 표현(주체·객체·상대 높임)을 모두 찾고, 근거가 되는 문법 요소를 쓰시오.<br>${escapeHtml(item.text)}`,
          `${escapeHtml(item.kinds.length ? item.kinds.join(", ") : "높임 표현 없음")} — ${escapeHtml(item.why)}`, { space: 8 }));
      }
    } else if (ask === "level") {
      const pool = SPEECH_LEVELS.flatMap(level => level.examples.map(text => ({ text, level })));
      for (const item of shuffle(pool).slice(0, count)) {
        problems.push(problem(`다음 문장에 쓰인 상대 높임의 등급(종결 표현)을 쓰시오.<br>${escapeHtml(item.text)}`,
          `${escapeHtml(item.level.name)}(${item.level.formal ? "격식체" : "비격식체"}, ${escapeHtml(item.level.level)})`));
      }
    } else if (ask === "tense") {
      for (const item of shuffle(TENSE_SENTENCES).slice(0, count)) {
        problems.push(problem(`다음 문장의 시제(사건시와 발화시의 관계)를 쓰고, 그렇게 판단할 수 있는 문법 요소를 쓰시오.<br>${escapeHtml(item.text)}`, `${item.tense} — ${escapeHtml(item.clue)}`, { space: 8 }));
      }
    } else if (ask === "voice") {
      for (const item of shuffle(VOICE_SENTENCES).slice(0, count)) {
        const ask = item.base ? " 또 능동문(주동문)으로 바꿔 쓰시오." : "";
        problems.push(problem(`다음 문장이 피동문인지 사동문인지 쓰고, 그렇게 만든 방법을 쓰시오.${ask}<br>${escapeHtml(item.text)}`,
          `${escapeHtml(item.voice === "능동·주동" ? "피동문·사동문이 아님(능동문·주동문)" : `${item.voice}문`)} — ${escapeHtml(item.how)}${item.base ? ` / ${escapeHtml(item.base)}` : ""}`, { space: 8 }));
      }
    } else {
      const items = shuffle(NEGATION_SENTENCES).slice(0, Math.max(3, Math.min(count * 2, NEGATION_SENTENCES.length)));
      problems.push(problem(`다음 문장의 부정 표현이 어떤 종류(‘안’/‘못’ 부정문, 짧은/긴 부정문, ‘말다’ 부정)인지 쓰시오.<br>${items.map((item, at) => `${circled(at)} ${escapeHtml(item.text)}`).join("<br>")}`,
        items.map((item, at) => `${circled(at)} ${escapeHtml(item.kind)}`).join("<br>"), { space: 8 }));
    }
    if (problems.length) sections.push({ heading: elementAsks[ask], problems });
  }
  return sections;
}

export const honorTableHtml = () => sheetTable(["높임", "높이는 대상", "실현 방법"], HONOR_TABLE.map(row => [row.kind, escapeHtml(row.target), escapeHtml(row.means)]), { widths: ["16%", "30%", "54%"], center: false, font: "9.5pt" });
export const levelTableHtml = () => sheetTable(["등급", "갈래", "높낮이", "예"], SPEECH_LEVELS.map(row => [row.name, row.formal ? "격식체" : "비격식체", row.level, escapeHtml(row.examples.join(" / "))]), { font: "9.5pt" });
export const tenseTableHtml = () => sheetTable(["시제", "선어말 어미", "관형사형 어미", "예"], TENSE_TABLE.map(row => [row.tense, escapeHtml(row.ending), escapeHtml(row.adnominal), escapeHtml(row.example)]), { center: false, font: "9.5pt" });
export const voiceTableHtml = () => sheetTable(["", "접미사(파생적)", "예", "통사적"], VOICE_TABLE.map(row => [row.voice, escapeHtml(row.suffix), escapeHtml(row.words), escapeHtml(row.syntactic)]), { center: false, font: "9.5pt" });
export const negationTableHtml = () => sheetTable(["종류", "짧은 부정문", "긴 부정문", "뜻"], NEGATION_TABLE.map(row => [escapeHtml(row.kind), escapeHtml(row.short), escapeHtml(row.long), escapeHtml(row.meaning)]), { center: false, font: "9.5pt" });
