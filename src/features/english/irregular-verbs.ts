/* 영어: 불규칙 동사표와 빈칸 시험지입니다. 미국·영국에서 둘 다 쓰는 형태는 learned/learnt처럼 함께 적습니다. */
import { clipboardWrap, sheetHead, textHead, type SheetMode } from "@/features/language-sheet";
import { escapeHtml, seededRandom, sheetTable, shuffled } from "./sheet";

export type IrregularVerb = { base: string; past: string; participle: string; meaning: string };

// [원형, 과거, 과거분사, 뜻]
const RAW: [string, string, string, string][] = [
  // A-A-A
  ["bet", "bet", "bet", "돈을 걸다"], ["broadcast", "broadcast", "broadcast", "방송하다"], ["burst", "burst", "burst", "터지다"], ["cast", "cast", "cast", "던지다"],
  ["cost", "cost", "cost", "(비용이) 들다"], ["cut", "cut", "cut", "자르다"], ["hit", "hit", "hit", "치다"], ["hurt", "hurt", "hurt", "다치게 하다"],
  ["let", "let", "let", "~하게 하다"], ["put", "put", "put", "놓다"], ["quit", "quit", "quit", "그만두다"], ["read", "read", "read", "읽다"],
  ["set", "set", "set", "놓다, 정하다"], ["shut", "shut", "shut", "닫다"], ["spread", "spread", "spread", "펼치다, 퍼지다"], ["upset", "upset", "upset", "속상하게 하다"],
  // A-B-B
  ["bring", "brought", "brought", "가져오다"], ["build", "built", "built", "짓다"], ["buy", "bought", "bought", "사다"], ["catch", "caught", "caught", "잡다"],
  ["feed", "fed", "fed", "먹이를 주다"], ["feel", "felt", "felt", "느끼다"], ["fight", "fought", "fought", "싸우다"], ["find", "found", "found", "찾다"],
  ["hang", "hung", "hung", "걸다"], ["have", "had", "had", "가지다"], ["hear", "heard", "heard", "듣다"], ["hold", "held", "held", "잡다, 열다"],
  ["keep", "kept", "kept", "유지하다"], ["lay", "laid", "laid", "놓다, (알을) 낳다"], ["lead", "led", "led", "이끌다"], ["leave", "left", "left", "떠나다, 남기다"],
  ["lend", "lent", "lent", "빌려주다"], ["lose", "lost", "lost", "잃다, 지다"], ["make", "made", "made", "만들다"], ["mean", "meant", "meant", "뜻하다"],
  ["meet", "met", "met", "만나다"], ["pay", "paid", "paid", "지불하다"], ["say", "said", "said", "말하다"], ["sell", "sold", "sold", "팔다"],
  ["send", "sent", "sent", "보내다"], ["shoot", "shot", "shot", "쏘다"], ["sit", "sat", "sat", "앉다"], ["sleep", "slept", "slept", "자다"],
  ["spend", "spent", "spent", "쓰다, 보내다"], ["stand", "stood", "stood", "서다"], ["teach", "taught", "taught", "가르치다"], ["tell", "told", "told", "말하다"],
  ["think", "thought", "thought", "생각하다"], ["understand", "understood", "understood", "이해하다"], ["win", "won", "won", "이기다"], ["seek", "sought", "sought", "찾다, 구하다"],
  ["learn", "learned/learnt", "learned/learnt", "배우다"], ["burn", "burned/burnt", "burned/burnt", "태우다"], ["dream", "dreamed/dreamt", "dreamed/dreamt", "꿈꾸다"], ["spell", "spelled/spelt", "spelled/spelt", "철자를 말하다"],
  ["light", "lit/lighted", "lit/lighted", "불을 켜다"], ["dig", "dug", "dug", "파다"], ["stick", "stuck", "stuck", "붙이다"], ["swing", "swung", "swung", "흔들다"],
  // A-B-C
  ["be", "was/were", "been", "~이다, 있다"], ["begin", "began", "begun", "시작하다"], ["bite", "bit", "bitten", "물다"], ["blow", "blew", "blown", "불다"],
  ["break", "broke", "broken", "깨다"], ["choose", "chose", "chosen", "고르다"], ["do", "did", "done", "하다"], ["draw", "drew", "drawn", "그리다"],
  ["drink", "drank", "drunk", "마시다"], ["drive", "drove", "driven", "운전하다"], ["eat", "ate", "eaten", "먹다"], ["fall", "fell", "fallen", "떨어지다"],
  ["fly", "flew", "flown", "날다"], ["forget", "forgot", "forgotten", "잊다"], ["forgive", "forgave", "forgiven", "용서하다"], ["freeze", "froze", "frozen", "얼다"],
  ["get", "got", "got/gotten", "얻다"], ["give", "gave", "given", "주다"], ["go", "went", "gone", "가다"], ["grow", "grew", "grown", "자라다"],
  ["hide", "hid", "hidden", "숨기다"], ["know", "knew", "known", "알다"], ["lie", "lay", "lain", "눕다"], ["ride", "rode", "ridden", "타다"],
  ["ring", "rang", "rung", "울리다"], ["rise", "rose", "risen", "오르다"], ["see", "saw", "seen", "보다"], ["shake", "shook", "shaken", "흔들다"],
  ["show", "showed", "shown/showed", "보여 주다"], ["sing", "sang", "sung", "노래하다"], ["sink", "sank", "sunk", "가라앉다"], ["speak", "spoke", "spoken", "말하다"],
  ["steal", "stole", "stolen", "훔치다"], ["swim", "swam", "swum", "수영하다"], ["take", "took", "taken", "가져가다"], ["tear", "tore", "torn", "찢다"],
  ["throw", "threw", "thrown", "던지다"], ["wake", "woke", "woken", "깨다"], ["wear", "wore", "worn", "입다"], ["write", "wrote", "written", "쓰다"],
  // A-B-A
  ["become", "became", "become", "~이 되다"], ["come", "came", "come", "오다"], ["run", "ran", "run", "달리다"], ["overcome", "overcame", "overcome", "극복하다"],
];

