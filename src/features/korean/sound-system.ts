/* 국어 문법: 국어의 자음 체계(조음 위치 × 조음 방법)와 모음 체계(단모음 10개, 이중 모음 11개), 빈칸 체계표와 음운 맞히기 문제입니다. 표준 발음법 제2~5항을 따릅니다. */
import { escapeHtml, problem, seededRandom, shuffled, type SheetProblem, type SheetSection } from "./sheet";

export const PLACES = ["입술소리", "잇몸소리", "센입천장소리", "여린입천장소리", "목청소리"] as const;
export type Place = (typeof PLACES)[number];
export type Manner = "파열음" | "파찰음" | "마찰음" | "비음" | "유음";
export type Strength = "예사소리" | "된소리" | "거센소리" | "";
export type Consonant = { letter: string; place: Place; manner: Manner; strength: Strength };
/** 자음 19개(표준 발음법 제2항)의 조음 위치·방법·세기 */
export const CONSONANTS: Consonant[] = [
  { letter: "ㅂ", place: "입술소리", manner: "파열음", strength: "예사소리" }, { letter: "ㅃ", place: "입술소리", manner: "파열음", strength: "된소리" }, { letter: "ㅍ", place: "입술소리", manner: "파열음", strength: "거센소리" },
  { letter: "ㄷ", place: "잇몸소리", manner: "파열음", strength: "예사소리" }, { letter: "ㄸ", place: "잇몸소리", manner: "파열음", strength: "된소리" }, { letter: "ㅌ", place: "잇몸소리", manner: "파열음", strength: "거센소리" },
  { letter: "ㄱ", place: "여린입천장소리", manner: "파열음", strength: "예사소리" }, { letter: "ㄲ", place: "여린입천장소리", manner: "파열음", strength: "된소리" }, { letter: "ㅋ", place: "여린입천장소리", manner: "파열음", strength: "거센소리" },
  { letter: "ㅈ", place: "센입천장소리", manner: "파찰음", strength: "예사소리" }, { letter: "ㅉ", place: "센입천장소리", manner: "파찰음", strength: "된소리" }, { letter: "ㅊ", place: "센입천장소리", manner: "파찰음", strength: "거센소리" },
  { letter: "ㅅ", place: "잇몸소리", manner: "마찰음", strength: "예사소리" }, { letter: "ㅆ", place: "잇몸소리", manner: "마찰음", strength: "된소리" },
  { letter: "ㅎ", place: "목청소리", manner: "마찰음", strength: "" },
  { letter: "ㅁ", place: "입술소리", manner: "비음", strength: "" }, { letter: "ㄴ", place: "잇몸소리", manner: "비음", strength: "" }, { letter: "ㅇ", place: "여린입천장소리", manner: "비음", strength: "" },
  { letter: "ㄹ", place: "잇몸소리", manner: "유음", strength: "" },
];
/** 체계표의 줄: 조음 방법과 세기 */
export const CONSONANT_ROWS: { manner: Manner; strength: Strength; label: string; group: string }[] = [
  { manner: "파열음", strength: "예사소리", label: "예사소리", group: "파열음" }, { manner: "파열음", strength: "된소리", label: "된소리", group: "파열음" }, { manner: "파열음", strength: "거센소리", label: "거센소리", group: "파열음" },
  { manner: "파찰음", strength: "예사소리", label: "예사소리", group: "파찰음" }, { manner: "파찰음", strength: "된소리", label: "된소리", group: "파찰음" }, { manner: "파찰음", strength: "거센소리", label: "거센소리", group: "파찰음" },
  { manner: "마찰음", strength: "예사소리", label: "예사소리", group: "마찰음" }, { manner: "마찰음", strength: "된소리", label: "된소리", group: "마찰음" },
  { manner: "비음", strength: "", label: "", group: "비음" }, { manner: "유음", strength: "", label: "", group: "유음" },
];
/** 울림소리(비음·유음)인지: 국어의 자음은 비음·유음만 울림소리입니다. */
export const voiced = (consonant: Consonant) => consonant.manner === "비음" || consonant.manner === "유음";

