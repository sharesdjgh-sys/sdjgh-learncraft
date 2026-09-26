/* 역학과 에너지: 힘의 합성·분해, 포물선 운동, 등속 원운동과 문제입니다. g = 10 m/s²로 계산합니다. */
import { arrowSvg, num, plotSvg, seededRandom, svgText, svgWrap, type SheetProblem, type SheetSection } from "./sheet";

export const G_EARTH = 10;
const rad = (degree: number) => (degree * Math.PI) / 180;

/* ───── 포물선 운동 ───── */
export type Launch = { speed: number; angle: number; height: number };
export function launch({ speed, angle, height }: Launch) {
  const vx = speed * Math.cos(rad(angle));
  const vy = speed * Math.sin(rad(angle));
  // y = h + vy t − g t²/2 = 0
  const time = (vy + Math.sqrt(vy * vy + 2 * G_EARTH * height)) / G_EARTH;
  const peakTime = Math.max(0, vy / G_EARTH);
  const peak = height + (vy > 0 ? (vy * vy) / (2 * G_EARTH) : 0);
  return { vx, vy, time, range: vx * time, peak, peakTime, impact: Math.hypot(vx, vy - G_EARTH * time) };
}
export function launchSvg(setup: Launch, options: { vectors?: boolean; compare?: Launch[] } = {}) {
  const all = [setup, ...(options.compare ?? [])];
  const results = all.map(launch);
  const xMax = Math.max(...results.map(result => result.range)) * 1.08 || 1;
  const yMax = Math.max(...results.map(result => result.peak)) * 1.2 || 1;
  const colors = ["#2563eb", "#dc2626", "#16a34a"];
  const series = all.map((item, index) => {
    const result = results[index];
    return { points: Array.from({ length: 81 }, (_, step) => { const t = (result.time * step) / 80; return [result.vx * t, item.height + result.vy * t - (G_EARTH * t * t) / 2] as [number, number]; }), color: colors[index], label: all.length > 1 ? `${item.angle}°` : undefined };
  });
  return plotSvg({
    xLabel: "수평 거리(m)", yLabel: "높이(m)", xMax, yMin: 0, yMax, series, width: 560, height: 300,
    extra: options.vectors === false ? undefined : (sx, sy) => {
      const result = results[0];
      const pieces: string[] = [];
      const scale = 60 / Math.max(setup.speed, 1);
      for (const fraction of [0, 0.25, 0.5, 0.75]) {
        const t = result.time * fraction;
        const x = result.vx * t;
        const y = setup.height + result.vy * t - (G_EARTH * t * t) / 2;
        const vy = result.vy - G_EARTH * t;
        pieces.push(arrowSvg(sx(x), sy(y), sx(x) + result.vx * scale, sy(y), "#16a34a", 1.6));
        if (Math.abs(vy) > 0.05) pieces.push(arrowSvg(sx(x), sy(y), sx(x), sy(y) - vy * scale, "#f59e0b", 1.6));
      }
      pieces.push(svgText(sx(xMax) - 4, sy(yMax) + 12, "초록: 수평 속도 · 주황: 연직 속도", { size: 10, anchor: "end", color: "#444" }));
      return pieces.join("");
    },
  });
}

/* ───── 등속 원운동 ───── */
export function circular(radius: number, speed: number, mass: number) {
  const period = (2 * Math.PI * radius) / speed;
  return { period, frequency: 1 / period, angular: speed / radius, acceleration: speed ** 2 / radius, force: (mass * speed ** 2) / radius };
}
export function circularSvg(radius: number) {
  const size = 260;
  const c = size / 2;
  const r = 90;
  const angle = -Math.PI / 5;
  const px = c + r * Math.cos(angle);
  const py = c + r * Math.sin(angle);
  return svgWrap(size, size, `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#94a3b8" stroke-dasharray="5 4"/><circle cx="${c}" cy="${c}" r="3" fill="#111"/>`
    + `<line x1="${c}" y1="${c}" x2="${px}" y2="${py}" stroke="#555"/>` + svgText((c + px) / 2 - 6, (c + py) / 2 + 16, `r = ${num(radius)} m`, { size: 11 })
    + `<circle cx="${px}" cy="${py}" r="8" fill="#2563eb"/>`
    + arrowSvg(px, py, px + 60 * Math.cos(angle + Math.PI / 2), py + 60 * Math.sin(angle + Math.PI / 2), "#16a34a", 2.2) + svgText(px + 64 * Math.cos(angle + Math.PI / 2) + 4, py + 64 * Math.sin(angle + Math.PI / 2), "v", { size: 12, italic: true, color: "#16a34a" })
    + arrowSvg(px, py, px - 50 * Math.cos(angle), py - 50 * Math.sin(angle), "#dc2626", 2.2) + svgText(px - 58 * Math.cos(angle), py - 58 * Math.sin(angle) - 6, "a, F(구심)", { size: 11, anchor: "middle", color: "#dc2626" }));
}

