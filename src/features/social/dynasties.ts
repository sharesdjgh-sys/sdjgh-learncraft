/* 역사: 한국·중국·일본·서양·서아시아·인도의 왕조·시대를 나란히 놓는 동시대 비교 연표와 문제입니다. 연도는 교과서가 쓰는 통설이고, 기원전은 음수로 적습니다. */
import { circled, escapeHtml, jamo, particle, problem, seededRandom, sheetTable, shuffled, svgWrap, type SheetProblem, type SheetSection } from "./sheet";

/** 연도는 쉼표 없이 “기원전 108년”, “1392년”처럼 적습니다. */
export const yearText = (year: number) => year < 0 ? `기원전 ${-year}년` : `${year}년`;

export type Dynasty = {
  name: string; start: number; end: number | null;
  /** 같은 줄 안에서 겹치는 나라를 아래칸에 그립니다. */
  lane: number;
  /** 시작 연도가 『삼국사기』 전승이거나 “무렵”인 것. 문제에는 쓰지 않습니다. */
  approx?: "legend" | "about";
  note?: string;
};
export type DynastyRow = { key: RowKey; label: string; color: string; items: Dynasty[] };
export type RowKey = "korea" | "china" | "japan" | "west" | "westasia" | "india";

/** 끝이 null이면 지금까지 이어집니다. */
export const PRESENT = 2026;

