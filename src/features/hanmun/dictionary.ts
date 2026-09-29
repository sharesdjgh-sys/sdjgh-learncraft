import { HANJA_DICTIONARY, RADICALS } from "@/data/hanja-dictionary";
import { RADICAL_NAMES } from "@/data/hanja-radicals";
import { isEducationHanja } from "./readings";

/* 한자 카드·쓰기 연습지·훈음 퀴즈가 쓰는 한자 사전입니다. 처음 쓸 때 한 번만 표로 풉니다. */

export type HanjaReading = { reading: string; glosses: string[] };
export type HanjaEntry = { char: string; strokes: number; radical: { number: number; char: string; label: string } | null; readings: HanjaReading[]; education: boolean };

let table: Map<string, { strokes: number; radical: number; readings: HanjaReading[] }> | null = null;

function dictionary() {
  if (table) return table;
  table = new Map();
  for (const line of HANJA_DICTIONARY.split("\n")) {
    const [char, strokes, radical, readings = ""] = line.split("|");
    table.set(char, {
      strokes: Number(strokes), radical: Number(radical),
      readings: readings.split(";").filter(Boolean).map(item => {
        const [reading, glosses = ""] = item.split(":");
        return { reading, glosses: glosses.split(",").filter(Boolean) };
      }),
    });
  }
  return table;
}

/** "배울 학"처럼 대표 훈음 하나입니다. */
export const mainMeaning = (reading: HanjaReading | undefined) => reading ? `${reading.glosses[0] ?? ""} ${reading.reading}`.trim() : "";

export function hanjaEntry(char: string): HanjaEntry | null {
  const normalized = char.normalize("NFC");
  const found = dictionary().get(normalized);
  if (!found) return null;
  const radicalChar = RADICALS[found.radical - 1];
  return {
    char: normalized, strokes: found.strokes, readings: found.readings, education: isEducationHanja(normalized),
    radical: radicalChar ? { number: found.radical, char: radicalChar, label: RADICAL_NAMES[found.radical - 1] } : null,
  };
}

/** 카드와 정답지에 쓰는 훈음 줄입니다. 대표 음의 훈 두세 개와 다른 음을 함께 적습니다. 예: 즐거울·즐길 락 / 풍류 악 / 좋아할 요 */
export function meaningLine(entry: HanjaEntry | null, glosses = 2) {
  if (!entry?.readings.length) return "";
  const [first, ...others] = entry.readings;
  return [`${first.glosses.slice(0, glosses).join("·")} ${first.reading}`.trim(), ...others.slice(0, 2).map(mainMeaning)].join(" / ");
}
