import { KANA_ROWS, rowsOfGroup, scriptLabels, strokeCount, wordReading, wordsFor, type KanaGroup, type KanaItem, type KanaRow, type Script, type ScriptChoice } from "./kana";
import { answerSection, clipboardWrap, escapeHtml, ja, jaStyle, romans, seededRandom, sheetHead, shuffled, textHead, type SheetMode } from "./sheet";
import { strokeStepsSvg } from "./strokes";

/* 가나 학습지 세 가지(50음도 표, 쓰기 연습지, 가나 퀴즈)를 만듭니다. 화면·인쇄·복사가 같은 결과가 되도록 seed로 섞습니다. */

// ── 50음도 표 ─────────────────────────────────────────────

export const blankModes = { none: "빈칸 없음", some: "절반 빈칸", all: "모두 빈칸" } as const;
export type BlankMode = keyof typeof blankModes;
export type ChartOptions = { title: string; script: ScriptChoice; rows: string[]; romaji: boolean; korean: boolean; blanks: BlankMode; seed: number; answers: boolean };

const chartGroups: { label: string; groups: KanaGroup[]; columns: string[] }[] = [
  { label: "청음", groups: ["seion"], columns: ["a", "i", "u", "e", "o"] },
  { label: "탁음 · 반탁음", groups: ["dakuon", "handakuon"], columns: ["a", "i", "u", "e", "o"] },
  { label: "요음", groups: ["yoon"], columns: ["ya", "yu", "yo"] },
];
const scriptsOf = (choice: ScriptChoice): Script[] => choice === "both" ? ["hira", "kata"] : [choice];

function chartTables(options: ChartOptions, blanks: BlankMode, mode: SheetMode) {
  const random = seededRandom(options.seed);
  const scripts = scriptsOf(options.script);
  const hidden = () => blanks === "all" || (blanks === "some" && random() < 0.5);
  const screen = mode === "screen";
  const border = "border:1px solid #555";
  return chartGroups.map(group => {
    const rows = KANA_ROWS.filter(row => group.groups.includes(row.group) && options.rows.includes(row.key));
    if (!rows.length) return "";
    const head = `<tr><th style="${border};width:18mm;background:#f2f2f2"></th>${group.columns.map(column => `<th style="${border};background:#f2f2f2;font-size:9pt;font-weight:600;color:#555">${column}</th>`).join("")}</tr>`;
    const body = rows.map((row: KanaRow) => {
      const label = scripts.map(script => row.key === "n" ? row.cells[0]![script] : `${row.cells.find(Boolean)![script]}행`).join(" ");
      const cells = row.cells.map(cell => {
        if (!cell) return `<td style="${border};background:#fafafa"></td>`;
        const glyphs = scripts.map(script => hidden() ? `<span style="display:inline-block;width:1.1em"></span>` : ja(cell[script], mode)).join(" ");
        const hints = [options.romaji && cell.romaji, options.korean && cell.korean].filter(Boolean).join(" · ");
        return `<td data-say="${escapeHtml(cell.hira)}" style="${border};text-align:center;padding:1.2mm 0.5mm;${screen ? "cursor:pointer;" : ""}">`
          + `<div style="font-size:${group.columns.length === 3 ? "18pt" : "20pt"};line-height:1.25;min-height:1.25em">${glyphs}</div>`
          + (hints ? `<div style="font-size:8.5pt;color:#666;line-height:1.3">${escapeHtml(hints)}</div>` : "") + "</td>";
      }).join("");
      return `<tr><th style="${border};font-size:10pt;font-weight:700;background:#f7f7f7">${ja(label, mode)}</th>${cells}</tr>`;
    }).join("");
    return `<h2 style="margin:0 0 2mm;font-size:12pt">${group.label}</h2><table style="width:100%;border-collapse:collapse;table-layout:fixed;margin:0 0 5mm">${head}${body}</table>`;
  }).join("");
}

export function kanaChartHtml(options: ChartOptions, mode: SheetMode) {
  const title = options.title.trim() || `${options.script === "both" ? "히라가나 · 가타카나" : scriptLabels[options.script]} 50음도`;
  const guide = options.blanks === "none" ? "" : `<p style="margin:0 0 3mm;font-size:11pt;font-weight:700">빈칸에 알맞은 가나를 쓰시오.</p>`;
  const answers = options.blanks !== "none" && options.answers ? answerSection(chartTables(options, "none", mode), mode) : "";
  return clipboardWrap(sheetHead(title) + guide + chartTables(options, options.blanks, mode) + answers, mode);
}

// ── 쓰기 연습지 ───────────────────────────────────────────

export const kanaPracticeSizes = { normal: { label: "보통 칸", cells: 9, mm: 16 }, large: { label: "큰 칸", cells: 7, mm: 20 } } as const;
export type KanaPracticeSize = keyof typeof kanaPracticeSizes;
export type KanaPracticeOptions = { title: string; size: KanaPracticeSize; trace: number; steps: boolean };