export const ROWS: DynastyRow[] = [
  {
    key: "korea", label: "한국", color: "#c2410c", items: [
      { name: "고조선", start: -2333, end: -108, lane: 0, approx: "legend", note: "건국 연도는 『삼국유사』·『동국통감』 전승, 기원전 108년 멸망" },
      { name: "고구려", start: -37, end: 668, lane: 0, approx: "legend", note: "건국 연도는 『삼국사기』 전승" },
      { name: "백제", start: -18, end: 660, lane: 1, approx: "legend", note: "건국 연도는 『삼국사기』 전승" },
      { name: "신라", start: -57, end: 935, lane: 2, approx: "legend", note: "건국 연도는 『삼국사기』 전승, 676년 삼국 통일" },
      { name: "발해", start: 698, end: 926, lane: 1 },
      { name: "고려", start: 918, end: 1392, lane: 0 },
      { name: "조선", start: 1392, end: 1897, lane: 0 },
      { name: "대한 제국", start: 1897, end: 1910, lane: 0 },
      { name: "일제 강점기", start: 1910, end: 1945, lane: 0 },
      { name: "대한민국", start: 1948, end: null, lane: 0 },
      { name: "북한", start: 1948, end: null, lane: 1, note: "조선민주주의인민공화국" },
    ],
  },
  {
    key: "china", label: "중국", color: "#b91c1c", items: [
      { name: "춘추 시대", start: -770, end: -403, lane: 0 },
      { name: "전국 시대", start: -403, end: -221, lane: 0 },
      { name: "진", start: -221, end: -206, lane: 0 },
      { name: "한", start: -202, end: 220, lane: 0, note: "전한·후한" },
      { name: "위진 남북조", start: 220, end: 589, lane: 0 },
      { name: "수", start: 581, end: 618, lane: 1 },
      { name: "당", start: 618, end: 907, lane: 0 },
      { name: "5대 10국", start: 907, end: 960, lane: 0 },
      { name: "요(거란)", start: 916, end: 1125, lane: 1 },
      { name: "송", start: 960, end: 1279, lane: 0, note: "1127년부터 남송" },
      { name: "금(여진)", start: 1115, end: 1234, lane: 2 },
      { name: "원", start: 1271, end: 1368, lane: 1, note: "1206년 몽골 제국 성립, 1271년 국호 원" },
      { name: "명", start: 1368, end: 1644, lane: 0 },
      { name: "청", start: 1636, end: 1912, lane: 1, note: "1616년 후금 건국, 1636년 국호 청, 1644년 베이징 점령" },
      { name: "중화민국", start: 1912, end: 1949, lane: 0, note: "1949년 이후 타이완" },
      { name: "중화 인민 공화국", start: 1949, end: null, lane: 0 },
    ],
  },
  {
    key: "japan", label: "일본", color: "#7c3aed", items: [
      { name: "야요이 시대", start: -300, end: 250, lane: 0, approx: "about", note: "기원전 3세기 무렵 ~ 3세기 무렵" },
      { name: "고훈 시대", start: 250, end: 592, lane: 0, approx: "about", note: "3세기 후반 무렵 ~ 6세기 말" },
      { name: "아스카 시대", start: 592, end: 710, lane: 0 },
      { name: "나라 시대", start: 710, end: 794, lane: 0 },
      { name: "헤이안 시대", start: 794, end: 1185, lane: 0 },
      { name: "가마쿠라 막부", start: 1185, end: 1333, lane: 0, note: "1192년으로 보기도 함" },
      { name: "무로마치 막부", start: 1336, end: 1573, lane: 0 },
      { name: "전국 시대", start: 1467, end: 1573, lane: 1, note: "오닌의 난(1467) 이후" },
      { name: "아즈치·모모야마 시대", start: 1573, end: 1603, lane: 0 },
      { name: "에도 막부", start: 1603, end: 1868, lane: 0 },
      { name: "메이지", start: 1868, end: 1912, lane: 0 },
      { name: "다이쇼", start: 1912, end: 1926, lane: 0 },
      { name: "쇼와", start: 1926, end: 1989, lane: 0 },
      { name: "헤이세이", start: 1989, end: 2019, lane: 0 },
      { name: "레이와", start: 2019, end: null, lane: 0 },
    ],
  },
  {
    key: "west", label: "서양", color: "#1d4ed8", items: [
      { name: "로마 공화정", start: -509, end: -27, lane: 0 },
      { name: "알렉산드로스 제국", start: -336, end: -323, lane: 1 },
      { name: "로마 제국", start: -27, end: 476, lane: 0, note: "395년 동서 분열, 476년 서로마 멸망" },
      { name: "비잔티움 제국", start: 395, end: 1453, lane: 1, note: "동로마 제국" },
      { name: "프랑크 왕국", start: 481, end: 843, lane: 0, note: "843년 베르됭 조약으로 나뉨" },
      { name: "신성 로마 제국", start: 962, end: 1806, lane: 0 },
      { name: "독일 제국", start: 1871, end: 1918, lane: 0 },
      { name: "미국", start: 1776, end: null, lane: 1, note: "1776년 독립 선언" },
    ],
  },
  {
    key: "westasia", label: "서아시아", color: "#047857", items: [
      { name: "아케메네스 왕조 페르시아", start: -550, end: -330, lane: 0 },
      { name: "파르티아", start: -247, end: 224, lane: 0 },
      { name: "사산 왕조 페르시아", start: 224, end: 651, lane: 0 },
      { name: "정통 칼리프 시대", start: 632, end: 661, lane: 1 },
      { name: "우마이야 왕조", start: 661, end: 750, lane: 0 },
      { name: "아바스 왕조", start: 750, end: 1258, lane: 0 },
      { name: "오스만 제국", start: 1299, end: 1922, lane: 0 },
      { name: "튀르키예 공화국", start: 1923, end: null, lane: 0 },
    ],
  },
  {
    key: "india", label: "인도", color: "#a16207", items: [
      { name: "마우리아 왕조", start: -322, end: -185, lane: 0, approx: "about", note: "기원전 322년 무렵 성립" },
      { name: "쿠샨 왕조", start: 30, end: 375, lane: 0, approx: "about", note: "1세기 무렵 ~ 3세기 무렵" },
      { name: "굽타 왕조", start: 320, end: 550, lane: 1, approx: "about", note: "320년 성립, 6세기 중엽 쇠퇴" },
      { name: "델리 술탄 왕조", start: 1206, end: 1526, lane: 0 },
      { name: "무굴 제국", start: 1526, end: 1857, lane: 0 },
      { name: "영국령 인도", start: 1858, end: 1947, lane: 0 },
      { name: "인도 공화국", start: 1947, end: null, lane: 0, note: "1947년 독립" },
    ],
  },
];
export const rowByKey = (key: RowKey) => ROWS.find(row => row.key === key)!;
export const endYear = (item: Dynasty) => item.end ?? PRESENT;
export const periodText = (item: Dynasty) => `${yearText(item.start)}${item.approx ? " 무렵" : ""} ~ ${item.end === null ? "현재" : yearText(item.end)}`;

/* ───── 막대 연표 ───── */
/** 눈금 간격: 보이는 구간이 길면 500년, 짧으면 50년까지 줄입니다. */
function tickStep(span: number) {
  return [50, 100, 200, 250, 500].find(step => span / step <= 12) ?? 500;
}
/** 이름을 막대 폭에 맞춰 적을 수 있는지 어림합니다(한글 한 자 ≈ 글자 크기). */
const fits = (text: string, width: number, size: number) => text.length * size * 0.95 + 6 <= width;

