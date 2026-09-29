/* 생명과학: 활동 전위(막전위 변화) 그래프와 흥분의 전도(속도·거리·시간으로 막전위 구하기) 문제입니다.
 * 막전위 모양은 교과서형 예시(휴지 전위 −70 mV, 최고 +30 mV)이며, 교사가 점을 바꿀 수 있습니다. */
import { escapeHtml, num, plotSvg, seededRandom, sheetTable, svgText, svgWrap, arrowSvg, type SheetProblem, type SheetSection } from "./sheet";

export const REST = -70;
/** 자극이 도달한 뒤 경과 시간(ms)과 막전위(mV)의 점들입니다. */
export const DEFAULT_CURVE: [number, number][] = [[0, -70], [1, -60], [2, 30], [3, -70], [4, -80], [5, -70]];

/** 점 사이를 곧게 이어 막전위를 구합니다. 자극 전·회복 뒤는 휴지 전위입니다. */
export function potentialAt(curve: [number, number][], elapsed: number) {
  if (elapsed <= curve[0][0] || elapsed >= curve[curve.length - 1][0]) return REST;
  for (let index = 1; index < curve.length; index += 1) {
    const [t1, v1] = curve[index - 1];
    const [t2, v2] = curve[index];
    if (elapsed <= t2) return v1 + ((v2 - v1) * (elapsed - t1)) / (t2 - t1);
  }
  return REST;
}

