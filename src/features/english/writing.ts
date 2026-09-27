/* 영어: 갈래별 글쓰기 틀(Write & Share·Write It Out), 평가 기준표 양식입니다. 표현은 직접 쓴 자연스러운 문장입니다. */
import { clipboardWrap, sheetHead, textHead, type SheetMode } from "@/features/language-sheet";
import { escapeHtml } from "./sheet";

export type WritingStep = { name: string; guide: string; expressions: string[] };
export type WritingGenre = { key: string; name: string; english: string; steps: WritingStep[]; checklist: string[] };

export const WRITING_GENRES: WritingGenre[] = [
  {
    key: "email", name: "이메일", english: "Email",
    steps: [
      { name: "Greeting", guide: "받는 사람에게 인사해요.", expressions: ["Dear Ms. Kim,", "Hi Jake,", "Hello, Mr. Brown."] },
      { name: "Purpose", guide: "이메일을 쓰는 까닭을 먼저 밝혀요.", expressions: ["I'm writing to ask about ...", "I'm writing to let you know that ...", "Thank you for your email about ..."] },
      { name: "Details", guide: "필요한 내용을 차례대로 써요.", expressions: ["First, ...", "Also, I'd like to know ...", "Could you tell me ...?"] },
      { name: "Closing", guide: "끝인사와 이름을 써요.", expressions: ["I look forward to hearing from you.", "Please let me know if you have any questions.", "Best regards, / Sincerely,"] },
    ],
    checklist: ["인사와 끝인사가 있다.", "쓰는 목적이 첫 부분에 드러난다.", "받는 사람에 맞게 공손한 말을 썼다.", "문장부호와 대문자를 바르게 썼다."],
  },
  {
    key: "complaint", name: "불만 제기 편지", english: "Customer Complaint Letter",
    steps: [
      { name: "Introduction", guide: "무엇을 언제 샀는지 밝혀요.", expressions: ["I am writing to complain about ...", "I bought ... from your online store on ...", "My order number is ..."] },
      { name: "Problem", guide: "어떤 문제가 있는지 구체적으로 써요.", expressions: ["Unfortunately, when it arrived, ...", "The problem is that ...", "It does not work properly."] },
      { name: "Request", guide: "바라는 해결 방법을 공손하게 요청해요.", expressions: ["I would like a full refund.", "Could you please send me a replacement?", "I would appreciate it if you could ..."] },
      { name: "Closing", guide: "답을 기다린다고 쓰고 마무리해요.", expressions: ["I hope to hear from you soon.", "Thank you for your attention to this matter.", "Sincerely,"] },
    ],
    checklist: ["산 물건과 날짜 등 사실을 분명히 썼다.", "문제를 구체적으로 설명했다.", "바라는 해결 방법을 공손하게 요청했다.", "감정적인 말보다 사실 중심으로 썼다."],
  },
  {
    key: "notice", name: "안내문", english: "Notice",
    steps: [
      { name: "Title", guide: "무엇에 관한 안내인지 제목으로 알려요.", expressions: ["School Sports Day", "Join Our Book Club!", "Library Closing Notice"] },
      { name: "Event", guide: "행사나 알릴 내용을 한두 문장으로 소개해요.", expressions: ["We are holding a ... for all students.", "Everyone is welcome to join ..."] },
      { name: "Details", guide: "날짜·시간·장소·대상·준비물을 정리해요.", expressions: ["Date: ... / Time: ... / Place: ...", "Who can join: ...", "Please bring ..."] },
      { name: "Contact", guide: "신청 방법이나 문의처를 써요.", expressions: ["To sign up, please visit ...", "For more information, contact ... at ...", "The deadline is ..."] },
    ],
    checklist: ["제목만 보고도 내용을 알 수 있다.", "날짜·시간·장소가 빠짐없이 있다.", "신청 방법이나 문의처가 있다.", "읽기 쉽게 항목으로 정리했다."],
  },
  {
    key: "blog", name: "블로그 글", english: "Blog Post",
    steps: [
      { name: "Hook", guide: "읽는 사람의 관심을 끄는 첫 문장을 써요.", expressions: ["Have you ever ...?", "Last weekend, I had an amazing experience.", "Let me tell you about ..."] },
      { name: "Experience", guide: "무엇을 했는지 차례대로 써요.", expressions: ["At first, ...", "Then, ...", "After that, ..."] },
      { name: "Feelings", guide: "느낀 점이나 배운 점을 써요.", expressions: ["I felt proud when ...", "It was a great chance to ...", "I learned that ..."] },
      { name: "Ending", guide: "읽는 사람에게 권하거나 질문하며 마무리해요.", expressions: ["Why don't you try it?", "I hope you can join us next time.", "What do you think?"] },
    ],
    checklist: ["흥미를 끄는 첫 문장이 있다.", "경험을 시간 순서대로 썼다.", "느낀 점이 구체적으로 드러난다.", "과거 시제를 바르게 썼다."],
  },
  {
    key: "place", name: "장소 소개", english: "Description of a Place",
    steps: [
      { name: "Introduction", guide: "소개할 장소와 위치를 밝혀요.", expressions: ["I'd like to introduce ...", "... is located in ...", "It is famous for ..."] },
      { name: "Features", guide: "생김새·역사·특징을 써요.", expressions: ["It was built in ...", "It has ...", "One of its most interesting features is ..."] },
      { name: "Activities", guide: "그곳에서 할 수 있는 일을 써요.", expressions: ["Visitors can ...", "You can also ...", "It is a great place to ..."] },
      { name: "Recommendation", guide: "왜 가 볼 만한지 써요.", expressions: ["I highly recommend visiting ...", "If you visit ..., don't miss ...", "You will never forget ..."] },
    ],
    checklist: ["장소의 이름과 위치가 분명하다.", "특징을 두 가지 이상 구체적으로 썼다.", "할 수 있는 일을 소개했다.", "추천하는 까닭이 드러난다."],
  },
  {
    key: "opinion", name: "의견 글", english: "Opinion Essay",
    steps: [
      { name: "Claim", guide: "주제에 대한 내 주장을 분명히 밝혀요.", expressions: ["In my opinion, ...", "I strongly believe that ...", "I agree/disagree that ..."] },
      { name: "Reasons", guide: "주장을 뒷받침하는 이유를 두세 가지 써요.", expressions: ["First, ...", "Second, ...", "Another reason is that ..."] },
      { name: "Examples", guide: "이유마다 예나 근거를 들어요.", expressions: ["For example, ...", "According to a survey, ...", "This shows that ..."] },
      { name: "Conclusion", guide: "주장을 다시 정리하며 마무리해요.", expressions: ["In conclusion, ...", "For these reasons, I think ...", "Therefore, we should ..."] },
    ],
    checklist: ["주장이 첫 부분에 분명히 드러난다.", "이유가 두 가지 이상이다.", "이유마다 알맞은 예나 근거가 있다.", "결론에서 주장을 다시 정리했다.", "연결어(First, However 등)를 알맞게 썼다."],
  },
  {
    key: "story", name: "이야기", english: "Story",
    steps: [
      { name: "Beginning", guide: "때·곳·인물을 소개해요.", expressions: ["Once upon a time, ...", "One rainy morning, ...", "There lived a girl named ..."] },
      { name: "Problem", guide: "인물에게 일어난 사건이나 문제를 써요.", expressions: ["One day, something strange happened.", "Suddenly, ...", "But there was a problem: ..."] },
      { name: "Climax", guide: "문제를 해결하려는 과정을 써요.", expressions: ["She decided to ...", "At that moment, ...", "Finally, ..."] },
      { name: "Ending", guide: "결말과 인물의 변화를 써요.", expressions: ["In the end, ...", "From that day on, ...", "He realized that ..."] },
    ],
    checklist: ["처음·가운데·끝이 분명하다.", "사건과 해결 과정이 자연스럽게 이어진다.", "과거 시제를 일관되게 썼다.", "인물의 마음이나 변화가 드러난다."],
  },
  {
    key: "thanks", name: "감사 편지", english: "Thank-You Letter",
    steps: [
      { name: "Greeting", guide: "받는 사람에게 인사해요.", expressions: ["Dear Mrs. Lee,", "To my dear friend Minho,"] },
      { name: "Thanks", guide: "무엇이 고마운지 분명히 써요.", expressions: ["I want to thank you for ...", "Thank you so much for ...", "I really appreciate your help with ..."] },
      { name: "Details", guide: "그 도움이 나에게 어떤 의미였는지 써요.", expressions: ["Thanks to you, I was able to ...", "It meant a lot to me because ...", "I will never forget ..."] },
      { name: "Closing", guide: "앞으로의 바람과 끝인사를 써요.", expressions: ["I hope to see you again soon.", "Thank you again.", "Warm wishes, / Love,"] },
    ],
    checklist: ["고마운 일이 구체적으로 드러난다.", "그 일이 나에게 준 의미를 썼다.", "받는 사람에게 알맞은 인사와 끝인사가 있다."],
  },
];

