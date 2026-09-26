/* 윤리: 현대 사회의 윤리 쟁점 모음과 토론 학습지 양식입니다. 찬반 논거는 균형 있게 세 개씩 두고, 교사가 고쳐 쓸 수 있습니다. */
import { clipboardWrap, sheetHead } from "@/features/language-sheet";
import { escapeHtml, type SheetMode } from "./sheet";

export type DebateIssue = { id: string; unit: string; title: string; question: string; pro: string[]; con: string[]; views: string; note?: string };

export const DEBATE_ISSUES: DebateIssue[] = [
  { id: "euthanasia", unit: "삶과 죽음의 윤리", title: "안락사", question: "회복할 수 없는 환자가 원할 때 적극적 안락사를 허용해야 하는가?",
    pro: ["자기 삶의 마지막을 스스로 결정할 권리(자기 결정권)를 존중해야 한다.", "회복할 수 없는 고통에서 벗어나게 하는 것이 오히려 인도적이다.", "의미 없는 연명 치료는 환자와 가족에게 큰 고통과 부담을 준다."],
    con: ["생명은 존엄하므로 어떤 이유로도 의도적으로 끊어서는 안 된다.", "경제적 부담이나 주변의 압박 때문에 원하지 않는 선택을 할 위험이 있다.", "의사의 본분은 생명을 살리는 것이며, 완화 의료로 고통을 줄일 수 있다."],
    views: "자율성 존중·공리주의(고통 감소) ↔ 칸트(생명을 수단으로 삼지 않음)·생명 존엄", note: "우리나라는 연명 의료 결정법에 따라 연명 의료 중단은 허용하지만, 적극적 안락사는 허용하지 않아요." },
  { id: "death-penalty", unit: "사회 정의와 윤리", title: "사형 제도", question: "사형 제도를 유지해야 하는가?",
    pro: ["흉악 범죄에는 그만큼의 처벌이 따라야 한다(응보적 정의).", "무거운 처벌로 범죄를 막는 효과가 있다.", "피해자와 유족, 사회의 정의감을 회복할 수 있다."],
    con: ["오판으로 사형이 집행되면 되돌릴 수 없다.", "국가라도 사람의 생명을 빼앗을 권리는 없다.", "범죄를 막는 효과가 뚜렷하지 않고 범죄자가 교화될 기회를 없앤다."],
    views: "칸트(응보주의) ↔ 베카리아(사형 폐지)·공리주의(예방 효과로 판단)", note: "우리나라는 사형 제도가 있지만 1997년 12월 이후 사형을 집행하지 않고 있어요." },
  { id: "animal-testing", unit: "자연과 윤리", title: "동물 실험", question: "의약품 개발을 위한 동물 실험을 허용해야 하는가?",
    pro: ["사람의 생명과 건강을 지키는 의약품을 개발하려면 필요하다.", "동물과 사람은 몸의 구조가 비슷해 효과와 안전성을 미리 확인할 수 있다.", "대체·감소·개선(3R) 원칙을 지키면 동물의 고통을 줄일 수 있다."],
    con: ["동물도 고통을 느끼는 존재이므로 그 이익을 고려해야 한다.", "종이 달라 동물 실험 결과를 사람에게 그대로 적용하기 어렵다.", "세포 배양·컴퓨터 모의실험 같은 대체 방법을 발전시켜야 한다."],
    views: "인간 중심주의 ↔ 싱어(이익 평등 고려)·레건(동물의 권리)" },
  { id: "gene-editing", unit: "삶과 죽음의 윤리", title: "유전자 편집·맞춤 아기", question: "유전자 편집으로 태어날 아이의 유전 형질을 고르는 것을 허용해야 하는가?",
    pro: ["심각한 유전 질환을 미리 막거나 치료할 수 있다.", "자녀가 더 건강하게 살도록 돕는 것은 부모의 선택일 수 있다.", "생명 과학 기술의 발전을 이끌 수 있다."],
    con: ["안전성이 확인되지 않은 변화가 후손에게까지 전해질 수 있다.", "원하는 형질을 고르는 일은 우생학적 차별과 불평등을 키울 수 있다.", "생명을 만들고 고르는 대상으로 여겨 인간의 존엄성을 해칠 수 있다."],
    views: "치료 목적과 향상 목적의 구별, 요나스(책임 윤리)" },
  { id: "brain-death", unit: "삶과 죽음의 윤리", title: "뇌사와 장기 이식", question: "뇌사를 사람의 죽음으로 인정해야 하는가?",
    pro: ["뇌 기능이 되돌릴 수 없이 멈추면 인격적인 삶은 끝난 것이다.", "뇌사자의 장기 기증으로 다른 사람의 생명을 살릴 수 있다.", "회복 가능성이 없는 상태를 오래 유지하는 것은 가족에게 큰 부담이다."],
    con: ["심장이 뛰고 숨을 쉬는 동안은 살아 있는 사람이다.", "장기를 얻으려고 뇌사 판정을 서두르거나 남용할 위험이 있다.", "심장과 폐가 멈춘 것을 죽음으로 보는 기준이 더 분명하다."],
    views: "인격 중심의 생명관 ↔ 생명 존엄·심폐사 기준", note: "우리나라는 장기 이식에 한해서 뇌사를 죽음으로 인정해요." },
  { id: "ai-responsibility", unit: "인공지능과 윤리", title: "인공지능의 책임", question: "인공지능을 도덕적 책임을 지는 행위자로 볼 수 있는가?",
    pro: ["스스로 학습하고 판단해 사람이 예측하지 못한 결과를 만든다.", "책임 주체를 분명히 하려면 인공지능에도 일정한 지위가 필요하다.", "개발자·사용자가 많아 한 사람에게 책임을 묻기 어렵다."],
    con: ["자유 의지와 도덕적 감정이 없으므로 책임을 질 수 없다.", "인공지능을 설계하고 사용한 사람에게 책임이 있다.", "인공지능에 책임을 돌리면 사람들이 책임을 피하는 구실이 된다."],
    views: "도덕적 행위자의 조건(자율성·의도), 요나스(책임 윤리)" },
  { id: "copyright", unit: "정보사회와 윤리", title: "정보 공유와 저작권", question: "디지털 창작물은 저작권 보호보다 자유로운 공유를 앞세워야 하는가?",
    pro: ["지식과 정보는 인류가 함께 쌓아 온 공동의 자산이다(카피레프트).", "자유로운 공유가 새로운 창작과 혁신을 이끈다.", "정보 격차를 줄여 누구나 지식에 다가갈 수 있다."],
    con: ["창작자가 들인 노력과 권리는 보호받아야 한다(카피라이트).", "보호가 없으면 창작할 동기가 약해진다.", "무단 복제는 창작자가 받아야 할 정당한 대가를 빼앗는다."],
    views: "정보 공유론 ↔ 정보 사유론, 로크(노동에 따른 소유)" },
  { id: "civil-disobedience", unit: "국가와 시민의 윤리", title: "시민 불복종", question: "부정의한 법에 대한 시민 불복종은 정당한가?",
    pro: ["법보다 정의와 양심이 먼저이다.", "다수의 결정으로 침해된 소수의 권리를 지킬 수 있다.", "잘못된 법과 정책을 바로잡아 민주주의를 건강하게 한다."],
    con: ["법을 어기면 법치주의와 사회 질서가 흔들린다.", "무엇이 부정의한지는 사람마다 판단이 다를 수 있다.", "선거·청원·헌법 소원 같은 합법적인 방법으로 바꿀 수 있다."],
    views: "소로(개인의 양심)·롤스(공개성·비폭력·처벌 감수·최후의 수단)" },
  { id: "foreign-aid", unit: "국제 사회의 윤리", title: "해외 원조", question: "잘사는 나라와 사람은 가난한 나라를 원조할 의무가 있는가?",
    pro: ["큰 희생 없이 고통을 줄일 수 있다면 도와야 한다.", "고통받는 사회가 제대로 된 사회를 이루도록 돕는 것은 국제 사회의 의무이다.", "세계 시민으로서 인류 모두의 인권을 존중해야 한다."],
    con: ["원조는 자선일 뿐 강제할 수 있는 의무는 아니다.", "나라 안의 어려운 사람을 먼저 도와야 한다.", "부패나 의존 때문에 원조가 효과를 거두지 못할 수 있다."],
    views: "싱어(원조는 의무)·롤스(고통받는 사회를 도울 의무) ↔ 노직(자선의 문제)" },
  { id: "ethical-consumption", unit: "의식주 및 경제생활과 윤리", title: "공정 무역·윤리적 소비", question: "값이 더 비싸더라도 윤리적 소비를 해야 하는가?",
    pro: ["생산자가 정당한 대가를 받고 노동 착취가 줄어든다.", "환경을 덜 해치는 생산을 늘릴 수 있다.", "소비는 사회에 영향을 주는 선택이므로 책임이 따른다."],
    con: ["무엇을 살지는 개인이 자유롭게 정할 일이다.", "비싼 값은 소득이 적은 사람에게 부담이 된다.", "인증 제도의 신뢰성과 실제 효과를 두고 논란이 있다."],
    views: "합리적 소비 ↔ 윤리적 소비, 공정 무역의 원칙" },
  { id: "future-generations", unit: "자연과 윤리", title: "기후 위기와 미래 세대", question: "현세대는 미래 세대를 위해 지금의 편리함과 이익을 줄여야 하는가?",
    pro: ["지구는 미래 세대와 함께 쓰는 것이며, 그들의 삶을 위협해서는 안 된다.", "기후 변화의 피해는 되돌리기 어려우므로 미리 조심해야 한다.", "기술의 힘이 커진 만큼 먼 미래까지 책임져야 한다."],
    con: ["아직 태어나지 않은 사람에 대한 의무는 근거가 분명하지 않다.", "지금 겪는 빈곤과 불평등을 먼저 해결해야 한다.", "미래에는 기술 발전으로 문제를 더 잘 해결할 수 있다."],
    views: "요나스(책임 윤리)·지속가능한 발전 ↔ 현세대 중심 관점" },
  { id: "art-morality", unit: "예술과 대중문화 윤리", title: "예술과 도덕", question: "예술 작품은 도덕적 기준으로 평가받아야 하는가?",
    pro: ["예술은 사람과 사회에 큰 영향을 주므로 도덕적 책임이 따른다(도덕주의).", "예술은 사람의 도덕성과 품성을 기르는 데 이바지해야 한다.", "인간의 존엄을 해치는 작품은 비판받아야 한다."],
    con: ["예술은 그 자체의 아름다움으로 평가해야 한다(예술 지상주의).", "도덕의 잣대가 표현의 자유와 창의성을 억누를 수 있다.", "도덕 기준은 시대와 사회에 따라 달라진다."],
    views: "도덕주의(플라톤·톨스토이) ↔ 예술 지상주의(와일드)" },
  { id: "multiculture", unit: "다문화 사회의 윤리", title: "다문화 정책", question: "이주민에게 우리 사회의 주류 문화를 따르도록 요구해야 하는가?",
    pro: ["공통의 언어와 가치가 있어야 서로 소통하고 사회가 하나로 뭉친다.", "빨리 적응할수록 이주민도 일자리와 생활에서 어려움을 덜 겪는다.", "문화 차이에서 오는 갈등을 줄일 수 있다(동화주의)."],
    con: ["여러 문화가 함께 있는 것 자체가 사회를 풍요롭게 한다(다문화주의).", "자기 문화와 정체성을 지킬 권리는 존중받아야 한다.", "주류 문화를 강요하는 것은 차별이 될 수 있다."],
    views: "동화주의(용광로) ↔ 다문화주의(샐러드 그릇)·문화 다원주의" },
];

