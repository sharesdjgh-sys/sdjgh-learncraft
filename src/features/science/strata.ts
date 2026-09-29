/* 지구과학: 지층 단면도(퇴적·경사·단층·관입·부정합)를 만들고 생성 순서를 묻는 문제, 화성암 분류표입니다.
 * 그림은 사건을 시간 역순으로 되짚어 각 점이 어느 지층·암석인지 정하는 방식으로 그려, 늘 지질학적으로 맞는 단면이 나옵니다. */
import { escapeHtml, seededRandom, sheetTable, svgText, svgWrap, type SheetProblem, type SheetSection } from "./sheet";

export type Rock = "sandstone" | "shale" | "limestone" | "conglomerate";
export const ROCKS: Record<Rock, { name: string; color: string }> = {
  sandstone: { name: "사암", color: "#fde68a" }, shale: { name: "셰일", color: "#cbd5e1" }, limestone: { name: "석회암", color: "#bfdbfe" }, conglomerate: { name: "역암", color: "#fed7aa" },
};
type Deposit = { type: "deposit"; name: string; rock: Rock; top: number; fossil?: string };
type Tilt = { type: "tilt"; angle: number };
type Fault = { type: "fault"; name: string; bottom: number; topX: number; offset: number };
type Intrusion = { type: "intrusion"; name: string; center: number; width: number; height: number; lean: number };
type Erosion = { type: "erosion"; level: number; amplitude: number; phase: number };
export type StrataEvent = Deposit | Tilt | Fault | Intrusion | Erosion;

const W = 480;
const H = 300;
const CELL = 3;

type Unit = { key: string; name: string; fill: string; pattern: string };
function unitOf(event: Deposit | Intrusion): Unit {
  if (event.type === "intrusion") return { key: event.name, name: event.name, fill: "#fca5a5", pattern: "granite" };
  return { key: event.name, name: event.name, fill: ROCKS[event.rock].color, pattern: event.rock };
}
const erosionAt = (event: Erosion, x: number) => event.level + event.amplitude * Math.sin(x / 38 + event.phase) + event.amplitude * 0.5 * Math.sin(x / 13 + event.phase * 2);
const faultSide = (event: Fault, x: number, y: number) => {
  // 단층선 위쪽(상반)에 있으면 true
  const lineX = event.bottom + ((event.topX - event.bottom) * y) / H;
  const dipsLeft = event.topX > event.bottom;
  return dipsLeft ? x < lineX : x > lineX;
};
function insideIntrusion(event: Intrusion, x: number, y: number) {
  if (y > event.height || y < 0) return false;
  const center = event.center + event.lean * y + 6 * Math.sin(y / 17);
  const half = event.width / 2 + 4 * Math.sin(y / 9 + 1);
  const top = y > event.height - 20 ? (event.height - y) / 20 : 1;
  return Math.abs(x - center) <= half * Math.max(0.35, top);
}

/** (x, y) 자리(아래가 y = 0)의 암석을 찾습니다. */
export function unitAt(events: StrataEvent[], px: number, py: number): Deposit | Intrusion | null {
  let x = px;
  let y = py;
  // 각 퇴적층의 바닥(그 전 지표면)을 앞에서부터 구해 둡니다.
  const floors: ((x: number) => number)[] = [];
  let surface: (x: number) => number = () => 0;
  for (const event of events) {
    if (event.type === "deposit") { floors.push(surface); const top = event.top; surface = () => top; }
    else { floors.push(surface); if (event.type === "erosion") { const e = event; surface = (at: number) => erosionAt(e, at); } }
  }
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event.type === "deposit") {
      if (y > event.top) return null;
      if (y >= floors[index](x) || index === 0) return event;
    } else if (event.type === "intrusion") {
      if (insideIntrusion(event, x, y)) return event;
    } else if (event.type === "fault") {
      if (faultSide(event, x, y)) y += event.offset;
    } else if (event.type === "tilt") {
      const angle = (-event.angle * Math.PI) / 180;
      const [cx, cy] = [W / 2, H / 2];
      [x, y] = [cx + (x - cx) * Math.cos(angle) - (y - cy) * Math.sin(angle), cy + (x - cx) * Math.sin(angle) + (y - cy) * Math.cos(angle)];
    } else if (y > erosionAt(event, x)) return null;
  }
  return null;
}