export function dynastySvg(rowKeys: RowKey[], from: number, to: number, options: { width?: number; mark?: number } = {}) {
  const width = options.width ?? 860;
  const left = 70;
  const right = 18;
  const top = 26;
  const laneHeight = 22;
  const gap = 12;
  const rows = rowKeys.map(rowByKey);
  const lanesOf = (row: DynastyRow) => Math.max(...row.items.filter(item => endYear(item) > from && item.start < to).map(item => item.lane), 0) + 1;
  const height = top + rows.reduce((sum, row) => sum + lanesOf(row) * laneHeight + gap, 0) + 30;
  const sx = (year: number) => left + ((Math.min(Math.max(year, from), to) - from) / (to - from || 1)) * (width - left - right);
  const parts: string[] = [];
  const step = tickStep(to - from);
  // 눈금선(기원전·기원후 경계는 진하게)
  for (let year = Math.ceil(from / step) * step; year <= to; year += step) {
    const x = sx(year).toFixed(1);
    parts.push(`<line x1="${x}" y1="${top - 6}" x2="${x}" y2="${height - 24}" stroke="${year === 0 ? "#9ca3af" : "#e5e7eb"}" stroke-width="1"/>`);
    parts.push(`<text x="${x}" y="${height - 10}" text-anchor="middle" font-size="10.5" fill="#333">${year < 0 ? `BC ${-year}` : year === 0 ? "1" : year}</text>`);
  }
  let y = top;
  for (const row of rows) {
    const lanes = lanesOf(row);
    parts.push(`<text x="${left - 8}" y="${(y + (lanes * laneHeight) / 2 + 4).toFixed(1)}" text-anchor="end" font-size="12.5" font-weight="700" fill="${row.color}">${escapeHtml(row.label)}</text>`);
    for (const item of row.items) {
      if (endYear(item) <= from || item.start >= to) continue;
      const x1 = sx(item.start);
      const x2 = sx(endYear(item));
      const barY = y + item.lane * laneHeight + 2;
      parts.push(`<rect x="${x1.toFixed(1)}" y="${barY.toFixed(1)}" width="${Math.max(x2 - x1, 1.5).toFixed(1)}" height="${laneHeight - 4}" rx="4" fill="${row.color}" fill-opacity="${0.16 + (item.lane % 2) * 0.08}" stroke="${row.color}" stroke-width="1"${item.approx ? ` stroke-dasharray="4 3"` : ""}/>`);
      const label = item.name.replace(/\(.*\)/, "");
      if (fits(label, x2 - x1, 11)) parts.push(`<text x="${((x1 + x2) / 2).toFixed(1)}" y="${(barY + laneHeight / 2 + 2).toFixed(1)}" text-anchor="middle" font-size="11" fill="#111">${escapeHtml(label)}</text>`);
      else if (fits(label.slice(0, 2), x2 - x1, 10)) parts.push(`<text x="${((x1 + x2) / 2).toFixed(1)}" y="${(barY + laneHeight / 2 + 2).toFixed(1)}" text-anchor="middle" font-size="10" fill="#111">${escapeHtml(label.slice(0, 2))}</text>`);
    }
    y += lanes * laneHeight + gap;
  }
  if (options.mark !== undefined && options.mark >= from && options.mark <= to) {
    const x = sx(options.mark).toFixed(1);
    parts.push(`<line x1="${x}" y1="${top - 12}" x2="${x}" y2="${height - 24}" stroke="#dc2626" stroke-width="1.6" stroke-dasharray="5 3"/><text x="${x}" y="${top - 14}" text-anchor="middle" font-size="11" font-weight="700" fill="#dc2626">${escapeHtml(yearText(options.mark))}</text>`);
  }
  return svgWrap(width, height, parts.join(""));
}

/** 그해에 있던 나라들입니다. */
export const aliveAt = (row: DynastyRow, year: number) => row.items.filter(item => item.start <= year && year < endYear(item));
/** 두 나라가 함께 있던 때가 있는지 봅니다. */
export const overlaps = (a: Dynasty, b: Dynasty) => a.start < endYear(b) && b.start < endYear(a);

/** 보이는 줄의 표(나라·기간·설명)입니다. */
export function dynastyTableHtml(rowKeys: RowKey[], from: number, to: number) {
  const rows = rowKeys.map(rowByKey).flatMap(row => row.items.filter(item => endYear(item) > from && item.start < to).map(item => [escapeHtml(row.label), escapeHtml(item.name), escapeHtml(periodText(item)), escapeHtml(item.note ?? "")]));
  return sheetTable(["지역", "나라·시대", "기간", "참고"], rows, { widths: ["12%", "24%", "30%", "34%"], font: "9.5pt" });
}

/* ───── 문제 ───── */
export type DynastyAsk = "founding" | "overlap" | "order";
export const dynastyAsks: Record<DynastyAsk, string> = { founding: "세워질 때 다른 지역의 나라", overlap: "같은 시기에 있던 나라", order: "나라가 들어선 순서" };

