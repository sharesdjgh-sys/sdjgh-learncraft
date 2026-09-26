/* 과학 교과 도구(물리·화학·생명과학·지구과학)가 함께 쓰는 숫자 표기, 그래프 SVG, 학습지 HTML입니다. 모든 글은 escapeHtml을 거쳐 넣습니다. */
import { answerSection, clipboardWrap, escapeHtml, sheetHead, textHead, type SheetMode } from "@/features/language-sheet";

export { escapeHtml, seededRandom, shuffled, type SheetMode } from "@/features/language-sheet";

/** 소수 digits자리까지 반올림하고 끝의 0을 지웁니다. 음수는 인쇄에서 잘 보이게 −(U+2212)로 적습니다. */
export function num(value: number, digits = 2) {
  if (!Number.isFinite(value)) return "—";
  const rounded = Number(value.toFixed(digits));
  const text = (Object.is(rounded, -0) ? 0 : rounded).toString();
  return text.startsWith("-") ? `−${text.slice(1)}` : text;
}
/** 1234567 → 1,234,567 처럼 세 자리마다 쉼표를 넣습니다. */
export const grouped = (value: number, digits = 2) => num(value, digits).replace(/^(−?)(\d+)/, (_, sign: string, whole: string) => sign + whole.replace(/\B(?=(\d{3})+(?!\d))/g, ","));

export const gcd = (a: number, b: number): number => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
export const lcm = (a: number, b: number) => Math.abs(a * b) / gcd(a, b);
/** 9 : 3 : 3 : 1 처럼 가장 작은 정수비로 줄입니다. */
export function ratio(counts: number[]) {
  const divisor = counts.reduce((acc, count) => gcd(acc, count), 0) || 1;
  return counts.map(count => count / divisor);
}
export const fraction = (top: number, bottom: number) => { const d = gcd(top, bottom); return bottom / d === 1 ? String(top / d) : `${top / d}/${bottom / d}`; };

const SUB = "₀₁₂₃₄₅₆₇₈₉";
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
export const subDigits = (text: string) => text.replace(/\d/g, digit => SUB[Number(digit)]);
export const supDigits = (text: string) => text.replace(/\d/g, digit => SUP[Number(digit)]).replace(/\+/g, "⁺").replace(/-/g, "⁻");

/* ───── 그래프 ───── */

/** 눈금 간격을 1·2·5 × 10ⁿ 가운데 눈금이 maxTicks개를 넘지 않는 값으로 고릅니다. */
export function niceStep(range: number, maxTicks = 8) {
  if (!(range > 0)) return 1;
  const raw = range / maxTicks;
  const power = 10 ** Math.floor(Math.log10(raw));
  return ([1, 2, 5, 10].map(unit => unit * power).find(step => step >= raw - 1e-9)) ?? 10 * power;
}

export type PlotSeries = { points: [number, number][]; color?: string; dash?: boolean; width?: number; label?: string };
export type PlotOptions = {
  xLabel: string; yLabel: string;
  xMin?: number; xMax: number; yMin: number; yMax: number;
  xStep?: number; yStep?: number;
  series?: PlotSeries[];
  dots?: { at: [number, number]; label?: string; color?: string; shape?: "circle" | "square" | "triangle"; r?: number }[];
  /** 색을 채운 영역(예: P-V 그래프에서 한 일) */
  areas?: { points: [number, number][]; color: string }[];
  /** 오른쪽 위 범례 */
  legend?: { label: string; color: string; dash?: boolean }[];
  /** 좌표 변환 함수를 받아 SVG 조각을 더 그립니다(화살표·이름표 등). */
  extra?: (sx: (x: number) => number, sy: (y: number) => number) => string;
  width?: number; height?: number;
  /** 눈금 숫자를 빼고 격자만 그립니다(그래프 그리기 빈칸). */
  hideTicks?: boolean;
  title?: string;
};