/** 막전위 그래프. 점 사이를 부드럽게(캣멀-롬) 이어 교과서 그림처럼 그립니다. */
export function actionPotentialSvg(curve: [number, number][], options: { labels?: boolean } = {}) {
  const smooth: [number, number][] = [];
  for (let index = 0; index < curve.length - 1; index += 1) {
    const [p0, p1, p2, p3] = [curve[Math.max(0, index - 1)], curve[index], curve[index + 1], curve[Math.min(curve.length - 1, index + 2)]];
    for (let step = 0; step < 12; step += 1) {
      const t = step / 12;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
      smooth.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  smooth.push(curve[curve.length - 1]);
  const end = curve[curve.length - 1][0];
  return plotSvg({
    xLabel: "시간(ms)", yLabel: "막전위(mV)", xMin: 0, xMax: end + 1, xStep: 1, yMin: -90, yMax: 40, yStep: 10,
    series: [{ points: [[0, REST], ...smooth.slice(1), [end + 1, REST]], color: "#dc2626", width: 2.4 }, { points: [[0, -55], [end + 1, -55]], color: "#94a3b8", dash: true, width: 1 }],
    dots: options.labels === false ? [] : curve.map(([t, v]) => ({ at: [t, v] as [number, number] })),
    extra: (sx, sy) => svgText(sx(end + 1) - 4, sy(-55) - 4, "역치 전위(예)", { size: 10, anchor: "end", color: "#64748b" }) + arrowSvg(sx(0), sy(34), sx(0), sy(26), "#111", 1.4) + svgText(sx(0) + 4, sy(36), "자극", { size: 10 }),
    width: 440, height: 280,
  });
}

/* ───── 흥분의 전도 ───── */
export type Nerve = { speed: number; points: { name: string; distance: number }[] };
/** 자극점에서 거리 d(cm)인 곳의 막전위: 흥분이 도달하는 데 d/v ms가 걸립니다. */
export function nervePotentials(nerve: Nerve, time: number, curve = DEFAULT_CURVE) {
  return nerve.points.map(point => {
    const elapsed = time - point.distance / nerve.speed;
    return { ...point, elapsed, potential: potentialAt(curve, elapsed) };
  });
}
export function nerveSvg(nerve: Nerve) {
  const width = 520;
  const height = 110;
  const max = Math.max(...nerve.points.map(point => point.distance), 1);
  const x = (d: number) => 50 + (d / max) * (width - 100);
  const parts = [`<rect x="30" y="50" width="${width - 60}" height="14" rx="7" fill="#fde68a" stroke="#b45309"/>`, `<circle cx="22" cy="57" r="16" fill="#fef3c7" stroke="#b45309"/>`, svgText(22, 61, "세포체", { size: 8, anchor: "middle" })];
  parts.push(arrowSvg(x(0), 18, x(0), 46, "#dc2626", 2) + svgText(x(0), 14, "자극", { size: 11, anchor: "middle", color: "#b91c1c" }));
  for (const point of nerve.points) parts.push(`<line x1="${x(point.distance)}" y1="46" x2="${x(point.distance)}" y2="68" stroke="#111"/>` + svgText(x(point.distance), 84, point.name, { size: 12, anchor: "middle", weight: 700 }) + svgText(x(point.distance), 100, `${num(point.distance)} cm`, { size: 10, anchor: "middle", color: "#555" }));
  return svgWrap(width, height, parts.join(""));
}

/* ───── 문제 ───── */
export type NeuronAsk = "potential" | "speed" | "phase";
export const neuronAsks: Record<NeuronAsk, string> = { potential: "지점별 막전위", speed: "전도 속도 구하기", phase: "탈분극·재분극 구간" };

export function neuronProblems(asks: NeuronAsk[], perAsk: number, seed: number, curve = DEFAULT_CURVE): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 101 + 7);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const problems: SheetProblem[] = [];
  const curveTable = sheetTable(["경과 시간(ms)", ...curve.map(([t]) => num(t))], [["막전위(mV)", ...curve.map(([, v]) => num(v))]], { font: "9pt" });
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "potential" || ask === "speed") {
      const speed = pick([1, 2, 3]);
      const steps = [1, 2, 3].map(() => pick([1, 2, 3, 4]));
      const distances = [0, steps[0], steps[0] + steps[1], steps[0] + steps[1] + steps[2]].map(value => value * speed).slice(1);
      const nerve: Nerve = { speed, points: distances.map((distance, at) => ({ name: "ⅠⅡⅢ"[at], distance })) };
      const time = Math.max(...distances) / speed + pick([0, 1, 2]);
      const potentials = nervePotentials(nerve, time, curve);
      if (ask === "potential") {
        problems.push({
          html: `그림과 같이 민말이집 신경의 한 지점에 역치 이상의 자극을 1회 주었다. 흥분의 전도 속도는 ${speed} cm/ms이고, 흥분이 도달한 지점의 막전위는 표와 같이 변한다. 자극을 주고 ${num(time)} ms가 지났을 때 Ⅰ~Ⅲ의 막전위를 구하시오.${curveTable}`,
          text: `전도 속도 ${speed} cm/ms, 자극 후 ${num(time)} ms일 때 Ⅰ(${distances[0]} cm)~Ⅲ(${distances[2]} cm)의 막전위를 구하시오.`,
          figure: nerveSvg(nerve), space: 8,
          answerHtml: potentials.map(value => `${value.name} ${num(value.potential)} mV <span style="color:#555">(도달 뒤 ${value.elapsed < 0 ? "아직 도달 안 함" : `${num(value.elapsed)} ms`})</span>`).join(", "),
          answerText: potentials.map(value => `${value.name} ${num(value.potential)} mV`).join(", "),
        });
      } else {
        const target = potentials[potentials.length - 1];
        // 막전위 값이 한 번만 나오는 최고점·최저점을 써야 도달 시간이 하나로 정해집니다.
        const values = curve.map(([, v]) => v);
        const elapsed = pick(curve.filter(([, v]) => v === Math.max(...values) || v === Math.min(...values)).map(([t]) => t));
        const shownTime = target.distance / speed + elapsed;
        problems.push({
          html: `민말이집 신경의 한 지점에 자극을 주고 ${num(shownTime)} ms가 지났을 때, 자극 지점에서 ${num(target.distance)} cm 떨어진 지점의 막전위가 ${num(potentialAt(curve, elapsed))} mV였다. 흥분이 도달한 지점의 막전위 변화가 표와 같을 때 흥분의 전도 속도를 구하시오.${curveTable}`,
          text: `자극 후 ${num(shownTime)} ms, ${num(target.distance)} cm 지점 막전위 ${num(potentialAt(curve, elapsed))} mV일 때 전도 속도는?`,
          answerHtml: `${speed} cm/ms (막전위가 ${num(potentialAt(curve, elapsed))} mV인 것은 도달 뒤 ${num(elapsed)} ms → 도달에 ${num(shownTime - elapsed)} ms)`, answerText: `${speed} cm/ms`, space: 12,
        });
      }
    } else {
      problems.push({
        html: `그림은 뉴런의 한 지점에서 활동 전위가 생길 때 막전위 변화를 나타낸 것이다. 탈분극·재분극·과분극 구간을 표시하고, 각 구간에서 주로 막을 통해 이동하는 이온(Na⁺, K⁺)과 이동 방향을 쓰시오.`,
        text: `막전위 그래프에서 탈분극·재분극·과분극 구간과 이온의 이동을 쓰시오.`,
        figure: actionPotentialSvg(curve, { labels: false }),
        answerHtml: `탈분극: Na⁺ 통로가 열려 Na⁺이 세포 안으로 확산(막전위 상승) · 재분극: K⁺ 통로가 열려 K⁺이 세포 밖으로 확산(막전위 하강) · 과분극: K⁺ 유출이 이어져 휴지 전위보다 낮아짐 · 휴지 상태의 이온 분포는 Na⁺-K⁺ 펌프가 유지`,
        answerText: "탈분극 Na⁺ 유입, 재분극 K⁺ 유출, 과분극 K⁺ 유출 지속", space: 10,
      });
    }
  }
  return [{ heading: "흥분의 발생과 전도", problems }];
}
export const curveLabel = (curve: [number, number][]) => escapeHtml(curve.map(([t, v]) => `${t} ms ${v} mV`).join(", "));