/** 문제에는 시작 연도가 확실하고 보이는 구간 안에 있는 나라만 씁니다. */
const sure = (item: Dynasty, from: number, to: number) => !item.approx && item.start >= from && item.start <= to;

export function dynastyProblems(asks: DynastyAsk[], perAsk: number, seed: number, rowKeys: RowKey[], from: number, to: number): SheetSection[] {
  const random = seededRandom(seed * 37 + 11);
  const nextSeed = () => Math.floor(random() * 4294967296);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const rows = rowKeys.map(rowByKey);
  const problems: SheetProblem[] = [];
  const seen = new Set<string>();
  for (const ask of asks) {
    for (let index = 0, tries = 0; index < perAsk && tries < 60; tries += 1) {
      const made = ask === "founding" ? founding() : ask === "overlap" ? overlap() : order();
      if (!made || seen.has(made.html)) continue;
      seen.add(made.html);
      problems.push(made);
      index += 1;
    }
  }
  return problems.length ? [{ heading: "동시대 비교", problems }] : [];

  function founding(): SheetProblem | null {
    if (rows.length < 2) return null;
    const [a, b] = shuffled(rows, nextSeed());
    const item = pick(a.items.filter(entry => sure(entry, from, to)));
    if (!item) return null;
    // 그해 다른 지역에 있던 나라가 하나뿐이고, 그 나라도 시작이 확실할 때만 냅니다.
    const alive = aliveAt(b, item.start);
    if (alive.length !== 1 || alive[0].approx) return null;
    const answer = alive[0];
    const others = shuffled(b.items.filter(entry => entry !== answer && entry.name !== answer.name), nextSeed()).slice(0, 4);
    if (others.length < 4) return null;
    const choices = shuffled([answer, ...others], nextSeed());
    const at = choices.indexOf(answer);
    return problem(
      `${escapeHtml(a.label)}에서 <b>${escapeHtml(item.name)}</b>${particle(item.name, "이", "가")} ${/(시대|막부|강점기)$/.test(item.name) ? "시작될" : "세워질"} 무렵 ${escapeHtml(b.label)}에 있던 나라(시대)로 옳은 것은?<br>${choices.map((choice, i) => `${circled(i)} ${escapeHtml(choice.name)}`).join("&nbsp;&nbsp; ")}`,
      `${circled(at)} ${escapeHtml(answer.name)} — ${escapeHtml(item.name)} ${escapeHtml(yearText(item.start))}, ${escapeHtml(answer.name)} ${escapeHtml(periodText(answer))}`,
      { space: 6 },
    );
  }
  function overlap(): SheetProblem | null {
    if (rows.length < 2) return null;
    const [a, b] = shuffled(rows, nextSeed());
    const target = pick(a.items.filter(entry => !entry.approx && entry.start >= from && endYear(entry) <= to + 200));
    if (!target) return null;
    const candidates = shuffled(b.items.filter(entry => !entry.approx), nextSeed()).slice(0, 4);
    if (candidates.length < 4) return null;
    const yes = candidates.filter(entry => overlaps(entry, target));
    if (!yes.length || yes.length === candidates.length) return null;
    return problem(
      `다음 중 ${escapeHtml(a.label)}의 <b>${escapeHtml(target.name)}</b>${particle(target.name, "과", "와")} 같은 시기에 있었던 적이 있는 ${escapeHtml(b.label)}의 나라(시대)를 모두 고르시오.<br>${candidates.map((entry, i) => `${jamo(i)}. ${escapeHtml(entry.name)}`).join("&nbsp;&nbsp; ")}`,
      `${yes.map(entry => jamo(candidates.indexOf(entry))).join(", ")} — ${escapeHtml(target.name)} ${escapeHtml(periodText(target))}; ${candidates.map(entry => `${escapeHtml(entry.name)} ${escapeHtml(periodText(entry))}`).join(", ")}`,
      { space: 6 },
    );
  }
  function order(): SheetProblem | null {
    const row = pick(rows);
    const items = shuffled(row.items.filter(entry => sure(entry, from, to)), nextSeed()).slice(0, 4);
    if (items.length < 3 || new Set(items.map(entry => entry.start)).size < items.length) return null;
    const sorted = [...items].sort((x, y) => x.start - y.start);
    return problem(
      `${escapeHtml(row.label)}에 들어선 나라(시대)를 먼저 들어선 것부터 차례대로 나열하시오.<br>${items.map((entry, i) => `${jamo(i)}. ${escapeHtml(entry.name)}`).join("&nbsp;&nbsp; ")}`,
      `${sorted.map(entry => jamo(items.indexOf(entry))).join(" → ")} (${sorted.map(entry => `${escapeHtml(entry.name)} ${escapeHtml(yearText(entry.start))}`).join(", ")})`,
      { space: 8 },
    );
  }
}
