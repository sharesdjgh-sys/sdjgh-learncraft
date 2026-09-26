import { EDUCATION_HANJA, HANJA_READINGS } from "@/data/hanja-readings";

// Unihan 한국 한자음으로 AI가 단 독음을 기계적으로 점검합니다. 처음 쓸 때 한 번만 표로 풉니다.
let table: Map<string, string[]> | null = null;
let education: Set<string> | null = null;

const isHangulSyllable = (char: string) => char >= "가" && char <= "힣";

function readingTable() {
  if (table) return table;
  table = new Map();
  let current = "";
  for (const char of HANJA_READINGS) {
    if (isHangulSyllable(char)) table.get(current)?.push(char);
    else {
      current = char;
      table.set(char, []);
    }
  }
  return table;
}

/** 사전에 있는 한국 한자음입니다. 사전에 없는 글자는 빈 배열입니다. */
export function hanjaReadings(char: string) {
  return readingTable().get(char.normalize("NFC")) ?? [];
}

export function isEducationHanja(char: string) {
  education ??= new Set(EDUCATION_HANJA);
  return education.has(char.normalize("NFC"));
}

const CHO_NIEUN = 2;
const CHO_RIEUL = 5;
const CHO_IEUNG = 11;
const initialOf = (syllable: string) => Math.floor((syllable.charCodeAt(0) - 0xac00) / 588);
const withInitial = (syllable: string, initial: number) => String.fromCharCode(0xac00 + initial * 588 + ((syllable.charCodeAt(0) - 0xac00) % 588));

// 두음법칙과 그 반대(구절 가운데에서 본음으로 읽기)를 모두 허용합니다. 예: 老 로·노, 女 녀·여, 樂 락·낙
function variants(syllable: string) {
  const initial = initialOf(syllable);
  if (initial === CHO_RIEUL) return [syllable, withInitial(syllable, CHO_NIEUN), withInitial(syllable, CHO_IEUNG)];
  if (initial === CHO_NIEUN) return [syllable, withInitial(syllable, CHO_IEUNG)];
  return [syllable];
}

/** 이 글자를 이 음으로 읽을 수 있는지 봅니다. 사전에 없는 글자는 판단하지 않고 true입니다. */
export function readingMatches(char: string, syllable: string) {
  const readings = hanjaReadings(char);
  return !readings.length || readings.some(reading => variants(reading).includes(syllable));
}
