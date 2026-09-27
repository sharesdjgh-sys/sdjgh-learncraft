/* 국어 · 독서: 교사가 넣은 지문으로 문단 분석 학습지를 만들고, 글의 구조(비교·대조, 원인·결과 등) 구조도 양식을 그립니다. 지문은 저작권 때문에 교사가 붙여 넣습니다. */
import { blankMark, parseBlanks } from "./literature";
import { escapeHtml, plainText, problem, sheetTable, shuffled, svgText, svgWrap, type SheetProblem, type SheetSection } from "./sheet";

/* ───── 지문 분석 ───── */

/** 빈 줄(없으면 줄 바꿈)로 문단을 나눕니다. */
export function splitParagraphs(body: string) {
  const text = body.replace(/\r\n/g, "\n").trim();
  if (!text) return [];
  return (/\n\s*\n/.test(text) ? text.split(/\n\s*\n/) : text.split("\n")).map(paragraph => paragraph.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean);
}

export type ReadingAsk = "literal" | "inferential" | "critical" | "creative";
export const readingAsks: Record<ReadingAsk, string> = { literal: "사실적 읽기", inferential: "추론적 읽기", critical: "비판적 읽기", creative: "창의적 읽기" };
const READING_TEXT: Record<ReadingAsk, string[]> = {
  literal: ["이 글의 중심 화제는 무엇인지 쓰시오.", "글쓴이가 이 글에서 설명하거나 주장하는 핵심 내용을 한 문장으로 요약하시오."],
  inferential: ["글에 드러나지 않은 전제나 생략된 내용을 추론하여 쓰시오.", "글쓴이가 이 글을 쓴 의도나 목적을 추론하여 쓰시오."],
  critical: ["글쓴이가 든 근거가 믿을 만하고 주장을 충분히 뒷받침하는지 평가하시오.", "글쓴이의 관점과 다른 관점을 하나 들어, 글의 내용을 비판적으로 평가하시오."],
  creative: ["이 글의 내용을 우리 생활이나 다른 상황에 적용하여 새로운 생각을 쓰시오.", "이 글에서 제기한 문제를 해결할 수 있는 나만의 방안을 쓰시오."],
};
const OPEN = "학생마다 답이 다를 수 있어요. 지문 속 근거를 들어 썼는지 봐 주세요.";

export type ReadingPassage = { title: string; origin: string; body: string; summaries: string[]; words: string };
export type ReadingOptions = { blanks: boolean; summary: boolean; asks: ReadingAsk[]; perAsk: number; custom: string[]; vocabulary: boolean; space: number };

/** 문단마다 [번호]를 붙인 지문 상자입니다. [낱말]은 빈칸이나 밑줄이 됩니다. */
export function passageBoxHtml(passage: ReadingPassage, blanks: boolean) {
  const counter = { value: 0 };
  const paragraphs = splitParagraphs(passage.body).map((paragraph, index) => {
    const body = parseBlanks(paragraph).map(part => part.blank
      ? blanks ? `<b>(&nbsp;&nbsp;${blankMark(counter.value++)}&nbsp;&nbsp;)</b>` : `<u>${escapeHtml(part.text)}</u>`
      : escapeHtml(part.text)).join("");
    return `<p style="margin:0 0 2mm"><b>[${index + 1}]</b> ${body}</p>`;
  }).join("");
  const head = passage.title ? `<p style="margin:0 0 2mm;font-weight:700">${escapeHtml(passage.title)}</p>` : "";
  const origin = passage.origin ? `<p style="margin:1mm 0 0;text-align:right;font-size:9.5pt;color:#444">${escapeHtml(passage.origin)}</p>` : "";
  return `<div style="border:1.5px solid #333;border-radius:2mm;padding:3mm 4mm;margin:1mm 0 2mm;line-height:1.75">${head}${paragraphs}${origin}</div>`;
}