export type WritingOptions = { title: string; topic: string; conditions: string; showExpressions: boolean; checklist: boolean; lines: number };

/** 갈래 하나의 글쓰기 틀입니다. 단계마다 안내·표현·쓰는 칸을 둡니다. */
export function writingSheetHtml(genre: WritingGenre, options: WritingOptions, mode: SheetMode) {
  const cell = "border:1px solid #666;padding:1.8mm 2.5mm;vertical-align:top";
  const task = `<div style="margin:0 0 3mm;padding:2.5mm 3mm;border:1.5px solid #222">${options.topic.trim() ? `<div><b>Topic</b> ${escapeHtml(options.topic.trim())}</div>` : ""}${options.conditions.trim() ? `<div style="margin-top:1mm"><b>조건</b> ${escapeHtml(options.conditions.trim()).replace(/\n/g, "<br>")}</div>` : ""}${!options.topic.trim() && !options.conditions.trim() ? `<b>${escapeHtml(genre.english)}</b> 쓰기` : ""}</div>`;
  const rows = genre.steps.map(step => `<tr><td style="${cell};width:24%"><b>${escapeHtml(step.name)}</b><div style="font-size:9pt;color:#444;margin-top:.8mm">${escapeHtml(step.guide)}</div>${options.showExpressions ? `<div style="font-size:9pt;margin-top:1mm">${step.expressions.map(expression => `· ${escapeHtml(expression)}`).join("<br>")}</div>` : ""}</td><td style="${cell}"><div style="height:${options.lines * 7}mm;background:repeating-linear-gradient(transparent,transparent 6.6mm,#bbb 6.6mm,#bbb 7mm)"></div></td></tr>`).join("");
  const table = `<table style="border-collapse:collapse;width:100%;font-size:10pt;margin:0 0 3mm">${rows}</table>`;
  const checklist = options.checklist ? `<div style="break-inside:avoid"><div style="font-weight:700;margin:2mm 0 1mm">스스로 점검하기</div><table style="border-collapse:collapse;width:100%;font-size:9.5pt"><tr><th style="${cell};background:#f1f1f1">점검 항목</th><th style="${cell};background:#f1f1f1;width:12%">예</th><th style="${cell};background:#f1f1f1;width:12%">아니요</th></tr>${genre.checklist.map(item => `<tr><td style="${cell}">${escapeHtml(item)}</td><td style="${cell}"></td><td style="${cell}"></td></tr>`).join("")}</table></div>` : "";
  return clipboardWrap(sheetHead(options.title.trim() || `${genre.english} 쓰기`) + task + table + checklist, mode);
}
export function writingSheetText(genre: WritingGenre, options: WritingOptions) {
  const lines = [...textHead(options.title.trim() || `${genre.english} 쓰기`), ""];
  if (options.topic.trim()) lines.push(`Topic: ${options.topic.trim()}`);
  if (options.conditions.trim()) lines.push(`조건: ${options.conditions.trim()}`);
  lines.push("");
  for (const step of genre.steps) {
    lines.push(`[${step.name}] ${step.guide}`);
    if (options.showExpressions) lines.push(...step.expressions.map(expression => `  · ${expression}`));
    lines.push("  ____________________________________________", "");
  }
  if (options.checklist) lines.push("스스로 점검하기", ...genre.checklist.map(item => `□ ${item}`));
  return lines.join("\n");
}

