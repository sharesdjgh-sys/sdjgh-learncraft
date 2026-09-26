import "server-only";
import { HANJA_WORDS } from "@/data/hanja-words";
import { WORDS_PER_CHAR, type HanjaWord } from "./hanja";

let table: Map<string, string[]> | null = null;

// "學校학교學生학생…"을 네 글자씩 끊어 한자어 → 독음 목록으로 풉니다.
function wordTable() {
  if (table) return table;
  table = new Map();
  const chars = [...HANJA_WORDS];
  for (let index = 0; index + 4 <= chars.length; index += 4) {
    const word = chars[index] + chars[index + 1];
    table.set(word, [...(table.get(word) ?? []), chars[index + 2] + chars[index + 3]]);
  }
  return table;
}

/** 사전에 있는 두 글자 한자어의 독음들입니다. 없으면 빈 배열입니다. */
export const wordReadings = (word: string) => wordTable().get(word.normalize("NFC")) ?? [];

/** AI가 제안한 한자어 가운데 그 한자가 들어 있고 사전에 있는 낱말만 남깁니다. 독음은 사전 독음으로 바로잡습니다. */
export function verifyWords(char: string, suggestions: HanjaWord[]) {
  const kept: HanjaWord[] = [];
  let rejected = 0;
  for (const suggestion of suggestions) {
    const word = suggestion.word.normalize("NFC").trim();
    const readings = [...word].length === 2 && word.includes(char) ? wordReadings(word) : [];
    if (!readings.length || kept.some(item => item.word === word)) {
      rejected += 1;
      continue;
    }
    const reading = suggestion.reading.trim();
    kept.push({ word, reading: readings.includes(reading) ? reading : readings[0], meaning: suggestion.meaning.trim() });
  }
  return { words: kept.slice(0, WORDS_PER_CHAR), rejected };
}
