/* 역사: 교사가 넣은 사료(제목·출전·본문)로 사료 탐구 학습지를 만듭니다. 본문에서 [낱말]로 묶은 곳은 빈칸 문제가 됩니다. */
import { escapeHtml, plainText, problem, type SheetProblem, type SheetSection } from "./sheet";

export type HistorySource = {
  title: string; origin: string; body: string;
  /** 정답지에 싣는 참고 답(비워 두면 “학생마다 다를 수 있어요”) */
  time: string; author: string; background: string;
};

/** 현대어 풀이가 널리 알려진 사료입니다. 교과서마다 풀이 말이 조금씩 다를 수 있어요. */
export const SOURCE_PRESETS: HistorySource[] = [
  {
    title: "훈민정음 어제 서문", origin: "『훈민정음』 해례본(1446) — 현대어 풀이",
    body: "나라의 말이 중국과 달라 [문자](한자)와 서로 잘 통하지 아니하므로, 이런 까닭으로 어리석은 백성이 이르고자 하는 바가 있어도 마침내 제 뜻을 능히 펴지 못하는 사람이 많으니라. 내가 이를 위하여 가엾게 여겨 새로 [스물여덟] 글자를 만드니, 사람마다 하여금 쉬이 익혀 날마다 쓰는 데 [편안]하게 하고자 할 따름이니라.",
    time: "조선 세종 때(1443년 창제, 1446년 반포)", author: "세종 — 백성이 쉽게 익혀 자기 뜻을 펼 수 있게 하려고", background: "한자는 배우기 어려워 백성이 글로 뜻을 나타내기 힘들었다. 세종은 집현전 학자들과 함께 우리말에 맞는 문자를 만들었다.",
  },
  {
    title: "기미 독립 선언서", origin: "기미 독립 선언서(1919. 3. 1.) — 현대어 풀이",
    body: "우리는 이에 우리 조선이 [독립]국임과 조선인이 [자주]민임을 선언하노라. 이로써 세계 만방에 알리어 인류 [평등]의 큰 도의를 분명히 하며, 이로써 자손만대에 깨우쳐 민족 자존의 정당한 권리를 영원히 누리게 하노라.",
    time: "1919년 3·1 운동 때", author: "민족 대표 33인 — 일제의 식민 지배를 거부하고 독립 의지를 세계에 알리려고", background: "일제의 무단 통치에 대한 불만이 커졌고, 제1차 세계 대전 뒤 민족 자결주의가 퍼졌으며, 도쿄에서 2·8 독립 선언이 있었다.",
  },
  {
    title: "미국 독립 선언문", origin: "미국 독립 선언문(1776) 일부 — 우리말 번역",
    body: "우리는 다음과 같은 사실을 자명한 진리로 받아들인다. 모든 사람은 [평등]하게 태어났으며, 창조주는 몇 개의 양도할 수 없는 권리를 부여하였고, 그 권리 중에는 생명과 [자유]와 행복의 추구가 있다. 이 권리를 확보하기 위하여 인류는 정부를 조직하였으며, 이 정부의 정당한 권력은 피치자의 [동의]로부터 유래하고 있는 것이다.",
    time: "1776년 미국 혁명(독립 전쟁) 때", author: "대륙 회의(토머스 제퍼슨 등이 기초) — 영국에서 독립하는 까닭을 밝히려고", background: "영국이 인지세법 등으로 식민지에 세금을 매기자 ‘대표 없이 과세 없다’며 반발하였다. 로크의 사회 계약설과 저항권 사상이 바탕이 되었다.",
  },
  {
    title: "프랑스 인권 선언", origin: "인간과 시민의 권리 선언(1789) 제1조·제2조 — 우리말 번역",
    body: "제1조 인간은 [자유]롭고 평등한 권리를 가지고 태어나 살아간다. 사회적 차별은 오직 공공의 이익을 근거로 해서만 있을 수 있다. 제2조 모든 정치적 결사의 목적은 인간의 자연적이고 소멸될 수 없는 권리를 보전하는 데 있다. 이 권리란 자유, [재산], 안전, 그리고 [압제]에 대한 저항이다.",
    time: "1789년 프랑스 혁명 때", author: "국민 의회 — 구제도(앙시앵 레짐)를 무너뜨리고 새 사회의 원칙을 밝히려고", background: "신분에 따른 불평등과 재정 위기 속에 삼부회가 열렸고, 제3 신분이 국민 의회를 만들었다. 계몽사상(자연권·사회 계약설)이 바탕이 되었다.",
  },
];

