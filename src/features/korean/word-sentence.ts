/* 국어 문법: 품사(9품사)와 문장 성분(7개), 문장의 짜임(홑문장·안은문장·이어진문장), 단어의 짜임(단일어·파생어·합성어)과 단어의 의미 관계 자료와 문제입니다.
   예문은 학교 문법으로 답이 하나로 정해지는 짧은 문장만 넣었습니다. */
import { circled, escapeHtml, jamo, problem, seededRandom, sheetTable, shuffled, type SheetProblem, type SheetSection } from "./sheet";

/* ───── 품사 ───── */
export type Pos = "명사" | "대명사" | "수사" | "동사" | "형용사" | "관형사" | "부사" | "조사" | "감탄사";
export const POS_TABLE: { function: string; parts: Pos[]; form: string; meaning: string }[] = [
  { function: "체언", parts: ["명사", "대명사", "수사"], form: "불변어", meaning: "사물의 이름, 이름을 대신하는 말, 수량·순서를 나타내요. 문장에서 주어·목적어 등이 돼요." },
  { function: "관계언", parts: ["조사"], form: "불변어(서술격 조사 ‘이다’는 활용)", meaning: "주로 체언 뒤에 붙어 문법적 관계를 나타내거나 뜻을 더해요." },
  { function: "용언", parts: ["동사", "형용사"], form: "가변어(활용)", meaning: "움직임(동사)이나 성질·상태(형용사)를 나타내며 서술어가 돼요." },
  { function: "수식언", parts: ["관형사", "부사"], form: "불변어", meaning: "관형사는 체언을, 부사는 주로 용언이나 다른 말을 꾸며요." },
  { function: "독립언", parts: ["감탄사"], form: "불변어", meaning: "느낌·부름·대답을 나타내며 문장에서 독립적으로 쓰여요." },
];
/** 단어로 나눈 예문: [단어, 품사] */
export const POS_SENTENCES: [string, Pos][][] = [
  [["아", "감탄사"], ["하늘", "명사"], ["이", "조사"], ["정말", "부사"], ["푸르다", "형용사"]],
  [["나", "대명사"], ["는", "조사"], ["새", "관형사"], ["책", "명사"], ["을", "조사"], ["두", "관형사"], ["권", "명사"], ["샀다", "동사"]],
  [["동생", "명사"], ["이", "조사"], ["운동장", "명사"], ["에서", "조사"], ["빨리", "부사"], ["달린다", "동사"]],
  [["셋", "수사"], ["에", "조사"], ["하나", "수사"], ["를", "조사"], ["더하면", "동사"], ["넷", "수사"], ["이다", "조사"]],
  [["그", "대명사"], ["는", "조사"], ["매우", "부사"], ["친절한", "형용사"], ["사람", "명사"], ["이다", "조사"]],
  [["우와", "감탄사"], ["저", "관형사"], ["꽃", "명사"], ["이", "조사"], ["활짝", "부사"], ["피었네", "동사"]],
  [["이것", "대명사"], ["은", "조사"], ["아주", "부사"], ["헌", "관형사"], ["옷", "명사"], ["이다", "조사"]],
  [["사과", "명사"], ["다섯", "수사"], ["을", "조사"], ["먹었다", "동사"]],
  [["철수", "명사"], ["야", "조사"], ["어서", "부사"], ["이리", "부사"], ["와", "동사"]],
  [["옛", "관형사"], ["친구", "명사"], ["를", "조사"], ["다시", "부사"], ["만나서", "동사"], ["기뻤다", "형용사"]],
  [["우리", "대명사"], ["는", "조사"], ["저녁", "명사"], ["에", "조사"], ["맛있는", "형용사"], ["떡볶이", "명사"], ["를", "조사"], ["먹었다", "동사"]],
  [["어머나", "감탄사"], ["네", "대명사"], ["가", "조사"], ["벌써", "부사"], ["왔구나", "동사"]],
];
/** 조사는 앞말에 붙여 문장을 적습니다. */
const posSentence = (words: [string, Pos][]) => words.reduce((text, [word, pos], index) => index === 0 ? word : `${text}${pos === "조사" ? "" : " "}${word}`, "").replace(/^(아|우와|어머나)\s/, "$1, ").replace(/야\s/, "야, ") + ".";