export type Vowel = { letter: string; front: boolean; round: boolean; height: "고모음" | "중모음" | "저모음" };
/** 단모음 10개(표준 발음법 제4항). ㅚ·ㅟ는 이중 모음으로 발음하는 것도 허용합니다. */
export const VOWELS: Vowel[] = [
  { letter: "ㅣ", front: true, round: false, height: "고모음" }, { letter: "ㅟ", front: true, round: true, height: "고모음" }, { letter: "ㅡ", front: false, round: false, height: "고모음" }, { letter: "ㅜ", front: false, round: true, height: "고모음" },
  { letter: "ㅔ", front: true, round: false, height: "중모음" }, { letter: "ㅚ", front: true, round: true, height: "중모음" }, { letter: "ㅓ", front: false, round: false, height: "중모음" }, { letter: "ㅗ", front: false, round: true, height: "중모음" },
  { letter: "ㅐ", front: true, round: false, height: "저모음" }, { letter: "ㅏ", front: false, round: false, height: "저모음" },
];
/** 이중 모음 11개: 반모음 ‘ㅣ[j]’계, ‘ㅗ/ㅜ[w]’계, ‘ㅢ’ */
export const DIPHTHONGS: { letter: string; glide: string }[] = [
  ..."ㅑㅒㅕㅖㅛㅠ".split("").map(letter => ({ letter, glide: "반모음 ‘ㅣ[j]’ + 단모음" })),
  ..."ㅘㅙㅝㅞ".split("").map(letter => ({ letter, glide: "반모음 ‘ㅗ/ㅜ[w]’ + 단모음" })),
  { letter: "ㅢ", glide: "반모음 ‘ㅡ[ɰ]’ + ‘ㅣ’(교과서에 따라 ‘ㅡ + 반모음 ㅣ’로 설명)" },
];

const vowelLabel = (vowel: Vowel) => `${vowel.front ? "전설" : "후설"} · ${vowel.round ? "원순" : "평순"} · ${vowel.height}`;
const consonantLabel = (consonant: Consonant) => `${consonant.place} · ${consonant.manner}${consonant.strength ? ` · ${consonant.strength}` : ""}`;

