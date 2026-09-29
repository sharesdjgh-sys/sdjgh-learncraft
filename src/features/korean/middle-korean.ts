/* 국어 문법: 훈민정음의 제자 원리(상형·가획·이체, 천지인과 합성)와 운용(병서·연서), 중세 국어의 특징입니다. 옛 글자는 한글 호환 자모로 적습니다. */
import { escapeHtml, jamo, problem, seededRandom, sheetTable, shuffled, type SheetProblem, type SheetSection } from "./sheet";

export const OLD = { araea: "ㆍ", yesieung: "ㆁ", bansiot: "ㅿ", yeorinhieut: "ㆆ", gabyeounbieup: "ㅸ", ssangHieut: "ㆅ" } as const;

/** 초성 17자: 소리 나는 자리(오음)마다 기본자·가획자·이체자 */
export const CONSONANT_MAKING: { sound: string; organ: string; basic: string; stroke: string[]; different: string[] }[] = [
  { sound: "어금닛소리(아음)", organ: "혀뿌리가 목구멍을 막는 모양", basic: "ㄱ", stroke: ["ㅋ"], different: [OLD.yesieung] },
  { sound: "혓소리(설음)", organ: "혀끝이 윗잇몸에 닿는 모양", basic: "ㄴ", stroke: ["ㄷ", "ㅌ"], different: [] },
  { sound: "입술소리(순음)", organ: "입의 모양", basic: "ㅁ", stroke: ["ㅂ", "ㅍ"], different: [] },
  { sound: "잇소리(치음)", organ: "이의 모양", basic: "ㅅ", stroke: ["ㅈ", "ㅊ"], different: [] },
  { sound: "목구멍소리(후음)", organ: "목구멍의 모양", basic: "ㅇ", stroke: [OLD.yeorinhieut, "ㅎ"], different: [] },
  { sound: "반혓소리(반설음)", organ: "—", basic: "", stroke: [], different: ["ㄹ"] },
  { sound: "반잇소리(반치음)", organ: "—", basic: "", stroke: [], different: [OLD.bansiot] },
];
/** 중성 11자: 기본자(천지인 상형), 초출자, 재출자 */
export const VOWEL_MAKING: { kind: string; letters: string[]; how: string }[] = [
  { kind: "기본자", letters: [OLD.araea, "ㅡ", "ㅣ"], how: `‘${OLD.araea}’는 둥근 하늘, ‘ㅡ’는 평평한 땅, ‘ㅣ’는 서 있는 사람을 본떴어요(천·지·인).` },
  { kind: "초출자", letters: ["ㅗ", "ㅏ", "ㅜ", "ㅓ"], how: `기본자 ‘${OLD.araea}’를 ‘ㅡ’, ‘ㅣ’와 한 번 합쳐 만들었어요.` },
  { kind: "재출자", letters: ["ㅛ", "ㅑ", "ㅠ", "ㅕ"], how: `초출자에 ‘${OLD.araea}’를 한 번 더 합쳐 만들었어요.` },
];
/** 글자를 운용하는 방법 */
export const LETTER_USE: { name: string; how: string; example: string }[] = [
  { name: "각자 병서", how: "같은 글자를 나란히 씀", example: `ㄲ, ㄸ, ㅃ, ㅆ, ㅉ, ${OLD.ssangHieut}` },
  { name: "합용 병서", how: "서로 다른 글자를 나란히 씀", example: "ㅺ(ㅅㄱ), ㅲ(ㅂㄱ), ㅴ(ㅂㅅㄱ)" },
  { name: "연서", how: "입술소리 아래에 ‘ㅇ’을 이어 써 가벼운 입술소리를 만듦", example: OLD.gabyeounbieup },
  { name: "부서", how: "모음을 자음의 아래나 오른쪽에 붙여 씀", example: "고(아래), 가(오른쪽)" },
  { name: "성음", how: "초성·중성·종성을 합쳐야 소리(음절)를 이룸", example: "ㄱ + ㅏ + ㅁ → 감" },
  { name: "종성부용초성", how: "종성(받침)에는 초성 글자를 다시 씀", example: "받침 글자를 따로 만들지 않음" },
];
/** 중세 국어의 특징(참·거짓 문제에 씁니다) */
export const MIDDLE_FEATURES: { text: string; true: boolean; why: string }[] = [
  { text: "소리 나는 대로 이어 적는 이어 적기(연철)가 주로 쓰였다.", true: true, why: "앞 음절의 받침을 뒤 음절의 첫소리로 옮겨 적었어요." },
  { text: "글자 왼쪽에 점(방점)을 찍어 소리의 높낮이(성조)를 나타냈다.", true: true, why: "거성은 한 점, 상성은 두 점, 평성은 점이 없었어요." },
  { text: "모음 조화가 현대 국어보다 잘 지켜졌다.", true: true, why: "양성 모음은 양성 모음끼리, 음성 모음은 음성 모음끼리 어울렸어요." },
  { text: "주격 조사로 ‘이, ㅣ’가 쓰였고 ‘가’는 아직 쓰이지 않았다.", true: true, why: "자음 뒤에는 ‘이’, ‘ㅣ’ 아닌 모음 뒤에는 ‘ㅣ’, ‘ㅣ’ 모음 뒤에서는 드러나지 않았어요." },
  { text: `‘${OLD.araea}, ${OLD.bansiot}, ${OLD.yesieung}’처럼 오늘날 쓰지 않는 글자가 쓰였다.`, true: true, why: "이 글자들은 뒤에 소리가 사라지거나 바뀌면서 쓰이지 않게 되었어요." },
  { text: "단어 첫머리에 둘 이상의 자음이 오는 어두 자음군이 있었다.", true: true, why: "‘ㅼ(ㅅㄷ)’, ‘ㅲ(ㅂㄱ)’ 같은 합용 병서가 첫소리에 쓰였어요." },
  { text: "훈민정음의 자음 기본자는 하늘·땅·사람의 모양을 본떠 만들었다.", true: false, why: "자음 기본자는 발음 기관의 모양을, 모음 기본자가 하늘·땅·사람을 본떴어요." },
  { text: "가획자는 기본자에 획을 더할 때마다 소리가 약해진다.", true: false, why: "획을 더할 때마다 소리가 세어져요(ㄴ → ㄷ → ㅌ)." },
  { text: "ㄹ은 ㄴ에 획을 더한 가획자이다.", true: false, why: "ㄹ은 가획의 원리와 관계없는 이체자예요." },
  { text: "훈민정음 창제 당시 중성 글자는 모두 11자였다.", true: true, why: `기본자 3자(${OLD.araea}, ㅡ, ㅣ), 초출자 4자, 재출자 4자예요.` },
];