/* ───── 문장 성분 ───── */
export type Role = "주어" | "서술어" | "목적어" | "보어" | "관형어" | "부사어" | "독립어";
export const ROLE_TABLE: { kind: string; roles: Role[]; note: string }[] = [
  { kind: "주성분", roles: ["주어", "서술어", "목적어", "보어"], note: "문장의 뼈대를 이루는 성분이에요. 보어는 ‘되다·아니다’ 앞에서 ‘이/가’가 붙은 말이에요." },
  { kind: "부속 성분", roles: ["관형어", "부사어"], note: "주성분을 꾸며요. 관형어는 체언을, 부사어는 주로 용언을 꾸며요." },
  { kind: "독립 성분", roles: ["독립어"], note: "다른 성분과 직접 관계를 맺지 않아요(감탄·부름·대답)." },
];
/** 어절로 나눈 예문: [어절, 성분] */
export const ROLE_SENTENCES: [string, Role][][] = [
  [["민수가", "주어"], ["책을", "목적어"], ["읽는다", "서술어"]],
  [["물이", "주어"], ["얼음이", "보어"], ["되었다", "서술어"]],
  [["그는", "주어"], ["선생님이", "보어"], ["아니다", "서술어"]],
  [["새", "관형어"], ["신발이", "주어"], ["무척", "부사어"], ["편하다", "서술어"]],
  [["아,", "독립어"], ["가을", "관형어"], ["하늘이", "주어"], ["참", "부사어"], ["높다", "서술어"]],
  [["동생이", "주어"], ["공원에서", "부사어"], ["친구를", "목적어"], ["만났다", "서술어"]],
  [["나는", "주어"], ["어제", "부사어"], ["동생에게", "부사어"], ["선물을", "목적어"], ["주었다", "서술어"]],
  [["지수야,", "독립어"], ["이", "관형어"], ["사과가", "주어"], ["정말", "부사어"], ["맛있다", "서술어"]],
];
const roleSentence = (words: [string, Role][]) => `${words.map(([word]) => word).join(" ")}.`;

/* ───── 문장의 짜임 ───── */
export type Structure = "홑문장" | "명사절을 안은 문장" | "관형절을 안은 문장" | "부사절을 안은 문장" | "서술절을 안은 문장" | "인용절을 안은 문장" | "대등하게 이어진 문장" | "종속적으로 이어진 문장";
export const STRUCTURE_SENTENCES: { text: string; structure: Structure; clause?: string }[] = [
  { text: "하늘이 파랗다.", structure: "홑문장" },
  { text: "동생이 아침에 우유를 마셨다.", structure: "홑문장" },
  { text: "나는 그가 범인임을 알았다.", structure: "명사절을 안은 문장", clause: "그가 범인임" },
  { text: "우리는 비가 오기를 기다렸다.", structure: "명사절을 안은 문장", clause: "비가 오기" },
  { text: "내가 읽은 책은 재미있다.", structure: "관형절을 안은 문장", clause: "내가 읽은" },
  { text: "이것은 어머니가 만드신 옷이다.", structure: "관형절을 안은 문장", clause: "어머니가 만드신" },
  { text: "꽃이 소리도 없이 피었다.", structure: "부사절을 안은 문장", clause: "소리도 없이" },
  { text: "그는 우리가 모르게 떠났다.", structure: "부사절을 안은 문장", clause: "우리가 모르게" },
  { text: "코끼리는 코가 길다.", structure: "서술절을 안은 문장", clause: "코가 길다" },
  { text: "언니는 키가 크다.", structure: "서술절을 안은 문장", clause: "키가 크다" },
  { text: "친구가 내일 오겠다고 말했다.", structure: "인용절을 안은 문장", clause: "내일 오겠다고(간접 인용)" },
  { text: "선생님께서 “조용히 하세요.”라고 말씀하셨다.", structure: "인용절을 안은 문장", clause: "“조용히 하세요.”라고(직접 인용)" },
  { text: "봄이 오고 꽃이 핀다.", structure: "대등하게 이어진 문장" },
  { text: "나는 사과를 좋아하지만 동생은 배를 좋아한다.", structure: "대등하게 이어진 문장" },
  { text: "비가 와서 길이 미끄럽다.", structure: "종속적으로 이어진 문장" },
  { text: "봄이 오면 꽃이 핀다.", structure: "종속적으로 이어진 문장" },
];
export const STRUCTURE_NOTE = "종속적으로 이어진 문장을 부사절을 안은 문장으로 함께 보는 교과서도 있어요. 수업 교과서의 설명을 따라 주세요.";

