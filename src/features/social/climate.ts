/* 지리: 기후 그래프(월평균 기온·강수량)와 쾨펜 기후 구분, 문제입니다. 도시 자료는 교과서형 대략값입니다. */
import { escapeHtml, niceStep, num, problem, seededRandom, sheetTable, shuffled, svgText, svgWrap, type SheetSection } from "./sheet";

export type ClimateData = { name: string; temps: number[]; precip: number[]; south: boolean; highland?: boolean };
/** C·D 경계(최한월 평균 기온). 우리나라 교과서는 −3 ℃를 씁니다. */
export type ColdLine = -3 | 0;

/** 대표 도시 기후 자료(교과서형 대략값). 월 1~12월 순서입니다. */
export const CLIMATE_PRESETS: ClimateData[] = [
  { name: "싱가포르", south: false, temps: [26.5, 27.1, 27.5, 28.0, 28.3, 28.3, 27.9, 27.9, 27.6, 27.6, 27.0, 26.4], precip: [222, 105, 154, 166, 171, 132, 153, 149, 122, 160, 257, 289] },
  { name: "마나우스", south: true, temps: [26.1, 26.0, 26.1, 26.2, 26.5, 26.6, 26.9, 27.5, 27.9, 27.7, 27.3, 26.7], precip: [260, 288, 314, 300, 256, 114, 88, 58, 83, 126, 183, 217] },
  { name: "다윈", south: true, temps: [28.4, 28.2, 28.3, 28.4, 27.4, 25.8, 25.3, 26.1, 27.8, 29.0, 29.2, 28.9], precip: [423, 374, 318, 106, 21, 2, 1, 5, 15, 70, 142, 248] },
  { name: "카이로", south: false, temps: [14.0, 15.3, 17.6, 21.3, 24.8, 27.3, 28.0, 28.0, 26.4, 23.7, 19.3, 15.7], precip: [5, 4, 4, 1, 0, 0, 0, 0, 0, 1, 3, 6] },
  { name: "리야드", south: false, temps: [14.5, 17.2, 21.4, 26.8, 32.5, 35.4, 36.6, 36.4, 33.4, 28.1, 21.2, 16.2], precip: [13, 8, 24, 26, 6, 0, 0, 0, 0, 1, 6, 13] },
  { name: "테헤란", south: false, temps: [3.9, 6.3, 11.0, 17.0, 22.0, 28.0, 30.5, 29.5, 25.0, 18.0, 10.5, 5.5], precip: [38, 36, 43, 29, 14, 2, 2, 1, 1, 12, 28, 34] },
  { name: "로마", south: false, temps: [7.5, 8.4, 10.9, 13.7, 17.9, 22.0, 24.9, 25.0, 21.4, 17.0, 11.9, 8.6], precip: [67, 73, 58, 81, 53, 34, 19, 37, 73, 113, 111, 81] },
  { name: "케이프타운", south: true, temps: [21.4, 21.5, 20.4, 18.1, 15.9, 13.9, 13.1, 13.6, 14.8, 16.8, 18.6, 20.2], precip: [15, 17, 20, 41, 69, 93, 82, 77, 40, 30, 14, 17] },
  { name: "런던", south: false, temps: [5.2, 5.3, 7.6, 9.9, 13.3, 16.5, 18.7, 18.5, 15.7, 12.0, 8.0, 5.5], precip: [55, 41, 42, 44, 49, 45, 45, 50, 49, 69, 59, 55] },
  { name: "서울", south: false, temps: [-2.0, 0.6, 6.3, 12.6, 18.2, 22.4, 25.3, 26.1, 21.6, 14.8, 7.2, 0.4], precip: [17, 28, 37, 73, 104, 130, 414, 348, 142, 52, 51, 23] },
  { name: "모스크바", south: false, temps: [-6.2, -5.9, -0.9, 6.9, 13.2, 17.0, 19.2, 17.0, 11.3, 5.6, -0.4, -4.4], precip: [53, 44, 39, 37, 61, 77, 84, 78, 66, 70, 52, 51] },
  { name: "이르쿠츠크", south: false, temps: [-17.8, -15.1, -6.9, 2.2, 9.6, 15.6, 18.4, 16.0, 9.2, 1.6, -7.9, -15.4], precip: [13, 8, 10, 18, 35, 73, 105, 95, 48, 20, 17, 15] },
  { name: "배로(우트키아비크)", south: false, temps: [-25.6, -27.3, -25.8, -17.4, -6.4, 1.6, 4.8, 3.4, -0.8, -8.9, -17.5, -23.6], precip: [4, 4, 4, 5, 5, 9, 25, 27, 17, 11, 6, 4] },
  { name: "키토(고산)", south: false, highland: true, temps: [14.0, 14.0, 14.0, 14.1, 14.2, 14.2, 14.2, 14.5, 14.5, 14.2, 13.9, 14.0], precip: [99, 112, 142, 175, 137, 43, 20, 31, 69, 112, 97, 79] },
];

