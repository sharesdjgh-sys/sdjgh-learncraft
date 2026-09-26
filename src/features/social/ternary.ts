/* 지리: 세 항목의 구성비(합 100%)를 나타내는 삼각 그래프와 읽기·점 찍기 문제입니다. 예시 국가는 가상 자료입니다. */
import { escapeHtml, num, problem, seededRandom, sheetTable, svgText, svgWrap, type SheetSection } from "./sheet";

export type TernaryRow = { name: string; a: number; b: number; c: number };
export type TernaryPreset = { id: string; name: string; labels: [string, string, string]; rows: TernaryRow[] };
export const TERNARY_PRESETS: TernaryPreset[] = [
  { id: "industry", name: "산업별 취업자 구성", labels: ["1차 산업", "2차 산업", "3차 산업"], rows: [
    { name: "A국", a: 60, b: 15, c: 25 }, { name: "B국", a: 40, b: 25, c: 35 }, { name: "C국", a: 20, b: 35, c: 45 }, { name: "D국", a: 8, b: 30, c: 62 }, { name: "E국", a: 3, b: 20, c: 77 },
  ] },
  { id: "age", name: "연령층별 인구 구성", labels: ["유소년층(0~14세)", "청장년층(15~64세)", "노년층(65세 이상)"], rows: [
    { name: "A국", a: 42, b: 54, c: 4 }, { name: "B국", a: 30, b: 63, c: 7 }, { name: "C국", a: 18, b: 68, c: 14 }, { name: "D국", a: 12, b: 64, c: 24 }, { name: "E국", a: 15, b: 70, c: 15 },
  ] },
];

export const rowTotal = (row: TernaryRow) => row.a + row.b + row.c;
/** 합이 100에서 0.5 넘게 벗어나면 고쳐 달라고 알립니다. */
export const rowValid = (row: TernaryRow) => row.a >= 0 && row.b >= 0 && row.c >= 0 && Math.abs(rowTotal(row) - 100) <= 0.5;

/**
 * 삼각 그래프: 위 꼭짓점이 a 100%, 왼쪽 아래가 b 100%, 오른쪽 아래가 c 100%입니다.
 * a는 왼쪽 변(아래→위), b는 아랫변(오른쪽→왼쪽), c는 오른쪽 변(위→아래)에서 읽습니다.
 */
export function ternarySvg(labels: [string, string, string], rows: TernaryRow[], options: { width?: number; blank?: boolean; title?: string } = {}) {
  const width = options.width ?? 460;
  const side = width - 150;
  const h = (side * Math.sqrt(3)) / 2;
  const left = 75; const top = options.title ? 58 : 40;
  const height = top + h + 64;
  const A = [left + side / 2, top] as const;
  const B = [left, top + h] as const;
  const C = [left + side, top + h] as const;
  const point = (a: number, b: number, c: number) => { const total = a + b + c || 1; return [(a * A[0] + b * B[0] + c * C[0]) / total, (a * A[1] + b * B[1] + c * C[1]) / total] as const; };
  const f = (value: number) => value.toFixed(1);
  const line = (p: readonly [number, number], q: readonly [number, number], stroke: string, w = 0.8) => `<line x1="${f(p[0])}" y1="${f(p[1])}" x2="${f(q[0])}" y2="${f(q[1])}" stroke="${stroke}" stroke-width="${w}"/>`;
  const parts: string[] = [];
  if (options.title) parts.push(svgText(width / 2, 20, options.title, { size: 12.5, anchor: "middle", weight: 700 }));
  const colors = ["#15803d", "#b45309", "#1d4ed8"];
  for (let value = 10; value < 100; value += 10) {
    const rest = 100 - value;
    const major = value % 20 === 0;
    // a 일정(가로선), b 일정(AC와 나란한 선), c 일정(AB와 나란한 선)
    parts.push(line(point(value, rest, 0), point(value, 0, rest), major ? "#bbf7d0" : "#e5e7eb"));
    parts.push(line(point(rest, value, 0), point(0, value, rest), major ? "#fde68a" : "#e5e7eb"));
    parts.push(line(point(rest, 0, value), point(0, rest, value), major ? "#bfdbfe" : "#e5e7eb"));
    if (!options.blank || major) {
      const [ax, ay] = point(value, rest, 0);
      parts.push(svgText(ax - 6, ay + 3.5, String(value), { size: 9.5, anchor: "end", color: colors[0] }));
      const [bx, by] = point(0, value, rest);
      parts.push(svgText(bx, by + 14, String(value), { size: 9.5, anchor: "middle", color: colors[1] }));
      const [cx, cy] = point(rest, 0, value);
      parts.push(svgText(cx + 6, cy + 3.5, String(value), { size: 9.5, color: colors[2] }));
    }
  }
  parts.push(`<path d="M${f(A[0])} ${f(A[1])}L${f(B[0])} ${f(B[1])}L${f(C[0])} ${f(C[1])}Z" fill="none" stroke="#111" stroke-width="1.5"/>`);
  // 축 이름과 읽는 방향(화살표 쪽으로 값이 커짐)
  parts.push(svgText((A[0] + B[0]) / 2 - 30, (A[1] + B[1]) / 2 - 6, `${labels[0]} ↑`, { size: 11, anchor: "end", color: colors[0], weight: 700 }));
  parts.push(svgText((B[0] + C[0]) / 2, B[1] + 32, `← ${labels[1]}`, { size: 11, anchor: "middle", color: colors[1], weight: 700 }));
  parts.push(svgText((A[0] + C[0]) / 2 + 30, (A[1] + C[1]) / 2 - 6, `${labels[2]} ↓`, { size: 11, color: colors[2], weight: 700 }));
  parts.push(svgText(width / 2, height - 8, "(단위: %) 화살표 쪽으로 값이 커져요", { size: 9.5, anchor: "middle", color: "#555" }));
  if (!options.blank) rows.filter(rowValid).forEach(row => {
    const [x, y] = point(row.a, row.b, row.c);
    parts.push(`<circle cx="${f(x)}" cy="${f(y)}" r="4" fill="#dc2626" stroke="#fff" stroke-width="1.2"/>` + svgText(x + 6, y - 5, row.name, { size: 11, weight: 800 }));
  });
  return svgWrap(width, height, parts.join(""));
}

