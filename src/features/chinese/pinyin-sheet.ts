import { answerSection, clipboardWrap, escapeHtml, romans, seededRandom, sheetHead, shuffled, textHead, zh, type SheetMode } from "@/features/language-sheet";
import {
  applySandhi, FINALS, finalGroups, INITIALS, initialGroups, markTone, parseSyllable, SANDHI_WORDS, spell, splitTone, syllables, toneInfo, type Tone,
} from "./pinyin";
import { hanziEntry, isCommonHanzi } from "./hanzi";

/* 병음 학습지 세 가지(병음 정리표, 음절표, 병음 퀴즈)를 만듭니다. 화면·인쇄·복사가 같은 결과가 되도록 seed로 섞습니다. */

export const ZERO_INITIAL = "영성모";
export type PinyinSelection = { initials: string[]; finals: string[] };
export const allInitialGroups = [...initialGroups, ZERO_INITIAL];

const initialsOf = (selection: PinyinSelection) => [
  ...INITIALS.filter(initial => selection.initials.includes(initial.group)).map(initial => initial.key),
  ...(selection.initials.includes(ZERO_INITIAL) ? [""] : []),
];
const finalsOf = (selection: PinyinSelection) => FINALS.filter(final => selection.finals.includes(final.group));

/** 성조 높낮이 그림(5단계)입니다. 1성 55, 2성 35, 3성 214, 4성 51, 경성은 짧은 점입니다. */
export function toneSvg(tone: Tone, size: string, color = "#b3402a") {
  const y = (level: number) => 44 - (level - 1) * 9;
  const points: Record<Tone, [number, number][]> = { 1: [[8, y(5)], [52, y(5)]], 2: [[8, y(3)], [52, y(5)]], 3: [[8, y(2)], [28, y(1)], [52, y(4)]], 4: [[8, y(5)], [52, y(1)]], 0: [] };
  const grid = [1, 2, 3, 4, 5].map(level => `<line x1="4" x2="56" y1="${y(level)}" y2="${y(level)}" stroke="#ddd" stroke-width="1"/>`).join("");
  const line = tone ? `<polyline points="${points[tone].map(point => point.join(",")).join(" ")}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>` : `<circle cx="30" cy="${y(2)}" r="4" fill="${color}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 50" width="${size}" height="calc(${size} * 5 / 6)" style="display:inline-block;vertical-align:middle">${grid}${line}</svg>`;
}

// ── 병음 정리표 ───────────────────────────────────────────

export const TONE_EXAMPLE = ["mā", "má", "mǎ", "mà", "ma"];
const RULES = [
  "성조 부호는 a·e가 있으면 그 위에, ou면 o 위에, 그 밖에는 마지막 모음 위에 씁니다(hǎo, xiè, dōu, liù, guǐ).",
  "j·q·x 뒤의 ü는 두 점을 빼고 u로 씁니다(jù, qù, xué). n·l 뒤에서는 그대로 씁니다(nǚ, lǜ).",
  "iou·uei·uen이 성모 뒤에 오면 iu·ui·un으로 줄여 씁니다(liù, guì, lún).",
  "성모 없이 i·u·ü로 시작하면 y·w를 붙여 씁니다(yī, wǔ, yú, yuè).",
  "3성이 이어지면 앞의 3성은 2성으로 읽습니다(你好 nǐ hǎo → ní hǎo). 一·不는 뒤 음절의 성조에 따라 바뀝니다.",
];

