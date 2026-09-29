/* 국어 · 주제 탐구 독서: 탐구 계획서, 독서 일지, 자료 신뢰성 점검표, 탐구 보고서, 발표 평가표 양식입니다. 교사가 켠 양식만 한 묶음으로 인쇄합니다. */
import { emptyRows, type FormSheet } from "./form-sheet";

export type InquiryForm = "plan" | "log" | "source" | "report" | "present";
export const inquiryForms: Record<InquiryForm, string> = { plan: "탐구 계획서", log: "독서 일지", source: "자료 신뢰성 점검표", report: "탐구 보고서", present: "발표 평가표" };
export type InquiryOptions = { field: string; topic: string; forms: InquiryForm[]; books: number };

export function inquirySheets(options: InquiryOptions): FormSheet[] {
  const head = { kind: "note" as const, text: `탐구 분야: ${options.field.trim() || "(분야)"} · 탐구 주제: ${options.topic.trim() || "(주제를 쓰세요)"}` };
  const books = Math.max(1, Math.min(6, options.books));
  return options.forms.map(form => {
    if (form === "plan") return { title: inquiryForms.plan, blocks: [
      head,
      { kind: "box", title: "이 주제를 고른 까닭", height: 16 },
      { kind: "box", title: "탐구 질문", height: 16, hint: "책과 자료를 읽으며 답을 찾을 질문 2~3개" },
      { kind: "table", title: "읽을 책·자료 목록", head: ["제목", "지은이·만든 곳", "펴낸 해", "고른 까닭"], rows: emptyRows(4, books), height: 9, widths: ["32%", "22%", "12%", "34%"] },
      { kind: "table", title: "탐구 일정", head: ["기간", "할 일"], rows: emptyRows(2, 4), height: 8, widths: ["24%", "76%"] },
    ] };
    if (form === "log") return { title: inquiryForms.log, blocks: [
      head,
      { kind: "table", head: ["날짜", "읽은 책·쪽", "알게 된 내용(요약)", "질문·생각"], rows: emptyRows(4, 6), height: 18, widths: ["12%", "20%", "40%", "28%"] },
    ] };
    if (form === "source") return { title: inquiryForms.source, blocks: [
      head,
      { kind: "table", title: "자료 기본 정보", head: ["자료 이름", "출처(누리집·책·기관)", "만든 사람", "만든 날짜"], rows: emptyRows(4, 2), height: 9 },
      { kind: "check", title: "자료를 믿을 수 있을까?", items: [
        "출처가 분명하다(누가, 어디서 만들었는지 알 수 있다).",
        "지은이나 만든 기관이 그 분야의 전문가이다.",
        "최근 자료이거나, 오래되었어도 지금도 맞는 내용이다.",
        "주장에 알맞은 근거(통계·연구·사례)가 있다.",
        "한쪽 관점에만 치우치지 않았다(광고·홍보 목적이 아니다).",
        "다른 자료와 견주어 보아도 내용이 맞는다.",
      ] },
      { kind: "box", title: "판단 결과", text: "이 자료는 ( 믿을 만하다 / 조심해서 써야 한다 / 쓰지 않는다 ).", height: 14 },
    ] };
    if (form === "report") return { title: inquiryForms.report, blocks: [
      head,
      { kind: "box", title: "1. 탐구 동기와 질문", height: 20 },
      { kind: "box", title: "2. 탐구 방법(읽은 책·자료)", height: 20 },
      { kind: "box", title: "3. 탐구 결과(질문에 대한 답)", height: 42 },
      { kind: "box", title: "4. 결론과 느낀 점, 더 알고 싶은 것", height: 24 },
      { kind: "box", title: "5. 참고 문헌", height: 14, hint: "지은이, 『책 제목』, 출판사, 펴낸 해." },
    ] };
    return { title: inquiryForms.present, blocks: [
      head,
      { kind: "rubric", title: "발표 평가 기준", score: true, items: [
        { name: "내용", levels: ["탐구 질문에 대한 답을 믿을 만한 자료로 분명히 전한다.", "답은 있으나 근거 자료가 부족하다.", "탐구 질문과 결과가 드러나지 않는다."] },
        { name: "구성", levels: ["처음·가운데·끝이 짜임새 있다.", "짜임이 있으나 흐름이 어색한 곳이 있다.", "짜임 없이 늘어놓는다."] },
        { name: "매체 활용", levels: ["자료(사진·도표)가 내용 이해를 돕고 출처를 밝혔다.", "자료가 있으나 내용과의 관련이 약하다.", "자료가 없거나 출처가 없다."] },
        { name: "전달", levels: ["알맞은 목소리·속도·시선으로 청중과 소통한다.", "전달이 대체로 알맞으나 원고를 자주 본다.", "전달이 잘 되지 않는다."] },
      ] },
      { kind: "table", title: "친구 발표 듣고 쓰기", head: ["발표자", "새로 알게 된 점", "궁금한 점·조언"], rows: emptyRows(3, 3), height: 14 },
    ] };
  });
}
