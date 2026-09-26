/* 일본어 학습지들이 함께 쓰는 HTML 조각입니다. 모든 글은 escapeHtml을 거쳐 넣습니다. */

export const escapeHtml = (text: string) => text.replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[char]!);

export type SheetMode = "screen" | "clipboard";

// 화면·인쇄에서는 이 페이지에서만 불러오는 교과서체(Klee One)를, 한글·워드에 붙여 넣을 때는 윈도에 있는 일본어 글꼴을 씁니다.
const JA_FONT: Record<SheetMode, string> = {
  screen: "var(--font-ja), 'Klee One', 'UD Digi Kyokasho N-R', 'Yu Gothic', 'Meiryo', sans-serif",
  clipboard: "'UD Digi Kyokasho N-R', 'Yu Mincho', 'Yu Gothic', 'MS Mincho', sans-serif",
};
export const jaStyle = (mode: SheetMode) => `font-family:${JA_FONT[mode]}`;
/** 일본어 글을 일본어 글꼴로 감쌉니다. html은 이미 이스케이프한 조각입니다. */
export const jaHtml = (html: string, mode: SheetMode) => `<span lang="ja" style="${jaStyle(mode)}">${html}</span>`;
export const ja = (text: string, mode: SheetMode) => jaHtml(escapeHtml(text), mode);

export const romans = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ", "Ⅷ"];

export const sheetHead = (title: string) => `<h1 style="margin:0 0 2mm;font-size:17pt">${escapeHtml(title)}</h1>`
  + `<p style="margin:0 0 5mm;padding-bottom:2mm;border-bottom:2px solid #222;font-size:10.5pt;text-align:right">&nbsp;&nbsp;학년 &nbsp;&nbsp;&nbsp;반 &nbsp;&nbsp;&nbsp;번 &nbsp;이름 ________________</p>`;
export const textHead = (title: string) => [title, "   학년    반    번  이름 ________________"];

/** 정답은 인쇄하면 새 쪽에서 시작합니다. 화면에서는 점선으로 나눕니다. */
export const answerSection = (body: string, mode: SheetMode) =>
  `<section style="break-before:page;${mode === "screen" ? "margin-top:8mm;padding-top:6mm;border-top:1px dashed #999" : ""}"><h2 style="margin:0 0 3mm;font-size:13pt">정답</h2>${body}</section>`;

/** 한글·워드에 붙여 넣는 HTML은 바깥을 한 번 감쌉니다. */
export const clipboardWrap = (html: string, mode: SheetMode) => mode === "screen" ? html : `<div style="font-family:'Malgun Gothic','맑은 고딕',sans-serif">${html}</div>`;

// 같은 seed면 같은 순서로 섞어 화면·인쇄·복사가 어긋나지 않게 합니다.
export function seededRandom(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffled<T>(items: T[], seed: number) {
  const random = seededRandom(seed);
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}
