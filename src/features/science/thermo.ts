/* 역학과 에너지: 이상 기체(단원자)의 열역학 과정(P-V 그래프, 한 일 = 넓이, ΔU, Q)과 열기관, 문제입니다.
 * 압력은 kPa, 부피는 L로 받아 PV를 J로 셉니다(1 kPa·L = 1 J). */
import { arrowSvg, num, plotSvg, seededRandom, svgText, type SheetProblem, type SheetSection } from "./sheet";

export const R_GAS = 8.314;
export const GAMMA = 5 / 3;
export type ProcessKind = "isobaric" | "isochoric" | "isothermal" | "adiabatic";
export const processNames: Record<ProcessKind, string> = { isobaric: "등압 과정", isochoric: "등적 과정", isothermal: "등온 과정", adiabatic: "단열 과정" };
export type State = { p: number; v: number };

/** 처음 상태와 과정, 나중 부피(등적이면 나중 압력)로 나중 상태를 구합니다. */
export function nextState(start: State, kind: ProcessKind, target: number): State {
  if (kind === "isobaric") return { p: start.p, v: target };
  if (kind === "isochoric") return { p: target, v: start.v };
  if (kind === "isothermal") return { p: (start.p * start.v) / target, v: target };
  return { p: start.p * (start.v / target) ** GAMMA, v: target };
}
/** 기체가 한 일 W, 내부 에너지 변화 ΔU, 흡수한 열 Q(= ΔU + W)입니다. 단원자 이상 기체입니다. */
export function processEnergy(start: State, end: State, kind: ProcessKind) {
  const deltaU = 1.5 * (end.p * end.v - start.p * start.v);
  let work = 0;
  if (kind === "isobaric") work = start.p * (end.v - start.v);
  else if (kind === "isothermal") work = start.p * start.v * Math.log(end.v / start.v);
  else if (kind === "adiabatic") work = (start.p * start.v - end.p * end.v) / (GAMMA - 1);
  return { work, deltaU, heat: deltaU + work };
}
export function processPoints(start: State, end: State, kind: ProcessKind): [number, number][] {
  if (kind === "isobaric" || kind === "isochoric") return [[start.v, start.p], [end.v, end.p]];
  return Array.from({ length: 41 }, (_, step) => {
    const v = start.v + ((end.v - start.v) * step) / 40;
    return [v, kind === "isothermal" ? (start.p * start.v) / v : start.p * (start.v / v) ** GAMMA];
  });
}

/** 꺾은선 위에서 t(0~1) 비율 자리의 점입니다(화살표 위치). */
function along(points: [number, number][], t: number): [number, number] {
  const at = t * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(at));
  const f = at - index;
  const [a, b] = [points[index], points[index + 1]];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}

/** 과정들을 이어 P-V 그래프를 그리고, 순환이면 둘러싼 넓이(알짜 일)를, 아니면 그래프 아래 넓이(한 일)를 칠합니다. */
export function pvSvg(states: State[], kinds: ProcessKind[], options: { cycle?: boolean; labels?: string[] } = {}) {
  const paths = kinds.map((kind, index) => processPoints(states[index], states[(index + 1) % states.length], kind));
  const all = paths.flat();
  const vMax = Math.max(...all.map(([v]) => v)) * 1.2;
  const pMax = Math.max(...all.map(([, p]) => p)) * 1.2;
  const areas = options.cycle ? [{ points: paths.flat(), color: "rgba(37,99,235,.16)" }] : paths.filter((_, index) => kinds[index] !== "isochoric").map(points => ({ points: [...points, [points[points.length - 1][0], 0], [points[0][0], 0]] as [number, number][], color: "rgba(37,99,235,.14)" }));
  return plotSvg({
    xLabel: "부피(L)", yLabel: "압력(kPa)", xMax: vMax, yMin: 0, yMax: pMax,
    series: paths.map(points => ({ points, color: "#1d4ed8", width: 2.4 })), areas,
    dots: states.slice(0, options.cycle ? states.length : kinds.length + 1).map((state, index) => ({ at: [state.v, state.p] as [number, number], label: options.labels?.[index] ?? String.fromCharCode(65 + index) })),
    extra: (sx, sy) => paths.map(points => { const [x1, y1] = along(points, 0.4); const [x2, y2] = along(points, 0.62); return arrowSvg(sx(x1), sy(y1), sx(x2), sy(y2), "#1d4ed8", 2); }).join("")
      + svgText(sx(vMax) - 4, sy(pMax) + 14, options.cycle ? "색칠한 넓이 = 한 순환에서 한 알짜 일" : "색칠한 넓이 = 기체가 한 일", { size: 10.5, anchor: "end", color: "#1e3a8a" }),
    width: 480, height: 320,
  });
}