/* ───── 힘의 합성 ───── */
export type Force = { magnitude: number; angle: number };
export function resultant(forces: Force[]) {
  const x = forces.reduce((sum, force) => sum + force.magnitude * Math.cos(rad(force.angle)), 0);
  const y = forces.reduce((sum, force) => sum + force.magnitude * Math.sin(rad(force.angle)), 0);
  const magnitude = Math.hypot(x, y);
  return { x, y, magnitude, angle: magnitude < 1e-9 ? 0 : (Math.atan2(y, x) * 180) / Math.PI };
}
export function forcesSvg(forces: Force[], options: { resultant?: boolean; components?: boolean } = {}) {
  const size = 340;
  const c = size / 2;
  const result = resultant(forces);
  const max = Math.max(1, result.magnitude, ...forces.map(force => force.magnitude));
  const scale = 130 / max;
  const tip = (force: Force) => [c + force.magnitude * scale * Math.cos(rad(force.angle)), c - force.magnitude * scale * Math.sin(rad(force.angle))] as const;
  const colors = ["#2563eb", "#9333ea", "#0891b2", "#ea580c"];
  const parts: string[] = [`<line x1="10" y1="${c}" x2="${size - 10}" y2="${c}" stroke="#e5e7eb"/><line x1="${c}" y1="10" x2="${c}" y2="${size - 10}" stroke="#e5e7eb"/>`];
  forces.forEach((force, index) => {
    const [x, y] = tip(force);
    parts.push(arrowSvg(c, c, x, y, colors[index % colors.length], 2.4) + svgText(x + 6, y - 4, `F${index + 1} ${num(force.magnitude)} N`, { size: 11, color: colors[index % colors.length] }));
    if (options.components) parts.push(`<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x.toFixed(1)}" y2="${c}" stroke="${colors[index % colors.length]}" stroke-dasharray="3 3"/><line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${c}" y2="${y.toFixed(1)}" stroke="${colors[index % colors.length]}" stroke-dasharray="3 3"/>`);
  });
  if (forces.length === 2 && options.resultant !== false) {
    const [ax, ay] = tip(forces[0]);
    const [bx, by] = tip(forces[1]);
    const [rx, ry] = [ax + bx - c, ay + by - c];
    parts.push(`<line x1="${ax.toFixed(1)}" y1="${ay.toFixed(1)}" x2="${rx.toFixed(1)}" y2="${ry.toFixed(1)}" stroke="#94a3b8" stroke-dasharray="4 3"/><line x1="${bx.toFixed(1)}" y1="${by.toFixed(1)}" x2="${rx.toFixed(1)}" y2="${ry.toFixed(1)}" stroke="#94a3b8" stroke-dasharray="4 3"/>`);
  }
  if (options.resultant !== false && result.magnitude > 1e-9) {
    const [x, y] = tip({ magnitude: result.magnitude, angle: result.angle });
    parts.push(arrowSvg(c, c, x, y, "#dc2626", 3) + svgText(x + 6, y + 14, `합력 ${num(result.magnitude)} N`, { size: 11.5, weight: 700, color: "#dc2626" }));
  }
  return svgWrap(size, size, parts.join(""));
}

/* ───── 문제 ───── */
export type MotionAsk = "horizontal" | "angled" | "circular" | "vector";
export const motion2dAsks: Record<MotionAsk, string> = { horizontal: "수평으로 던진 운동", angled: "비스듬히 던진 운동", circular: "등속 원운동", vector: "힘의 합성" };

export function motion2dProblems(asks: MotionAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 41 + 13);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const problems: SheetProblem[] = [];
  const add = (html: string, answer: string, extra: Partial<SheetProblem> = {}) => problems.push({ html, text: html.replace(/<[^>]+>/g, ""), answerHtml: answer, answerText: answer.replace(/<[^>]+>/g, ""), space: 16, ...extra });
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "horizontal") {
      const height = pick([5, 20, 45, 80]); const speed = pick([5, 10, 15, 20]);
      const r = launch({ speed, angle: 0, height });
      add(`높이 ${height} m인 곳에서 물체를 수평 방향으로 ${speed} m/s의 속력으로 던졌다. 물체가 땅에 닿을 때까지 걸린 시간과 수평 이동 거리를 구하시오. (g = 10 m/s², 공기 저항 무시)`, `${num(r.time)} s, ${num(r.range)} m`);
    } else if (ask === "angled") {
      const [speed, angle] = pick([[20, 30], [20, 60], [10 * Math.SQRT2, 45], [20 * Math.SQRT2, 45], [40, 30]] as [number, number][]);
      const r = launch({ speed, angle, height: 0 });
      const speedText = Math.abs(speed - Math.round(speed)) > 1e-9 ? `${num(speed / Math.SQRT2)}√2` : num(speed);
      add(`수평면에서 물체를 수평면과 ${angle}°의 각으로 ${speedText} m/s의 속력으로 던졌다. 최고점 높이, 공중에 머문 시간, 수평 도달 거리를 구하시오. (g = 10 m/s²)`, `최고점 ${num(r.peak)} m, ${num(r.time)} s, 수평 거리 ${num(r.range)} m`, { figure: launchSvg({ speed, angle, height: 0 }, { vectors: false }) });
    } else if (ask === "circular") {
      const radius = pick([0.5, 1, 2, 4]); const speed = pick([2, 4, 6]); const mass = pick([0.5, 1, 2]);
      const r = circular(radius, speed, mass);
      add(`질량 ${mass} kg인 물체가 반지름 ${radius} m인 원을 따라 ${speed} m/s의 일정한 속력으로 운동한다. 구심 가속도와 구심력의 크기를 구하시오.`, `구심 가속도 ${num(r.acceleration)} m/s², 구심력 ${num(r.force)} N`);
    } else {
      const [a, b] = pick([[3, 4], [6, 8], [5, 12], [8, 15]] as [number, number][]);
      add(`한 물체에 크기 ${a} N인 힘과 ${b} N인 힘이 서로 수직으로 작용한다. 합력의 크기를 구하시오.`, `${num(Math.hypot(a, b))} N`, { figure: forcesSvg([{ magnitude: a, angle: 0 }, { magnitude: b, angle: 90 }], { resultant: false }), answerFigure: forcesSvg([{ magnitude: a, angle: 0 }, { magnitude: b, angle: 90 }]) });
    }
  }
  return [{ heading: "평면에서의 운동", problems }];
}
