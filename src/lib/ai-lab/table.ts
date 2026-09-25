import type { DataPoint } from "./ml";

/* 지도·비지도학습 체험의 데이터 표: 엑셀·구글 시트에서 복사한 글을 읽고, 표를 다시 엑셀로 붙일 글로 만듭니다. */

export type PastedRow = { x: number | null; y: number | null; label: number | null };
export type PasteResult = { rows: PastedRow[]; columns: number; skippedHeader: boolean; outOfRange: number; invalid: number };

/** 숫자 칸: 쉼표 천 단위·공백·전각 숫자를 정리하고, 비었거나 숫자가 아니면 null. */
export function parseNumber(text: string) {
  const cleaned = text.normalize("NFKC").trim().replace(/,(?=\d{3}\b)/g, "").replace(/\s+/g, "");
  if (!cleaned || !/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(cleaned)) return null;
  return Number(cleaned);
}

/** 표에 넣을 수 있는 값: 너무 큰 수(±100만 초과)만 막고, 축은 값에 맞춰 자동으로 정합니다. */
export const VALUE_LIMIT = 1_000_000;
export const inRange = (value: number) => Number.isFinite(value) && Math.abs(value) <= VALUE_LIMIT;

/** 무리 칸: ‘스팸 메일’처럼 이름, A·B·C, 1·2·3(첫째부터) 모두 알아듣습니다. */
export function parseLabel(text: string, classNames: readonly string[]) {
  const value = text.normalize("NFKC").trim();
  if (!value) return null;
  const byName = classNames.findIndex((name) => name.replace(/\s+/g, "") === value.replace(/\s+/g, ""));
  if (byName >= 0) return byName;
  const letter = "ABC".indexOf(value.toUpperCase());
  if (value.length === 1 && letter >= 0 && letter < classNames.length) return letter;
  const number = parseNumber(value);
  if (number !== null && Number.isInteger(number) && number >= 1 && number <= classNames.length) return number - 1;
  return null;
}

function splitCells(line: string) {
  if (line.includes("\t")) return line.split("\t");
  // 쉼표로 나뉜 CSV(숫자 속 소수점과 헷갈리지 않도록 쉼표만 나눕니다).
  if (line.includes(",")) return line.split(",");
  return line.trim().split(/\s+/);
}

/**
 * 붙여 넣은 글을 줄·칸으로 나눕니다. 첫 줄에 숫자가 없으면 머리글로 보고 건너뜁니다.
 * 두 칸 이상이면 x, y(, 무리) 순서, 한 칸이면 고른 열 하나만 채웁니다.
 */
export function parsePastedTable(text: string, classNames: readonly string[], withLabel: boolean): PasteResult {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").filter((line) => line.trim());
  let skippedHeader = false;
  const first = lines.length ? splitCells(lines[0]) : [];
  // 첫 줄의 앞 두 칸이 모두 숫자가 아니면(예: "공부 시간, 점수") 머리글로 봅니다.
  if (first.length && parseNumber(first[0] ?? "") === null && parseNumber(first[1] ?? "") === null) {
    lines.shift();
    skippedHeader = true;
  }
  let outOfRange = 0;
  let invalid = 0;
  let columns = 0;
  const rows = lines.map((line) => {
    const cells = splitCells(line).map((cell) => cell.trim());
    columns = Math.max(columns, cells.length);
    const read = (cell: string | undefined) => {
      if (cell === undefined || cell === "") return null;
      const value = parseNumber(cell);
      if (value === null) { invalid += 1; return null; }
      if (!inRange(value)) { outOfRange += 1; return null; }
      return Math.round(value * 10000) / 10000;
    };
    const label = withLabel && cells[2] !== undefined ? parseLabel(cells[2], classNames) : null;
    if (withLabel && cells[2] !== undefined && cells[2] !== "" && label === null) invalid += 1;
    return { x: read(cells[0]), y: read(cells[1]), label };
  });
  return { rows, columns, skippedHeader, outOfRange, invalid };
}

/** 붙여 넣은 줄을 start번째 줄부터 덮어쓰고, 모자라면 새 줄로 이어 붙입니다(엑셀처럼). */
export function applyPastedRows(points: DataPoint[], rows: PastedRow[], start: number, singleColumn: "x" | "y" | null, limit = 150) {
  const next = points.map((point) => ({ ...point }));
  let added = 0;
  let changed = 0;
  rows.forEach((row, offset) => {
    const index = start + offset;
    if (singleColumn) {
      const value = row.x;
      if (value === null || index >= next.length) return;
      next[index] = { ...next[index], [singleColumn]: value };
      changed += 1;
      return;
    }
    if (row.x === null || row.y === null) return;
    const label = row.label ?? next[index]?.label ?? 0;
    if (index < next.length) { next[index] = { x: row.x, y: row.y, label }; changed += 1; }
    else if (next.length < limit) { next.push({ x: row.x, y: row.y, label }); added += 1; }
  });
  return { points: next, added, changed };
}

/** 표 전체를 엑셀에 붙일 수 있는 탭 구분 글로 만듭니다. */
export function toTsv(points: DataPoint[], headers: string[], classNames: readonly string[] | null) {
  const lines = [headers.join("\t")];
  for (const point of points) {
    lines.push([point.x, point.y, ...(classNames ? [classNames[point.label] ?? ""] : [])].join("\t"));
  }
  return lines.join("\n");
}

/** CSV 파일(엑셀에서 한글이 깨지지 않도록 BOM을 붙임). */
export function toCsv(points: DataPoint[], headers: string[], classNames: readonly string[] | null) {
  const escape = (value: string | number) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [headers.map(escape).join(",")];
  for (const point of points) lines.push([point.x, point.y, ...(classNames ? [classNames[point.label] ?? ""] : [])].map(escape).join(","));
  return `﻿${lines.join("\r\n")}`;
}
