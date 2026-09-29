import { CHINESE_SYLLABLES } from "@/data/chinese-syllables";

/* 한어병음 규칙입니다. 병음 학습 탭과 본문 풀이의 병음 점검이 함께 씁니다.
 * 한글 설명은 발음을 돕는 참고용입니다. 음절 목록과 대표 글자는 Unihan 통용규범한자표 읽기에서 만들었습니다(scripts/build-chinese-data.ts). */

export type Tone = 0 | 1 | 2 | 3 | 4;
const MARKS: Record<string, string> = { a: "āáǎà", e: "ēéěè", i: "īíǐì", o: "ōóǒò", u: "ūúǔù", ü: "ǖǘǚǜ" };
const UNMARK = new Map(Object.entries(MARKS).flatMap(([vowel, marks]) => [...marks].map((mark, index) => [mark, { vowel, tone: (index + 1) as Tone }] as const)));

export const toneInfo: Record<Tone, { name: string; pitch: string; tip: string }> = {
  1: { name: "1성", pitch: "55", tip: "높고 평평하게 길게 끕니다." },
  2: { name: "2성", pitch: "35", tip: "중간 높이에서 높이 올라갑니다. 되물을 때 ‘응?’처럼." },
  3: { name: "3성", pitch: "214", tip: "낮게 내려갔다가 올라갑니다. 뒤에 다른 음절이 오면 낮게만 내는 반3성(21)으로 많이 소리 냅니다." },
  4: { name: "4성", pitch: "51", tip: "높은 데서 아래로 뚝 떨어집니다." },
  0: { name: "경성", pitch: "", tip: "짧고 가볍게, 앞 음절에 붙여 소리 냅니다. 성조 부호를 쓰지 않습니다." },
};

/** 병음 한 음절을 성조 없는 모양과 성조로 나눕니다. 숫자 표기(ma3, lv4, nu:3)도 받습니다. */
export function splitTone(syllable: string): { base: string; tone: Tone } {
  const text = syllable.normalize("NFC").toLowerCase().trim().replace(/u:|v/g, "ü");
  const numbered = text.match(/^([a-zü]+)([0-5])$/u);
  if (numbered) return { base: numbered[1], tone: (Number(numbered[2]) % 5) as Tone };
  let tone: Tone = 0;
  const base = [...text].map(char => {
    const found = UNMARK.get(char);
    if (found) tone = found.tone;
    return found?.vowel ?? char;
  }).join("");
  return { base, tone };
}

/** 성조 부호를 붙입니다. a·e가 있으면 그 위에, ou면 o 위에, 그 밖에는 마지막 모음 위에 씁니다(liù, guǐ). */
export function markTone(base: string, tone: Tone) {
  if (!tone) return base;
  const chars = [...base];
  let index = chars.findIndex(char => char === "a" || char === "e");
  if (index < 0) index = base.includes("ou") ? chars.indexOf("o") : chars.findLastIndex(char => "iouü".includes(char));
  if (index < 0) return base;
  chars[index] = MARKS[chars[index]][tone - 1];
  return chars.join("");
}
export const numbered = (syllable: string) => { const { base, tone } = splitTone(syllable); return `${base.replace(/ü/g, "v")}${tone || 5}`; };

// ── 성모·운모 ─────────────────────────────────────────────

