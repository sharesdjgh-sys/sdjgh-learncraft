/* 국어 문법: 표준 발음법(제4장 받침의 발음 ~ 제7장 음의 첨가)을 따라 낱말의 표준 발음과 음운 변동 과정을 구합니다.
   형태소 경계가 있어야 정해지는 규칙은 교사가 표시합니다.
   +  합성어·파생어의 경계(뒤가 실질 형태소나 접두사 뒤 말): ㄴ 첨가, 대표음으로 바꾼 뒤 연음
   ~  용언 어간과 어미의 경계: 어간 받침 ㄴ·ㅁ·ㄼ·ㄾ 뒤 된소리, 용언 어간 ㄺ + ㄱ → [ㄹ]
   *  뒤 글자를 된소리로(사잇소리 현상, 한자어 ㄹ 받침 뒤, 관형사형 -(으)ㄹ 뒤)
   '  앞 글자의 받침 ㅅ이 사이시옷
   띄어 쓴 말은 대표음으로 바꾼 뒤 이어 발음합니다. 표시가 없는 경계는 조사·어미·접미사(형식 형태소) 앞으로 봅니다. */
import { CLUSTERS, compose, decompose, isSyllable, phonemeCount } from "./hangul";

export type RuleId = "coda" | "cluster" | "nasal" | "rNasal" | "lateral" | "palatal" | "tense" | "aspirate" | "hDrop" | "nInsert" | "sai" | "liaison";
export type ChangeType = "교체" | "탈락" | "첨가" | "축약" | "사잇소리" | "연음";
export const RULES: Record<RuleId, { name: string; type: ChangeType; article: string; how: string }> = {
  coda: { name: "음절의 끝소리 규칙", type: "교체", article: "제8·9항", how: "받침은 ㄱ·ㄴ·ㄷ·ㄹ·ㅁ·ㅂ·ㅇ 일곱 소리로만 발음해요(ㄲ·ㅋ→ㄱ, ㅅ·ㅆ·ㅈ·ㅊ·ㅌ·ㅎ→ㄷ, ㅍ→ㅂ)." },
  cluster: { name: "자음군 단순화", type: "탈락", article: "제10·11항", how: "겹받침은 자음 앞이나 끝에서 둘 중 하나만 발음해요." },
  nasal: { name: "비음화", type: "교체", article: "제18항", how: "받침 ㄱ·ㄷ·ㅂ이 ㄴ·ㅁ 앞에서 ㅇ·ㄴ·ㅁ으로 바뀌어요." },
  rNasal: { name: "ㄹ의 비음화", type: "교체", article: "제19항", how: "받침 ㅁ·ㅇ(과 ㄱ·ㅂ) 뒤의 ㄹ이 ㄴ으로 바뀌어요." },
  lateral: { name: "유음화", type: "교체", article: "제20항", how: "ㄴ이 ㄹ의 앞이나 뒤에서 ㄹ로 바뀌어요." },
  palatal: { name: "구개음화", type: "교체", article: "제17항", how: "받침 ㄷ·ㅌ이 모음 ㅣ로 시작하는 조사·접미사 앞에서 ㅈ·ㅊ으로 바뀌어요." },
  tense: { name: "된소리되기", type: "교체", article: "제23~27항", how: "예사소리 ㄱ·ㄷ·ㅂ·ㅅ·ㅈ이 일정한 조건에서 ㄲ·ㄸ·ㅃ·ㅆ·ㅉ으로 바뀌어요." },
  aspirate: { name: "거센소리되기", type: "축약", article: "제12항", how: "ㅎ과 ㄱ·ㄷ·ㅂ·ㅈ이 만나 ㅋ·ㅌ·ㅍ·ㅊ 하나로 줄어요." },
  hDrop: { name: "ㅎ 탈락", type: "탈락", article: "제12항", how: "받침 ㅎ이 모음 앞이나 ㄴ·ㅅ 앞에서 소리 나지 않아요." },
  nInsert: { name: "ㄴ 첨가", type: "첨가", article: "제29항", how: "합성어·파생어에서 앞말이 자음으로 끝나고 뒷말이 이·야·여·요·유로 시작하면 ㄴ이 덧나요." },
  sai: { name: "사잇소리 현상", type: "사잇소리", article: "제28·30항", how: "합성어에서 뒷말의 첫소리가 된소리로 나거나 ㄴ 소리가 덧나요." },
  liaison: { name: "연음", type: "연음", article: "제13~16항", how: "받침이 모음으로 시작하는 뒤 음절의 첫소리로 옮겨 가요(음운 변동은 아니에요)." },
};