/** 글자마다 한 줄: 왼쪽에 가나·발음·획 수, 오른쪽에 십자 보조선이 있는 쓰기 칸. 앞쪽 칸은 연한 글자로 따라 씁니다. 아래 줄에 획순을 그립니다. */
export function kanaPracticeHtml(items: KanaItem[], options: KanaPracticeOptions) {
  const { cells, mm } = kanaPracticeSizes[options.size];
  const trace = Math.max(0, Math.min(cells, options.trace));
  const guide = "position:absolute;border-color:#c4c4c4;border-style:dashed;border-width:0";
  const rows = items.map(item => {
    const size = Math.round(mm * ([...item.char].length > 1 ? 1.2 : 1.9));
    const cell = (show: boolean) => `<td style="border:1px solid #555;padding:0"><div style="position:relative;height:${mm}mm;line-height:${mm}mm;text-align:center;white-space:nowrap">`
      + `<div style="${guide};left:0;top:0;width:50%;height:100%;border-right-width:1px"></div><div style="${guide};left:0;top:0;width:100%;height:50%;border-bottom-width:1px"></div>`
      + (show ? `<span lang="ja" style="position:relative;${jaStyle("screen")};font-size:${size}pt;color:#c9c9c9">${escapeHtml(item.char)}</span>` : "") + "</div></td>";
    const strokes = strokeCount(item.char);
    const info = `<td style="width:30mm;border:1px solid #555;padding:1mm 1.5mm;text-align:center;vertical-align:middle">`
      + `<div lang="ja" style="${jaStyle("screen")};font-size:${mm + 8}pt;line-height:1.15;white-space:nowrap">${escapeHtml(item.char)}</div>`
      + `<div style="font-size:9.5pt;font-weight:700;line-height:1.3">${escapeHtml(`${item.romaji} · ${item.korean}`)}</div>`
      + `<div style="font-size:7.5pt;color:#555;line-height:1.4">${escapeHtml([scriptLabels[item.script], strokes && `${strokes}획`].filter(Boolean).join(" · "))}</div></td>`;
    const writing = Array.from({ length: cells }, (_, index) => cell(index < trace)).join("");
    const steps = options.steps ? strokeStepsSvg(item.char, "8mm") : [];
    const extra = steps.length || item.tip
      ? `<tr><td colspan="${cells + 1}" style="border:1px solid #555;border-top:0;padding:1mm 2mm;font-size:8.5pt">`
        + (steps.length ? `<span style="font-weight:700;margin-right:2mm;vertical-align:middle">획순</span>${steps.join("<span style=\"display:inline-block;width:1mm\"></span>")}` : "")
        + (item.tip ? `<span style="display:inline-block;vertical-align:middle;margin-left:${steps.length ? "3mm" : "0"};color:#333">${escapeHtml(item.tip)}</span>` : "") + "</td></tr>"
      : "";
    return `<table style="width:100%;border-collapse:collapse;table-layout:fixed;margin:0 0 2.5mm;break-inside:avoid"><tr>${info}${writing}</tr>${extra}</table>`;
  }).join("");
  return sheetHead(options.title.trim() || "가나 쓰기 연습") + rows;
}

// ── 가나 퀴즈 ─────────────────────────────────────────────

export const kanaQuizTypes = {
  read: { label: "발음 쓰기", instruction: "다음 가나의 발음을 쓰시오." },
  write: { label: "가나 쓰기", instruction: "다음 발음에 알맞은 가나를 쓰시오." },
  convert: { label: "바꿔 쓰기", instruction: "히라가나는 가타카나로, 가타카나는 히라가나로 바꿔 쓰시오." },
  words: { label: "낱말 읽기", instruction: "다음 낱말을 읽고 발음을 쓰시오." },
} as const;
export type KanaQuizType = keyof typeof kanaQuizTypes;
export const kanaQuizTypeKeys = Object.keys(kanaQuizTypes) as KanaQuizType[];
export const quizCounts = [10, 20, 0] as const;
export type KanaQuizOptions = { title: string; types: KanaQuizType[]; count: number; shuffle: boolean; seed: number; answers: boolean };
export type KanaQuizItem = { question: string; answer: string; ja: boolean };
export type KanaQuizSection = { type: KanaQuizType; instruction: string; items: KanaQuizItem[] };

export function buildKanaQuiz(items: KanaItem[], options: Pick<KanaQuizOptions, "types" | "count" | "shuffle" | "seed">): KanaQuizSection[] {
  const scripts = new Set(items.map(item => item.script));
  const both = scripts.size > 1;
  const only = both ? "가나" : scriptLabels[[...scripts][0] ?? "hira"];
  return kanaQuizTypeKeys.filter(type => options.types.includes(type)).map((type, index) => {
    let list: KanaQuizItem[] = [];
    if (type === "read") list = items.map(item => ({ question: item.char, answer: `${item.romaji} (${item.korean})`, ja: true }));
    if (type === "write") list = items.map(item => ({ question: both ? `${item.romaji} · ${scriptLabels[item.script]}` : item.romaji, answer: item.char, ja: false }));
    if (type === "convert") list = items.map(item => ({ question: item.char, answer: item.pair, ja: true }));
    if (type === "words") list = wordsFor(items).map(([word, meaning]) => {
      const reading = wordReading(word)!;
      return { question: word, answer: `${reading.romaji} · ${reading.korean} (${meaning})`, ja: true };
    });
    if (options.shuffle) list = shuffled(list, options.seed + index + 1);
    if (options.count) list = list.slice(0, options.count);
    const instruction = type === "write" ? `다음 발음에 알맞은 ${only}를 쓰시오.` : kanaQuizTypes[type].instruction;
    return { type, instruction, items: list };
  }).filter(section => section.items.length);
}