export function ternaryTableHtml(labels: [string, string, string], rows: TernaryRow[]) {
  return sheetTable(["구분", ...labels.map(escapeHtml)], rows.map(row => [escapeHtml(row.name), num(row.a, 1), num(row.b, 1), num(row.c, 1)]));
}

/* ───── 문제 ───── */
export type TernaryAsk = "read" | "plot";
export const ternaryAsks: Record<TernaryAsk, string> = { read: "그래프 읽기", plot: "점 찍기" };

/** 5의 배수로 합이 100인 가상 자료를 만듭니다. */
function randomRows(random: () => number, count: number): TernaryRow[] {
  return [...Array(count).keys()].map(index => {
    const a = 5 * (1 + Math.floor(random() * 14));
    const b = 5 * (1 + Math.floor(random() * (19 - a / 5 - 1)));
    return { name: `${String.fromCharCode(65 + index)}`, a, b, c: 100 - a - b };
  });
}

export function ternaryProblems(asks: TernaryAsk[], count: number, seed: number, preset: TernaryPreset = TERNARY_PRESETS[0]): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 71 + 13);
  const sections: SheetSection[] = [];
  for (const ask of asks) {
    const rows = randomRows(random, Math.max(2, Math.min(6, count + 1)));
    if (ask === "read") {
      const problems = rows.slice(0, count).map(row => problem(`그래프에서 ${row.name} 지역의 ${escapeHtml(preset.labels.join(", "))} 비율을 차례로 읽으시오.`,
        `${row.name}: ${escapeHtml(preset.labels[0])} ${row.a}%, ${escapeHtml(preset.labels[1])} ${row.b}%, ${escapeHtml(preset.labels[2])} ${row.c}% (합 100%)`, { space: 6 }));
      sections.push({ heading: `${ternaryAsks.read} — ${preset.name}`, intro: { html: "다음 삼각 그래프를 보고 물음에 답하시오.", text: "다음 삼각 그래프를 보고 물음에 답하시오.", figure: ternarySvg(preset.labels, rows, { width: 440 }) }, problems });
    } else {
      sections.push({ heading: `${ternaryAsks.plot} — ${preset.name}`, problems: [problem(`다음 표의 지역을 삼각 그래프에 점으로 나타내시오.${ternaryTableHtml(preset.labels, rows.slice(0, count))}`,
        "그림과 같음", { figure: ternarySvg(preset.labels, [], { width: 440, blank: true }), answerFigure: ternarySvg(preset.labels, rows.slice(0, count), { width: 440 }) })] });
    }
  }
  return sections;
}