export function pinyinChartHtml(title: string, mode: SheetMode) {
  const border = "border:1px solid #555;padding:1.5mm 2mm";
  const head = (text: string) => `<h2 style="margin:4mm 0 2mm;font-size:12pt">${escapeHtml(text)}</h2>`;
  const initialRows = initialGroups.map(group => `<tr><th style="${border};background:#f2f2f2;width:22mm;font-size:10pt">${group}</th><td style="${border};font-size:10pt;line-height:1.7">${INITIALS.filter(initial => initial.group === group).map(initial => `<b style="font-size:13pt">${initial.key}</b> ${escapeHtml(initial.tip)}`).join("<br>")}</td></tr>`).join("");
  const finalRows = finalGroups.map(group => `<tr><th style="${border};background:#f2f2f2;width:22mm;font-size:10pt">${group}</th><td style="${border};font-size:12.5pt;letter-spacing:.02em">${FINALS.filter(final => final.group === group).map(final => `<b>${final.key}</b>${final.zero ? `<span style="font-size:8.5pt;color:#666">(${final.zero})</span>` : ""}`).join(" &nbsp; ")}</td></tr>`).join("");
  const toneRows = ([1, 2, 3, 4, 0] as Tone[]).map((tone, index) => `<tr><th style="${border};background:#f2f2f2;width:16mm">${toneInfo[tone].name}</th><td style="${border};width:20mm;text-align:center">${toneSvg(tone, "14mm")}</td><td style="${border};width:24mm;text-align:center;font-size:14pt"><b>${TONE_EXAMPLE[index]}</b> ${zh(syllables().get("ma")?.find(item => item.tone === tone)?.char ?? "", mode)}</td><td style="${border};font-size:10pt">${toneInfo[tone].pitch ? `${toneInfo[tone].pitch} · ` : ""}${escapeHtml(toneInfo[tone].tip)}</td></tr>`).join("");
  const table = (rows: string) => `<table style="width:100%;border-collapse:collapse;margin:0 0 2mm">${rows}</table>`;
  const rules = `<ol style="margin:0;padding-left:6mm;font-size:10pt;line-height:1.8">${RULES.map(rule => `<li>${escapeHtml(rule)}</li>`).join("")}</ol>`;
  return clipboardWrap(sheetHead(title.trim() || "한어병음 정리표") + head("성모(声母) 21개") + table(initialRows) + head("운모(韵母) · 괄호는 성모 없이 쓸 때") + table(finalRows) + head("성조(声调)") + table(toneRows) + head("표기와 발음 규칙") + rules, mode);
}

export function pinyinChartText(title: string) {
  return [
    ...textHead(title.trim() || "한어병음 정리표"),
    "[성모]", ...initialGroups.map(group => `${group}: ${INITIALS.filter(initial => initial.group === group).map(initial => initial.key).join(" ")}`),
    "[운모]", ...finalGroups.map(group => `${group}: ${FINALS.filter(final => final.group === group).map(final => final.zero ? `${final.key}(${final.zero})` : final.key).join(" ")}`),
    "[성조]", ...([1, 2, 3, 4, 0] as Tone[]).map((tone, index) => `${toneInfo[tone].name} ${TONE_EXAMPLE[index]} ${toneInfo[tone].pitch} ${toneInfo[tone].tip}`),
    "[규칙]", ...RULES.map((rule, index) => `${index + 1}. ${rule}`),
  ].join("\n");
}

// ── 음절표 ───────────────────────────────────────────────

export const blankModes = { none: "빈칸 없음", some: "절반 빈칸", all: "모두 빈칸" } as const;
export type BlankMode = keyof typeof blankModes;
export type SyllableTableOptions = { title: string; selection: PinyinSelection; blanks: BlankMode; seed: number; answers: boolean };

/** 운모 묶음마다 표 하나: 줄은 고른 성모, 칸은 운모입니다. 쓰지 않는 음절 칸은 회색으로 둡니다. */
export function syllableGrid(selection: PinyinSelection) {
  const initials = initialsOf(selection);
  return finalGroups.filter(group => selection.finals.includes(group)).map(group => {
    const finals = FINALS.filter(final => final.group === group);
    const rows = initials.map(initial => ({ initial, cells: finals.map(final => { const text = spell(initial, final.key); return text && syllables().has(text) ? text : ""; }) }))
      .filter(row => row.cells.some(Boolean));
    return { group, finals: finals.map(final => final.key), rows };
  }).filter(table => table.rows.length);
}

function syllableTables(options: SyllableTableOptions, blanks: BlankMode) {
  const random = seededRandom(options.seed);
  const border = "border:1px solid #555";
  return syllableGrid(options.selection).map(table => {
    const head = `<tr><th style="${border};width:12mm;background:#f2f2f2"></th>${table.finals.map(final => `<th style="${border};background:#f2f2f2;font-size:10pt">${escapeHtml(final)}</th>`).join("")}</tr>`;
    const body = table.rows.map(row => `<tr><th style="${border};font-size:11pt;background:#f7f7f7">${row.initial || "Ø"}</th>${row.cells.map(cell => {
      if (!cell) return `<td style="${border};background:#f1f1f1"></td>`;
      const hidden = blanks === "all" || (blanks === "some" && random() < 0.5);
      return `<td data-say="${escapeHtml(cell)}" style="${border};text-align:center;height:8mm;font-size:11.5pt">${hidden ? "" : escapeHtml(cell)}</td>`;
    }).join("")}</tr>`).join("");
    return `<h2 style="margin:0 0 2mm;font-size:12pt">${escapeHtml(table.group)}</h2><table style="width:100%;border-collapse:collapse;table-layout:fixed;margin:0 0 5mm">${head}${body}</table>`;
  }).join("");
}

