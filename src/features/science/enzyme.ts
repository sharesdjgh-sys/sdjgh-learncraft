/* 세포와 물질대사: 효소 반응 속도와 기질 농도(저해제), 온도·pH의 영향 그래프와 문제입니다. 곡선은 교과서형 모양입니다. */
import { plotSvg, seededRandom, svgText, type SheetProblem, type SheetSection } from "./sheet";

export type Inhibitor = "none" | "competitive" | "noncompetitive";
export const inhibitors: Record<Inhibitor, string> = { none: "저해제 없음", competitive: "경쟁적 저해제", noncompetitive: "비경쟁적 저해제" };
/** 미카엘리스-멘텐 식 v = Vmax[S]/(Km + [S]). 경쟁적 저해는 Km을, 비경쟁적 저해는 Vmax를 바꿉니다. */
export function rate(substrate: number, vmax: number, km: number, inhibitor: Inhibitor, strength = 2) {
  const k = inhibitor === "competitive" ? km * strength : km;
  const v = inhibitor === "noncompetitive" ? vmax / strength : vmax;
  return (v * substrate) / (k + substrate);
}
export function substrateSvg(vmax: number, km: number, shown: Inhibitor[], options: { marks?: boolean } = {}) {
  const span = km * 10;
  const colors: Record<Inhibitor, string> = { none: "#2563eb", competitive: "#dc2626", noncompetitive: "#16a34a" };
  return plotSvg({
    xLabel: "기질 농도", yLabel: "반응 속도", xMax: span * 1.05, yMin: 0, yMax: vmax * 1.2, hideTicks: true,
    series: shown.map(kind => ({ points: Array.from({ length: 121 }, (_, step) => { const s = (span * step) / 120; return [s, rate(s, vmax, km, kind)] as [number, number]; }), color: colors[kind], label: inhibitors[kind].replace(" 저해제", ""), width: 2.2 })),
    extra: options.marks === false ? undefined : (sx, sy) => `<line x1="${sx(0)}" y1="${sy(vmax)}" x2="${sx(span)}" y2="${sy(vmax)}" stroke="#94a3b8" stroke-dasharray="4 3"/>` + svgText(sx(0) + 4, sy(vmax) - 4, "Vmax", { size: 10.5, color: "#475569" })
      + `<line x1="${sx(0)}" y1="${sy(vmax / 2)}" x2="${sx(km)}" y2="${sy(vmax / 2)}" stroke="#94a3b8" stroke-dasharray="3 3"/><line x1="${sx(km)}" y1="${sy(vmax / 2)}" x2="${sx(km)}" y2="${sy(0)}" stroke="#94a3b8" stroke-dasharray="3 3"/>` + svgText(sx(km), sy(0) + 14, "Km", { size: 10.5, anchor: "middle", color: "#475569" }) + svgText(sx(0) + 4, sy(vmax / 2) - 4, "½Vmax", { size: 10, color: "#475569" }),
    width: 480, height: 290,
  });
}

/** 온도에 따른 반응 속도(최적 온도에서 최대, 높은 온도에서 효소 변성으로 급감)입니다. */
export function temperatureSvg(optimum: number) {
  const points = Array.from({ length: 121 }, (_, step) => {
    const t = (80 * step) / 120;
    const rise = Math.exp((t - optimum) / 12);
    const fall = 1 / (1 + Math.exp((t - optimum - 6) / 2.2));
    return [t, rise * fall] as [number, number];
  });
  const max = Math.max(...points.map(([, v]) => v));
  return plotSvg({ xLabel: "온도(℃)", yLabel: "반응 속도", xMax: 82, xStep: 10, yMin: 0, yMax: max * 1.2, series: [{ points, color: "#dc2626", width: 2.4 }], extra: (sx, sy) => svgText(sx(optimum), sy(max) - 8, `최적 온도 약 ${optimum} ℃`, { size: 10.5, anchor: "middle" }), width: 460, height: 260 });
}
export const PH_ENZYMES = [{ name: "펩신", optimum: 2, color: "#9333ea" }, { name: "아밀레이스", optimum: 7, color: "#2563eb" }, { name: "트립신", optimum: 8, color: "#16a34a" }];
export function phSvg() {
  return plotSvg({
    xLabel: "pH", yLabel: "반응 속도", xMax: 12.5, xStep: 1, yMin: 0, yMax: 1.25,
    series: PH_ENZYMES.map(enzyme => ({ points: Array.from({ length: 121 }, (_, step) => { const p = (12 * step) / 120; return [p, Math.exp(-((p - enzyme.optimum) ** 2) / 1.6)] as [number, number]; }), color: enzyme.color, label: enzyme.name })),
    width: 480, height: 260,
  });
}