const PATTERNS = `<defs>
<pattern id="st-sandstone" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="0.9" fill="#92400e"/><circle cx="6" cy="6" r="0.9" fill="#92400e"/></pattern>
<pattern id="st-shale" width="14" height="6" patternUnits="userSpaceOnUse"><line x1="1" y1="3" x2="9" y2="3" stroke="#475569" stroke-width="0.8"/></pattern>
<pattern id="st-limestone" width="16" height="10" patternUnits="userSpaceOnUse"><path d="M0 0 H16 M0 5 H16 M4 0 V5 M12 5 V10" stroke="#1d4ed8" stroke-width="0.6" fill="none"/></pattern>
<pattern id="st-conglomerate" width="12" height="10" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="2" fill="none" stroke="#9a3412" stroke-width="0.7"/><circle cx="9" cy="7" r="1.6" fill="none" stroke="#9a3412" stroke-width="0.7"/></pattern>
<pattern id="st-granite" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M3 1 V5 M1 3 H5 M8 6 V10 M6 8 H10" stroke="#991b1b" stroke-width="0.8"/></pattern>
</defs>`;

/** 단면도 SVG. labels가 false면 지층 이름을 빼고, reveal이면 사건 이름(단층·부정합)도 붙입니다. */
export function strataSvg(events: StrataEvent[], options: { labels?: boolean } = {}) {
  const cols = Math.ceil(W / CELL);
  const rows = Math.ceil(H / CELL);
  const grid: (Deposit | Intrusion | null)[][] = [];
  for (let row = 0; row < rows; row += 1) {
    const line: (Deposit | Intrusion | null)[] = [];
    for (let col = 0; col < cols; col += 1) line.push(unitAt(events, col * CELL + CELL / 2, H - (row * CELL + CELL / 2)));
    grid.push(line);
  }
  const parts: string[] = [PATTERNS];
  const cells = new Map<string, { sx: number; sy: number; count: number; unit: Unit }>();
  grid.forEach((line, row) => {
    let start = 0;
    for (let col = 1; col <= cols; col += 1) {
      if (col === cols || line[col] !== line[start]) {
        const found = line[start];
        if (found) {
          const unit = unitOf(found);
          const x = start * CELL;
          const width = (col - start) * CELL;
          parts.push(`<rect x="${x}" y="${row * CELL}" width="${width + 0.4}" height="${CELL + 0.4}" fill="${unit.fill}"/><rect x="${x}" y="${row * CELL}" width="${width + 0.4}" height="${CELL + 0.4}" fill="url(#st-${unit.pattern})"/>`);
          const entry = cells.get(unit.key) ?? { sx: 0, sy: 0, count: 0, unit };
          entry.sx += (x + width / 2) * (col - start); entry.sy += (row * CELL) * (col - start); entry.count += col - start;
          cells.set(unit.key, entry);
        }
        start = col;
      }
    }
  });
  // 경계선: 이웃 칸과 암석이 다르면 선을 긋습니다.
  const edges: string[] = [];
  for (let row = 0; row < rows; row += 1) for (let col = 0; col < cols; col += 1) {
    const here = grid[row][col];
    if (!here) continue;
    if (col + 1 < cols && grid[row][col + 1] !== here && grid[row][col + 1]) edges.push(`M${(col + 1) * CELL} ${row * CELL} v${CELL}`);
    if (row + 1 < rows && grid[row + 1][col] !== here && grid[row + 1][col]) edges.push(`M${col * CELL} ${(row + 1) * CELL} h${CELL}`);
    if (row === 0 || !grid[row - 1][col]) edges.push(`M${col * CELL} ${row * CELL} h${CELL}`);
  }
  parts.push(`<path d="${edges.join(" ")}" stroke="#334155" stroke-width="0.9" fill="none"/>`);
  // 단층선(단층 뒤 부정합이 있으면 그 면 아래까지만)
  events.forEach((event, index) => {
    if (event.type !== "fault") return;
    const erosion = events.slice(index + 1).find((item): item is Erosion => item.type === "erosion");
    const lastDeposit = [...events.slice(0, index)].reverse().find((item): item is Deposit => item.type === "deposit");
    const limit = erosion ? erosion.level - erosion.amplitude * 1.5 : lastDeposit?.top ?? H;
    const x1 = event.bottom;
    const x2 = event.bottom + ((event.topX - event.bottom) * limit) / H;
    parts.push(`<line x1="${x1}" y1="${H}" x2="${x2.toFixed(1)}" y2="${(H - limit).toFixed(1)}" stroke="#111" stroke-width="2.2"/>`);
    parts.push(svgText(x1 + 6, H - 6, event.name, { size: 12, weight: 700 }) + svgText(x2 + 6, H - limit + 14, `${event.name}′`, { size: 12, weight: 700 }));
  });
  if (options.labels !== false) for (const entry of cells.values()) {
    const cx = entry.sx / entry.count;
    const cy = entry.sy / entry.count;
    // 무게 중심이 바깥이면 가장 가까운 자기 칸으로 옮깁니다.
    let [lx, ly] = [cx, cy];
    const at = grid[Math.min(rows - 1, Math.floor(cy / CELL))]?.[Math.min(cols - 1, Math.floor(cx / CELL))];
    if (!at || unitOf(at).key !== entry.unit.key) {
      let best = Infinity;
      grid.forEach((line, row) => line.forEach((cell, col) => { if (cell && unitOf(cell).key === entry.unit.key) { const d = (col * CELL - cx) ** 2 + (row * CELL - cy) ** 2; if (d < best) { best = d; [lx, ly] = [col * CELL, row * CELL]; } } }));
    }
    parts.push(`<circle cx="${lx.toFixed(1)}" cy="${(ly + 2).toFixed(1)}" r="10" fill="#fff" stroke="#111"/>` + svgText(lx, ly + 7, entry.unit.name, { size: 12, anchor: "middle", weight: 700 }));
  }
  parts.push(`<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="none" stroke="#111"/>`);
  return svgWrap(W, H, parts.join(""));
}