export function syllableTableHtml(options: SyllableTableOptions, mode: SheetMode) {
  const guide = options.blanks === "none" ? "" : `<p style="margin:0 0 3mm;font-size:11pt;font-weight:700">성모와 운모를 이어 빈칸에 병음을 쓰시오. (Ø는 성모가 없는 음절)</p>`;
  const answers = options.blanks !== "none" && options.answers ? answerSection(syllableTables(options, "none"), mode) : "";
  return clipboardWrap(sheetHead(options.title.trim() || "병음 음절표") + guide + syllableTables(options, options.blanks) + answers, mode);
}

// ── 병음 퀴즈 ─────────────────────────────────────────────

export const pinyinQuizTypes = {
  toneMark: { label: "성조 부호 쓰기", instruction: "숫자로 적은 성조를 성조 부호로 바꿔 쓰시오. (ma3 → mǎ)" },
  toneNumber: { label: "몇 성인지 쓰기", instruction: "다음 병음은 몇 성인지 쓰시오. (경성은 0)" },
  split: { label: "성모·운모 나누기", instruction: "다음 음절을 성모와 운모로 나누어 쓰시오. (성모가 없으면 Ø)" },
  reading: { label: "글자 병음 쓰기", instruction: "다음 글자의 병음을 성조 부호와 함께 쓰시오." },
  sandhi: { label: "성조 변화", instruction: "다음 낱말을 실제로 읽는 성조로 쓰시오. (바뀌지 않으면 그대로)" },
} as const;
export type PinyinQuizType = keyof typeof pinyinQuizTypes;
export const pinyinQuizTypeKeys = Object.keys(pinyinQuizTypes) as PinyinQuizType[];
export type PinyinQuizOptions = { title: string; types: PinyinQuizType[]; count: number; shuffle: boolean; seed: number; answers: boolean };
export type PinyinQuizItem = { question: string; answer: string; zh?: boolean };
export type PinyinQuizSection = { type: PinyinQuizType; items: PinyinQuizItem[] };

/** 고른 성모·운모로 만들 수 있는, 대표 글자가 있는 음절·성조입니다. */
export function selectedSyllables(selection: PinyinSelection) {
  const initials = new Set(initialsOf(selection));
  const finals = new Set(finalsOf(selection).map(final => final.key));
  return [...syllables().entries()].flatMap(([base, tones]) => {
    const parsed = parseSyllable(base);
    return parsed && initials.has(parsed.initial) && finals.has(parsed.final) ? tones.filter(item => item.tone && !item.rare).map(item => ({ ...item, base, parsed })) : [];
  });
}

const splitAnswer = (base: string, parsed: { initial: string; final: string }) => {
  const notes: string[] = [];
  if (!parsed.initial && /^[yw]/.test(base)) notes.push("y·w는 성모가 아님");
  if (/^[jqx]u/.test(base)) notes.push("ü를 u로 씀");
  if (["iou", "uei", "uen"].includes(parsed.final) && parsed.initial) notes.push(`${parsed.final}를 줄여 씀`);
  return `${parsed.initial || "Ø"} + ${parsed.final}${notes.length ? ` (${notes.join(", ")})` : ""}`;
};

export function buildPinyinQuiz(selection: PinyinSelection, options: Pick<PinyinQuizOptions, "types" | "count" | "shuffle" | "seed">): PinyinQuizSection[] {
  const pool = selectedSyllables(selection);
  // 같은 음절이 여러 성조로 겹치지 않게, 섞은 뒤 음절마다 하나만 고릅니다.
  const pick = (salt: number) => {
    const seen = new Set<string>();
    return (options.shuffle ? shuffled(pool, options.seed + salt) : pool).filter(item => !seen.has(item.base) && seen.add(item.base));
  };
  return pinyinQuizTypeKeys.filter(type => options.types.includes(type)).map((type, index) => {
    let items: PinyinQuizItem[] = [];
    if (type === "toneMark") items = pick(index + 1).map(item => ({ question: `${item.base}${item.tone}`, answer: item.marked }));
    if (type === "toneNumber") items = pick(index + 1).map(item => ({ question: item.marked, answer: `${item.tone}성` }));
    if (type === "split") {
      const seen = new Set<string>();
      items = (options.shuffle ? shuffled(pool, options.seed + index + 1) : pool).filter(item => !seen.has(item.base) && seen.add(item.base)).map(item => ({ question: item.marked, answer: splitAnswer(item.base, item.parsed) }));
    }
    // 글자 병음 쓰기는 자주 쓰는 글자로만 냅니다(대표 글자가 드문 글자인 음절은 뺍니다).
    if (type === "reading") items = pick(index + 1).filter(item => isCommonHanzi(hanziEntry(item.char))).map(item => ({ question: item.char, answer: item.marked, zh: true }));
    if (type === "sandhi") {
      const words = options.shuffle ? shuffled(SANDHI_WORDS, options.seed + index + 1) : SANDHI_WORDS;
      items = words.map(([word, pinyin, meaning]) => {
        const result = applySandhi(pinyin.split(" "), [...word]).map(item => item.pinyin).join(" ");
        return { question: `${word} ${pinyin} (${meaning})`, answer: result === pinyin ? `${pinyin} (그대로)` : result, zh: true };
      });
    }
    return { type, items: options.count ? items.slice(0, options.count) : items };
  }).filter(section => section.items.length);
}