export type SourceAsk = "summary" | "when" | "who" | "keyword" | "background" | "trust" | "today" | "compare";
export const sourceAsks: Record<SourceAsk, string> = {
  summary: "내용 요약", when: "언제 쓰였나", who: "누가 왜 썼나", keyword: "핵심 낱말", background: "당시 배경", trust: "믿을 만한가", today: "오늘날 의미", compare: "다른 사료와 비교",
};
const ASK_TEXT: Record<SourceAsk, string> = {
  summary: "사료의 내용을 한두 문장으로 요약하시오.",
  when: "이 사료가 쓰인 시기를 쓰고, 그렇게 생각한 근거를 사료에서 찾아 쓰시오.",
  who: "이 사료를 쓴 사람(기관)은 누구이며, 무엇을 위해 썼는지 쓰시오.",
  keyword: "사료의 핵심 낱말 세 개를 골라 쓰고, 각각의 뜻을 설명하시오.",
  background: "이 사료가 나오게 된 당시의 역사적 배경을 설명하시오.",
  trust: "이 사료를 역사 자료로 믿을 만한지 판단하고, 그 까닭을 쓰시오. (누가, 언제, 누구에게, 무엇을 위해 쓴 글인지 생각해 보시오.)",
  today: "이 사료가 오늘날 우리에게 주는 의미를 쓰시오.",
  compare: "이 사료와 관점이 비슷하거나 다른 사료를 하나 찾아 공통점과 차이점을 비교하시오.",
};
const OPEN = "학생마다 답이 다를 수 있어요. 사료 속 근거를 들었는지 봐 주세요.";

/** 본문을 글과 [빈칸]으로 나눕니다. */
export function parseBlanks(body: string) {
  const parts: { text: string; blank: boolean }[] = [];
  const pattern = /\[([^\[\]]{1,40})\]/g;
  let last = 0;
  for (let match = pattern.exec(body); match; match = pattern.exec(body)) {
    if (match.index > last) parts.push({ text: body.slice(last, match.index), blank: false });
    parts.push({ text: match[1], blank: true });
    last = match.index + match[0].length;
  }
  if (last < body.length) parts.push({ text: body.slice(last), blank: false });
  return parts;
}
const MARKS = "㉠㉡㉢㉣㉤㉥㉦㉧㉨㉩㉪㉫㉬㉭";
const mark = (index: number) => MARKS[index] ?? `(${index + 1})`;

/** 사료 상자 HTML. 빈칸을 쓰지 않으면 [ ] 표시만 없애고 낱말을 그대로 둡니다. */
export function sourceBoxHtml(source: HistorySource, blanks: boolean) {
  let index = 0;
  const body = parseBlanks(source.body).map(part => part.blank
    ? blanks ? `<b>(&nbsp;&nbsp;${mark(index++)}&nbsp;&nbsp;)</b>` : escapeHtml(part.text)
    : escapeHtml(part.text)).join("").replace(/\n/g, "<br>");
  return `<div style="border:1.5px solid #333;border-radius:2mm;padding:3mm 4mm;margin:1mm 0 2mm;line-height:1.75"><p style="margin:0 0 1.5mm;font-weight:700">${escapeHtml(source.title || "사료")}</p><p style="margin:0">${body}</p>${source.origin ? `<p style="margin:1.5mm 0 0;text-align:right;font-size:9.5pt;color:#444">— ${escapeHtml(source.origin)}</p>` : ""}</div>`;
}

export function sourceSheet(source: HistorySource, options: { blanks: boolean; asks: SourceAsk[]; custom: string[]; space: number }): SheetSection[] {
  const words = parseBlanks(source.body).filter(part => part.blank).map(part => part.text);
  const box = sourceBoxHtml(source, options.blanks);
  const problems: SheetProblem[] = [];
  if (options.blanks && words.length) problems.push(problem(`사료의 빈칸 ${words.map((_, i) => mark(i)).join(", ")}에 들어갈 알맞은 말을 쓰시오.`, words.map((word, i) => `${mark(i)} ${escapeHtml(word)}`).join("&nbsp;&nbsp; "), { space: 10 }));
  const hint: Partial<Record<SourceAsk, string>> = { when: source.time, who: source.author, background: source.background };
  for (const ask of options.asks) problems.push(problem(escapeHtml(ASK_TEXT[ask]), escapeHtml(hint[ask]?.trim() ? `(예시) ${hint[ask]!.trim()}` : OPEN), { space: options.space }));
  for (const question of options.custom.map(item => item.trim()).filter(Boolean)) problems.push(problem(escapeHtml(question), escapeHtml(OPEN), { space: options.space }));
  return [{ heading: "사료 탐구", intro: { html: box, text: `[${source.title || "사료"}] ${plainText(box.replace(/<p style="margin:0 0 1.5mm;font-weight:700">.*?<\/p>/, ""))}` }, problems }];
}