/* ───── 무작위 단면 ───── */
export type StrataOptions = { tilt: boolean; fault: boolean; intrusion: boolean; unconformity: boolean; late: boolean };
export function randomStrata(random: () => number, options: StrataOptions): StrataEvent[] {
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const rocks = Object.keys(ROCKS) as Rock[];
  const letters = "ABCDEFGHIJK";
  let letter = 0;
  const events: StrataEvent[] = [];
  const lowerCount = options.unconformity ? 3 + Math.floor(random() * 2) : 5;
  let top = 0;
  const lowerTop = options.unconformity ? H * 0.95 : H;
  for (let index = 0; index < lowerCount; index += 1) {
    top += lowerTop / lowerCount;
    events.push({ type: "deposit", name: letters[letter++], rock: pick(rocks), top: Math.round(top) });
  }
  const igneous = ["F", "G"];
  let igneousIndex = 0;
  if (options.unconformity && options.tilt) events.push({ type: "tilt", angle: pick([-14, -10, 10, 14]) });
  if (options.fault) { const bottom = pick([170, 210, 250]); events.push({ type: "fault", name: "f", bottom, topX: bottom + pick([-90, -60, 60, 90]), offset: pick([-36, -28, 28, 36]) }); }
  if (options.intrusion) events.push({ type: "intrusion", name: igneous[igneousIndex++], center: pick([80, 120, 360, 400]), width: pick([34, 44]), height: options.unconformity ? H * 0.95 : H * 0.7, lean: pick([-0.15, 0, 0.15]) });
  if (options.unconformity) {
    const level = pick([150, 170]);
    events.push({ type: "erosion", level, amplitude: pick([5, 7]), phase: random() * 6 });
    const upper = 2 + Math.floor(random() * 2);
    let upperTop = level + 10;
    for (let index = 0; index < upper; index += 1) {
      upperTop += (H - level - 8) / upper;
      // 부정합 바로 위 첫 지층은 기저 역암으로 둡니다.
      events.push({ type: "deposit", name: letters[letter++], rock: index === 0 ? "conglomerate" : pick(rocks.filter(rock => rock !== "conglomerate")), top: Math.round(Math.min(H, upperTop)) });
    }
  }
  if (options.late) events.push({ type: "intrusion", name: igneous[igneousIndex++] ?? "H", center: pick([230, 280, 300]), width: 30, height: H * 0.8, lean: pick([-0.1, 0.1]) });
  // 이름표를 지층 A…, 화성암 F·G 순으로 다시 붙입니다(화성암 이름이 지층 이름과 겹치지 않게).
  const depositCount = events.filter(event => event.type === "deposit").length;
  let igneousLetter = depositCount;
  return events.map(event => event.type === "intrusion" ? { ...event, name: letters[igneousLetter++] } : event);
}

