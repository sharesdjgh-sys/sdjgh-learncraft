import { CHINESE_HANZI } from "@/data/chinese-hanzi";
import { hanjaEntry, mainMeaning } from "@/features/hanmun/dictionary";
import { splitPinyin, splitTone } from "./pinyin";

/* 간체자 사전입니다. 통용규범한자표 8,105자의 병음·총획수·빈도·번체자(Unihan)에, 번체자를 거쳐 한국 한자음과 훈(한문 도구의 한자 사전)을 붙입니다.
 * 본문 풀이·중국문화 자료의 병음 점검과 간체자 학습지가 함께 씁니다. */

export type HanziEntry = { char: string; strokes: number; rank: number; pinyin: string[]; traditional: string[] };
const HAN = /\p{Script=Han}/u;
export const hanziOf = (text: string) => [...text.normalize("NFC")].filter(char => HAN.test(char));

let table: Map<string, HanziEntry> | null = null;
export function hanziEntry(char: string): HanziEntry | null {
  if (!table) {
    table = new Map();
    for (const line of CHINESE_HANZI.split("\n")) {
      const [char, strokes, rank, pinyin, traditional = ""] = line.split("|");
      table.set(char, { char, strokes: Number(strokes), rank: Number(rank), pinyin: pinyin.split(" ").filter(Boolean), traditional: [...traditional] });
    }
  }
  return table.get(char.normalize("NFC")) ?? null;
}
/** 자주 쓰는 글자인지입니다. 현대 한어 빈도 자료에서 2,500위 안이면 자주 쓰는 글자로 봅니다. */
export const isCommonHanzi = (entry: HanziEntry | null) => Boolean(entry && entry.rank > 0 && entry.rank <= 2500);

/** 한국 한자로 읽은 훈음입니다. 번체자를 먼저 보고, 간체자가 한국에서도 쓰는 다른 글자면 함께 적습니다(后 → 後 뒤 후 / 后 임금 후).
 *  간체자가 번체에서도 그대로 쓰이는 글자면(了: 번체 瞭은 liǎo 뜻일 때만) 그 글자를 먼저 적습니다. */
export function koreanReadings(char: string): { char: string; meaning: string }[] {
  const entry = hanziEntry(char);
  const sameInTraditional = Boolean(hanjaEntry(char)) && (entry?.traditional ?? []).some(variant => !entry?.pinyin.every(reading => hanziEntry(variant)?.pinyin.includes(reading) ?? true));
  const candidates = [...new Set(sameInTraditional ? [char, ...(entry?.traditional ?? [])] : [...(entry?.traditional ?? []), char])];
  const found: { char: string; meaning: string }[] = [];
  for (const candidate of candidates) {
    const reading = hanjaEntry(candidate)?.readings[0];
    // "麪과 同字"처럼 같은 글자라는 설명만 있는 훈은 건너뜁니다.
    const gloss = reading?.glosses.find(item => !/同字|[와과]\s*같은|의\s*속자|의\s*略字|의\s*古字/.test(item));
    const meaning = reading && gloss ? mainMeaning({ ...reading, glosses: [gloss] }) : "";
    if (meaning && !found.some(item => item.meaning === meaning)) found.push({ char: candidate, meaning });
  }
  return found;
}

// ── 병음 점검 ─────────────────────────────────────────────

/** 사전 읽기와 같은지 봅니다. 경성, 一·不의 성조 변화, 3성 연속의 2성 표기는 맞는 것으로 봅니다. */
export function readingMatches(char: string, syllable: string) {
  const entry = hanziEntry(char);
  if (!entry) return true;
  const { base, tone } = splitTone(syllable);
  if (entry.pinyin.some(reading => splitTone(reading).base === base && (tone === 0 || splitTone(reading).tone === tone))) return true;
  if (char === "一" && base === "yi") return true;
  if (char === "不" && base === "bu") return true;
  if (tone === 2 && entry.pinyin.some(reading => splitTone(reading).base === base && splitTone(reading).tone === 3)) return true;
  // 儿化(r)는 앞 음절에 붙여 적기도 합니다: 一点儿 yìdiǎnr.
  return char === "儿" && base === "r";
}

/** 한자 덩어리에 단 병음을 점검합니다. 형식이 틀리면 error, 사전 읽기와 다르면 check입니다. */
export function pinyinProblem(base: string, reading: string): { level: "error" | "check"; text: string } | null {
  const error = (text: string) => ({ level: "error" as const, text });
  const chars = hanziOf(base);
  if (!reading.trim()) return error("병음이 비어 있습니다.");
  if (/\d/.test(reading)) return error("성조는 숫자가 아니라 성조 부호로 씁니다(mǎ).");
  const syllables = splitPinyin(reading);
  if (!syllables) return error(`‘${reading}’를 병음 음절로 나눌 수 없습니다.`);
  // 儿化: 한자에 儿가 있는데 병음은 앞 음절에 r을 붙였으면(diǎnr) r을 따로 셉니다.
  const aligned = syllables.length === chars.length ? syllables : syllables.flatMap(syllable => /[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]r$/u.test(syllable) && !/^(e|é|ě|è|ē)r$/u.test(syllable) ? [syllable.slice(0, -1), "r"] : [syllable]);
  if (aligned.length !== chars.length) return error(`한자 ${chars.length}자인데 병음은 ${syllables.length}음절입니다.`);
  const odd = chars.flatMap((char, index) => readingMatches(char, aligned[index]) ? [] : [`${char} ${aligned[index]}(사전: ${hanziEntry(char)?.pinyin.join("·")})`]);
  return odd.length ? { level: "check", text: `사전 읽기와 다릅니다: ${odd.slice(0, 3).join(", ")}` } : null;
}
/** 병음 문제를 한국어 한 줄로 돌려줍니다. 없으면 null입니다. */
export const pinyinIssue = (base: string, reading: string) => pinyinProblem(base, reading)?.text ?? null;
