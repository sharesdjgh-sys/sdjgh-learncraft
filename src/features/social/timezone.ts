/* 지리: 경도와 표준시, 시차, 비행 도착 시각, 날짜 변경선 문제입니다. 서머타임(일광 절약 시간)은 넣지 않습니다. */
import { escapeHtml, num, particle, problem, seededRandom, svgText, svgWrap, type SheetSection } from "./sheet";

/** offset은 협정 세계시(UTC)와의 차(시간), longitude는 동경 +, 서경 −입니다. */
export type TimeCity = { id: string; name: string; longitude: number; offset: number };
export const TIME_CITIES: TimeCity[] = [
  { id: "seoul", name: "서울", longitude: 127.0, offset: 9 },
  { id: "tokyo", name: "도쿄", longitude: 139.7, offset: 9 },
  { id: "beijing", name: "베이징", longitude: 116.4, offset: 8 },
  { id: "delhi", name: "뉴델리", longitude: 77.2, offset: 5.5 },
  { id: "dubai", name: "두바이", longitude: 55.3, offset: 4 },
  { id: "moscow", name: "모스크바", longitude: 37.6, offset: 3 },
  { id: "cairo", name: "카이로", longitude: 31.2, offset: 2 },
  { id: "paris", name: "파리", longitude: 2.35, offset: 1 },
  { id: "london", name: "런던", longitude: -0.13, offset: 0 },
  { id: "saopaulo", name: "상파울루", longitude: -46.6, offset: -3 },
  { id: "newyork", name: "뉴욕", longitude: -74.0, offset: -5 },
  { id: "chicago", name: "시카고", longitude: -87.6, offset: -6 },
  { id: "la", name: "로스앤젤레스", longitude: -118.2, offset: -8 },
  { id: "honolulu", name: "호놀룰루", longitude: -157.9, offset: -10 },
  { id: "sydney", name: "시드니", longitude: 151.2, offset: 10 },
  { id: "auckland", name: "오클랜드", longitude: 174.8, offset: 12 },
];
export const cityById = (id: string) => TIME_CITIES.find(city => city.id === id) ?? TIME_CITIES[0];

/** 날짜·시각(분 단위)입니다. 연도는 2026년으로 고정해 달·날짜가 바뀌는 것만 셉니다. */
export type LocalTime = { month: number; day: number; hour: number; minute: number };
const YEAR = 2026;
const toUtc = (time: LocalTime, offset: number) => Date.UTC(YEAR, time.month - 1, time.day, time.hour, time.minute) - offset * 3600_000;
const fromUtc = (ms: number, offset: number): LocalTime => { const date = new Date(ms + offset * 3600_000); return { month: date.getUTCMonth() + 1, day: date.getUTCDate(), hour: date.getUTCHours(), minute: date.getUTCMinutes() }; };
/** from 도시의 현지 시각을 to 도시의 현지 시각으로 바꿉니다. hours만큼 지난 뒤(비행 시간)도 셀 수 있습니다. */
export const convertTime = (time: LocalTime, from: TimeCity, to: TimeCity, hours = 0) => fromUtc(toUtc(time, from.offset) + hours * 3600_000, to.offset);
/** 오전·오후로 적습니다(자정은 오전 0시, 정오는 오후 12시). */
export function timeText(time: LocalTime, withDate = true) {
  const pm = time.hour >= 12;
  const hour = time.hour % 12 === 0 && pm ? 12 : time.hour % 12;
  return `${withDate ? `${time.month}월 ${time.day}일 ` : ""}${pm ? "오후" : "오전"} ${hour}시${time.minute ? ` ${time.minute}분` : ""}`;
}
/** 시차(시간)를 “9시간 30분”처럼 적습니다. */
export function hoursText(hours: number) {
  const whole = Math.floor(Math.abs(hours));
  const minutes = Math.round((Math.abs(hours) - whole) * 60);
  return `${whole}시간${minutes ? ` ${minutes}분` : ""}`;
}
/** 표준 경선: 표준시 차 × 15° */
export const standardMeridian = (offset: number) => offset * 15;
/** UTC+9, UTC+5:30, UTC−3 */
export function offsetText(offset: number) {
  const whole = Math.floor(Math.abs(offset));
  const minutes = Math.round((Math.abs(offset) - whole) * 60);
  return `UTC${offset >= 0 ? "+" : "−"}${whole}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}`;
}
export const meridianText = (longitude: number) => longitude === 0 ? "본초 자오선(0°)" : `${longitude > 0 ? "동경" : "서경"} ${num(Math.abs(longitude), 1)}°`;

