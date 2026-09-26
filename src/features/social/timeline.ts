/* 역사: 사건 연표(가로 SVG)와 빈칸 연표·순서 나열·‘(가)와 (나) 사이’ 문제입니다. 연도는 교과서에 나오는 확정된 연도만 싣고, 기원전은 음수로 적습니다. */
import { endYear, rowByKey, yearText, type RowKey } from "./dynasties";
import { circled, escapeHtml, ganada, jamo, objectParticle, problem, seededRandom, sheetTable, shuffled, svgWrap, type SheetProblem, type SheetSection } from "./sheet";

export type HistoryEvent = { name: string; year: number };
export type EventSet = { key: string; label: string; band: RowKey; events: HistoryEvent[] };

export const EVENT_SETS: EventSet[] = [
  {
    key: "korea-premodern", label: "한국사 전근대", band: "korea", events: [
      { name: "고조선 멸망", year: -108 },
      { name: "고구려 불교 수용", year: 372 },
      { name: "고구려 평양 천도", year: 427 },
      { name: "나제 동맹 성립", year: 433 },
      { name: "신라 불교 공인", year: 527 },
      { name: "대가야 멸망", year: 562 },
      { name: "살수 대첩", year: 612 },
      { name: "안시성 싸움", year: 645 },
      { name: "백제 멸망", year: 660 },
      { name: "고구려 멸망", year: 668 },
      { name: "신라의 삼국 통일(기벌포 전투)", year: 676 },
      { name: "발해 건국", year: 698 },
      { name: "청해진 설치", year: 828 },
      { name: "고려 건국", year: 918 },
      { name: "발해 멸망", year: 926 },
      { name: "고려의 후삼국 통일", year: 936 },
      { name: "노비안검법 실시", year: 956 },
      { name: "과거제 실시", year: 958 },
      { name: "서희의 외교 담판", year: 993 },
      { name: "귀주 대첩", year: 1019 },
      { name: "이자겸의 난", year: 1126 },
      { name: "묘청의 서경 천도 운동", year: 1135 },
      { name: "무신 정변", year: 1170 },
      { name: "몽골의 첫 침입", year: 1231 },
      { name: "위화도 회군", year: 1388 },
      { name: "조선 건국", year: 1392 },
      { name: "훈민정음 반포", year: 1446 },
      { name: "임진왜란", year: 1592 },
      { name: "병자호란", year: 1636 },
      { name: "균역법 실시", year: 1750 },
    ],
  },
  {
    key: "korea-modern", label: "한국사 근현대", band: "korea", events: [
      { name: "병인양요", year: 1866 },
      { name: "신미양요", year: 1871 },
      { name: "강화도 조약", year: 1876 },
      { name: "임오군란", year: 1882 },
      { name: "갑신정변", year: 1884 },
      { name: "동학 농민 운동", year: 1894 },
      { name: "을미사변", year: 1895 },
      { name: "아관 파천", year: 1896 },
      { name: "대한 제국 수립", year: 1897 },
      { name: "을사늑약", year: 1905 },
      { name: "국채 보상 운동", year: 1907 },
      { name: "국권 피탈", year: 1910 },
      { name: "3·1 운동", year: 1919 },
      { name: "청산리 대첩", year: 1920 },
      { name: "6·10 만세 운동", year: 1926 },
      { name: "신간회 창립", year: 1927 },
      { name: "광주 학생 항일 운동", year: 1929 },
      { name: "한국광복군 창설", year: 1940 },
      { name: "8·15 광복", year: 1945 },
      { name: "대한민국 정부 수립", year: 1948 },
      { name: "6·25 전쟁 발발", year: 1950 },
      { name: "정전 협정 체결", year: 1953 },
      { name: "4·19 혁명", year: 1960 },
      { name: "5·16 군사 정변", year: 1961 },
      { name: "7·4 남북 공동 성명", year: 1972 },
      { name: "5·18 민주화 운동", year: 1980 },
      { name: "6월 민주 항쟁", year: 1987 },
      { name: "남북한 유엔 동시 가입", year: 1991 },
      { name: "외환 위기", year: 1997 },
      { name: "6·15 남북 공동 선언", year: 2000 },
    ],
  },
  {
    key: "world", label: "세계사", band: "west", events: [
      { name: "알렉산드로스의 동방 원정", year: -334 },
      { name: "진의 중국 통일", year: -221 },
      { name: "로마 제정 시작(아우구스투스)", year: -27 },
      { name: "밀라노 칙령", year: 313 },
      { name: "서로마 제국 멸망", year: 476 },
      { name: "무함마드의 헤지라", year: 622 },
      { name: "카롤루스 대제 대관", year: 800 },
      { name: "십자군 전쟁 시작", year: 1096 },
      { name: "칭기즈 칸의 몽골 통일", year: 1206 },
      { name: "대헌장(마그나 카르타)", year: 1215 },
      { name: "비잔티움 제국 멸망", year: 1453 },
      { name: "콜럼버스의 아메리카 도착", year: 1492 },
      { name: "루터의 종교 개혁", year: 1517 },
      { name: "명예혁명", year: 1688 },
      { name: "미국 독립 선언", year: 1776 },
      { name: "프랑스 혁명", year: 1789 },
      { name: "아편 전쟁", year: 1840 },
      { name: "메이지 유신", year: 1868 },
      { name: "독일 제국 성립", year: 1871 },
      { name: "신해혁명", year: 1911 },
      { name: "제1차 세계 대전 발발", year: 1914 },
      { name: "러시아 혁명", year: 1917 },
      { name: "세계 대공황", year: 1929 },
      { name: "제2차 세계 대전 발발", year: 1939 },
      { name: "국제 연합(UN) 창설", year: 1945 },
      { name: "중화 인민 공화국 수립", year: 1949 },
      { name: "베를린 장벽 붕괴", year: 1989 },
      { name: "소련 해체", year: 1991 },
    ],
  },
  {
    key: "eastasia", label: "동아시아 교류·전쟁", band: "china", events: [
      { name: "백강 전투", year: 663 },
      { name: "안사의 난", year: 755 },
      { name: "여몽 연합군의 1차 일본 원정", year: 1274 },
      { name: "정화의 첫 원정", year: 1405 },
      { name: "임진왜란", year: 1592 },
      { name: "정유재란", year: 1597 },
      { name: "에도 막부 성립", year: 1603 },
      { name: "기유약조", year: 1609 },
      { name: "정묘호란", year: 1627 },
      { name: "병자호란", year: 1636 },
      { name: "청의 베이징 점령", year: 1644 },
      { name: "아편 전쟁", year: 1840 },
      { name: "미일 화친 조약", year: 1854 },
      { name: "메이지 유신", year: 1868 },
      { name: "강화도 조약", year: 1876 },
      { name: "청일 전쟁", year: 1894 },
      { name: "러일 전쟁", year: 1904 },
      { name: "신해혁명", year: 1911 },
      { name: "5·4 운동", year: 1919 },
      { name: "만주 사변", year: 1931 },
      { name: "중일 전쟁", year: 1937 },
      { name: "태평양 전쟁", year: 1941 },
      { name: "샌프란시스코 강화 조약", year: 1951 },
      { name: "한일 기본 조약", year: 1965 },
      { name: "중일 국교 정상화", year: 1972 },
      { name: "한중 수교", year: 1992 },
    ],
  },
];
export const eventSetByKey = (key: string) => EVENT_SETS.find(set => set.key === key);