export type Rubric = "logic" | "evidence" | "rebuttal" | "respect" | "principle";
export const RUBRICS: Record<Rubric, { name: string; levels: [string, string, string] }> = {
  logic: { name: "논거의 타당성", levels: ["주장과 근거가 논리적으로 잘 이어진다.", "근거가 있으나 주장과의 연결이 약하다.", "근거 없이 주장만 한다."] },
  evidence: { name: "근거 자료", levels: ["믿을 만한 자료와 사례를 출처와 함께 든다.", "사례는 있으나 출처가 분명하지 않다.", "자료나 사례가 없다."] },
  rebuttal: { name: "반론과 재반론", levels: ["상대 논거를 정확히 짚어 반박한다.", "반박하지만 상대 논거를 잘못 이해한 부분이 있다.", "상대 논거에 대응하지 않는다."] },
  respect: { name: "경청과 존중", levels: ["상대 말을 끝까지 듣고 존중하는 말로 말한다.", "대체로 듣지만 가끔 말을 끊는다.", "상대를 무시하거나 비난한다."] },
  principle: { name: "윤리 원리 적용", levels: ["관련 윤리 이론·사상가를 알맞게 적용한다.", "윤리 이론을 언급하지만 적용이 부정확하다.", "윤리 이론을 활용하지 않는다."] },
};