/* ───── 문제 ───── */
export type EnzymeAsk = "substrate" | "inhibitor" | "temperature" | "ph";
export const enzymeAsks: Record<EnzymeAsk, string> = { substrate: "기질 농도와 속도", inhibitor: "저해제 구별", temperature: "온도의 영향", ph: "최적 pH" };

export function enzymeProblems(asks: EnzymeAsk[], seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 109 + 1);
  const problems: SheetProblem[] = [];
  for (const ask of asks) {
    if (ask === "substrate") problems.push({ html: "그림은 효소의 양이 일정할 때 기질 농도에 따른 반응 속도이다. 기질 농도가 충분히 높아지면 반응 속도가 더 이상 증가하지 않는 까닭을 쓰시오.", text: "기질 농도가 높아지면 반응 속도가 일정해지는 까닭을 쓰시오.", figure: substrateSvg(1, 1, ["none"]), answerHtml: "모든 효소의 활성 부위가 기질과 결합(포화)되어 효소-기질 복합체가 더 늘어날 수 없기 때문이다.", answerText: "효소가 포화되어서", space: 12 });
    else if (ask === "inhibitor") {
      const swap = random() < 0.5;
      problems.push({ html: `그림은 저해제가 없을 때와 저해제 ${swap ? "B, A" : "A, B"}가 있을 때 기질 농도에 따른 반응 속도를 나타낸 것이다(A, B는 경쟁적·비경쟁적 저해제 중 하나). 경쟁적 저해제를 고르고, 기질 농도를 높일 때 그 효과가 어떻게 되는지 쓰시오.`, text: "경쟁적·비경쟁적 저해제 그래프를 구별하고, 기질 농도를 높일 때 경쟁적 저해의 효과를 쓰시오.", figure: substrateSvg(1, 1, ["none", "competitive", "noncompetitive"], { marks: false }).replace(">경쟁적<", `>${swap ? "B" : "A"}<`).replace(">비경쟁적<", `>${swap ? "A" : "B"}<`), answerHtml: `${swap ? "B" : "A"}(경쟁적 저해제): 기질과 활성 부위를 두고 경쟁하므로 기질 농도를 높이면 저해 효과가 줄어 최대 속도에 가까워진다. 비경쟁적 저해제는 최대 속도 자체를 낮춘다.`, answerText: `${swap ? "B" : "A"}, 기질 농도를 높이면 저해 효과가 줄어듦`, space: 12 });
    } else if (ask === "temperature") problems.push({ html: "그림은 온도에 따른 효소의 반응 속도이다. 최적 온도보다 높은 온도에서 반응 속도가 급격히 줄어드는 까닭을 쓰시오.", text: "최적 온도보다 높은 온도에서 효소의 반응 속도가 줄어드는 까닭을 쓰시오.", figure: temperatureSvg(37), answerHtml: "효소의 주성분인 단백질의 입체 구조가 변하여(변성) 활성 부위가 기질과 결합하지 못하기 때문이다.", answerText: "단백질 변성", space: 12 });
    else problems.push({ html: "그림은 소화 효소 A~C의 pH에 따른 반응 속도이다. 위에서 작용하는 효소를 고르고, 그 까닭을 쓰시오.", text: "pH에 따른 소화 효소 그래프에서 위에서 작용하는 효소와 까닭을 쓰시오.", figure: phSvg().replace(">펩신<", ">A<").replace(">아밀레이스<", ">B<").replace(">트립신<", ">C<"), answerHtml: "A(펩신): 위액은 강한 산성(pH 약 2)이고 A의 최적 pH가 약 2이다. (B는 아밀레이스 pH 7, C는 트립신 pH 8)", answerText: "A(펩신), 최적 pH가 산성", space: 10 });
  }
  return [{ heading: "효소", problems }];
}