/* ───── 평가 기준표 ───── */

export type RubricRow = { name: string; levels: string[] };
export type RubricKind = "writing" | "speaking";
export const DEFAULT_RUBRICS: Record<RubricKind, RubricRow[]> = {
  writing: [
    { name: "내용", levels: ["주제에 맞는 내용을 충분하고 구체적으로 썼다.", "주제에 맞지만 내용이 조금 부족하다.", "주제와 관계없는 내용이 많거나 내용이 매우 부족하다."] },
    { name: "구성", levels: ["처음·가운데·끝이 분명하고 연결어를 알맞게 썼다.", "구성은 있으나 연결이 어색한 곳이 있다.", "구성이 분명하지 않다."] },
    { name: "언어 사용", levels: ["어휘와 문법이 정확하고 다양하다.", "오류가 있지만 뜻을 이해하는 데 문제가 없다.", "오류가 많아 뜻을 이해하기 어렵다."] },
    { name: "조건", levels: ["주어진 조건(단어 수·표현 등)을 모두 지켰다.", "조건을 일부 지켰다.", "조건을 거의 지키지 않았다."] },
  ],
  speaking: [
    { name: "내용", levels: ["과제에 맞는 내용을 충분히 말했다.", "과제에 맞지만 내용이 조금 부족하다.", "과제와 관계없는 말이 많다."] },
    { name: "유창성", levels: ["머뭇거림 없이 자연스럽게 말했다.", "가끔 머뭇거리지만 말을 이어 갔다.", "자주 멈추어 말이 끊긴다."] },
    { name: "정확성", levels: ["어휘와 문법을 정확하게 썼다.", "오류가 있지만 뜻은 통한다.", "오류가 많아 뜻이 잘 통하지 않는다."] },
    { name: "발음·태도", levels: ["발음이 분명하고 눈을 맞추며 자신 있게 말했다.", "대체로 알아들을 수 있게 말했다.", "알아듣기 어렵거나 태도가 소극적이다."] },
  ],
};
export type RubricOptions = { title: string; kind: RubricKind; rows: RubricRow[]; scores: number[]; labels: string[]; names: boolean };