/** 네 과정(등압 → 등적 → 등압 → 등적)으로 된 사각형 순환입니다. */
export function rectangleCycle(p1: number, p2: number, v1: number, v2: number) {
  const states: State[] = [{ p: p1, v: v1 }, { p: p1, v: v2 }, { p: p2, v: v2 }, { p: p2, v: v1 }];
  const kinds: ProcessKind[] = ["isobaric", "isochoric", "isobaric", "isochoric"];
  const steps = kinds.map((kind, index) => processEnergy(states[index], states[(index + 1) % 4], kind));
  const net = steps.reduce((sum, step) => sum + step.work, 0);
  const heatIn = steps.reduce((sum, step) => sum + Math.max(0, step.heat), 0);
  return { states, kinds, steps, net, heatIn, efficiency: net / heatIn };
}

/* ───── 문제 ───── */
export type ThermoAsk = "isobaric" | "isochoric" | "cycle" | "engine" | "carnot";
export const thermoAsks: Record<ThermoAsk, string> = { isobaric: "등압 팽창", isochoric: "등적 가열", cycle: "순환 과정", engine: "열기관 효율", carnot: "카르노 기관" };

export function thermoProblems(asks: ThermoAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 59 + 3);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const problems: SheetProblem[] = [];
  const add = (html: string, answer: string, extra: Partial<SheetProblem> = {}) => problems.push({ html, text: html.replace(/<[^>]+>/g, ""), answerHtml: answer, answerText: answer.replace(/<[^>]+>/g, ""), space: 16, ...extra });
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "isobaric") {
      const p = pick([100, 200, 300]); const v1 = pick([2, 4]); const v2 = v1 + pick([2, 4, 6]);
      const start = { p, v: v1 }; const end = nextState(start, "isobaric", v2); const e = processEnergy(start, end, "isobaric");
      add(`단원자 분자 이상 기체가 ${p} kPa의 일정한 압력에서 부피가 ${v1} L에서 ${v2} L로 팽창하였다. 기체가 한 일, 내부 에너지 변화량, 흡수한 열량을 구하시오.`, `W = ${num(e.work)} J, ΔU = ${num(e.deltaU)} J, Q = ${num(e.heat)} J`, { figure: pvSvg([start, end], ["isobaric"]) });
    } else if (ask === "isochoric") {
      const v = pick([2, 4, 5]); const p1 = pick([100, 200]); const p2 = p1 + pick([100, 200]);
      const start = { p: p1, v }; const end = nextState(start, "isochoric", p2); const e = processEnergy(start, end, "isochoric");
      add(`단원자 분자 이상 기체의 부피를 ${v} L로 유지하면서 가열하였더니 압력이 ${p1} kPa에서 ${p2} kPa로 증가하였다. 기체가 한 일과 흡수한 열량을 구하시오.`, `W = 0 J, Q = ΔU = ${num(e.heat)} J`);
    } else if (ask === "cycle") {
      const p1 = pick([200, 300]); const p2 = pick([100]); const v1 = pick([1, 2]); const v2 = v1 + pick([2, 3]);
      const cycle = rectangleCycle(p1, p2, v1, v2);
      add(`그림은 단원자 분자 이상 기체의 상태가 A → B → C → D → A를 따라 변하는 것을 나타낸 것이다. 한 번 순환하는 동안 기체가 한 알짜 일과 이 열기관의 열효율을 구하시오.`, `알짜 일 ${num(cycle.net)} J, 흡수한 열 ${num(cycle.heatIn)} J, 열효율 ${num(cycle.efficiency * 100, 1)}%`, { figure: pvSvg(cycle.states, cycle.kinds, { cycle: true }) });
    } else if (ask === "engine") {
      const qIn = pick([500, 800, 1000, 1200]); const eff = pick([0.2, 0.25, 0.4]);
      add(`열기관이 한 번 순환하는 동안 고열원에서 ${qIn} J의 열을 흡수하고 저열원으로 ${num(qIn * (1 - eff))} J의 열을 방출하였다. 열기관이 한 일과 열효율을 구하시오.`, `W = ${num(qIn * eff)} J, 열효율 ${num(eff * 100)}%`);
    } else {
      const hot = pick([600, 500, 400]); const cold = pick([300, 200]);
      add(`고열원의 온도가 ${hot} K, 저열원의 온도가 ${cold} K인 카르노 기관의 열효율을 구하시오.`, `${num((1 - cold / hot) * 100, 1)}% (e = 1 − T저/T고)`);
    }
  }
  return [{ heading: "열역학 과정과 열기관", problems }];
}
