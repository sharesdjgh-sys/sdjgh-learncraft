/* 물리학: 1차원 충돌(운동량 보존, 반발 계수)과 충격량(F-t 그래프 넓이), 문제입니다. */
import { arrowSvg, num, plotSvg, seededRandom, svgText, svgWrap, type SheetProblem, type SheetSection } from "./sheet";

export type Collision = { m1: number; v1: number; m2: number; v2: number; e: number };
/** 반발 계수 e(1: 탄성, 0: 완전 비탄성)로 충돌 뒤 속도를 구합니다. 오른쪽이 +입니다. */
export function collide({ m1, v1, m2, v2, e }: Collision) {
  const total = m1 * v1 + m2 * v2;
  const after1 = (total - m2 * e * (v1 - v2)) / (m1 + m2);
  const after2 = (total + m1 * e * (v1 - v2)) / (m1 + m2);
  const before = 0.5 * m1 * v1 ** 2 + 0.5 * m2 * v2 ** 2;
  const after = 0.5 * m1 * after1 ** 2 + 0.5 * m2 * after2 ** 2;
  return { after1, after2, momentum: total, kineticBefore: before, kineticAfter: after, loss: before - after, impulse1: m1 * (after1 - v1) };
}

/** 충돌 전·후 두 물체와 속도 화살표 그림입니다. */
export function collisionSvg(collision: Collision) {
  const result = collide(collision);
  const width = 560;
  const height = 230;
  const maxV = Math.max(1, ...[collision.v1, collision.v2, result.after1, result.after2].map(Math.abs));
  const scale = 70 / maxV;
  const cart = (x: number, y: number, mass: number, label: string, color: string, v: number) => {
    const w = 38 + Math.min(40, mass * 6);
    return `<rect x="${x - w / 2}" y="${y - 30}" width="${w}" height="30" rx="4" fill="${color}" stroke="#111"/><circle cx="${x - w / 3}" cy="${y + 4}" r="5" fill="#333"/><circle cx="${x + w / 3}" cy="${y + 4}" r="5" fill="#333"/>`
      + svgText(x, y - 11, `${label} ${num(mass)} kg`, { size: 11, anchor: "middle", weight: 700 })
      + (Math.abs(v) > 1e-9 ? arrowSvg(x, y - 44, x + v * scale, y - 44, "#dc2626", 2.4) + svgText(x + v * scale / 2, y - 50, `${num(v)} m/s`, { size: 11, anchor: "middle", color: "#dc2626" }) : svgText(x, y - 48, "정지", { size: 11, anchor: "middle", color: "#666" }));
  };
  const row = (y: number, title: string, a: number, b: number) => `<line x1="20" y1="${y + 9}" x2="${width - 20}" y2="${y + 9}" stroke="#999"/>` + svgText(24, y - 58, title, { size: 12, weight: 700 }) + cart(190, y, collision.m1, "A", "#dbeafe", a) + cart(380, y, collision.m2, "B", "#fee2e2", b);
  return svgWrap(width, height, row(92, "충돌 전", collision.v1, collision.v2) + row(206, "충돌 후", result.after1, result.after2));
}

/** 충격량: 삼각형 모양 F-t 그래프(최대 힘 F, 작용 시간 t)입니다. */
export function forceTimeSvg(peak: number, duration: number, other?: { peak: number; duration: number }) {
  const series = [{ points: [[0, 0], [duration / 2, peak], [duration, 0]] as [number, number][], color: "#2563eb", label: other ? "A" : undefined }];
  if (other) series.push({ points: [[0, 0], [other.duration / 2, other.peak], [other.duration, 0]], color: "#dc2626", label: "B" });
  const maxT = Math.max(duration, other?.duration ?? 0);
  const maxF = Math.max(peak, other?.peak ?? 0);
  return plotSvg({ xLabel: "시간(s)", yLabel: "힘(N)", xMax: maxT * 1.1, yMin: 0, yMax: maxF * 1.15, series, areas: [{ points: series[0].points, color: "rgba(37,99,235,.15)" }], width: 380, height: 230 });
}

/* ───── 문제 ───── */
export type MomentumAsk = "inelastic" | "elastic" | "conservation" | "impulse" | "safety";
export const momentumAsks: Record<MomentumAsk, string> = { inelastic: "한 덩어리 충돌", elastic: "탄성 충돌", conservation: "운동량 보존", impulse: "F-t 그래프와 충격량", safety: "충돌 시간과 평균 힘" };

