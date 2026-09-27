/* 국어 · 작문: 글쓰기 과정(계획하기 → 내용 생성·조직 → 표현 → 고쳐쓰기)의 양식입니다. 교사가 켜고 끈 칸만 학습지에 넣습니다. */
import { emptyRows, type FormBlock, type FormSheet } from "./form-sheet";

export type WritingPart = "plan" | "ideas" | "outline" | "revise" | "rubric" | "peer";
export const writingParts: Record<WritingPart, string> = { plan: "작문 계획", ideas: "내용 떠올리기", outline: "개요 짜기", revise: "고쳐쓰기 점검", rubric: "평가 기준표", peer: "친구 글 읽고 조언" };
export type WritingKind = "argument" | "info" | "reflection" | "report";
export const writingKinds: Record<WritingKind, string> = { argument: "논증하는 글", info: "정보 전달 글", reflection: "성찰하는 글", report: "보고서" };

export const REVISE_LEVELS: { level: string; items: string[] }[] = [
  { level: "글 수준", items: ["글의 목적과 예상 독자에 맞는가?", "주제가 분명하게 드러나는가?", "처음·가운데·끝의 짜임이 알맞은가?"] },
  { level: "문단 수준", items: ["한 문단에 중심 내용이 하나인가?", "뒷받침 문장이 중심 문장을 잘 받쳐 주는가?", "문단과 문단이 자연스럽게 이어지는가?"] },
  { level: "문장 수준", items: ["주어와 서술어가 호응하는가?", "문장이 지나치게 길지 않은가?", "중의적인 문장은 없는가?"] },
  { level: "단어 수준", items: ["맞춤법과 띄어쓰기가 바른가?", "뜻에 맞는 정확한 낱말을 썼는가?", "같은 낱말을 불필요하게 되풀이하지 않았는가?"] },
];
const RUBRIC_ITEMS: Record<WritingKind, { name: string; levels: [string, string, string] }[]> = {
  argument: [
    { name: "주장", levels: ["주장이 분명하고 일관된다.", "주장이 있으나 조금 흐릿하다.", "주장이 드러나지 않는다."] },
    { name: "근거", levels: ["타당하고 믿을 만한 근거를 충분히 들었다.", "근거가 있으나 일부가 약하다.", "근거가 없거나 주장과 관련이 없다."] },
    { name: "반론 고려", levels: ["예상 반론을 소개하고 알맞게 재반박했다.", "반론을 언급했으나 답이 약하다.", "반론을 고려하지 않았다."] },
  ],
  info: [
    { name: "정보의 정확성", levels: ["정확하고 출처가 분명한 정보를 담았다.", "대체로 정확하나 출처가 부족하다.", "틀리거나 믿기 어려운 정보가 있다."] },
    { name: "설명 방법", levels: ["정의·예시·비교 등 알맞은 설명 방법을 썼다.", "설명 방법이 단조롭다.", "설명이 이해하기 어렵다."] },
    { name: "독자 고려", levels: ["독자의 수준에 맞게 쉽게 썼다.", "일부 어려운 말이 설명 없이 나온다.", "독자를 고려하지 않았다."] },
  ],
  reflection: [
    { name: "경험", levels: ["의미 있는 경험을 구체적으로 썼다.", "경험이 있으나 구체성이 부족하다.", "경험이 드러나지 않는다."] },
    { name: "성찰", levels: ["경험에서 얻은 깨달음을 깊이 있게 썼다.", "깨달음이 있으나 막연하다.", "깨달음이 드러나지 않는다."] },
    { name: "진솔한 표현", levels: ["자신의 생각과 느낌을 진솔하게 표현했다.", "표현이 다소 상투적이다.", "생각과 느낌이 드러나지 않는다."] },
  ],
  report: [
    { name: "탐구 과정", levels: ["목적·방법·결과가 체계적으로 드러난다.", "일부 과정이 빠졌다.", "탐구 과정이 드러나지 않는다."] },
    { name: "자료", levels: ["믿을 만한 자료를 알맞게 해석하고 출처를 밝혔다.", "자료 해석이나 출처가 부족하다.", "자료가 없거나 잘못 쓰였다."] },
    { name: "결론", levels: ["결과를 바탕으로 한 타당한 결론을 냈다.", "결론이 결과와 조금 어긋난다.", "결론이 없다."] },
  ],
};
const COMMON_RUBRIC: { name: string; levels: [string, string, string] }[] = [
  { name: "조직", levels: ["처음·가운데·끝이 짜임새 있고 문단이 잘 이어진다.", "짜임이 있으나 연결이 어색한 곳이 있다.", "짜임이 드러나지 않는다."] },
  { name: "표현", levels: ["어법에 맞고 정확한 표현을 썼다.", "어법에 어긋난 곳이 몇 군데 있다.", "어법에 어긋난 곳이 많다."] },
];

export type WritingOptions = { kind: WritingKind; topic: string; parts: WritingPart[] };
export function writingForm(options: WritingOptions): FormSheet {
  const blocks: FormBlock[] = [{ kind: "note", text: `${writingKinds[options.kind]} · 주제: ${options.topic.trim() || "(주제를 쓰세요)"}` }];
  for (const part of options.parts) {
    if (part === "plan") blocks.push({ kind: "table", title: "작문 계획", head: ["항목", "내용"], rows: [["글을 쓰는 목적", ""], ["예상 독자(누가 읽나?)", ""], ["글을 실을 매체", ""], ["주제(하고 싶은 말)", ""]], height: 10, widths: ["30%", "70%"] });
    if (part === "ideas") blocks.push({ kind: "box", title: "내용 떠올리기", height: 34, hint: "생각 그물(마인드맵)이나 자유롭게 쓰기로 떠오르는 내용을 적어요." });
    if (part === "outline") blocks.push({ kind: "table", title: "개요 짜기", head: ["짜임", "중심 내용", "쓸 자료·예시"], rows: [["처음", "", ""], ["가운데 1", "", ""], ["가운데 2", "", ""], ["가운데 3", "", ""], ["끝", "", ""]], height: 13, widths: ["16%", "46%", "38%"] });
    if (part === "revise") for (const level of REVISE_LEVELS) blocks.push({ kind: "check", title: `고쳐쓰기 점검 · ${level.level}`, items: level.items });
    if (part === "rubric") blocks.push({ kind: "rubric", title: "평가 기준표", score: true, items: [...RUBRIC_ITEMS[options.kind], ...COMMON_RUBRIC] });
    if (part === "peer") blocks.push({ kind: "table", title: "친구 글 읽고 조언하기", head: ["좋은 점", "고치면 좋을 점", "조언"], rows: emptyRows(3, 2), height: 18 });
  }
  return { title: `${writingKinds[options.kind]} 쓰기`, blocks };
}