/** 기후 기호와 우리 교과서 이름입니다. */
const NAMES: [RegExp, string][] = [
  [/^Af/, "열대 우림 기후"], [/^Am/, "열대 몬순 기후"], [/^Aw/, "사바나 기후"],
  [/^BW/, "사막 기후"], [/^BS/, "스텝 기후"],
  [/^Cs/, "지중해성 기후"], [/^Cw/, "온대 겨울 건조 기후"], [/^Cfa/, "온난 습윤 기후"], [/^Cf/, "서안 해양성 기후"],
  [/^Df/, "냉대 습윤 기후"], [/^Dw/, "냉대 겨울 건조 기후"], [/^Ds/, "냉대 여름 건조 기후"],
  [/^ET/, "툰드라 기후"], [/^EF/, "빙설 기후"],
];
export const climateName = (code: string) => NAMES.find(([pattern]) => pattern.test(code))?.[1] ?? code;

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
/** 여름 반년(북반구 4~9월, 남반구 10~3월)의 달 번호(0부터)입니다. */
export const summerMonths = (south: boolean) => south ? [9, 10, 11, 0, 1, 2] : [3, 4, 5, 6, 7, 8];

export function climateStats(data: ClimateData) {
  const mean = sum(data.temps) / 12;
  const total = sum(data.precip);
  const warmest = Math.max(...data.temps);
  const coldest = Math.min(...data.temps);
  return { mean, total, warmest, coldest, range: warmest - coldest };
}

/** 쾨펜 기후 구분: 기호, 이름, 판정 근거를 돌려줍니다. E → B → A → C·D 차례로 봅니다. */
export function koppen(data: ClimateData, coldLine: ColdLine = -3) {
  const { mean, total, warmest, coldest } = climateStats(data);
  const reasons: string[] = [];
  const summer = summerMonths(data.south);
  const winter = [...Array(12).keys()].filter(month => !summer.includes(month));
  const summerRain = sum(summer.map(month => data.precip[month]));
  const share = total > 0 ? summerRain / total : 0;
  const threshold = 20 * mean + (share >= 0.7 ? 280 : share >= 0.3 ? 140 : 0);
  let code: string;
  if (warmest < 10) {
    reasons.push(`최난월 평균 기온 ${num(warmest, 1)} ℃ < 10 ℃ → 한대(E)`);
    code = warmest > 0 ? "ET" : "EF";
    reasons.push(code === "ET" ? "최난월이 0 ℃보다 높아요 → 툰드라(ET)" : "최난월도 0 ℃ 이하예요 → 빙설(EF)");
  } else if (total < threshold) {
    reasons.push(`건조 한계 = 20 × ${num(mean, 1)} + ${share >= 0.7 ? 280 : share >= 0.3 ? 140 : 0} = ${num(threshold, 0)} mm (여름 반년 강수 ${num(share * 100, 0)}%)`);
    reasons.push(`연강수량 ${num(total, 0)} mm < 건조 한계 → 건조(B)`);
    const desert = total < threshold / 2;
    reasons.push(desert ? `건조 한계의 절반(${num(threshold / 2, 0)} mm)보다 적어요 → 사막(BW)` : `건조 한계의 절반(${num(threshold / 2, 0)} mm) 이상이에요 → 스텝(BS)`);
    code = `${desert ? "BW" : "BS"}${mean >= 18 ? "h" : "k"}`;
    reasons.push(`연평균 기온 ${num(mean, 1)} ℃ ${mean >= 18 ? "≥ 18 ℃ → h(더움)" : "< 18 ℃ → k(서늘함)"}`);
  } else if (coldest >= 18) {
    reasons.push(`최한월 평균 기온 ${num(coldest, 1)} ℃ ≥ 18 ℃ → 열대(A)`);
    const driest = Math.min(...data.precip);
    const monsoon = 100 - total / 25;
    if (driest >= 60) { code = "Af"; reasons.push(`최소우월 강수량 ${num(driest, 0)} mm ≥ 60 mm → 열대 우림(Af)`); }
    else if (driest >= monsoon) { code = "Am"; reasons.push(`최소우월 ${num(driest, 0)} mm < 60 mm이지만 100 − 연강수량/25 = ${num(monsoon, 1)} mm 이상 → 열대 몬순(Am)`); }
    else { code = "Aw"; reasons.push(`최소우월 ${num(driest, 0)} mm가 60 mm와 ${num(monsoon, 1)} mm보다 적어요(뚜렷한 건기) → 사바나(Aw)`); }
  } else {
    const group = coldest >= coldLine ? "C" : "D";
    reasons.push(`최한월 평균 기온 ${num(coldest, 1)} ℃ ${group === "C" ? `≥ ${coldLine} ℃ → 온대(C)` : `< ${coldLine} ℃ → 냉대(D)`}`);
    const summerDry = Math.min(...summer.map(month => data.precip[month]));
    const summerWet = Math.max(...summer.map(month => data.precip[month]));
    const winterDry = Math.min(...winter.map(month => data.precip[month]));
    const winterWet = Math.max(...winter.map(month => data.precip[month]));
    let rain: string;
    if (summerDry < 40 && summerDry < winterWet / 3) { rain = "s"; reasons.push(`여름 최소우월 ${num(summerDry, 0)} mm < 40 mm, 겨울 최다우월(${num(winterWet, 0)} mm)의 1/3보다 적어요 → 여름 건조(s)`); }
    else if (winterDry < summerWet / 10) { rain = "w"; reasons.push(`겨울 최소우월 ${num(winterDry, 0)} mm < 여름 최다우월(${num(summerWet, 0)} mm)의 1/10 → 겨울 건조(w)`); }
    else { rain = "f"; reasons.push("건기가 뚜렷하지 않아요 → 연중 습윤(f)"); }
    const warmMonths = data.temps.filter(temp => temp >= 10).length;
    let heat: string;
    if (warmest >= 22) { heat = "a"; reasons.push(`최난월 ${num(warmest, 1)} ℃ ≥ 22 ℃ → a`); }
    else if (warmMonths >= 4) { heat = "b"; reasons.push(`최난월 < 22 ℃, 10 ℃ 이상인 달 ${warmMonths}개(4개 이상) → b`); }
    else if (group === "D" && coldest < -38) { heat = "d"; reasons.push(`최한월 ${num(coldest, 1)} ℃ < −38 ℃ → d`); }
    else { heat = "c"; reasons.push(`10 ℃ 이상인 달 ${warmMonths}개(1~3개) → c`); }
    code = group + rain + heat;
  }
  return { code, name: climateName(code), reasons, threshold, share };
}