export const IRREGULAR_VERBS: IrregularVerb[] = RAW.map(([base, past, participle, meaning]) => ({ base, past, participle, meaning }));

export type VerbPattern = "AAA" | "ABB" | "ABC" | "ABA";
export const verbPatterns: Record<VerbPattern, string> = { AAA: "A-A-A (cut-cut-cut)", ABB: "A-B-B (make-made-made)", ABC: "A-B-C (go-went-gone)", ABA: "A-B-A (come-came-come)" };
/** 첫 형태끼리 비교해 유형을 가릅니다(learned/learnt처럼 둘이면 앞의 것으로). */
export function verbPattern(verb: IrregularVerb): VerbPattern {
  const [a, b, c] = [verb.base, verb.past.split("/")[0], verb.participle.split("/")[0]];
  if (a === b && b === c) return "AAA";
  if (a === c) return "ABA";
  if (b === c) return "ABB";
  return "ABC";
}

export type VerbBlank = "none" | "forms" | "meaning" | "mixed";
export const verbBlanks: Record<VerbBlank, string> = { none: "다 보이기(외우기 표)", forms: "원형·뜻만 주기", meaning: "뜻 가리기", mixed: "한 칸씩 섞어 가리기" };
export type VerbSheetOptions = { title: string; patterns: VerbPattern[]; blank: VerbBlank; count: number; seed: number; shuffle: boolean; answers: boolean };

/** 시험지에 실을 동사를 고릅니다(유형·수·섞기). */
export function pickVerbs(options: Pick<VerbSheetOptions, "patterns" | "count" | "seed" | "shuffle">) {
  const pool = IRREGULAR_VERBS.filter(verb => options.patterns.includes(verbPattern(verb)));
  const ordered = options.shuffle ? shuffled(pool, options.seed * 53 + 1) : pool;
  return ordered.slice(0, Math.min(options.count, ordered.length));
}
const COLUMNS = ["원형", "과거", "과거분사", "뜻"] as const;
/** 가릴 칸(0~3)을 정합니다. mixed는 원형이 아닌 칸 하나 또는 원형 하나를 가려요(적어도 한 칸은 남깁니다). */
function hiddenColumns(blank: VerbBlank, random: () => number): number[] {
  if (blank === "none") return [];
  if (blank === "forms") return [1, 2];
  if (blank === "meaning") return [3];
  return [Math.floor(random() * 4)];
}

export function verbSheetHtml(options: VerbSheetOptions, mode: SheetMode) {
  const verbs = pickVerbs(options);
  const random = seededRandom(options.seed * 17 + 3);
  const hides = verbs.map(() => hiddenColumns(options.blank, random));
  const cells = (verb: IrregularVerb) => [verb.base, verb.past, verb.participle, verb.meaning];
  const rows = verbs.map((verb, index) => [String(index + 1), ...cells(verb).map((value, column) => hides[index].includes(column) ? "" : column === 3 ? escapeHtml(value) : `<b>${escapeHtml(value)}</b>`)]);
  const table = sheetTable(["번호", ...COLUMNS], rows, { widths: ["8%", "22%", "22%", "22%", "26%"], font: "10.5pt" });
  const answer = options.answers && options.blank !== "none"
    ? `<section style="break-before:page;${mode === "screen" ? "margin-top:8mm;padding-top:6mm;border-top:1px dashed #999" : ""}"><h2 style="margin:0 0 3mm;font-size:13pt">정답</h2>${sheetTable(["번호", ...COLUMNS], verbs.map((verb, index) => [String(index + 1), ...cells(verb).map(escapeHtml)]), { widths: ["8%", "22%", "22%", "22%", "26%"], font: "9.5pt" })}</section>`
    : "";
  return clipboardWrap(sheetHead(options.title.trim() || "불규칙 동사 변화표") + table + answer, mode);
}
export function verbSheetText(options: VerbSheetOptions) {
  const verbs = pickVerbs(options);
  const random = seededRandom(options.seed * 17 + 3);
  const lines = [...textHead(options.title.trim() || "불규칙 동사 변화표"), "", COLUMNS.join("\t")];
  const answers: string[] = [];
  verbs.forEach((verb, index) => {
    const hide = hiddenColumns(options.blank, random);
    const values = [verb.base, verb.past, verb.participle, verb.meaning];
    lines.push(`${index + 1}. ${values.map((value, column) => hide.includes(column) ? "______" : value).join("\t")}`);
    answers.push(`${index + 1}. ${values.join(" - ")}`);
  });
  if (options.answers && options.blank !== "none") lines.push("", "정답", ...answers);
  return lines.join("\n");
}