export function strataOrder(events: StrataEvent[]) {
  const words: string[] = [];
  events.forEach((event, index) => {
    if (event.type === "deposit") words.push(event.name);
    else if (event.type === "tilt") words.push("지층 기울어짐(습곡·경사)");
    else if (event.type === "fault") words.push(`단층 ${event.name}-${event.name}′`);
    else if (event.type === "intrusion") words.push(`${event.name} 관입`);
    else { words.push("융기·침식(부정합)"); if (events[index + 1]?.type === "deposit") words.push("침강"); }
  });
  return words;
}
export const faultKind = (event: Fault) => event.offset > 0 ? "정단층(상반이 내려감, 장력)" : "역단층(상반이 올라감, 횡압력)";

/* ───── 화성암 분류 ───── */
export const IGNEOUS = { fine: ["현무암", "안산암", "유문암"], coarse: ["반려암", "섬록암", "화강암"] };
export const igneousTableHtml = (blank = false) => sheetTable(["", "염기성암(SiO₂ 52% 이하)", "중성암", "산성암(SiO₂ 63% 이상)"], [
  ["화산암(빨리 식음, 세립질)", ...IGNEOUS.fine.map(name => blank ? "" : name)],
  ["심성암(천천히 식음, 조립질)", ...IGNEOUS.coarse.map(name => blank ? "" : name)],
  ["색", "어두움", "←", "밝음"], ["밀도", "큼", "←", "작음"],
]);

/* ───── 문제 ───── */
export function strataProblems(count: number, seed: number, options: StrataOptions, igneousTable: boolean): SheetSection[] {
  const random = seededRandom(seed * 113 + 5);
  const problems: SheetProblem[] = [];
  for (let index = 0; index < count; index += 1) {
    const events = randomStrata(random, options);
    const order = strataOrder(events);
    const fault = events.find((event): event is Fault => event.type === "fault");
    const units = events.filter(event => event.type === "deposit").map(event => (event as Deposit).name);
    const igneous = events.filter(event => event.type === "intrusion").map(event => (event as Intrusion).name);
    const extra = [fault ? `단층 ${fault.name}-${fault.name}′의 종류` : "", events.some(event => event.type === "erosion") ? `부정합의 종류` : ""].filter(Boolean);
    problems.push({
      html: `그림은 어느 지역의 지질 단면이다. 지층 ${units.join(", ")}${igneous.length ? `와 화성암 ${igneous.join(", ")}` : ""}${fault ? ", 단층" : ""}${events.some(event => event.type === "erosion") ? ", 부정합" : ""}의 생성 순서를 쓰시오.${extra.length ? ` 또 ${extra.join("와 ")}를 쓰시오.` : ""} (지층은 역전되지 않았다.)`,
      text: `지질 단면에서 지층 ${units.join(", ")}${igneous.length ? `, 화성암 ${igneous.join(", ")}` : ""}의 생성 순서를 쓰시오. (그림은 인쇄본 참고)`,
      figure: strataSvg(events), space: 16,
      answerHtml: `${escapeHtml(order.join(" → "))}${fault ? `<br>단층: ${faultKind(fault)}` : ""}${events.some(event => event.type === "erosion") ? `<br>부정합: ${events.some(event => event.type === "tilt") ? "경사 부정합(아래 지층이 기울어짐)" : "평행 부정합"}` : ""}`,
      answerText: `${order.join(" → ")}${fault ? ` / ${faultKind(fault)}` : ""}`,
    });
  }
  const sections: SheetSection[] = [{ heading: "지층의 생성 순서", problems }];
  if (igneousTable) sections.push({ heading: "화성암의 분류", problems: [{ html: `빈칸에 알맞은 화성암의 이름을 쓰시오.${igneousTableHtml(true).replace(/<td style="([^"]*)"><\/td>/g, '<td style="$1height:8mm"></td>')}`, text: "화성암 분류표의 빈칸을 채우시오.", answerHtml: igneousTableHtml(), answerText: `${IGNEOUS.fine.join(", ")} / ${IGNEOUS.coarse.join(", ")}` }] });
  return sections;
}