/** 한글에 붙여 넣을 때 쓰는 표 글(칸은 | 로 나눔)입니다. */
export const tableText = (head: string[], rows: string[][]) => [head, ...rows].map(row => row.join(" | ")).join("\n");

const CIRCLED_HANGUL = "㉠㉡㉢㉣㉤㉥㉦㉧㉨㉩㉪㉫㉬㉭";
export const blankMark = (index: number) => CIRCLED_HANGUL[index] ?? `(${index + 1})`;
const sorted = (events: HistoryEvent[]) => [...events].sort((a, b) => a.year - b.year);

/* ───── 연표 그림 ───── */
export type TimelineOptions = {
  /** linear: 연도 비율대로, even: 사건마다 같은 간격 */
  scale: "linear" | "even";
  /** 아래에 그 지역 왕조·시대 띠를 깝니다. */
  band?: RowKey | null;
  /** 이름·연도를 빈칸 기호로 바꿀 사건 번호(정렬 뒤 순서) */
  blankNames?: Map<number, string>;
  blankYears?: Map<number, string>;
  width?: number;
};
/** 글자 폭 어림(한글·숫자 섞임) */
const textWidth = (text: string, size: number) => [...text].reduce((sum, char) => sum + (/[ㄱ-힣]/.test(char) ? size * 0.98 : size * 0.58), 0);