export function passageSheet(passage: ReadingPassage, options: ReadingOptions): SheetSection[] {
  const paragraphs = splitParagraphs(passage.body);
  if (!paragraphs.length) return [];
  const box = passageBoxHtml(passage, options.blanks);
  const problems: SheetProblem[] = [];
  const words = paragraphs.flatMap(paragraph => parseBlanks(paragraph).filter(part => part.blank).map(part => part.text));
  if (options.blanks && words.length) problems.push(problem(`지문의 빈칸 ${words.map((_, i) => blankMark(i)).join(", ")}에 들어갈 알맞은 말을 쓰시오.`, words.map((word, i) => `${blankMark(i)} ${escapeHtml(word)}`).join("&nbsp;&nbsp; "), { space: 10 }));
  if (options.summary) {
    const table = sheetTable(["문단", "중심 내용"], paragraphs.map((_, index) => [`[${index + 1}]`, "<div style=\"height:9mm\"></div>"]), { widths: ["14%", "86%"] });
    const answer = paragraphs.map((_, index) => `[${index + 1}] ${escapeHtml(passage.summaries[index]?.trim() || "학생마다 표현이 다를 수 있어요.")}`).join("<br>");
    problems.push(problem("각 문단의 중심 내용을 한 문장으로 쓰시오.", answer, { after: table }));
  }
  for (const ask of options.asks) for (const text of READING_TEXT[ask].slice(0, options.perAsk)) problems.push(problem(`<b>[${readingAsks[ask]}]</b> ${escapeHtml(text)}`, escapeHtml(OPEN), { space: options.space }));
  for (const question of options.custom.map(item => item.trim()).filter(Boolean)) problems.push(problem(escapeHtml(question), escapeHtml(OPEN), { space: options.space }));
  const vocabulary = passage.words.split(/[,\n]/).map(word => word.trim()).filter(Boolean).slice(0, 12);
  if (options.vocabulary && vocabulary.length) {
    const table = sheetTable(["낱말", "뜻", "짧은 글짓기"], vocabulary.map(word => [escapeHtml(word), "<div style=\"height:8mm\"></div>", ""]), { widths: ["20%", "40%", "40%"] });
    problems.push(problem("지문에 나온 다음 낱말의 뜻을 사전에서 찾아 쓰고, 짧은 글을 지으시오.", "사전 뜻과 비교해 봐 주세요.", { after: table }));
  }
  const introText = `${passage.title ? `[${passage.title}]\n` : ""}${plainText(box.replace(/<\/p>/g, "</p>\n"))}`;
  return [{ heading: "지문 분석", intro: { html: box, text: introText }, problems }];
}

/* ───── 글의 구조 ───── */
export type Structure = "compare" | "cause" | "problem" | "list" | "sequence" | "claim";
export const STRUCTURES: Record<Structure, { name: string; meaning: string; signals: string; labels: string[] }> = {
  compare: { name: "비교·대조", meaning: "두 대상의 공통점과 차이점을 견주어 설명한다.", signals: "~와 달리, 반면에, 이와 마찬가지로, 공통점은", labels: ["대상 1", "대상 2", "공통점", "차이점(대상 1)", "차이점(대상 2)"] },
  cause: { name: "원인·결과", meaning: "어떤 현상이 일어난 원인과 그 결과를 설명한다.", signals: "왜냐하면, 그 결과, 따라서, ~때문에", labels: ["원인 1", "원인 2", "원인 3", "현상", "결과"] },
  problem: { name: "문제·해결", meaning: "문제 상황과 원인을 밝히고 해결 방안을 제시한다.", signals: "문제는, 그 까닭은, 해결하려면, 방안으로", labels: ["문제 상황", "원인", "해결 방안 1", "해결 방안 2", "기대 효과"] },
  list: { name: "열거(나열)", meaning: "중심 화제에 대한 여러 내용을 차례로 늘어놓는다.", signals: "첫째·둘째·셋째, 또한, 그리고, 마지막으로", labels: ["중심 화제", "내용 1", "내용 2", "내용 3", "내용 4"] },
  sequence: { name: "시간 순서(과정)", meaning: "일이 일어난 차례나 과정을 순서대로 설명한다.", signals: "먼저, 다음으로, 그 뒤, 마침내", labels: ["1단계", "2단계", "3단계", "4단계", "5단계"] },
  claim: { name: "주장·근거", meaning: "주장을 내세우고 그것을 뒷받침하는 근거를 든다.", signals: "~해야 한다, 왜냐하면, 예를 들어, 그러므로", labels: ["주장", "근거 1", "근거 2", "근거 3", "결론"] },
};