export type Initial = { key: string; group: string; tip: string };
export const initialGroups = ["쌍순음", "순치음", "설첨중음", "설근음", "설면음", "권설음", "설첨전음"] as const;
export const INITIALS: Initial[] = [
  { key: "b", group: "쌍순음", tip: "두 입술을 붙였다 떼며 숨을 약하게(ㅂ·ㅃ 사이)" },
  { key: "p", group: "쌍순음", tip: "두 입술로, 숨을 세게 내보내며(ㅍ)" },
  { key: "m", group: "쌍순음", tip: "두 입술을 붙인 콧소리(ㅁ)" },
  { key: "f", group: "순치음", tip: "윗니를 아랫입술에 살짝 대고(영어 f)" },
  { key: "d", group: "설첨중음", tip: "혀끝을 윗잇몸에 대고 숨을 약하게(ㄷ·ㄸ 사이)" },
  { key: "t", group: "설첨중음", tip: "혀끝을 윗잇몸에 대고 숨을 세게(ㅌ)" },
  { key: "n", group: "설첨중음", tip: "혀끝을 윗잇몸에 댄 콧소리(ㄴ)" },
  { key: "l", group: "설첨중음", tip: "혀끝을 윗잇몸에 대고 옆으로 흘리듯(ㄹ, 영어 l)" },
  { key: "g", group: "설근음", tip: "혀뿌리를 여린입천장에 대고 숨을 약하게(ㄱ·ㄲ 사이)" },
  { key: "k", group: "설근음", tip: "혀뿌리로, 숨을 세게(ㅋ)" },
  { key: "h", group: "설근음", tip: "혀뿌리를 여린입천장에 가까이 대고 마찰(ㅎ보다 거칠게)" },
  { key: "j", group: "설면음", tip: "혓바닥을 입천장에 대고, 혀끝은 아랫니 뒤에(ㅈ)" },
  { key: "q", group: "설면음", tip: "j와 같은 자리에서 숨을 세게(ㅊ)" },
  { key: "x", group: "설면음", tip: "j와 같은 자리에서 마찰(ㅅ)" },
  { key: "zh", group: "권설음", tip: "혀끝을 말아 입천장 앞쪽에 대고(ㅈ)" },
  { key: "ch", group: "권설음", tip: "혀끝을 말아 숨을 세게(ㅊ)" },
  { key: "sh", group: "권설음", tip: "혀끝을 말아 마찰(ㅅ)" },
  { key: "r", group: "권설음", tip: "혀끝을 말아 울리며 마찰(영어 r과 비슷)" },
  { key: "z", group: "설첨전음", tip: "혀끝을 윗니 뒤에 대고(ㅉ)" },
  { key: "c", group: "설첨전음", tip: "혀끝을 윗니 뒤에 대고 숨을 세게(ㅊ)" },
  { key: "s", group: "설첨전음", tip: "혀끝을 윗니 뒤에 가까이 대고 마찰(ㅆ)" },
];
const INITIAL_KEYS = INITIALS.map(initial => initial.key).sort((a, b) => b.length - a.length);

/** zero는 성모 없이 쓸 때의 표기(y·w)입니다. */
export type Final = { key: string; group: string; zero?: string; tip?: string };
export const finalGroups = ["단운모", "복운모", "비운모", "i 결합운모", "u 결합운모", "ü 결합운모", "특수 운모"] as const;
export const FINALS: Final[] = [
  { key: "a", group: "단운모", tip: "입을 크게 벌려(아)" }, { key: "o", group: "단운모", tip: "입술을 둥글게(오어)" }, { key: "e", group: "단운모", tip: "입을 조금 벌리고 혀를 뒤로(으어)" },
  { key: "i", group: "단운모", zero: "yi", tip: "입술을 옆으로(이)" }, { key: "u", group: "단운모", zero: "wu", tip: "입술을 둥글게 내밀어(우)" }, { key: "ü", group: "단운모", zero: "yu", tip: "‘이’를 발음하며 입술만 둥글게(위, 입 모양은 끝까지 그대로)" },
  { key: "ai", group: "복운모" }, { key: "ei", group: "복운모" }, { key: "ao", group: "복운모" }, { key: "ou", group: "복운모" },
  { key: "an", group: "비운모", tip: "-n은 혀끝을 윗잇몸에(ㄴ 받침)" }, { key: "en", group: "비운모" }, { key: "ang", group: "비운모", tip: "-ng는 혀뿌리로(ㅇ 받침)" }, { key: "eng", group: "비운모" }, { key: "ong", group: "비운모" },
  { key: "ia", group: "i 결합운모", zero: "ya" }, { key: "ie", group: "i 결합운모", zero: "ye" }, { key: "iao", group: "i 결합운모", zero: "yao" }, { key: "iou", group: "i 결합운모", zero: "you", tip: "성모 뒤에서는 iu로 씁니다(liù)." },
  { key: "ian", group: "i 결합운모", zero: "yan", tip: "‘이엔’에 가깝게" }, { key: "in", group: "i 결합운모", zero: "yin" }, { key: "iang", group: "i 결합운모", zero: "yang" }, { key: "ing", group: "i 결합운모", zero: "ying" }, { key: "iong", group: "i 결합운모", zero: "yong" },
  { key: "ua", group: "u 결합운모", zero: "wa" }, { key: "uo", group: "u 결합운모", zero: "wo" }, { key: "uai", group: "u 결합운모", zero: "wai" }, { key: "uei", group: "u 결합운모", zero: "wei", tip: "성모 뒤에서는 ui로 씁니다(guǐ)." },
  { key: "uan", group: "u 결합운모", zero: "wan" }, { key: "uen", group: "u 결합운모", zero: "wen", tip: "성모 뒤에서는 un으로 씁니다(lún)." }, { key: "uang", group: "u 결합운모", zero: "wang" }, { key: "ueng", group: "u 결합운모", zero: "weng" },
  { key: "üe", group: "ü 결합운모", zero: "yue" }, { key: "üan", group: "ü 결합운모", zero: "yuan" }, { key: "ün", group: "ü 결합운모", zero: "yun" },
  { key: "er", group: "특수 운모", tip: "혀를 말면서 ‘얼’" }, { key: "-i", group: "특수 운모", tip: "zh·ch·sh·r, z·c·s 뒤의 i는 ‘이’가 아니라 혀를 그대로 둔 ‘으’에 가까운 소리" },
];
const RETROFLEX_OR_DENTAL = new Set(["zh", "ch", "sh", "r", "z", "c", "s"]);
const PALATAL = new Set(["j", "q", "x"]);