/* ───── 단어의 짜임 ───── */
export type Formation = "단일어" | "파생어(접두)" | "파생어(접미)" | "합성어(통사적)" | "합성어(비통사적)";
export const FORMATION_WORDS: { word: string; kind: Formation; parts: string }[] = [
  { word: "하늘", kind: "단일어", parts: "하늘" }, { word: "나무", kind: "단일어", parts: "나무" }, { word: "먹다", kind: "단일어", parts: "먹- + -다(어미)" }, { word: "바다", kind: "단일어", parts: "바다" },
  { word: "맨손", kind: "파생어(접두)", parts: "맨- + 손" }, { word: "풋사과", kind: "파생어(접두)", parts: "풋- + 사과" }, { word: "헛고생", kind: "파생어(접두)", parts: "헛- + 고생" },
  { word: "짓밟다", kind: "파생어(접두)", parts: "짓- + 밟다" }, { word: "새빨갛다", kind: "파생어(접두)", parts: "새- + 빨갛다" }, { word: "군말", kind: "파생어(접두)", parts: "군- + 말" },
  { word: "지우개", kind: "파생어(접미)", parts: "지우- + -개" }, { word: "먹이", kind: "파생어(접미)", parts: "먹- + -이" }, { word: "멋쟁이", kind: "파생어(접미)", parts: "멋 + -쟁이" },
  { word: "선생님", kind: "파생어(접미)", parts: "선생 + -님" }, { word: "넓이", kind: "파생어(접미)", parts: "넓- + -이" }, { word: "높이다", kind: "파생어(접미)", parts: "높- + -이- + -다" },
  { word: "돌다리", kind: "합성어(통사적)", parts: "돌 + 다리(명사 + 명사)" }, { word: "작은아버지", kind: "합성어(통사적)", parts: "작- + -은 + 아버지(관형사형 + 명사)" },
  { word: "들어가다", kind: "합성어(통사적)", parts: "들- + -어 + 가다(연결 어미로 이음)" }, { word: "힘들다", kind: "합성어(통사적)", parts: "힘 + 들다(주어 + 서술어 관계)" },
  { word: "새해", kind: "합성어(통사적)", parts: "새 + 해(관형사 + 명사)" }, { word: "앞뒤", kind: "합성어(통사적)", parts: "앞 + 뒤(명사 + 명사)" },
  { word: "덮밥", kind: "합성어(비통사적)", parts: "덮- + 밥(어간 + 명사, 관형사형 어미 없음)" }, { word: "늦잠", kind: "합성어(비통사적)", parts: "늦- + 잠(어간 + 명사)" },
  { word: "굳세다", kind: "합성어(비통사적)", parts: "굳- + 세다(연결 어미 없음)" }, { word: "오르내리다", kind: "합성어(비통사적)", parts: "오르- + 내리다(연결 어미 없음)" },
  { word: "부슬비", kind: "합성어(비통사적)", parts: "부슬 + 비(부사 + 명사)" }, { word: "검붉다", kind: "합성어(비통사적)", parts: "검- + 붉다(연결 어미 없음)" },
];