/** 칸 안에 들어갈 글을 줄 나눕니다(한 줄에 대략 limit자). */
function wrapLines(text: string, limit: number, max = 3) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && (line + " " + word).length > limit) { lines.push(line); line = word; } else line = line ? `${line} ${word}` : word;
    if (lines.length >= max) break;
  }
  if (line && lines.length < max) lines.push(line);
  return lines;
}
/** 구조도 SVG. texts의 빈 칸은 학생이 쓰는 칸입니다. */
export function structureSvg(kind: Structure, texts: string[] = []) {
  const width = 640;
  const parts: string[] = [];
  const label = (index: number) => STRUCTURES[kind].labels[index];
  const boxAt = (x: number, y: number, w: number, h: number, index: number, fill = "#fff") => {
    parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="#333" stroke-width="1.4"/>`);
    parts.push(svgText(x + 8, y + 17, label(index), { size: 11.5, weight: 700, color: "#444" }));
    wrapLines(texts[index]?.trim() ?? "", Math.max(8, Math.floor((w - 16) / 12)), Math.max(1, Math.floor((h - 26) / 16))).forEach((line, row) => parts.push(svgText(x + 8, y + 36 + row * 16, line, { size: 12 })));
  };
  const arrow = (x1: number, y1: number, x2: number, y2: number) => {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const head = (turn: number) => `${(x2 - 9 * Math.cos(angle - turn)).toFixed(1)} ${(y2 - 9 * Math.sin(angle - turn)).toFixed(1)}`;
    parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#333" stroke-width="1.6"/><path d="M${x2} ${y2} L${head(0.45)} L${head(-0.45)} Z" fill="#333"/>`);
  };
  let height = 260;
  if (kind === "compare") {
    boxAt(20, 20, 290, 70, 0, "#f3f4f6"); boxAt(330, 20, 290, 70, 1, "#f3f4f6");
    boxAt(20, 110, 600, 60, 2);
    boxAt(20, 190, 290, 70, 3); boxAt(330, 190, 290, 70, 4);
    height = 280;
  } else if (kind === "cause") {
    [0, 1, 2].forEach(index => { boxAt(20, 20 + index * 80, 200, 64, index); arrow(222, 52 + index * 80, 268, 132); });
    boxAt(270, 100, 170, 64, 3, "#f3f4f6"); arrow(442, 132, 468, 132); boxAt(470, 100, 150, 64, 4);
    height = 260;
  } else if (kind === "problem") {
    boxAt(20, 20, 290, 70, 0, "#f3f4f6"); arrow(312, 55, 328, 55); boxAt(330, 20, 290, 70, 1);
    arrow(475, 92, 170, 118);
    boxAt(20, 120, 290, 70, 2); boxAt(330, 120, 290, 70, 3);
    arrow(170, 192, 320, 214); arrow(475, 192, 320, 214);
    boxAt(170, 216, 300, 60, 4, "#f3f4f6");
    height = 290;
  } else if (kind === "list") {
    boxAt(220, 20, 200, 56, 0, "#f3f4f6");
    [1, 2, 3, 4].forEach((index, at) => { const x = 20 + at * 152; arrow(320, 78, x + 70, 118); boxAt(x, 120, 140, 110, index); });
    height = 250;
  } else if (kind === "sequence") {
    [0, 1, 2, 3, 4].forEach(index => { const x = 12 + index * 126; boxAt(x, 40, 108, 150, index); if (index < 4) arrow(x + 110, 115, x + 124, 115); });
    height = 220;
  } else {
    boxAt(170, 20, 300, 56, 0, "#f3f4f6");
    [1, 2, 3].forEach((index, at) => { const x = 20 + at * 205; arrow(x + 95, 118, 320, 80); boxAt(x, 120, 190, 90, index); });
    arrow(320, 212, 320, 226);
    boxAt(170, 228, 300, 50, 4, "#f3f4f6");
    height = 290;
  }
  return svgWrap(width, height, parts.join(""));
}
export type StructureAsk = "identify" | "fill";
export const structureAsks: Record<StructureAsk, string> = { identify: "구조 유형 맞히기", fill: "구조도 채우기" };
const STRUCTURE_EXAMPLES: { kind: Structure; text: string }[] = [
  { kind: "compare", text: "종이책과 전자책은 모두 글을 읽는 매체이다. 그러나 종이책은 손으로 넘기는 감촉이 있고 눈이 덜 피로한 반면, 전자책은 가볍고 많은 책을 한 기기에 담을 수 있다." },
  { kind: "cause", text: "도시의 여름 기온이 주변보다 높은 까닭은 무엇일까? 아스팔트와 건물이 열을 머금고, 자동차와 냉방기가 열을 내뿜으며, 녹지가 적어 열이 식지 않기 때문이다. 그 결과 도시에는 열섬 현상이 나타난다." },
  { kind: "problem", text: "학교 급식을 남기는 학생이 많다. 입맛에 맞지 않는 메뉴와 부족한 배식 시간 때문이다. 학생 설문으로 메뉴를 정하고 배식 시간을 늘리면 남는 음식을 줄일 수 있을 것이다." },
  { kind: "list", text: "좋은 발표를 하려면 몇 가지가 필요하다. 첫째, 청중을 분석해야 한다. 둘째, 내용을 짜임새 있게 구성해야 한다. 셋째, 알맞은 매체 자료를 준비해야 한다. 마지막으로 충분히 연습해야 한다." },
  { kind: "sequence", text: "김치를 담글 때는 먼저 배추를 소금물에 절인다. 다음으로 절인 배추를 깨끗이 씻어 물기를 뺀다. 그 뒤 양념을 만들어 배춧잎 사이사이에 바른다. 마지막으로 항아리에 담아 익힌다." },
  { kind: "claim", text: "청소년에게 투표권을 더 일찍 주어야 한다. 청소년도 사회 문제에 관심이 많고, 정책의 영향을 직접 받으며, 일찍 투표를 경험하면 민주 시민 의식이 자란다. 그러므로 선거 연령을 낮추는 것을 검토해야 한다." },
];
export function structureProblems(asks: StructureAsk[], count: number, seed: number): SheetSection[] {
  const sections: SheetSection[] = [];
  for (const ask of asks) {
    const problems: SheetProblem[] = [];
    const examples = shuffled(STRUCTURE_EXAMPLES, seed * 61 + asks.indexOf(ask)).slice(0, count);
    for (const example of examples) {
      const quote = `<span style="display:block;margin:1mm 0 1mm 4mm;padding-left:2mm;border-left:2px solid #999">${escapeHtml(example.text)}</span>`;
      const info = STRUCTURES[example.kind];
      if (ask === "identify") problems.push(problem(`다음 글의 짜임(구조)을 쓰고, 그렇게 판단한 근거가 되는 표현을 찾아 쓰시오.${quote}`, `${info.name} — ${escapeHtml(info.meaning)} (표지: ${escapeHtml(info.signals)})`, { space: 12 }));
      else problems.push(problem(`다음 글을 읽고 구조도의 빈칸을 채우시오.${quote}`, `${info.name}의 짜임으로 정리했는지 봐 주세요.`, { figure: structureSvg(example.kind), space: 2 }));
    }
    if (problems.length) sections.push({ heading: structureAsks[ask], problems });
  }
  return sections;
}