/** 가로 연표. 이름표는 위아래로 번갈아 두고, 겹치면 한 줄씩 더 떨어뜨립니다(줄 수에 맞춰 높이가 늘어납니다). */
export function timelineSvg(events: HistoryEvent[], options: TimelineOptions) {
  const list = sorted(events);
  const width = options.width ?? 860;
  if (!list.length) return svgWrap(width, 80, `<text x="${width / 2}" y="44" text-anchor="middle" font-size="13" fill="#666">사건을 더해 주세요.</text>`);
  const pad = 24;
  const maxLevels = 6; // 위아래 각각 쓸 수 있는 줄 수(넘치면 마지막 줄에 겹쳐 둡니다)
  const levelGap = 34;
  const first = list[0].year;
  const last = list[list.length - 1].year;
  const span = last - first || 1;
  const inner = width - 2 * pad - 100;
  const x = (index: number) => options.scale === "even" || list.length === 1
    ? pad + 50 + (list.length === 1 ? inner / 2 : (index / (list.length - 1)) * inner)
    : pad + 50 + ((list[index].year - first) / span) * inner;
  // 이름표 자리를 먼저 정합니다. 위(짝수)·아래(홀수)에서 같은 줄의 이름표와 겹치지 않는 가장 가까운 줄을 고릅니다.
  // 바깥 줄로 가는 줄기는 안쪽 이름표의 흰 바탕 뒤로 지나갑니다.
  type Side = "up" | "down";
  const boxes: Record<Side, [number, number][][]> = { up: [...Array(maxLevels)].map(() => []), down: [...Array(maxLevels)].map(() => []) };
  const free = (side: Side, level: number, x1: number, x2: number) => boxes[side][level].every(([a, b]) => x2 + 4 < a || x1 - 4 > b);
  const labels = list.map((event, index) => {
    const name = options.blankNames?.get(index) ?? event.name;
    const year = options.blankYears?.get(index) ?? yearText(event.year);
    const w = Math.max(textWidth(name, 11.5), textWidth(year, 10.5)) + 4;
    const cx = x(index);
    // 글자는 그림 안에 들어오게 가로로만 당깁니다(줄기와 점은 제자리).
    const tx = Math.min(Math.max(cx, w / 2 + 2), width - w / 2 - 2);
    const [x1, x2] = [tx - w / 2, tx + w / 2];
    const prefer: Side[] = index % 2 ? ["down", "up"] : ["up", "down"];
    let side: Side = prefer[0];
    let level = maxLevels - 1;
    search: for (let l = 0; l < maxLevels; l += 1) for (const s of prefer) if (free(s, l, x1, x2)) { side = s; level = l; break search; }
    boxes[side][level].push([x1, x2]);
    return { name, year, cx, tx, w, side, level };
  });
  const used = (side: Side) => Math.max(0, ...labels.filter(label => label.side === side).map(label => label.level + 1));
  const axisY = 12 + Math.max(1, used("up")) * levelGap;
  const bandRow = options.band && options.scale === "linear" ? rowByKey(options.band) : null;
  const bandItems = bandRow ? bandRow.items.filter(entry => endYear(entry) > first && entry.start < last) : [];
  const bandLanes = bandItems.length ? Math.max(...bandItems.map(item => item.lane)) + 1 : 0;
  const bandY = axisY + Math.max(1, used("down")) * levelGap + 8;
  const height = bandY + (bandLanes ? bandLanes * 20 + 6 : 0);
  const parts: string[] = [];
  parts.push(`<line x1="${pad}" y1="${axisY}" x2="${width - pad}" y2="${axisY}" stroke="#111" stroke-width="2"/><path d="M${width - pad} ${axisY} l-8 -4 v8 z" fill="#111"/>`);
  // 왕조 띠: 연도 비율(linear)일 때만 사건 구간에 맞춰 칸(lane)마다 한 줄씩 그립니다.
  if (bandRow) {
    const yearX = (year: number) => pad + 50 + ((Math.min(Math.max(year, first), last) - first) / span) * inner;
    for (const item of bandItems) {
      const x1 = yearX(item.start);
      const x2 = yearX(endYear(item));
      const y = bandY + item.lane * 20;
      parts.push(`<rect x="${x1.toFixed(1)}" y="${y}" width="${Math.max(x2 - x1, 1).toFixed(1)}" height="17" fill="${bandRow.color}" fill-opacity=".14" stroke="${bandRow.color}" stroke-width="1"${item.approx ? ` stroke-dasharray="4 3"` : ""}/>`);
      const name = item.name.replace(/\(.*\)/, "");
      if (textWidth(name, 10.5) + 6 < x2 - x1) parts.push(`<text x="${((x1 + x2) / 2).toFixed(1)}" y="${y + 12.5}" text-anchor="middle" font-size="10.5" fill="#111">${escapeHtml(name)}</text>`);
    }
  }
  const labelY = (side: Side, level: number) => side === "up" ? axisY - 14 - level * levelGap : axisY + 24 + level * levelGap;
  // 줄기를 먼저 모두 긋고, 그 위에 흰 바탕 이름표와 축 위의 점을 올립니다.
  for (const { cx, side, level } of labels) parts.push(`<line x1="${cx.toFixed(1)}" y1="${axisY}" x2="${cx.toFixed(1)}" y2="${(side === "up" ? labelY(side, level) + 4 : labelY(side, level) - 24).toFixed(1)}" stroke="#9ca3af" stroke-width="1"/>`);
  for (const { name, year, tx, w, side, level } of labels) {
    const y = labelY(side, level);
    parts.push(`<rect x="${(tx - w / 2).toFixed(1)}" y="${(y - 23).toFixed(1)}" width="${w.toFixed(1)}" height="28" fill="#fff"/>`);
    parts.push(`<text x="${tx.toFixed(1)}" y="${(y - 12).toFixed(1)}" text-anchor="middle" font-size="10.5" fill="#555">${escapeHtml(year)}</text>`);
    parts.push(`<text x="${tx.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#111">${escapeHtml(name)}</text>`);
  }
  for (const { cx } of labels) parts.push(`<circle cx="${cx.toFixed(1)}" cy="${axisY}" r="4" fill="#fff" stroke="#111" stroke-width="1.6"/>`);
  return svgWrap(width, height, parts.join(""));
}