/* ───── 의미 관계 ───── */
export type Relation = "유의 관계" | "반의 관계" | "상하 관계";
export const RELATION_PAIRS: { a: string; b: string; relation: Relation; note?: string }[] = [
  { a: "가끔", b: "이따금", relation: "유의 관계" }, { a: "걱정", b: "근심", relation: "유의 관계" }, { a: "달걀", b: "계란", relation: "유의 관계" }, { a: "아름답다", b: "곱다", relation: "유의 관계" },
  { a: "위", b: "아래", relation: "반의 관계" }, { a: "길다", b: "짧다", relation: "반의 관계" }, { a: "남자", b: "여자", relation: "반의 관계" }, { a: "살다", b: "죽다", relation: "반의 관계" },
  { a: "꽃", b: "장미", relation: "상하 관계", note: "꽃이 상의어, 장미가 하의어" }, { a: "동물", b: "개", relation: "상하 관계", note: "동물이 상의어, 개가 하의어" },
  { a: "과일", b: "사과", relation: "상하 관계", note: "과일이 상의어, 사과가 하의어" }, { a: "악기", b: "피아노", relation: "상하 관계", note: "악기가 상의어, 피아노가 하의어" },
];
/** 다의어(뜻이 서로 이어짐)와 동음이의어(소리만 같음) 예 */
export const POLYSEMY: { word: string; kind: "다의어" | "동음이의어"; uses: string[] }[] = [
  { word: "손", kind: "다의어", uses: ["손을 깨끗이 씻었다.(신체 부위)", "일할 손이 모자라다.(일하는 사람)", "그 일은 선배의 손을 거쳤다.(어떤 사람의 힘·영향)"] },
  { word: "먹다", kind: "다의어", uses: ["밥을 먹다.(음식을 삼키다)", "마음을 굳게 먹다.(마음을 품다)", "나이를 먹다.(나이가 들다)"] },
  { word: "배", kind: "동음이의어", uses: ["배가 아프다.(사람 몸의 배)", "배를 타고 섬에 갔다.(물 위를 다니는 탈것)", "배를 깎아 먹었다.(과일)"] },
  { word: "눈", kind: "동음이의어", uses: ["눈이 부시다.(보는 기관)", "밤새 눈이 내렸다.(하늘에서 내리는 눈)"] },
];

/* ───── 문제 ───── */
export type WordAsk = "pos" | "role" | "structure" | "formation" | "relation";
export const wordAsks: Record<WordAsk, string> = { pos: "품사 분류", role: "문장 성분", structure: "문장의 짜임", formation: "단어의 짜임", relation: "단어의 의미 관계" };