export function momentumProblems(asks: MomentumAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 37 + 2);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const problems: SheetProblem[] = [];
  const add = (html: string, answer: string, extra: Partial<SheetProblem> = {}) => problems.push({ html, text: html.replace(/<[^>]+>/g, ""), answerHtml: answer, answerText: answer.replace(/<[^>]+>/g, ""), space: 14, ...extra });
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "inelastic") {
      const m1 = pick([1, 2, 3, 4]); const m2 = pick([1, 2, 3, 4]); const v1 = pick([4, 6, 8, 10, 12]); const v2 = pick([0, 0, 2, -2]);
      const c: Collision = { m1, v1, m2, v2, e: 0 };
      const r = collide(c);
      add(`마찰이 없는 수평면에서 질량 ${m1} kg인 물체 A가 ${v1} m/s로, 질량 ${m2} kg인 물체 B가 ${v2 === 0 ? "정지해 있다가" : `${Math.abs(v2)} m/s로 ${v2 > 0 ? "같은 방향으로" : "반대 방향으로"} 운동하다가`} 충돌한 뒤 한 덩어리가 되었다. 충돌 뒤 속도와 충돌 과정에서 줄어든 운동 에너지를 구하시오.`,
        `${num(r.after1)} m/s (${r.after1 >= 0 ? "A의 처음 운동 방향" : "A와 반대 방향"}), 줄어든 운동 에너지 ${num(r.loss)} J`, { figure: collisionSvg(c) });
    } else if (ask === "elastic") {
      const m = pick([1, 2, 3]); const v1 = pick([3, 4, 5, 6]);
      add(`질량이 ${m} kg으로 같은 두 물체 중 A가 ${v1} m/s로 운동하다가 정지해 있던 B와 정면으로 탄성 충돌하였다. 충돌 뒤 A와 B의 속도를 구하시오.`, `A 0 m/s(정지), B ${v1} m/s (질량이 같으면 속도를 맞바꿈)`);
    } else if (ask === "conservation") {
      const m1 = pick([2, 3, 4]); const m2 = pick([1, 2]); const v1 = pick([5, 6, 8]); const after1 = pick([1, 2, -1]);
      const after2 = (m1 * v1 - m1 * after1) / m2;
      add(`질량 ${m1} kg인 A가 ${v1} m/s로 운동하다가 정지해 있던 질량 ${m2} kg인 B와 충돌한 뒤, A는 ${after1 > 0 ? `같은 방향으로 ${after1} m/s` : `반대 방향으로 ${Math.abs(after1)} m/s`}로 운동하였다. 충돌 뒤 B의 속도와 A가 받은 충격량의 크기를 구하시오.`,
        `B ${num(after2)} m/s, A가 받은 충격량 ${num(Math.abs(m1 * (after1 - v1)))} N·s`);
    } else if (ask === "impulse") {
      const peak = pick([100, 200, 400, 600]); const duration = pick([0.1, 0.2, 0.4]); const m = pick([0.5, 1, 2]);
      const impulse = (peak * duration) / 2;
      add(`그림은 정지해 있던 질량 ${m} kg인 물체에 작용한 힘을 시간에 따라 나타낸 것이다. 물체가 받은 충격량과 힘이 작용한 뒤 물체의 속력을 구하시오.`, `충격량 ${num(impulse)} N·s (그래프 넓이), 속력 ${num(impulse / m)} m/s`, { figure: forceTimeSvg(peak, duration) });
    } else {
      const m = pick([0.2, 0.5, 1]); const v = pick([10, 20, 30]); const t1 = pick([0.01, 0.02]); const factor = pick([5, 10]);
      add(`질량 ${m} kg인 공이 ${v} m/s로 날아와 멈추었다. 공을 멈추는 데 ${t1}초가 걸렸을 때와 ${num(t1 * factor, 3)}초가 걸렸을 때, 공이 받은 평균 힘의 크기를 각각 구하시오.`, `${num((m * v) / t1)} N, ${num((m * v) / (t1 * factor))} N (충격량이 같을 때 시간을 늘리면 평균 힘이 줄어듦)`);
    }
  }
  return [{ heading: "운동량과 충격량", problems }];
}