/** 경도 축 위에 시간대 띠와 도시를 놓은 그림입니다. base를 주면 각 도시의 현지 시각을 적습니다. */
export function timezoneSvg(cities: TimeCity[], options: { base?: { city: TimeCity; time: LocalTime }; width?: number } = {}) {
  const width = options.width ?? 760;
  const left = 20; const right = 20;
  const bandTop = 40; const bandH = 26;
  const plotW = width - left - right;
  const X = (longitude: number) => left + ((longitude + 180) / 360) * plotW;
  const sorted = [...cities].sort((a, b) => a.longitude - b.longitude);
  const rowsNeeded = 4;
  const rowH = options.base ? 30 : 18;
  const height = bandTop + bandH + 20 + rowsNeeded * rowH + 28;
  const f = (value: number) => value.toFixed(1);
  const parts: string[] = [];
  // 한 시간 띠(표준 경선 ±7.5°)를 번갈아 칠합니다.
  for (let zone = -12; zone <= 12; zone += 1) {
    const from = Math.max(-180, zone * 15 - 7.5);
    const to = Math.min(180, zone * 15 + 7.5);
    parts.push(`<rect x="${f(X(from))}" y="${bandTop}" width="${f(X(to) - X(from))}" height="${bandH}" fill="${zone % 2 === 0 ? "#e0e7ff" : "#f1f5f9"}"/>`);
    if (zone % 3 === 0) parts.push(svgText(X(zone * 15), bandTop + 17, zone === 0 ? "0" : `${zone > 0 ? "+" : "−"}${Math.abs(zone)}`, { size: 10, anchor: "middle", color: "#334155", weight: 700 }));
  }
  parts.push(svgText(left, bandTop - 8, "UTC와의 시차(시간)", { size: 10.5, color: "#334155", weight: 700 }));
  for (let longitude = -180; longitude <= 180; longitude += 30) {
    parts.push(`<line x1="${f(X(longitude))}" y1="${bandTop + bandH}" x2="${f(X(longitude))}" y2="${bandTop + bandH + 5}" stroke="#111"/>`);
    parts.push(svgText(X(longitude), bandTop + bandH + 16, longitude === 0 ? "0°" : `${Math.abs(longitude)}°${longitude > 0 ? "E" : "W"}`, { size: 9, anchor: "middle", color: "#555" }));
  }
  parts.push(`<line x1="${f(X(180))}" y1="${bandTop - 4}" x2="${f(X(180))}" y2="${height - 24}" stroke="#dc2626" stroke-width="1.6" stroke-dasharray="5 3"/>`);
  parts.push(`<line x1="${f(X(-180))}" y1="${bandTop - 4}" x2="${f(X(-180))}" y2="${height - 24}" stroke="#dc2626" stroke-width="1.6" stroke-dasharray="5 3"/>`);
  parts.push(svgText(width - right, height - 10, "날짜 변경선(대략 180° 경선)", { size: 10, anchor: "end", color: "#b91c1c" }));
  parts.push(svgText(left, height - 10, "← 서쪽(시각이 늦음)", { size: 10, color: "#555" }));
  parts.push(svgText(width / 2, height - 10, "동쪽(시각이 빠름) →", { size: 10, anchor: "middle", color: "#555" }));
  sorted.forEach((city, index) => {
    const row = index % rowsNeeded;
    const x = X(city.longitude);
    const y = bandTop + bandH + 30 + row * rowH;
    parts.push(`<line x1="${f(x)}" y1="${bandTop + bandH}" x2="${f(x)}" y2="${f(y - 9)}" stroke="#94a3b8" stroke-width=".8"/><circle cx="${f(x)}" cy="${bandTop + bandH}" r="3.2" fill="#111"/>`);
    const anchor = x < left + 40 ? "start" : x > width - right - 40 ? "end" : "middle";
    parts.push(svgText(x, y, city.name, { size: 10.5, anchor, weight: options.base?.city.id === city.id ? 800 : 600, color: options.base?.city.id === city.id ? "#1d4ed8" : "#111" }));
    if (options.base) parts.push(svgText(x, y + 12, timeText(convertTime(options.base.time, options.base.city, city)), { size: 9, anchor, color: "#475569" }));
  });
  return svgWrap(width, height, parts.join(""));
}