export type DebateSheetOptions = {
  title: string;
  /** 찬반 논거를 채워 줄지(비우면 학생이 쓰는 칸) */
  showArguments: boolean;
  stance: boolean; rebuttal: boolean; consensus: boolean;
  rubrics: Rubric[];
};

const cell = "border:1px solid #666;padding:1.6mm 2mm;vertical-align:top";
const head = `${cell};background:#f1f1f1;text-align:center`;
const box = (title: string, body: string, height: number) => `<div style="margin:0 0 3mm;break-inside:avoid"><div style="font-weight:700;margin:0 0 1mm">${title}</div><div style="border:1px solid #666;padding:2mm 3mm;min-height:${height}mm">${body}</div></div>`;

/** 쟁점 하나의 토론 학습지 양식입니다. 비운 칸은 학생이 쓰는 칸입니다. */
export function debateSheetHtml(issue: DebateIssue, options: DebateSheetOptions, mode: SheetMode) {
  const count = Math.max(3, issue.pro.length, issue.con.length);
  const rows = Array.from({ length: count }, (_, at) => `<tr><td style="${cell};height:12mm;width:50%">${options.showArguments && issue.pro[at] ? escapeHtml(issue.pro[at]) : ""}</td><td style="${cell};width:50%">${options.showArguments && issue.con[at] ? escapeHtml(issue.con[at]) : ""}</td></tr>`).join("");
  const table = `<table style="border-collapse:collapse;width:100%;font-size:10pt;margin:0 0 3mm"><tr><th style="${head}">찬성 논거</th><th style="${head}">반대 논거</th></tr>${rows}</table>`;
  const question = `<div style="margin:0 0 3mm;padding:2.5mm 3mm;border:1.5px solid #222;font-size:11.5pt"><b>쟁점</b> ${escapeHtml(issue.question)}</div>`
    + (issue.note ? `<p style="margin:-1mm 0 3mm;font-size:9.5pt;color:#444">참고: ${escapeHtml(issue.note)}</p>` : "")
    + `<p style="margin:0 0 3mm;font-size:9.5pt;color:#444">관련 관점: ${escapeHtml(issue.views)}</p>`;
  const stance = options.stance ? box("내 입장과 근거", `나는 이 쟁점에 대해 ( 찬성 / 반대 ) 한다.<div style="height:18mm"></div>`, 24) : "";
  const rebuttal = options.rebuttal ? `<table style="border-collapse:collapse;width:100%;font-size:10pt;margin:0 0 3mm;break-inside:avoid"><tr><th style="${head};width:50%">예상되는 반론</th><th style="${head}">나의 재반론</th></tr><tr><td style="${cell};height:24mm"></td><td style="${cell}"></td></tr></table>` : "";
  const consensus = options.consensus ? box("토론 후 합의안(또는 달라진 생각)", "", 22) : "";
  const rubric = options.rubrics.length ? `<div style="break-inside:avoid"><div style="font-weight:700;margin:2mm 0 1mm">평가 기준</div><table style="border-collapse:collapse;width:100%;font-size:9pt"><tr><th style="${head}">기준</th><th style="${head}">상</th><th style="${head}">중</th><th style="${head}">하</th></tr>${options.rubrics.map(key => `<tr><td style="${cell};font-weight:700;width:18%">${escapeHtml(RUBRICS[key].name)}</td>${RUBRICS[key].levels.map(level => `<td style="${cell}">${escapeHtml(level)}</td>`).join("")}</tr>`).join("")}</table></div>` : "";
  return clipboardWrap(sheetHead(options.title.trim() || `윤리 쟁점 토론 · ${issue.title}`) + question + table + stance + rebuttal + consensus + rubric, mode);
}
export function debateSheetText(issue: DebateIssue, options: DebateSheetOptions) {
  const lines = [options.title.trim() || `윤리 쟁점 토론 · ${issue.title}`, "", `쟁점: ${issue.question}`];
  if (issue.note) lines.push(`참고: ${issue.note}`);
  lines.push(`관련 관점: ${issue.views}`, "");
  if (options.showArguments) lines.push("찬성 논거", ...issue.pro.map(item => `- ${item}`), "", "반대 논거", ...issue.con.map(item => `- ${item}`), "");
  if (options.stance) lines.push("내 입장과 근거: ( 찬성 / 반대 )", "");
  if (options.rebuttal) lines.push("예상되는 반론:", "나의 재반론:", "");
  if (options.consensus) lines.push("토론 후 합의안:", "");
  for (const key of options.rubrics) lines.push(`${RUBRICS[key].name} — 상: ${RUBRICS[key].levels[0]} / 중: ${RUBRICS[key].levels[1]} / 하: ${RUBRICS[key].levels[2]}`);
  return lines.join("\n");
}