const columnsOf = (type: KanaQuizType) => type === "words" ? 2 : type === "write" ? 3 : 4;

/** 퀴즈 HTML입니다. screen은 여러 칸 배치, clipboard는 한글·워드에 붙이기 좋은 표입니다. */
export function kanaQuizHtml(sections: KanaQuizSection[], options: Pick<KanaQuizOptions, "title" | "answers">, mode: SheetMode) {
  // 칸이 좁을수록 답 칸을 짧게 하고, 문제와 답 칸이 한 줄에 있도록 줄바꿈을 막습니다.
  const blank = (type: KanaQuizType) => ({ 2: "( ________________ )", 3: "( __________ )", 4: "( _____ )" })[columnsOf(type)];
  const item = (entry: KanaQuizItem, number: number, type: KanaQuizType) => `<span style="white-space:nowrap"><b style="margin-right:2mm">${number}.</b>`
    + (entry.ja ? `<span style="font-size:17pt">${ja(entry.question, mode)}</span>` : `<span style="font-size:12pt">${escapeHtml(entry.question)}</span>`) + ` ${blank(type)}</span>`;
  const body = sections.map((section, index) => {
    const title = `<h2 style="margin:0 0 2mm;font-size:12pt">${romans[index]}. ${escapeHtml(section.instruction)}</h2>`;
    const columns = columnsOf(section.type);
    if (mode === "screen") return `<section style="margin-bottom:6mm">${title}${section.items.map((entry, number) => `<div style="display:inline-block;width:${100 / columns}%;margin:0 0 3.5mm;vertical-align:top">${item(entry, number + 1, section.type)}</div>`).join("")}</section>`;
    const rows: string[] = [];
    for (let number = 0; number < section.items.length; number += columns) {
      rows.push(`<tr>${Array.from({ length: columns }, (_, offset) => section.items[number + offset] ? `<td style="padding:1.5mm 2mm">${item(section.items[number + offset], number + offset + 1, section.type)}</td>` : "<td></td>").join("")}</tr>`);
    }
    return `${title}<table style="width:100%;border-collapse:collapse;margin-bottom:4mm">${rows.join("")}</table>`;
  }).join("");
  const answers = options.answers && sections.length
    ? answerSection(sections.map((section, index) => `<p style="margin:0 0 3mm;line-height:1.9"><b>${romans[index]}. ${kanaQuizTypes[section.type].label}</b><br>${section.items.map((entry, number) => `${number + 1}) ${section.type === "write" || section.type === "convert" ? ja(entry.answer, mode) : escapeHtml(entry.answer)}`).join(" &nbsp; ")}</p>`).join(""), mode)
    : "";
  return clipboardWrap(sheetHead(options.title.trim() || "가나 퀴즈") + body + answers, mode);
}

export function kanaQuizText(sections: KanaQuizSection[], options: Pick<KanaQuizOptions, "title" | "answers">) {
  const blocks = textHead(options.title.trim() || "가나 퀴즈");
  sections.forEach((section, index) => blocks.push([`${romans[index]}. ${section.instruction}`, ...section.items.map((entry, number) => `${number + 1}. ${entry.question} ( ________ )`)].join("\n")));
  if (options.answers && sections.length) blocks.push(["[정답]", ...sections.map((section, index) => `${romans[index]}. ${section.items.map((entry, number) => `${number + 1}) ${entry.answer}`).join("  ")}`)].join("\n"));
  return blocks.join("\n\n");
}

export const rowKeysOf = (groups: KanaGroup[]) => groups.flatMap(group => rowsOfGroup(group).map(row => row.key));

/** 50음도 표의 일반 텍스트입니다. 빈칸은 □로 씁니다. */
export function kanaChartText(options: ChartOptions) {
  const random = seededRandom(options.seed);
  const scripts = scriptsOf(options.script);
  const hidden = () => options.blanks === "all" || (options.blanks === "some" && random() < 0.5);
  const rows = chartGroups.flatMap(group => KANA_ROWS.filter(row => group.groups.includes(row.group) && options.rows.includes(row.key)))
    .map(row => row.cells.map(cell => cell ? scripts.map(script => hidden() ? "□" : cell[script]).join("") : "　").join("  "));
  return [...textHead(options.title.trim() || "50음도"), ...rows].join("\n");
}