/** 성모와 운모를 이어 쓴 병음(성조 없음)입니다. 쓰는 규칙: j·q·x 뒤 ü → u, iou → iu, uei → ui, uen → un, 성모 없으면 y·w. */
export function spell(initial: string, final: string) {
  const info = FINALS.find(item => item.key === final);
  if (!initial) return final === "-i" ? "" : info?.zero ?? final;
  if (final === "-i") return RETROFLEX_OR_DENTAL.has(initial) ? `${initial}i` : "";
  let body = final;
  if (body === "iou") body = "iu";
  if (body === "uei") body = "ui";
  if (body === "uen") body = "un";
  if (PALATAL.has(initial)) body = body.replace("ü", "u");
  return initial + body;
}

/** 성조 없는 병음을 성모와 운모로 나눕니다. 운모는 표준 모양(ü, iou, uei, uen, -i)으로 돌려줍니다. */
export function parseSyllable(base: string): { initial: string; final: string } | null {
  const text = base.normalize("NFC").toLowerCase();
  const zero = FINALS.find(item => item.zero === text);
  if (zero) return { initial: "", final: zero.key };
  if (FINALS.some(item => item.key === text && !item.zero)) return { initial: "", final: text };
  const initial = INITIAL_KEYS.find(key => text.startsWith(key));
  if (!initial) return null;
  let final = text.slice(initial.length);
  if (!final) return null;
  if (RETROFLEX_OR_DENTAL.has(initial) && final === "i") return { initial, final: "-i" };
  if (PALATAL.has(initial)) final = final.replace(/^u/, "ü");
  final = ({ iu: "iou", ui: "uei", un: "uen" } as Record<string, string>)[final] ?? final;
  if (!FINALS.some(item => item.key === final)) return null;
  return spell(initial, final) === text ? { initial, final } : null;
}

// ── 음절과 대표 글자 ───────────────────────────────────────

export type SyllableTone = { marked: string; tone: Tone; char: string; rare: boolean };
let syllableTable: Map<string, SyllableTone[]> | null = null;
/** 성조 없는 병음마다 성조별 대표 글자입니다. 통용규범한자표에 있는 음절만 들어 있습니다. */
export function syllables() {
  if (syllableTable) return syllableTable;
  syllableTable = new Map();
  for (const item of CHINESE_SYLLABLES.split(" ")) {
    const match = item.match(/^(\S+?)(\p{Script=Han})(\?)?$/u);
    if (!match) continue;
    const { base, tone } = splitTone(match[1]);
    const list = syllableTable.get(base) ?? [];
    list.push({ marked: match[1], tone, char: match[2], rare: Boolean(match[3]) });
    syllableTable.set(base, list.sort((a, b) => a.tone - b.tone));
  }
  return syllableTable;
}
export const isSyllable = (base: string) => syllables().has(base);
/** 그 음절·성조로 소리를 낼 때 읽힐 글자입니다. 없으면 undefined입니다. */
export const syllableChar = (marked: string) => { const { base, tone } = splitTone(marked); return syllables().get(base)?.find(item => item.tone === tone)?.char; };

// ── 병음 문자열 ───────────────────────────────────────────

