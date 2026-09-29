import { KANA_STROKES } from "@/data/kana-strokes";

/* 가나 획순 그림입니다. 획 경로는 KanjiVG(CC BY-SA 3.0)에서 옮긴 109×109 격자 좌표입니다. */

export type StrokeData = { paths: string[]; numbers: [number, number][] };

let table: Map<string, StrokeData> | null = null;
export function strokesOf(char: string): StrokeData | null {
  table ??= new Map(KANA_STROKES.split("\n").map(line => {
    const [char, numbers, ...paths] = line.split("|");
    return [char, { paths, numbers: numbers.split(";").map(pair => pair.split(",").map(Number) as [number, number]) }];
  }));
  return table.get(char) ?? null;
}

const svgOpen = (size: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 109 109" width="${size}" height="${size}" style="display:inline-block;vertical-align:middle">`;
const strokeGroup = (paths: string[], color: string, width: number) => paths.length
  ? `<g fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${paths.map(d => `<path d="${d}"/>`).join("")}</g>` : "";

/** 획마다 빨간 번호를 붙인 획순 그림입니다. 요음처럼 자료가 없는 글자면 빈 문자열입니다. */
export function strokeOrderSvg(char: string, size: string) {
  const data = strokesOf(char);
  if (!data) return "";
  const numbers = data.numbers.map(([x, y], index) => `<text x="${x}" y="${y}">${index + 1}</text>`).join("");
  return `${svgOpen(size)}${strokeGroup(data.paths, "#222", 4)}<g font-size="11" font-family="sans-serif" font-weight="700" fill="#d2402a">${numbers}</g></svg>`;
}

/** 한 획씩 더해 가는 그림 여러 개입니다. 지금 긋는 획은 검게, 앞서 그은 획은 연하게 그립니다. */
export function strokeStepsSvg(char: string, size: string) {
  const data = strokesOf(char);
  if (!data) return [];
  return data.paths.map((path, index) => `${svgOpen(size)}<rect x="1" y="1" width="107" height="107" fill="none" stroke="#bbb" stroke-width="1.5"/>`
    + strokeGroup(data.paths.slice(0, index), "#b8b8b8", 5) + strokeGroup([path], "#111", 6) + "</svg>");
}