const columnsOf = (type: PinyinQuizType) => type === "sandhi" ? 2 : type === "split" ? 3 : 4;

export function pinyinQuizHtml(sections: PinyinQuizSection[], options: Pick<PinyinQuizOptions, "title" | "answers">, mode: SheetMode) {
  const blank = (type: PinyinQuizType) => ({ 2: "( ________________ )", 3: "( ____________ )", 4: "( _______ )" })[columnsOf(type)];
  const item = (entry: PinyinQuizItem, number: number, type: PinyinQuizType) => `<span style="white-space:nowrap"><b style="margin-right:2mm">${number}.</b>`
    + (entry.zh ? `<span style="font-size:${type === "reading" ? "18pt" : "13pt"}">${zh(entry.question, mode)}</span>` : `<span style="font-size:13pt">${escapeHtml(entry.question)}</span>`) + ` ${blank(type)}</span>`;
  const body = sections.map((section, index) => {
    const title = `<h2 style="margin:0 0 2mm;font-size:12pt">${romans[index]}. ${escapeHtml(pinyinQuizTypes[section.type].instruction)}</h2>`;
    const columns = columnsOf(section.type);
    if (mode === "screen") return `<section style="margin-bottom:6mm">${title}${section.items.map((entry, number) => `<div style="display:inline-block;width:${100 / columns}%;margin:0 0 3.5mm;vertical-align:top">${item(entry, number + 1, section.type)}</div>`).join("")}</section>`;
    const rows: string[] = [];
    for (let number = 0; number < section.items.length; number += columns) {
      rows.push(`<tr>${Array.from({ length: columns }, (_, offset) => section.items[number + offset] ? `<td style="padding:1.5mm 2mm">${item(section.items[number + offset], number + offset + 1, section.type)}</td>` : "<td></td>").join("")}</tr>`);
    }
    return `${title}<table style="width:100%;border-collapse:collapse;margin-bottom:4mm">${rows.join("")}</table>`;
  }).join("");
  const answers = options.answers && sections.length
    ? answerSection(sections.map((section, index) => `<p style="margin:0 0 3mm;line-height:1.9"><b>${romans[index]}. ${pinyinQuizTypes[section.type].label}</b><br>${section.items.map((entry, number) => `${number + 1}) ${escapeHtml(entry.answer)}`).join(" &nbsp; ")}</p>`).join(""), mode)
    : "";
  return clipboardWrap(sheetHead(options.title.trim() || "병음 퀴즈") + body + answers, mode);
}

export function pinyinQuizText(sections: PinyinQuizSection[], options: Pick<PinyinQuizOptions, "title" | "answers">) {
  const blocks = textHead(options.title.trim() || "병음 퀴즈");
  sections.forEach((section, index) => blocks.push([`${romans[index]}. ${pinyinQuizTypes[section.type].instruction}`, ...section.items.map((entry, number) => `${number + 1}. ${entry.question} ( ________ )`)].join("\n")));
  if (options.answers && sections.length) blocks.push(["[정답]", ...sections.map((section, index) => `${romans[index]}. ${section.items.map((entry, number) => `${number + 1}) ${entry.answer}`).join("  ")}`)].join("\n"));
  return blocks.join("\n\n");
}

/** 성조 듣기 카드로 쓸 음절입니다. 대표 글자로 소리를 냅니다. */
export const listeningCards = (selection: PinyinSelection) => selectedSyllables(selection).map(item => ({ marked: item.marked, base: item.base, tone: item.tone, char: item.char }));
export { markTone, splitTone };
