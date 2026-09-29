/* 국어 · 화법·작문·독서가 함께 쓰는 양식형 학습지(입론서·판정표·작문 계획서·탐구 계획서 등)입니다. 양식은 칸(글 상자·표·점검표·평가표)을 차례로 이어 만듭니다.
   빈칸은 학생이 쓰는 자리이고, 교사가 채운 글은 그대로 인쇄됩니다. 모든 글은 escapeHtml을 거쳐 넣습니다. */
import { clipboardWrap, sheetHead } from "@/features/language-sheet";
import { escapeHtml, type SheetMode } from "./sheet";

export type FormBlock =
  /** 제목이 있는 글 상자. text가 있으면 채워서, 없으면 height(mm)만큼 빈칸으로 */
  | { kind: "box"; title: string; text?: string; height: number; hint?: string }
  /** 표. rows의 빈 글은 학생이 쓰는 칸 */
  | { kind: "table"; title?: string; head: string[]; rows: string[][]; height?: number; widths?: string[] }
  /** 점검표(□ 항목) */
  | { kind: "check"; title: string; items: string[] }
  /** 평가표(기준 × 상·중·하 설명) */
  | { kind: "rubric"; title: string; items: { name: string; levels: [string, string, string] }[]; score?: boolean }
  /** 안내 글(굵은 테두리) */
  | { kind: "note"; text: string };

const cell = "border:1px solid #666;padding:1.6mm 2mm;vertical-align:top";
const head = `${cell};background:#f1f1f1;text-align:center;font-weight:700`;
const lines = (text: string) => escapeHtml(text).replace(/\n/g, "<br>");

function blockHtml(block: FormBlock) {
  if (block.kind === "note") return `<div style="margin:0 0 3mm;padding:2.5mm 3mm;border:1.5px solid #222;font-size:10.5pt">${lines(block.text)}</div>`;
  if (block.kind === "box") {
    const hint = block.hint ? `<span style="font-weight:400;font-size:9pt;color:#555"> ${escapeHtml(block.hint)}</span>` : "";
    return `<div style="margin:0 0 3mm;break-inside:avoid"><div style="font-weight:700;margin:0 0 1mm">${escapeHtml(block.title)}${hint}</div><div style="border:1px solid #666;padding:2mm 3mm;min-height:${block.height}mm">${block.text?.trim() ? lines(block.text) : ""}</div></div>`;
  }
  if (block.kind === "table") {
    const title = block.title ? `<div style="font-weight:700;margin:0 0 1mm">${escapeHtml(block.title)}</div>` : "";
    const th = block.head.map((text, index) => `<th style="${head}${block.widths?.[index] ? `;width:${block.widths[index]}` : ""}">${escapeHtml(text)}</th>`).join("");
    const rows = block.rows.map(row => `<tr>${row.map(text => `<td style="${cell};height:${block.height ?? 10}mm">${lines(text)}</td>`).join("")}</tr>`).join("");
    return `<div style="margin:0 0 3mm;break-inside:avoid">${title}<table style="border-collapse:collapse;width:100%;font-size:9.5pt"><tr>${th}</tr>${rows}</table></div>`;
  }
  if (block.kind === "check") {
    return `<div style="margin:0 0 3mm;break-inside:avoid"><div style="font-weight:700;margin:0 0 1mm">${escapeHtml(block.title)}</div><table style="border-collapse:collapse;width:100%;font-size:9.5pt"><tr><th style="${head}">점검 항목</th><th style="${head};width:14mm">예</th><th style="${head};width:14mm">아니요</th></tr>${block.items.map(item => `<tr><td style="${cell}">${escapeHtml(item)}</td><td style="${cell};text-align:center">□</td><td style="${cell};text-align:center">□</td></tr>`).join("")}</table></div>`;
  }
  const score = block.score ? `<th style="${head};width:14mm">점수</th>` : "";
  return `<div style="margin:0 0 3mm;break-inside:avoid"><div style="font-weight:700;margin:0 0 1mm">${escapeHtml(block.title)}</div><table style="border-collapse:collapse;width:100%;font-size:9pt"><tr><th style="${head}">기준</th><th style="${head}">상</th><th style="${head}">중</th><th style="${head}">하</th>${score}</tr>${block.items.map(item => `<tr><td style="${cell};font-weight:700;width:18%">${escapeHtml(item.name)}</td>${item.levels.map(level => `<td style="${cell}">${escapeHtml(level)}</td>`).join("")}${block.score ? `<td style="${cell}"></td>` : ""}</tr>`).join("")}</table></div>`;
}
function blockText(block: FormBlock) {
  if (block.kind === "note") return [block.text, ""];
  if (block.kind === "box") return [`${block.title}${block.hint ? ` (${block.hint})` : ""}`, block.text?.trim() ? block.text : "", ""];
  if (block.kind === "table") return [...(block.title ? [block.title] : []), block.head.join(" | "), ...block.rows.map(row => row.join(" | ")), ""];
  if (block.kind === "check") return [block.title, ...block.items.map(item => `□ ${item}`), ""];
  return [block.title, ...block.items.map(item => `${item.name} — 상: ${item.levels[0]} / 중: ${item.levels[1]} / 하: ${item.levels[2]}`), ""];
}

export type FormSheet = { title: string; blocks: FormBlock[] };
export function formSheetHtml(form: FormSheet, mode: SheetMode) {
  return clipboardWrap(sheetHead(form.title) + form.blocks.map(blockHtml).join(""), mode);
}
export function formSheetText(form: FormSheet) {
  return [form.title, "   학년    반    번  이름 ________________", "", ...form.blocks.flatMap(blockText)].join("\n");
}
/** 양식 여러 장을 한 번에 인쇄할 때 쪽을 나눕니다. */
export function formSheetsHtml(forms: FormSheet[], mode: SheetMode) {
  return clipboardWrap(forms.map((form, index) => `<section style="${index ? "break-before:page;" : ""}${index && mode === "screen" ? "margin-top:8mm;padding-top:6mm;border-top:1px dashed #999" : ""}">${sheetHead(form.title)}${form.blocks.map(blockHtml).join("")}</section>`).join(""), mode);
}
export const formSheetsText = (forms: FormSheet[]) => forms.map(formSheetText).join("\n\n");
/** 빈 행 n개 */
export const emptyRows = (columns: number, count: number) => Array.from({ length: count }, () => Array.from({ length: columns }, () => ""));