/** 병음 문자열을 음절로 나눕니다(띄어쓰기·작은따옴표·붙임표 기준, 붙여 쓴 병음은 가장 긴 음절부터). 나눌 수 없으면 null입니다. */
export function splitPinyin(text: string): string[] | null {
  const parts = text.normalize("NFC").toLowerCase().split(/[\s'’\-·]+/u).filter(Boolean);
  const result: string[] = [];
  for (const part of parts) {
    const syllablesOfPart = splitJoined(part);
    if (!syllablesOfPart) return null;
    result.push(...syllablesOfPart);
  }
  return result.length ? result : null;
}
function splitJoined(part: string): string[] | null {
  const chars = [...part];
  // 뒤에서부터 가장 짧은 나머지가 되도록 앞에서 가장 긴 음절을 잡되, 남은 부분이 나뉘지 않으면 짧은 음절로 다시 시도합니다(xian → xian, xi'an은 따옴표로).
  for (let length = Math.min(6, chars.length); length >= 1; length -= 1) {
    const head = chars.slice(0, length).join("");
    const { base } = splitTone(head);
    if (!isSyllable(base) && !(base === "r" && length === chars.length)) continue;
    if (length === chars.length) return [head];
    const rest = splitJoined(chars.slice(length).join(""));
    if (rest) return [head, ...rest];
  }
  return null;
}

// ── 성조 변화 ─────────────────────────────────────────────

export type SandhiResult = { pinyin: string; changed: boolean; rule?: string };
/** 사전 성조로 적은 음절에 성조 변화를 적용합니다. chars는 음절마다의 글자입니다(一·不 판단에 씁니다). */
export function applySandhi(pinyins: string[], chars: string[] = []): SandhiResult[] {
  const tones = pinyins.map(pinyin => splitTone(pinyin));
  const result: SandhiResult[] = pinyins.map(pinyin => ({ pinyin, changed: false }));
  const set = (index: number, tone: Tone, rule: string) => { result[index] = { pinyin: markTone(tones[index].base, tone), changed: true, rule }; };
  tones.forEach((current, index) => {
    const next = tones[index + 1];
    if (!next) return;
    if (chars[index] === "一" && current.base === "yi" && chars[index - 1] !== "第") {
      if (next.tone === 4) set(index, 2, "一 + 4성 → yí");
      else if (next.tone >= 1) set(index, 4, "一 + 1·2·3성 → yì");
    }
    if (chars[index] === "不" && current.base === "bu" && next.tone === 4) set(index, 2, "不 + 4성 → bú");
  });
  // 3성이 이어지면 마지막 하나만 3성으로 두고 앞은 2성으로 읽습니다(你好 ní hǎo, 我很好 wó hén hǎo).
  for (let start = 0; start < tones.length; start += 1) {
    if (tones[start].tone !== 3 || result[start].changed) continue;
    let end = start;
    while (end + 1 < tones.length && tones[end + 1].tone === 3 && !result[end + 1].changed) end += 1;
    for (let index = start; index < end; index += 1) set(index, 2, "3성 + 3성 → 2성 + 3성");
    start = end;
  }
  return result;
}

/** 성조 변화를 연습할 낱말입니다. 병음은 사전 성조로 적었습니다. */
export const SANDHI_WORDS: [word: string, pinyin: string, meaning: string][] = [
  ["你好", "nǐ hǎo", "안녕하세요"], ["很好", "hěn hǎo", "아주 좋다"], ["可以", "kě yǐ", "~해도 된다"], ["水果", "shuǐ guǒ", "과일"], ["老虎", "lǎo hǔ", "호랑이"],
  ["我很好", "wǒ hěn hǎo", "나는 잘 지낸다"], ["展览馆", "zhǎn lǎn guǎn", "전시관"], ["不是", "bù shì", "~이 아니다"], ["不去", "bù qù", "가지 않는다"], ["不要", "bù yào", "~하지 마라"],
  ["不对", "bù duì", "틀리다"], ["不好", "bù hǎo", "좋지 않다"], ["不来", "bù lái", "오지 않는다"], ["一起", "yī qǐ", "함께"], ["一天", "yī tiān", "하루"],
  ["一年", "yī nián", "일 년"], ["一样", "yī yàng", "같다"], ["一定", "yī dìng", "반드시"], ["一共", "yī gòng", "모두 합해서"], ["一百", "yī bǎi", "백"],
  ["第一", "dì yī", "첫째"], ["不客气", "bù kè qi", "천만에요"], ["一点儿", "yī diǎnr", "조금"], ["洗手", "xǐ shǒu", "손을 씻다"],
];