type Boundary = "" | "+" | "~" | " ";
type Syl = { cho: string; jung: string; jong: string; orig: string; text: string; before: Boundary; star: boolean; sai: boolean; tenseBy: RuleId | null; fromHi: boolean; nrException: boolean };
export type PhonologyStep = { rule: RuleId; form: string };
export type PhonologyResult = { input: string; surface: string; steps: PhonologyStep[]; standard: string; allowed: string | null; before: number; after: number; verbGuess: boolean };

const TENSE: Record<string, string> = { "ㄱ": "ㄲ", "ㄷ": "ㄸ", "ㅂ": "ㅃ", "ㅅ": "ㅆ", "ㅈ": "ㅉ" };
const OBSTRUENT_START = new Set(["ㄱ", "ㄷ", "ㅂ", "ㅅ", "ㅈ"]);
const Y_VOWELS = new Set(["ㅣ", "ㅑ", "ㅕ", "ㅛ", "ㅠ"]);
const CODA: Record<string, string> = { "ㄲ": "ㄱ", "ㅋ": "ㄱ", "ㅅ": "ㄷ", "ㅆ": "ㄷ", "ㅈ": "ㄷ", "ㅊ": "ㄷ", "ㅌ": "ㄷ", "ㅎ": "ㄷ", "ㅍ": "ㅂ" };
/** 자음 앞·끝에서 겹받침이 남기는 소리(제10·11항) */
const CLUSTER_KEEP: Record<string, string> = { "ㄳ": "ㄱ", "ㄵ": "ㄴ", "ㄶ": "ㄴ", "ㄼ": "ㄹ", "ㄽ": "ㄹ", "ㄾ": "ㄹ", "ㅀ": "ㄹ", "ㅄ": "ㅂ", "ㄺ": "ㄱ", "ㄻ": "ㅁ", "ㄿ": "ㅂ" };
/** ㄴ + ㄹ이 [ㄴㄴ]으로 나는 낱말(제20항 다만) */
export const NR_EXCEPTIONS = ["의견란", "임진란", "생산량", "결단력", "공권력", "동원령", "상견례", "횡단로", "이원론", "입원료", "구근류"];