/* ───── 문제 ───── */
export type TimelineAsk = "blankYear" | "blankName" | "order" | "between";
export const timelineAsks: Record<TimelineAsk, string> = { blankYear: "빈칸 연표(연도)", blankName: "빈칸 연표(사건)", order: "순서대로 나열", between: "(가)와 (나) 사이" };

/** 연도가 같은 사건은 순서를 물을 수 없으므로 한 해에 하나만 남깁니다. */
const distinctYears = (events: HistoryEvent[], random: () => number) => {
  const byYear = new Map<number, HistoryEvent[]>();
  for (const event of events) byYear.set(event.year, [...(byYear.get(event.year) ?? []), event]);
  return sorted([...byYear.values()].map(group => group[Math.floor(random() * group.length)]));
};

export function timelineProblems(asks: TimelineAsk[], perAsk: number, seed: number, events: HistoryEvent[], options: { band?: RowKey | null; scale: "linear" | "even" }): SheetSection[] {
  const random = seededRandom(seed * 53 + 7);
  // 섞기용 seed는 32비트 전체에서 골라, 이어서 섞은 결과끼리 닮지 않게 합니다.
  const nextSeed = () => Math.floor(random() * 4294967296);
  const list = sorted(events.filter(event => event.name.trim()));
  const sections: SheetSection[] = [];
  for (const kind of ["blankYear", "blankName"] as const) {
    if (!asks.includes(kind) || list.length < 2) continue;
    // 빈칸은 사건 가운데 perAsk×2개(최대 8)를 고릅니다.
    const count = Math.min(list.length, Math.max(2, Math.min(8, perAsk * 2)));
    const chosen = shuffled(list.map((_, index) => index), nextSeed()).slice(0, count).sort((a, b) => a - b);
    const marks = new Map(chosen.map((index, order) => [index, `( ${blankMark(order)} )`]));
    const figure = timelineSvg(list, { scale: options.scale, band: options.band, blankYears: kind === "blankYear" ? marks : undefined, blankNames: kind === "blankName" ? marks : undefined });
    const table = sheetTable(["연도", "사건"], list.map((event, index) => [
      kind === "blankYear" && marks.has(index) ? escapeHtml(marks.get(index)!) : escapeHtml(yearText(event.year)),
      kind === "blankName" && marks.has(index) ? escapeHtml(marks.get(index)!) : escapeHtml(event.name),
    ]), { widths: ["28%", "72%"], font: "9.5pt" });
    const what = kind === "blankYear" ? "연도" : "사건";
    sections.push({
      heading: `빈칸 연표 — ${what}`,
      intro: { html: `연표의 빈칸에 알맞은 ${objectParticle(what)} 쓰시오.`, text: `연표의 빈칸에 알맞은 ${objectParticle(what)} 쓰시오.`, figure },
      problems: [{ ...problem(`${table}`, chosen.map((index, order) => `${blankMark(order)} ${escapeHtml(kind === "blankYear" ? yearText(list[index].year) : list[index].name)}${kind === "blankYear" ? ` (${escapeHtml(list[index].name)})` : ` (${escapeHtml(yearText(list[index].year))})`}`).join("<br>")), text: tableText(["연도", "사건"], list.map((event, index) => [
        kind === "blankYear" && marks.has(index) ? marks.get(index)! : yearText(event.year),
        kind === "blankName" && marks.has(index) ? marks.get(index)! : event.name,
      ])) }],
    });
  }
  const others: SheetProblem[] = [];
  const seen = new Set<string>();
  const push = (made: SheetProblem | null) => { if (made && !seen.has(made.html)) { seen.add(made.html); others.push(made); return true; } return false; };
  if (asks.includes("order")) for (let index = 0, tries = 0; index < perAsk && tries < 40; tries += 1) if (push(order())) index += 1;
  if (asks.includes("between")) for (let index = 0, tries = 0; index < perAsk && tries < 40; tries += 1) if (push(between())) index += 1;
  if (others.length) sections.push({ heading: "사건의 순서", problems: others });
  return sections;

  function order(): SheetProblem | null {
    const pool = distinctYears(list, random);
    if (pool.length < 4) return null;
    const items = shuffled(pool, nextSeed()).slice(0, 4);
    const right = [...items].sort((a, b) => a.year - b.year).map(event => items.indexOf(event));
    // 오답 선택지는 정답 순서를 조금씩 바꿔 만듭니다.
    const perms = new Set<string>([right.join()]);
    for (let tries = 0; perms.size < 5 && tries < 50; tries += 1) perms.add(shuffled(right, nextSeed()).join());
    const choices = shuffled([...perms], nextSeed()).map(key => key.split(",").map(Number));
    const at = choices.findIndex(choice => choice.join() === right.join());
    const show = (choice: number[]) => choice.map(index => jamo(index)).join(" → ");
    return problem(
      `다음 사건을 일어난 순서대로 바르게 나열한 것은?<br>${items.map((event, i) => `${jamo(i)}. ${escapeHtml(event.name)}`).join("&nbsp;&nbsp; ")}<br>${choices.map((choice, i) => `${circled(i)} ${show(choice)}`).join("&nbsp;&nbsp; ")}`,
      `${circled(at)} ${show(right)} (${right.map(index => `${escapeHtml(items[index].name)} ${escapeHtml(yearText(items[index].year))}`).join(", ")})`,
      { space: 4 },
    );
  }
  function between(): SheetProblem | null {
    const pool = distinctYears(list, random);
    if (pool.length < 6) return null;
    const a = Math.floor(random() * (pool.length - 2));
    const b = a + 2 + Math.floor(random() * Math.min(4, pool.length - a - 2));
    const inside = pool.slice(a + 1, b);
    const outside = [...pool.slice(0, a), ...pool.slice(b + 1)];
    if (!inside.length || outside.length < 4) return null;
    const answer = inside[Math.floor(random() * inside.length)];
    const choices = shuffled([answer, ...shuffled(outside, nextSeed()).slice(0, 4)], nextSeed());
    const at = choices.indexOf(answer);
    return problem(
      `${ganada(0)} ${escapeHtml(pool[a].name)} → ${ganada(1)} ${escapeHtml(pool[b].name)}<br>${ganada(0)}와 ${ganada(1)} 사이 시기에 있었던 사건으로 옳은 것은?<br>${choices.map((event, i) => `${circled(i)} ${escapeHtml(event.name)}`).join("&nbsp;&nbsp; ")}`,
      `${circled(at)} ${escapeHtml(answer.name)} (${escapeHtml(yearText(answer.year))}) — ${ganada(0)} ${escapeHtml(yearText(pool[a].year))}, ${ganada(1)} ${escapeHtml(yearText(pool[b].year))}`,
      { space: 4 },
    );
  }
}