export type MiddleAsk = "consonant" | "vowel" | "use" | "feature";
export const middleAsks: Record<MiddleAsk, string> = { consonant: "자음 제자 원리", vowel: "모음 제자 원리", use: "글자의 운용", feature: "중세 국어의 특징(O·X)" };

export const consonantMakingHtml = (hide = false) => sheetTable(["소리 나는 자리", "본뜬 모양", "기본자", "가획자", "이체자"], CONSONANT_MAKING.map(row => [
  escapeHtml(row.sound), escapeHtml(row.organ), hide && row.basic ? "(&nbsp;&nbsp;&nbsp;)" : escapeHtml(row.basic),
  hide && row.stroke.length ? "(&nbsp;&nbsp;&nbsp;)" : escapeHtml(row.stroke.join(", ")), escapeHtml(row.different.join(", ")),
]), { font: "10pt" });
export const vowelMakingHtml = (hide = false) => sheetTable(["갈래", "글자", "만든 방법"], VOWEL_MAKING.map(row => [row.kind, hide && row.kind !== "기본자" ? "(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)" : escapeHtml(row.letters.join(", ")), escapeHtml(row.how)]), { widths: ["14%", "24%", "62%"], font: "10pt" });
export const letterUseHtml = () => sheetTable(["운용 방법", "뜻", "예"], LETTER_USE.map(row => [row.name, escapeHtml(row.how), escapeHtml(row.example)]), { widths: ["18%", "52%", "30%"], center: false, font: "10pt" });

export function middleProblems(asks: MiddleAsk[], count: number, seed: number): SheetSection[] {
  const random = seededRandom(seed * 19 + 13);
  const shuffle = <T,>(items: T[]) => shuffled(items, Math.floor(random() * 1e9));
  const sections: SheetSection[] = [];
  for (const ask of asks) {
    const problems: SheetProblem[] = [];
    if (ask === "consonant") {
      problems.push({ ...problem("다음은 훈민정음 초성 17자의 제자 원리를 정리한 표이다. 빈칸에 알맞은 글자를 쓰시오.",
        CONSONANT_MAKING.filter(row => row.basic).map(row => `${escapeHtml(row.sound)}: 기본자 ${escapeHtml(row.basic)}, 가획자 ${escapeHtml(row.stroke.join(", "))}`).join("<br>")), after: consonantMakingHtml(true) });
      for (const row of shuffle(CONSONANT_MAKING.filter(item => item.stroke.length)).slice(0, Math.max(0, count - 1))) {
        problems.push(problem(`기본자 ‘${escapeHtml(row.basic)}’에 획을 더해 만든 글자를 모두 쓰고, 기본자가 본뜬 모양을 쓰시오.`, `${escapeHtml(row.stroke.join(", "))} — ${escapeHtml(row.organ)}(${escapeHtml(row.sound)}). 획을 더할수록 소리가 세어져요.`));
      }
    } else if (ask === "vowel") {
      problems.push({ ...problem("다음 표의 빈칸에 알맞은 중성 글자를 쓰시오.", VOWEL_MAKING.map(row => `${row.kind}: ${escapeHtml(row.letters.join(", "))}`).join("<br>")), after: vowelMakingHtml(true) });
    } else if (ask === "use") {
      for (const row of shuffle(LETTER_USE).slice(0, count)) {
        // 설명은 모두 받침 있는 말(씀·만듦·이룸)로 끝나 ‘을’을 붙입니다.
        problems.push(problem(`훈민정음의 글자 운용 방법 가운데 ‘${escapeHtml(row.how)}’을 무엇이라고 하는지 쓰시오.`, `${escapeHtml(row.name)} (예: ${escapeHtml(row.example)})`));
      }
    } else {
      const items = shuffle(MIDDLE_FEATURES).slice(0, Math.max(3, count * 2));
      problems.push(problem(`중세 국어와 훈민정음에 대한 설명으로 맞으면 O, 틀리면 X를 쓰시오.<br>${items.map((entry, at) => `${jamo(at)}. ${escapeHtml(entry.text)} (&nbsp;&nbsp;&nbsp;)`).join("<br>")}`,
        items.map((entry, at) => `${jamo(at)}. ${entry.true ? "O" : "X"} — ${escapeHtml(entry.why)}`).join("<br>")));
    }
    if (problems.length) sections.push({ heading: middleAsks[ask], problems });
  }
  return sections;
}