/** 표시가 섞인 입력을 음절로 나눕니다. 한글·표시·띄어쓰기 말고 다른 글자가 있으면 오류를 알립니다. */
export function parseWord(input: string): { syllables: Syl[]; surface: string } | { error: string } {
  const syllables: Syl[] = [];
  let before: Boundary = "";
  let star = false;
  for (const char of input.trim()) {
    if (char === "+" || char === "-") { before = "+"; continue; }
    if (char === "~") { before = "~"; continue; }
    if (char === "*") { star = true; continue; }
    if (char === " ") { if (before === "") before = " "; continue; }
    if (char === "'" || char === "’") { const last = syllables[syllables.length - 1]; if (!last || last.jong !== "ㅅ") return { error: "사이시옷 표시(')는 받침 ㅅ이 있는 글자 뒤에 붙여요." }; last.sai = true; continue; }
    if (!isSyllable(char)) return { error: `‘${char}’는 쓸 수 없어요. 한글 낱말과 + ~ * ' 표시만 넣어 주세요.` };
    const { cho, jung, jong } = decompose(char)!;
    syllables.push({ cho, jung, jong, orig: jong, text: char, before: syllables.length ? before : "", star, sai: false, tenseBy: null, fromHi: false, nrException: false });
    before = "";
    star = false;
  }
  if (!syllables.length) return { error: "낱말을 넣어 주세요." };
  if (syllables.length > 24) return { error: "24음절 이하로 넣어 주세요." };
  return { syllables, surface: input.replace(/[+~*'’-]/g, "").replace(/\s+/g, " ").trim() };
}

const form = (syllables: Syl[]) => syllables.map(compose).join("");
/** 조사·어미·접미사 앞(형식 형태소)인지 */
const formal = (syllable: Syl | undefined) => !!syllable && (syllable.before === "" || syllable.before === "~");
const vowelStart = (syllable: Syl | undefined) => !!syllable && syllable.cho === "ㅇ";

/* 규칙마다 음절을 고치고, 고친 것이 있으면 true를 돌려줍니다. */
type Rule = (syllables: Syl[]) => boolean;

const hDrop: Rule = syllables => {
  let changed = false;
  syllables.forEach((syllable, index) => {
    const next = syllables[index + 1];
    if (!["ㅎ", "ㄶ", "ㅀ"].includes(syllable.jong) || !next) return;
    const rest = syllable.jong === "ㅎ" ? "" : syllable.jong === "ㄶ" ? "ㄴ" : "ㄹ";
    // ㅎ + 모음으로 시작하는 어미·접미사(낳은[나은]), ㅎ + ㅅ(닿소[다쏘]: 뒤의 ㅅ은 된소리로), ㄶ·ㅀ + ㄴ(않네[안네])
    if (vowelStart(next) && formal(next)) { syllable.jong = rest; changed = true; }
    else if (next.cho === "ㅅ") { syllable.jong = rest; next.tenseBy = "hDrop"; changed = true; }
    else if (next.cho === "ㄴ" && syllable.jong !== "ㅎ") { syllable.jong = rest; changed = true; }
  });
  return changed;
};
/** 옷 한 벌[오탄벌]처럼 ㅎ 앞의 ㅅ·ㅆ·ㅊ·ㅌ은 먼저 [ㄷ]이 됩니다(제12항 붙임 2). */
const codaBeforeH: Rule = syllables => {
  let changed = false;
  syllables.forEach((syllable, index) => {
    const next = syllables[index + 1];
    if (next?.cho === "ㅎ" && ["ㅅ", "ㅆ", "ㅊ", "ㅌ"].includes(syllable.jong)) { syllable.jong = "ㄷ"; changed = true; }
  });
  return changed;
};
const ASPIRATE: Record<string, string> = { "ㄱ": "ㅋ", "ㄷ": "ㅌ", "ㅂ": "ㅍ", "ㅈ": "ㅊ" };
const aspirate: Rule = syllables => {
  let changed = false;
  syllables.forEach((syllable, index) => {
    const next = syllables[index + 1];
    if (!next) return;
    // ㅎ(ㄶ·ㅀ) + ㄱ·ㄷ·ㅈ → ㅋ·ㅌ·ㅊ
    if (["ㅎ", "ㄶ", "ㅀ"].includes(syllable.jong) && ["ㄱ", "ㄷ", "ㅈ"].includes(next.cho)) {
      next.cho = ASPIRATE[next.cho];
      syllable.jong = syllable.jong === "ㅎ" ? "" : syllable.jong === "ㄶ" ? "ㄴ" : "ㄹ";
      changed = true;
      return;
    }
    // ㄱ(ㄺ)·ㄷ·ㅂ(ㄼ)·ㅈ(ㄵ) + ㅎ → ㅋ·ㅌ·ㅍ·ㅊ
    if (next.cho !== "ㅎ") return;
    const parts = CLUSTERS[syllable.jong];
    const last = parts ? parts[1] : syllable.jong;
    if (!ASPIRATE[last] || (parts && !["ㄺ", "ㄼ", "ㄵ"].includes(syllable.jong))) return;
    next.cho = ASPIRATE[last];
    // ㄷ + 히는 [티]를 거쳐 [치]가 됩니다(닫히다[다치다]).
    next.fromHi = last === "ㄷ" && next.jung === "ㅣ" && formal(next);
    syllable.jong = parts ? parts[0] : "";
    changed = true;
  });
  return changed;
};
const palatal: Rule = syllables => {
  let changed = false;
  syllables.forEach((syllable, index) => {
    const next = syllables[index + 1];
    if (syllable.fromHi) { syllable.cho = "ㅊ"; syllable.fromHi = false; changed = true; }
    if (!next || !formal(next) || next.cho !== "ㅇ" || next.jung !== "ㅣ" || !["ㄷ", "ㅌ", "ㄾ"].includes(syllable.jong)) return;
    next.cho = syllable.jong === "ㄷ" ? "ㅈ" : "ㅊ";
    syllable.jong = syllable.jong === "ㄾ" ? "ㄹ" : "";
    changed = true;
  });
  return changed;
};
/** 사이시옷 뒤 ㄱ·ㄷ·ㅂ·ㅅ·ㅈ은 된소리로만 발음하는 것이 원칙입니다(제30항 1). keep이면 허용 발음([ㄷ]을 발음)으로 둡니다. */
const sai = (keep: boolean): Rule => syllables => {
  let changed = false;
  syllables.forEach((syllable, index) => {
    const next = syllables[index + 1];
    if (!syllable.sai || !next || !OBSTRUENT_START.has(next.cho)) return;
    next.cho = TENSE[next.cho];
    if (!keep) syllable.jong = "";
    changed = true;
  });
  return changed;
};
const nInsert: Rule = syllables => {
  let changed = false;
  syllables.forEach((syllable, index) => {
    const next = syllables[index + 1];
    if (!next || !syllable.jong || next.cho !== "ㅇ" || !Y_VOWELS.has(next.jung) || (next.before !== "+" && !syllable.sai)) return;
    next.cho = "ㄴ";
    changed = true;
  });
  return changed;
};
/** 뒤 음절이 조사·어미·접미사처럼 모음으로 시작하면 받침을 그대로 옮기므로(제13·14항) 끝소리 규칙을 적용하지 않습니다. */
const movesAsIs = (syllables: Syl[], index: number) => { const next = syllables[index + 1]; return vowelStart(next) && formal(next); };
const cluster: Rule = syllables => {
  let changed = false;
  syllables.forEach((syllable, index) => {
    if (!CLUSTERS[syllable.jong] || movesAsIs(syllables, index)) return;
    const next = syllables[index + 1];
    let keep = CLUSTER_KEEP[syllable.jong];
    // 밟-은 자음 앞에서 [밥], 넓죽하다·넓둥글다의 넓-은 [넙](제10항 다만)
    if (syllable.text === "밟" || (syllable.text === "넓" && (next?.text === "죽" || next?.text === "둥"))) keep = "ㅂ";
    // 용언 어간 ㄺ은 ㄱ 앞에서 [ㄹ](제11항 다만): 맑게[말께]
    if (syllable.jong === "ㄺ" && next?.before === "~" && next.cho === "ㄱ") keep = "ㄹ";
    syllable.jong = keep;
    changed = true;
  });
  return changed;
};
const coda: Rule = syllables => {
  let changed = false;
  syllables.forEach((syllable, index) => {
    if (!CODA[syllable.jong] || movesAsIs(syllables, index)) return;
    syllable.jong = CODA[syllable.jong];
    changed = true;
  });
  return changed;
};
const liaison: Rule = syllables => {
  let changed = false;
  syllables.forEach((syllable, index) => {
    const next = syllables[index + 1];
    if (!next || next.cho !== "ㅇ" || !syllable.jong || syllable.jong === "ㅇ") return;
    const parts = CLUSTERS[syllable.jong];
    if (parts) {
      syllable.jong = parts[0];
      next.cho = parts[1];
      // 겹받침의 ㅅ은 옮겨 가며 된소리로 납니다(제14항): 넋이[넉씨], 값을[갑쓸]
      if (parts[1] === "ㅅ") next.tenseBy = "liaison";
    } else {
      next.cho = syllable.jong;
      syllable.jong = "";
    }
    changed = true;
  });
  return changed;
};
const rNasal: Rule = syllables => {
  let changed = false;
  syllables.forEach((syllable, index) => {
    const next = syllables[index + 1];
    if (next?.cho !== "ㄹ") return;
    if (["ㅁ", "ㅇ", "ㄱ", "ㅂ"].includes(syllable.jong) || (syllable.jong === "ㄴ" && syllable.nrException)) { next.cho = "ㄴ"; changed = true; }
  });
  return changed;
};
const NASAL: Record<string, string> = { "ㄱ": "ㅇ", "ㄷ": "ㄴ", "ㅂ": "ㅁ" };
const nasal: Rule = syllables => {
  let changed = false;
  syllables.forEach((syllable, index) => {
    const next = syllables[index + 1];
    if (next && (next.cho === "ㄴ" || next.cho === "ㅁ") && NASAL[syllable.jong]) { syllable.jong = NASAL[syllable.jong]; changed = true; }
  });
  return changed;
};
const lateral: Rule = syllables => {
  let changed = false;
  syllables.forEach((syllable, index) => {
    const next = syllables[index + 1];
    if (!next) return;
    if (syllable.jong === "ㄴ" && next.cho === "ㄹ") { syllable.jong = "ㄹ"; changed = true; }
    else if (syllable.jong === "ㄹ" && next.cho === "ㄴ") { next.cho = "ㄹ"; changed = true; }
  });
  return changed;
};
const tenseRule = (starAsSai: boolean): Rule => syllables => {
  let changed = false;
  syllables.forEach((syllable, index) => {
    const next = syllables[index + 1];
    if (!next || !OBSTRUENT_START.has(next.cho)) return;
    const star = next.star && (starAsSai ? next.before === "+" : next.before !== "+");
    const afterStop = ["ㄱ", "ㄷ", "ㅂ"].includes(syllable.jong); // 제23항
    const stemEnding = next.before === "~" && next.cho !== "ㅂ" && (["ㄴ", "ㄵ", "ㅁ", "ㄻ"].includes(syllable.orig) || (["ㄼ", "ㄾ", "ㄺ"].includes(syllable.orig) && syllable.jong === "ㄹ")); // 제24·25항, 제11항 다만
    const flagged = next.tenseBy !== null && !starAsSai;
    if (!(starAsSai ? star : star || afterStop || stemEnding || flagged)) return;
    next.cho = TENSE[next.cho];
    next.tenseBy = null;
    changed = true;
  });
  return changed;
};

/** 표시한 낱말의 표준 발음과 변동 과정을 구합니다. verb면 표시가 없을 때 첫 음절을 용언 어간으로 봅니다. */
export function pronounce(input: string, options: { verb?: boolean; keepSai?: boolean } = {}): PhonologyResult | { error: string } {
  const parsed = parseWord(input);
  if ("error" in parsed) return parsed;
  const { syllables, surface } = parsed;
  const verbGuess = !!options.verb && syllables.length > 1 && !syllables.some(syllable => syllable.before === "~");
  if (verbGuess) syllables[1].before = "~";
  // ㄴ + ㄹ이 [ㄴㄴ]이 되는 낱말은 그 자리를 표시해 둡니다.
  const letters = syllables.map(syllable => syllable.text).join("");
  for (const word of NR_EXCEPTIONS) {
    for (let at = letters.indexOf(word); at >= 0; at = letters.indexOf(word, at + 1)) {
      for (let k = 0; k < word.length - 1; k += 1) if (syllables[at + k].jong === "ㄴ" && syllables[at + k + 1].cho === "ㄹ") syllables[at + k].nrException = true;
    }
  }
  const steps: PhonologyStep[] = [];
  const run = (rule: RuleId, apply: Rule) => { if (apply(syllables)) steps.push({ rule, form: form(syllables) }); };
  run("hDrop", hDrop);
  run("coda", codaBeforeH);
  run("aspirate", aspirate);
  run("palatal", palatal);
  run("sai", sai(!!options.keepSai));
  run("nInsert", nInsert);
  run("cluster", cluster);
  run("coda", coda);
  run("liaison", liaison);
  run("rNasal", rNasal);
  run("nasal", nasal);
  run("lateral", lateral);
  run("sai", tenseRule(true));
  run("tense", tenseRule(false));
  const standard = form(syllables);
  let allowed: string | null = null;
  if (!options.keepSai && syllables.some(syllable => syllable.sai)) {
    const other = pronounce(input, { ...options, keepSai: true });
    if (!("error" in other) && other.standard !== standard) allowed = other.standard;
  }
  return { input, surface, steps, standard, allowed, before: phonemeCount(surface), after: phonemeCount(standard), verbGuess };
}

/** 연음을 뺀 음운 변동 이름(겹치는 것은 한 번만) */
export const changeRules = (result: PhonologyResult): RuleId[] => [...new Set(result.steps.map(step => step.rule).filter(rule => rule !== "liaison"))];