/* ───── 문제 ───── */
export type TimeAsk = "difference" | "local" | "flight" | "meridian";
export const timeAsks: Record<TimeAsk, string> = { difference: "두 도시의 시차", local: "현지 시각 구하기", flight: "비행 도착 시각", meridian: "표준 경선과 시차" };

export function timeProblems(asks: TimeAsk[], perAsk: number, seed: number, cities = TIME_CITIES): SheetSection[] {
  if (!asks.length || cities.length < 2) return [];
  const random = seededRandom(seed * 37 + 11);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const pair = () => { const a = pick(cities); let b = pick(cities); while (b.offset === a.offset) b = pick(cities); return [a, b] as const; };
  const moment = (): LocalTime => ({ month: pick([1, 3, 5, 8, 10, 12]), day: pick([1, 1, 15, 31, 28]), hour: pick([0, 3, 7, 9, 12, 15, 18, 21, 23]), minute: 0 });
  const safeMoment = () => { const time = moment(); const days = new Date(Date.UTC(YEAR, time.month, 0)).getUTCDate(); return { ...time, day: Math.min(time.day, days) }; };
  const sections: SheetSection[] = [];
  const meridianNote = (city: TimeCity) => `${escapeHtml(city.name)}(${offsetText(city.offset)}, 표준 경선 ${meridianText(standardMeridian(city.offset))})`;
  // 조사는 괄호 앞 도시 이름의 받침으로 고릅니다.
  const and = (city: TimeCity) => particle(city.name, "과", "와");
  const is = (city: TimeCity) => particle(city.name, "이", "가");
  for (const ask of asks) {
    const problems = [];
    for (let index = 0; index < perAsk; index += 1) {
      if (ask === "difference") {
        const [a, b] = pair();
        const diff = a.offset - b.offset;
        problems.push(problem(`${meridianNote(a)}${and(a)} ${meridianNote(b)}의 시차를 구하고, 어느 도시의 시각이 더 빠른지 쓰시오.`,
          `${hoursText(diff)}, ${escapeHtml((diff > 0 ? a : b).name)}${is(diff > 0 ? a : b)} 빠름 (표준 경선 차 ${num(Math.abs(standardMeridian(diff)), 1)}° ÷ 15°)`, { space: 10 }));
      } else if (ask === "local") {
        const [a, b] = pair();
        const time = safeMoment();
        const result = convertTime(time, a, b);
        problems.push(problem(`${meridianNote(a)}${is(a)} ${timeText(time)}일 때, ${meridianNote(b)}의 현지 날짜와 시각을 구하시오.`,
          `${timeText(result)} (시차 ${hoursText(b.offset - a.offset)}, ${b.offset > a.offset ? "더함" : "뺌"})`, { space: 12 }));
      } else if (ask === "flight") {
        const [a, b] = pair();
        const time = safeMoment();
        const hours = pick([2, 5, 8, 10, 11, 12, 14]);
        const result = convertTime(time, a, b, hours);
        problems.push(problem(`${meridianNote(a)}에서 현지 시각 ${timeText(time)}에 출발한 비행기가 ${hours}시간 뒤 ${meridianNote(b)}에 도착하였다. 도착한 곳의 현지 날짜와 시각을 구하시오.`,
          `${timeText(result)} (출발 시각을 ${escapeHtml(b.name)} 시각으로 바꾼 ${timeText(convertTime(time, a, b))}에 ${hours}시간을 더함)`, { space: 14 }));
      } else {
        const east = pick([15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165]);
        const west = pick([15, 45, 60, 75, 90, 120, 150]);
        problems.push(problem(`동경 ${east}°를 표준 경선으로 쓰는 A국과 서경 ${west}°를 표준 경선으로 쓰는 B국의 시차는 몇 시간인지 구하고, A국이 정오일 때 B국의 시각을 쓰시오.`,
          `${(east + west) / 15}시간 ((${east}° + ${west}°) ÷ 15°), B국은 ${timeText(convertTime({ month: 1, day: 2, hour: 12, minute: 0 }, { id: "a", name: "A", longitude: east, offset: east / 15 }, { id: "b", name: "B", longitude: -west, offset: -west / 15 }), false)}${(east + west) / 15 > 12 ? "(전날)" : ""}`, { space: 10 }));
      }
    }
    sections.push({ heading: timeAsks[ask], problems });
  }
  return sections;
}