/** 좌표평면 그래프를 SVG 문자열로 만듭니다. 화면과 인쇄가 같은 그림을 씁니다. */
export function plotSvg(options: PlotOptions) {
  const width = options.width ?? 360;
  const height = options.height ?? 240;
  // 선 끝에 이름표를 붙이면 오른쪽에 자리를 더 둡니다.
  const pad = { left: 46, right: options.series?.some(series => series.label) ? 92 : 30, top: options.title ? 30 : 18, bottom: 42 };
  const xMin = options.xMin ?? 0;
  const { xMax, yMin, yMax } = options;
  const xStep = options.xStep ?? niceStep(xMax - xMin);
  const yStep = options.yStep ?? niceStep(yMax - yMin, 6);
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const sx = (x: number) => pad.left + ((x - xMin) / (xMax - xMin || 1)) * plotW;
  const sy = (y: number) => pad.top + ((yMax - y) / (yMax - yMin || 1)) * plotH;
  const f = (value: number) => value.toFixed(1);
  const parts: string[] = [];
  parts.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="#fff"/>`);
  if (options.title) parts.push(`<text x="${width / 2}" y="16" text-anchor="middle" font-size="13" font-weight="700" fill="#111">${escapeHtml(options.title)}</text>`);
  for (const area of options.areas ?? []) parts.push(`<path d="${area.points.map(([x, y], index) => `${index ? "L" : "M"}${f(sx(x))} ${f(sy(y))}`).join(" ")} Z" fill="${area.color}" stroke="none"/>`);
  // 격자
  for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax + 1e-9; x += xStep) parts.push(`<line x1="${f(sx(x))}" y1="${pad.top}" x2="${f(sx(x))}" y2="${pad.top + plotH}" stroke="#e5e7eb" stroke-width="1"/>`);
  for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax + 1e-9; y += yStep) parts.push(`<line x1="${pad.left}" y1="${f(sy(y))}" x2="${pad.left + plotW}" y2="${f(sy(y))}" stroke="#e5e7eb" stroke-width="1"/>`);
  // 축: 가로축은 y=0에(범위 밖이면 아래쪽에), 세로축은 x=0에 둡니다.
  const axisY = yMin <= 0 && yMax >= 0 ? sy(0) : sy(yMin);
  const axisX = xMin <= 0 && xMax >= 0 ? sx(0) : sx(xMin);
  parts.push(`<line x1="${pad.left}" y1="${f(axisY)}" x2="${pad.left + plotW + 14}" y2="${f(axisY)}" stroke="#111" stroke-width="1.4"/>`);
  parts.push(`<path d="M${f(pad.left + plotW + 14)} ${f(axisY)} l-7 -3.5 v7 z" fill="#111"/>`);
  parts.push(`<line x1="${f(axisX)}" y1="${pad.top + plotH}" x2="${f(axisX)}" y2="${pad.top - 10}" stroke="#111" stroke-width="1.4"/>`);
  parts.push(`<path d="M${f(axisX)} ${pad.top - 10} l-3.5 7 h7 z" fill="#111"/>`);
  // 축 이름은 눈금 숫자 아래 줄에 적어 겹치지 않게 합니다.
  parts.push(`<text x="${pad.left + plotW + 16}" y="${f(axisY + 29)}" text-anchor="end" font-size="12" font-style="italic" fill="#111">${escapeHtml(options.xLabel)}</text>`);
  parts.push(`<text x="${f(axisX + 6)}" y="${pad.top - 4}" font-size="12" font-style="italic" fill="#111">${escapeHtml(options.yLabel)}</text>`);
  if (!options.hideTicks) {
    for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax + 1e-9; x += xStep) {
      if (Math.abs(x) < 1e-9) continue;
      parts.push(`<text x="${f(sx(x))}" y="${f(axisY + 14)}" text-anchor="middle" font-size="10.5" fill="#333">${num(x)}</text>`);
    }
    for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax + 1e-9; y += yStep) {
      if (Math.abs(y) < 1e-9) continue;
      parts.push(`<text x="${f(axisX - 5)}" y="${f(sy(y) + 3.5)}" text-anchor="end" font-size="10.5" fill="#333">${num(y)}</text>`);
    }
    parts.push(`<text x="${f(axisX - 5)}" y="${f(axisY + 14)}" text-anchor="end" font-size="10.5" fill="#333">0</text>`);
  }
  for (const series of options.series ?? []) {
    if (series.points.length < 2) continue;
    const d = series.points.map(([x, y], index) => `${index ? "L" : "M"}${f(sx(x))} ${f(sy(y))}`).join(" ");
    parts.push(`<path d="${d}" fill="none" stroke="${series.color ?? "#2563eb"}" stroke-width="${series.width ?? 2.2}" stroke-linejoin="round" stroke-linecap="round"${series.dash ? ` stroke-dasharray="5 4"` : ""}/>`);
    if (series.label) {
      const [x, y] = series.points[series.points.length - 1];
      parts.push(`<text x="${f(sx(x) + 4)}" y="${f(sy(y) - 4)}" font-size="11" font-weight="700" fill="${series.color ?? "#2563eb"}">${escapeHtml(series.label)}</text>`);
    }
  }
  for (const dot of options.dots ?? []) {
    const [cx, cy, r, color] = [sx(dot.at[0]), sy(dot.at[1]), dot.r ?? 3, dot.color ?? "#111"];
    if (dot.shape === "square") parts.push(`<rect x="${f(cx - r)}" y="${f(cy - r)}" width="${f(r * 2)}" height="${f(r * 2)}" fill="${color}"/>`);
    else if (dot.shape === "triangle") parts.push(`<path d="M${f(cx)} ${f(cy - r * 1.2)} L${f(cx + r * 1.1)} ${f(cy + r * 0.8)} L${f(cx - r * 1.1)} ${f(cy + r * 0.8)} Z" fill="${color}"/>`);
    else parts.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${r}" fill="${color}"/>`);
    if (dot.label) parts.push(`<text x="${f(sx(dot.at[0]) + 5)}" y="${f(sy(dot.at[1]) - 5)}" font-size="10.5" fill="#111">${escapeHtml(dot.label)}</text>`);
  }
  if (options.extra) parts.push(options.extra(sx, sy));
  (options.legend ?? []).forEach((item, index) => {
    const y = pad.top + 4 + index * 15;
    parts.push(`<line x1="${width - pad.right - 96}" y1="${y}" x2="${width - pad.right - 78}" y2="${y}" stroke="${item.color}" stroke-width="2.4"${item.dash ? ` stroke-dasharray="4 3"` : ""}/><text x="${width - pad.right - 74}" y="${y + 4}" font-size="10.5" fill="#111">${escapeHtml(item.label)}</text>`);
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="max-width:100%;height:auto;font-family:'Malgun Gothic',sans-serif">${parts.join("")}</svg>`;
}

/** SVG 문자열의 겉을 씌웁니다. */
export const svgWrap = (width: number, height: number, body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="max-width:100%;height:auto;font-family:'Malgun Gothic',sans-serif"><rect width="${width}" height="${height}" fill="#fff"/>${body}</svg>`;
/** 화살촉이 있는 선입니다. */
export function arrowSvg(x1: number, y1: number, x2: number, y2: number, color = "#111", width = 2, dash = false) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 8;
  const a1 = angle + Math.PI * 0.85;
  const a2 = angle - Math.PI * 0.85;
  const f = (value: number) => value.toFixed(1);
  return `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2 - Math.cos(angle) * 2)}" y2="${f(y2 - Math.sin(angle) * 2)}" stroke="${color}" stroke-width="${width}"${dash ? ` stroke-dasharray="5 4"` : ""}/><path d="M${f(x2)} ${f(y2)} L${f(x2 + head * Math.cos(a1))} ${f(y2 + head * Math.sin(a1))} L${f(x2 + head * Math.cos(a2))} ${f(y2 + head * Math.sin(a2))} Z" fill="${color}"/>`;
}
export const svgText = (x: number, y: number, text: string, options: { size?: number; anchor?: "start" | "middle" | "end"; color?: string; weight?: number; italic?: boolean } = {}) =>
  `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${options.size ?? 12}" text-anchor="${options.anchor ?? "start"}" fill="${options.color ?? "#111"}"${options.weight ? ` font-weight="${options.weight}"` : ""}${options.italic ? ` font-style="italic"` : ""}>${escapeHtml(text)}</text>`;

/* ───── 학습지 ───── */

export type SheetProblem = {
  /** 문제 HTML(이스케이프한 조각)과 한글에 붙여 넣을 글 */
  html: string; text: string;
  answerHtml: string; answerText: string;
  /** 문제·정답에 붙는 그림(SVG). 한글에 붙여 넣는 복사에는 넣지 않습니다. */
  figure?: string; answerFigure?: string;
  /** 그림 아래에 붙는 HTML(예: 회로도 아래의 빈 표) */
  after?: string;
  /** 풀이 칸 높이(mm) */
  space?: number;
};
export type SheetSection = { heading: string; problems: SheetProblem[]; intro?: { html: string; text: string; figure?: string } };
export type SheetOptions = { title: string; answers: boolean; intro?: string };

const figureBox = (svg: string, mode: SheetMode) => mode === "screen" ? `<div style="margin:2mm 0 1mm">${svg}</div>` : `<p style="margin:1mm 0;color:#666;font-size:9.5pt">[그림은 인쇄한 학습지를 보세요]</p>`;

/** 번호 매긴 문제 묶음을 A4 학습지 HTML로 만듭니다. 정답은 인쇄하면 새 쪽에서 시작합니다. */
export function problemSheetHtml(sections: SheetSection[], options: SheetOptions, mode: SheetMode) {
  let number = 0;
  const body = sections.map(section => {
    const items = section.problems.map(problem => {
      number += 1;
      return `<div style="margin:0 0 4mm;break-inside:avoid"><div>${number}. ${problem.html}</div>${problem.figure ? figureBox(problem.figure, mode) : ""}${problem.after ?? ""}${problem.space ? `<div style="height:${problem.space}mm"></div>` : ""}</div>`;
    }).join("");
    const intro = section.intro ? `<div style="margin:0 0 3mm;break-inside:avoid"><div>${section.intro.html}</div>${section.intro.figure ? figureBox(section.intro.figure, mode) : ""}</div>` : "";
    return `<h2 style="margin:5mm 0 2.5mm;font-size:12.5pt">${escapeHtml(section.heading)}</h2>${intro}${items}`;
  }).join("");
  number = 0;
  const answers = sections.map(section => section.problems.map(problem => {
    number += 1;
    return `<div style="margin:0 0 3mm;break-inside:avoid"><div>${number}. ${problem.answerHtml}</div>${problem.answerFigure ? figureBox(problem.answerFigure, mode) : ""}</div>`;
  }).join("")).join("");
  const intro = options.intro ? `<p style="margin:0 0 3mm;font-size:10pt;color:#333">${escapeHtml(options.intro)}</p>` : "";
  return clipboardWrap(sheetHead(options.title) + intro + body + (options.answers ? answerSection(answers, mode) : ""), mode);
}

export function problemSheetText(sections: SheetSection[], options: SheetOptions) {
  let number = 0;
  const lines = [...textHead(options.title), ""];
  if (options.intro) lines.push(options.intro, "");
  for (const section of sections) {
    lines.push(section.heading);
    if (section.intro) lines.push(section.intro.text);
    for (const problem of section.problems) { number += 1; lines.push(`${number}. ${problem.text}`); }
    lines.push("");
  }
  if (options.answers) {
    number = 0;
    lines.push("정답");
    for (const section of sections) for (const problem of section.problems) { number += 1; lines.push(`${number}. ${problem.answerText}`); }
  }
  return lines.join("\n");
}

/** 학습지 안의 표입니다. cells는 이미 이스케이프한 HTML입니다. */
export function sheetTable(head: string[], rows: string[][], options: { widths?: string[]; center?: boolean; font?: string } = {}) {
  const cell = (content: string, index: number, tag: "th" | "td") => `<${tag} style="border:1px solid #444;padding:1.4mm 2mm;${options.center === false ? "" : "text-align:center;"}${tag === "th" ? "background:#f1f1f1;" : ""}${options.widths?.[index] ? `width:${options.widths[index]};` : ""}">${content}</${tag}>`;
  return `<table style="border-collapse:collapse;width:100%;margin:1.5mm 0;font-size:${options.font ?? "10pt"}"><thead><tr>${head.map((h, i) => cell(h, i, "th")).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${row.map((c, i) => cell(c, i, "td")).join("")}</tr>`).join("")}</tbody></table>`;
}
export const blankLine = (width = "22mm") => `<span style="display:inline-block;min-width:${width};border-bottom:1px solid #333">&nbsp;</span>`;
