/* 국어 문법: 한글 음절을 초성·중성·종성으로 나누고 다시 합칩니다. 자모는 한글 호환 자모(ㄱ, ㅏ)로 적습니다. */

export const CHO = [..."ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"];
export const JUNG = [..."ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"];
export const JONG = ["", ..."ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ"];
/** 겹받침을 이루는 두 자음 */
export const CLUSTERS: Record<string, [string, string]> = {
  "ㄳ": ["ㄱ", "ㅅ"], "ㄵ": ["ㄴ", "ㅈ"], "ㄶ": ["ㄴ", "ㅎ"], "ㄺ": ["ㄹ", "ㄱ"], "ㄻ": ["ㄹ", "ㅁ"], "ㄼ": ["ㄹ", "ㅂ"],
  "ㄽ": ["ㄹ", "ㅅ"], "ㄾ": ["ㄹ", "ㅌ"], "ㄿ": ["ㄹ", "ㅍ"], "ㅀ": ["ㄹ", "ㅎ"], "ㅄ": ["ㅂ", "ㅅ"],
};

export type Syllable = { cho: string; jung: string; jong: string };
const BASE = 0xac00;
export const isSyllable = (char: string) => { const code = char.charCodeAt(0); return code >= BASE && code <= 0xd7a3; };
export function decompose(char: string): Syllable | null {
  if (!isSyllable(char)) return null;
  const index = char.charCodeAt(0) - BASE;
  return { cho: CHO[Math.floor(index / 588)], jung: JUNG[Math.floor((index % 588) / 28)], jong: JONG[index % 28] };
}
export function compose({ cho, jung, jong }: Syllable) {
  const [a, b, c] = [CHO.indexOf(cho), JUNG.indexOf(jung), JONG.indexOf(jong)];
  if (a < 0 || b < 0 || c < 0) throw new Error(`음절을 만들 수 없어요: ${cho}${jung}${jong}`);
  return String.fromCharCode(BASE + a * 588 + b * 28 + c);
}
/** 받침 자음 목록(겹받침은 둘로) */
export const jongParts = (jong: string) => jong ? CLUSTERS[jong] ?? [jong] : [];
/** 두 자음으로 겹받침을 만듭니다(없으면 null). */
export const joinCluster = (first: string, second: string) => Object.entries(CLUSTERS).find(([, [a, b]]) => a === first && b === second)?.[0] ?? null;

/**
 * 음운 개수를 셉니다. 첫소리 ㅇ은 소리가 없어 세지 않고, 겹받침은 두 개로, 모음(이중 모음 포함)은 하나로 셉니다.
 * 교과서에 따라 이중 모음을 반모음 + 단모음으로 보기도 하므로 음운 변동 전후의 차이를 볼 때만 씁니다.
 */
export function phonemeCount(text: string) {
  let count = 0;
  for (const char of text) {
    const syllable = decompose(char);
    if (!syllable) continue;
    count += (syllable.cho === "ㅇ" ? 0 : 1) + 1 + jongParts(syllable.jong).length;
  }
  return count;
}
/** '국' → 'ㄱ ㅜ ㄱ' 처럼 자모를 풀어 씁니다. */
export const spell = (text: string) => [...text].map(char => { const s = decompose(char); return s ? [s.cho === "ㅇ" ? "" : s.cho, s.jung, ...jongParts(s.jong)].filter(Boolean).join("") : char; }).join(" ");