const cellStyle = "border:1px solid #444;padding:1.4mm 2mm;text-align:center";
const headStyle = `${cellStyle};background:#f1f1f1`;
/** 자음 체계표. hide에 든 글자는 빈칸으로 둡니다. */
export function consonantTableHtml(hide: Set<string> = new Set()) {
  // ㅎ은 세기 구분이 없지만 교과서 체계표처럼 마찰음의 예사소리 줄(목청소리 칸)에 둡니다.
  const inRow = (item: Consonant, row: (typeof CONSONANT_ROWS)[number]) => item.strength === row.strength || (item.manner === "마찰음" && !item.strength && row.strength === "예사소리");
  const cell = (row: (typeof CONSONANT_ROWS)[number], place: Place) => CONSONANTS.filter(item => item.place === place && item.manner === row.manner && inRow(item, row))
    .map(item => hide.has(item.letter) ? "(&nbsp;&nbsp;&nbsp;)" : escapeHtml(item.letter)).join(" ");
  const rows = CONSONANT_ROWS.map((row, index) => {
    const first = CONSONANT_ROWS.findIndex(item => item.group === row.group) === index;
    const span = CONSONANT_ROWS.filter(item => item.group === row.group).length;
    const group = first ? `<th style="${headStyle}" rowspan="${span}"${row.label ? "" : ` colspan="2"`}>${escapeHtml(row.group)}${row.group === "비음" || row.group === "유음" ? "<br><span style=\"font-weight:400;font-size:8.5pt\">(울림소리)</span>" : ""}</th>` : "";
    const label = row.label ? `<th style="${headStyle};font-weight:400">${escapeHtml(row.label)}</th>` : "";
    return `<tr>${group}${label}${PLACES.map(place => `<td style="${cellStyle}">${cell(row, place)}</td>`).join("")}</tr>`;
  }).join("");
  return `<table style="border-collapse:collapse;width:100%;margin:1.5mm 0;font-size:10pt"><thead><tr><th style="${headStyle}" colspan="2">조음 방법 \\ 조음 위치</th>${PLACES.map(place => `<th style="${headStyle}">${escapeHtml(place)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>`;
}
/** 단모음 체계표. hide에 든 글자는 빈칸으로 둡니다. */
export function vowelTableHtml(hide: Set<string> = new Set()) {
  const cell = (front: boolean, round: boolean, height: Vowel["height"]) => {
    const vowel = VOWELS.find(item => item.front === front && item.round === round && item.height === height);
    return vowel ? hide.has(vowel.letter) ? "(&nbsp;&nbsp;&nbsp;)" : escapeHtml(vowel.letter) : "";
  };
  const heights: Vowel["height"][] = ["고모음", "중모음", "저모음"];
  return `<table style="border-collapse:collapse;width:100%;margin:1.5mm 0;font-size:10pt"><thead>`
    + `<tr><th style="${headStyle}" rowspan="2">혀의 높이 \\ 혀의 앞뒤</th><th style="${headStyle}" colspan="2">전설 모음</th><th style="${headStyle}" colspan="2">후설 모음</th></tr>`
    + `<tr>${["평순 모음", "원순 모음", "평순 모음", "원순 모음"].map(text => `<th style="${headStyle};font-weight:400">${text}</th>`).join("")}</tr></thead><tbody>`
    + heights.map(height => `<tr><th style="${headStyle}">${height}</th>${[[true, false], [true, true], [false, false], [false, true]].map(([front, round]) => `<td style="${cellStyle}">${cell(front, round, height)}</td>`).join("")}</tr>`).join("")
    + `</tbody></table>`;
}

export type SoundAsk = "consonantBlank" | "vowelBlank" | "describe" | "compare";
export const soundAsks: Record<SoundAsk, string> = { consonantBlank: "자음 체계표 빈칸", vowelBlank: "단모음 체계표 빈칸", describe: "설명에 맞는 음운", compare: "두 음운의 같은 점" };

export function soundProblems(asks: SoundAsk[], count: number, seed: number, blanks: number): SheetSection[] {
  const random = seededRandom(seed * 53 + 7);
  const shuffle = <T,>(items: T[]) => shuffled(items, Math.floor(random() * 1e9));
  const sections: SheetSection[] = [];
  for (const ask of asks) {
    const problems: SheetProblem[] = [];
    if (ask === "consonantBlank" || ask === "vowelBlank") {
      const letters = ask === "consonantBlank" ? CONSONANTS.map(item => item.letter) : VOWELS.map(item => item.letter);
      const hidden = shuffle(letters).slice(0, Math.min(blanks, letters.length));
      const hide = new Set(hidden);
      const table = ask === "consonantBlank" ? consonantTableHtml(hide) : vowelTableHtml(hide);
      // 정답은 칸의 자리(조음 위치·방법 등)와 함께 적어 어느 칸인지 알 수 있게 합니다.
      const answers = ask === "consonantBlank"
        ? CONSONANTS.filter(item => hide.has(item.letter)).map(item => `${item.letter}(${consonantLabel(item)})`)
        : VOWELS.filter(item => hide.has(item.letter)).map(item => `${item.letter}(${vowelLabel(item)})`);
      problems.push({ ...problem(`다음 ${ask === "consonantBlank" ? "자음" : "단모음"} 체계표의 빈칸에 알맞은 ${ask === "consonantBlank" ? "자음" : "모음"}을 쓰시오.`, escapeHtml(answers.join(", "))), after: table });
    } else if (ask === "describe") {
      for (let index = 0; index < count; index += 1) {
        if (random() < 0.6) {
          const consonant = shuffle(CONSONANTS)[0];
          problems.push(problem(`조음 위치는 ‘${escapeHtml(consonant.place)}’이고 조음 방법은 ‘${escapeHtml(consonant.manner)}’${consonant.strength ? `이며 ‘${escapeHtml(consonant.strength)}’` : ""}인 자음을 쓰시오.`, `${escapeHtml(consonant.letter)}${voiced(consonant) ? " (울림소리)" : ""}`));
        } else {
          const vowel = shuffle(VOWELS)[0];
          problems.push(problem(`‘${escapeHtml(vowelLabel(vowel))}’인 단모음을 쓰시오.`, `${escapeHtml(vowel.letter)}${vowel.letter === "ㅚ" || vowel.letter === "ㅟ" ? " (이중 모음으로 발음하는 것도 허용)" : ""}`));
        }
      }
    } else {
      for (let index = 0; index < count; index += 1) {
        if (random() < 0.5) {
          const [a, b] = shuffle(CONSONANTS);
          const same = [a.place === b.place && `조음 위치(${a.place})`, a.manner === b.manner && `조음 방법(${a.manner})`, a.strength && a.strength === b.strength && `소리의 세기(${a.strength})`, voiced(a) === voiced(b) && (voiced(a) ? "울림소리" : "안울림소리")].filter(Boolean);
          problems.push(problem(`자음 ‘${escapeHtml(a.letter)}’과 ‘${escapeHtml(b.letter)}’의 같은 점과 다른 점을 조음 위치·조음 방법·소리의 세기로 설명하시오.`,
            `${escapeHtml(a.letter)}: ${escapeHtml(consonantLabel(a))} / ${escapeHtml(b.letter)}: ${escapeHtml(consonantLabel(b))} — 같은 점: ${escapeHtml(same.join(", ") || "없음")}`, { space: 10 }));
        } else {
          const [a, b] = shuffle(VOWELS);
          const same = [a.front === b.front && (a.front ? "전설 모음" : "후설 모음"), a.round === b.round && (a.round ? "원순 모음" : "평순 모음"), a.height === b.height && a.height].filter(Boolean);
          problems.push(problem(`단모음 ‘${escapeHtml(a.letter)}’와 ‘${escapeHtml(b.letter)}’의 같은 점을 혀의 앞뒤·입술 모양·혀의 높이로 설명하시오.`,
            `${escapeHtml(a.letter)}: ${escapeHtml(vowelLabel(a))} / ${escapeHtml(b.letter)}: ${escapeHtml(vowelLabel(b))} — 같은 점: ${escapeHtml(same.join(", ") || "없음")}`, { space: 10 }));
        }
      }
    }
    sections.push({ heading: soundAsks[ask], problems });
  }
  return sections;
}