/** 월평균 기온(꺾은선)과 강수량(막대)을 한 그림에 그린 기후 그래프입니다. */
export function climateSvg(data: ClimateData, options: { title?: string; width?: number } = {}) {
  const width = options.width ?? 420;
  const height = 290;
  const pad = { left: 44, right: 50, top: options.title === "" ? 18 : 34, bottom: 34 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const tMinRaw = Math.min(0, ...data.temps);
  const tMaxRaw = Math.max(30, ...data.temps);
  const tStep = niceStep(tMaxRaw - tMinRaw, 6);
  const tMin = Math.floor(tMinRaw / tStep) * tStep;
  const tMax = Math.ceil(tMaxRaw / tStep) * tStep;
  const ticks = Math.round((tMax - tMin) / tStep);
  // 강수량 눈금은 기온 눈금과 같은 줄에 맞춥니다.
  const pStep = niceStep(Math.max(100, ...data.precip) / ticks, 1) || 50;
  const pMax = pStep * ticks;
  const x = (month: number) => pad.left + ((month + 0.5) / 12) * plotW;
  const yT = (t: number) => pad.top + ((tMax - t) / (tMax - tMin)) * plotH;
  const yP = (p: number) => pad.top + plotH - (p / pMax) * plotH;
  const f = (value: number) => value.toFixed(1);
  const parts: string[] = [];
  const stats = climateStats(data);
  const title = options.title ?? `${data.name} (연평균 ${num(stats.mean, 1)} ℃ · 연강수량 ${num(stats.total, 0)} mm)`;
  if (title) parts.push(svgText(width / 2, 18, title, { size: 12.5, anchor: "middle", weight: 700 }));
  for (let index = 0; index <= ticks; index += 1) {
    const y = pad.top + (index / ticks) * plotH;
    parts.push(`<line x1="${pad.left}" y1="${f(y)}" x2="${pad.left + plotW}" y2="${f(y)}" stroke="#e5e7eb"/>`);
    parts.push(svgText(pad.left - 5, y + 3.5, num(tMax - index * tStep), { size: 10, anchor: "end", color: "#b91c1c" }));
    parts.push(svgText(pad.left + plotW + 5, y + 3.5, num(pMax - index * pStep), { size: 10, color: "#1d4ed8" }));
  }
  if (tMin < 0 && tMax > 0) parts.push(`<line x1="${pad.left}" y1="${f(yT(0))}" x2="${pad.left + plotW}" y2="${f(yT(0))}" stroke="#9ca3af" stroke-width="1.2"/>`);
  const barW = (plotW / 12) * 0.62;
  data.precip.forEach((p, month) => parts.push(`<rect x="${f(x(month) - barW / 2)}" y="${f(yP(Math.max(0, p)))}" width="${f(barW)}" height="${f(yP(0) - yP(Math.max(0, p)))}" fill="#93c5fd" stroke="#2563eb" stroke-width=".8"/>`));
  parts.push(`<path d="${data.temps.map((t, month) => `${month ? "L" : "M"}${f(x(month))} ${f(yT(t))}`).join(" ")}" fill="none" stroke="#dc2626" stroke-width="2.2" stroke-linejoin="round"/>`);
  data.temps.forEach((t, month) => parts.push(`<circle cx="${f(x(month))}" cy="${f(yT(t))}" r="2.6" fill="#dc2626"/>`));
  parts.push(`<rect x="${pad.left}" y="${pad.top}" width="${plotW}" height="${plotH}" fill="none" stroke="#111" stroke-width="1.2"/>`);
  for (let month = 0; month < 12; month += 1) parts.push(svgText(x(month), pad.top + plotH + 14, String(month + 1), { size: 10, anchor: "middle", color: "#333" }));
  parts.push(svgText(pad.left + plotW / 2, height - 4, "월", { size: 10.5, anchor: "middle", italic: true }));
  parts.push(svgText(4, pad.top - 8, "기온(℃)", { size: 10.5, color: "#b91c1c", weight: 700 }));
  parts.push(svgText(width - 4, pad.top - 8, "강수량(mm)", { size: 10.5, anchor: "end", color: "#1d4ed8", weight: 700 }));
  if (data.south) parts.push(svgText(pad.left + 6, pad.top + 14, "남반구", { size: 10, color: "#555" }));
  return svgWrap(width, height, parts.join(""));
}

export function climateTableHtml(data: ClimateData, options: { blankTotals?: boolean } = {}) {
  const months = [...Array(12).keys()].map(month => `${month + 1}월`);
  const stats = climateStats(data);
  return sheetTable(["", ...months, "연"], [
    ["기온(℃)", ...data.temps.map(t => num(t, 1)), options.blankTotals ? "" : num(stats.mean, 1)],
    ["강수량(mm)", ...data.precip.map(p => num(p, 0)), options.blankTotals ? "" : num(stats.total, 0)],
  ], { font: "8.5pt" });
}

/* ───── 문제 ───── */
export type ClimateAsk = "classify" | "stats" | "reason";
export const climateAsks: Record<ClimateAsk, string> = { classify: "그래프 보고 기후 구분", stats: "연교차·연강수량 구하기", reason: "판정 근거 쓰기" };

export function climateProblems(asks: ClimateAsk[], perAsk: number, seed: number, coldLine: ColdLine = -3, presets = CLIMATE_PRESETS): SheetSection[] {
  const pool = presets.filter(preset => !preset.highland);
  if (!asks.length || !pool.length) return [];
  const order = shuffled(pool, seed * 17 + 3);
  const random = seededRandom(seed * 29 + 1);
  let cursor = Math.floor(random() * order.length);
  const next = () => order[cursor++ % order.length];
  const sections: SheetSection[] = [];
  for (const ask of asks) {
    const problems = [];
    for (let index = 0; index < perAsk; index += 1) {
      const data = next();
      const result = koppen(data, coldLine);
      const stats = climateStats(data);
      const label = `(${String.fromCharCode(65 + index)}) 지역`;
      const hidden = { ...data, name: label };
      if (ask === "classify") {
        problems.push(problem(`다음은 어느 지역의 기후 그래프이다.${data.south ? " (남반구)" : ""} 쾨펜의 기후 구분에 따른 기후 기호와 이름을 쓰시오.`,
          `${result.code} · ${escapeHtml(result.name)} — ${escapeHtml(data.name)}`, { figure: climateSvg(hidden, { title: label }), space: 10 }));
      } else if (ask === "stats") {
        problems.push(problem(`다음 표는 ${escapeHtml(label)}의 기후 자료이다. 기온의 연교차와 연강수량을 구하시오.${climateTableHtml(hidden, { blankTotals: true })}`,
          `연교차 ${num(stats.range, 1)} ℃ (최난월 ${num(stats.warmest, 1)} − 최한월 ${num(stats.coldest, 1)}), 연강수량 ${num(stats.total, 0)} mm`, { space: 12 }));
      } else {
        problems.push(problem(`다음 기후 그래프의 지역이 ${escapeHtml(result.name)}(${result.code})에 속하는 까닭을 기온과 강수량의 기준으로 쓰시오.${data.south ? " (남반구)" : ""}`,
          result.reasons.map(escapeHtml).join("<br>"), { figure: climateSvg(hidden, { title: label }), space: 22 }));
      }
    }
    sections.push({ heading: climateAsks[ask], problems });
  }
  return sections;
}