/** 평가 기준표 양식입니다. 단계(상·중·하 등)마다 점수를 적고, 학생 이름 칸을 붙일 수 있어요. */
export function rubricHtml(options: RubricOptions, mode: SheetMode) {
  const cell = "border:1px solid #666;padding:1.8mm 2.2mm;vertical-align:top";
  const levels = options.labels.length;
  const headRow = `<tr><th style="${cell};background:#f1f1f1;width:14%">평가 요소</th>${options.labels.map((label, index) => `<th style="${cell};background:#f1f1f1">${escapeHtml(label)} (${options.scores[index] ?? 0}점)</th>`).join("")}<th style="${cell};background:#f1f1f1;width:10%">점수</th></tr>`;
  const body = options.rows.filter(row => row.name.trim()).map(row => `<tr><td style="${cell};font-weight:700">${escapeHtml(row.name)}</td>${Array.from({ length: levels }, (_, index) => `<td style="${cell}">${escapeHtml(row.levels[index] ?? "")}</td>`).join("")}<td style="${cell}"></td></tr>`).join("");
  const total = options.rows.filter(row => row.name.trim()).length * Math.max(0, ...options.scores);
  const foot = `<tr><td style="${cell};font-weight:700;text-align:right" colspan="${levels + 1}">합계 (만점 ${total}점)</td><td style="${cell}"></td></tr>`;
  const names = options.names ? `<p style="margin:0 0 2mm;font-size:10pt">과제: ________________________________ &nbsp; 평가자: ____________</p>` : "";
  return clipboardWrap(sheetHead(options.title.trim() || (options.kind === "writing" ? "쓰기 평가 기준표" : "말하기 평가 기준표")) + names + `<table style="border-collapse:collapse;width:100%;font-size:9.5pt">${headRow}${body}${foot}</table>`, mode);
}
export function rubricText(options: RubricOptions) {
  const lines = [...textHead(options.title.trim() || (options.kind === "writing" ? "쓰기 평가 기준표" : "말하기 평가 기준표")), ""];
  for (const row of options.rows.filter(item => item.name.trim())) {
    lines.push(`[${row.name}]`);
    options.labels.forEach((label, index) => lines.push(`  ${label}(${options.scores[index] ?? 0}점): ${row.levels[index] ?? ""}`));
  }
  return lines.join("\n");
}