const blank = "&nbsp;".repeat(14);
export function wordProblems(asks: WordAsk[], count: number, seed: number): SheetSection[] {
  const random = seededRandom(seed * 71 + 3);
  const shuffle = <T,>(items: T[]) => shuffled(items, Math.floor(random() * 1e9));
  const sections: SheetSection[] = [];
  for (const ask of asks) {
    const problems: SheetProblem[] = [];
    if (ask === "pos") {
      for (const words of shuffle(POS_SENTENCES).slice(0, count)) {
        const table = sheetTable(words.map(([word]) => escapeHtml(word)), [words.map(() => blank)], { font: "9.5pt" });
        problems.push({ ...problem(`다음 문장을 이루는 단어의 품사를 표에 쓰시오.<br>${escapeHtml(posSentence(words))}`, words.map(([word, pos]) => `${escapeHtml(word)}(${pos})`).join(" / ")), after: table });
      }
    } else if (ask === "role") {
      for (const words of shuffle(ROLE_SENTENCES).slice(0, count)) {
        const table = sheetTable(words.map(([word]) => escapeHtml(word.replace(/,$/, ""))), [words.map(() => blank)], { font: "9.5pt" });
        problems.push({ ...problem(`다음 문장의 각 어절이 어떤 문장 성분인지 표에 쓰시오.<br>${escapeHtml(roleSentence(words))}`, words.map(([word, role]) => `${escapeHtml(word.replace(/,$/, ""))}(${role})`).join(" / ")), after: table });
      }
    } else if (ask === "structure") {
      for (const item of shuffle(STRUCTURE_SENTENCES).slice(0, count)) {
        problems.push(problem(`다음 문장의 짜임을 쓰고, 안긴 문장이 있으면 그 부분을 쓰시오.<br>${escapeHtml(item.text)}`, `${escapeHtml(item.structure)}${item.clause ? ` — 안긴 문장: ${escapeHtml(item.clause)}` : ""}`, { space: 8 }));
      }
    } else if (ask === "formation") {
      for (let index = 0; index < count; index += 1) {
        const words = shuffle(FORMATION_WORDS).slice(0, 5);
        problems.push(problem(`다음 단어를 단일어, 파생어, 합성어로 나누고, 합성어는 통사적·비통사적 합성어인지 쓰시오.<br>${words.map((item, at) => `${circled(at)} ${escapeHtml(item.word)}`).join("&nbsp;&nbsp;")}`,
          words.map((item, at) => `${circled(at)} ${escapeHtml(item.kind)} (${escapeHtml(item.parts)})`).join("<br>"), { space: 10 }));
      }
    } else {
      for (let index = 0; index < count; index += 1) {
        if (random() < 0.6) {
          const pairs = shuffle(RELATION_PAIRS).slice(0, 4);
          problems.push(problem(`다음 단어 쌍의 의미 관계를 쓰시오.<br>${pairs.map((pair, at) => `${jamo(at)}. ${escapeHtml(pair.a)} – ${escapeHtml(pair.b)}`).join("&nbsp;&nbsp;")}`,
            pairs.map((pair, at) => `${jamo(at)}. ${pair.relation}${pair.note ? `(${escapeHtml(pair.note)})` : ""}`).join(", ")));
        } else {
          const item = shuffle(POLYSEMY)[0];
          problems.push(problem(`다음 문장에 쓰인 ‘${escapeHtml(item.word)}’의 관계가 다의어인지 동음이의어인지 쓰고, 그렇게 판단한 까닭을 쓰시오.<br>${item.uses.map((use, at) => `${circled(at)} ${escapeHtml(use.replace(/\(.*\)$/, ""))}`).join("<br>")}`,
            `${item.kind} — ${item.kind === "다의어" ? "뜻들이 서로 이어져 있어 한 단어로 봐요." : "소리만 같고 뜻 사이에 관련이 없어 다른 단어로 봐요."} (${item.uses.map(use => escapeHtml(use.match(/\((.*)\)$/)?.[1] ?? "")).join(" / ")})`, { space: 10 }));
        }
      }
    }
    if (problems.length) sections.push({ heading: wordAsks[ask], problems, ...(ask === "structure" ? { intro: { html: escapeHtml(STRUCTURE_NOTE), text: STRUCTURE_NOTE } } : {}) });
  }
  return sections;
}

/** 품사·문장 성분 참고표 */
export const posTableHtml = () => sheetTable(["기능", "품사", "형태", "설명"], POS_TABLE.map(row => [row.function, row.parts.join(", "), escapeHtml(row.form), escapeHtml(row.meaning)]), { widths: ["12%", "22%", "20%", "46%"], center: false, font: "9.5pt" });
export const roleTableHtml = () => sheetTable(["갈래", "문장 성분", "설명"], ROLE_TABLE.map(row => [row.kind, row.roles.join(", "), escapeHtml(row.note)]), { widths: ["14%", "30%", "56%"], center: false, font: "9.5pt" });
