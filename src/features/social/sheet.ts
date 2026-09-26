/* 사회 교과 도구(역사·지리·정치·법·경제·윤리)가 함께 쓰는 숫자 표기와 학습지 조각입니다. 그래프·학습지 HTML은 과학 교과 도구의 것을 같이 씁니다. 모든 글은 escapeHtml을 거쳐 넣습니다. */
export {
  arrowSvg, blankLine, escapeHtml, fraction, gcd, grouped, lcm, niceStep, num, plotSvg, problemSheetHtml, problemSheetText, seededRandom, sheetTable, shuffled, svgText, svgWrap,
  type PlotOptions, type PlotSeries, type SheetMode, type SheetOptions, type SheetProblem, type SheetSection,
} from "@/features/science/sheet";
export { objectParticle, particle, subjectParticle } from "@/features/language-sheet";
import { grouped } from "@/features/science/sheet";

/** 12345 → 12,345원 */
export const won = (value: number, digits = 0) => `${grouped(value, digits)}원`;
/** 0.1234 → 12.3% */
export const percent = (ratio: number, digits = 1) => `${grouped(ratio * 100, digits)}%`;
/** 기원전은 “기원전 57년”, 기원후는 “1392년”처럼 쉼표 없이 적습니다. */
export const yearText = (year: number) => year < 0 ? `기원전 ${-year}년` : `${year}년`;
/** 태그를 뺀 한글 복사용 글입니다(위 첨자는 ^로). */
export const plainText = (html: string) => html.replace(/<sup>(.*?)<\/sup>/g, "^($1)").replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&amp;/g, "&");
/** 문제 하나를 HTML과 한글 복사용 글로 함께 만듭니다. */
export const problem = (html: string, answerHtml: string, options: { space?: number; figure?: string; answerFigure?: string; after?: string } = {}) =>
  ({ html, text: plainText(html), answerHtml, answerText: plainText(answerHtml), ...options });
/** ①~⑩ 번호 */
export const circled = (index: number) => "①②③④⑤⑥⑦⑧⑨⑩"[index] ?? `(${index + 1})`;
/** ㄱ~ㅎ 보기 기호 */
export const jamo = (index: number) => "ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ"[index] ?? String(index + 1);
/** (가)~(하) 기호 */
export const ganada = (index: number) => `(${"가나다라마바사아자차카타파하"[index] ?? index + 1})`;
