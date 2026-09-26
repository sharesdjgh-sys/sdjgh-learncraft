/* 지리: 인구 피라미드(5세 연령층 남녀 인구), 부양비·노령화 지수·고령 사회 단계, 인구 변천 모형, 문제입니다. 모형 자료는 가상 자료입니다. */
import { arrowSvg, escapeHtml, num, problem, seededRandom, sheetTable, shuffled, svgText, svgWrap, type SheetSection } from "./sheet";

/** 0~4세, 5~9세, …, 80~84세, 85세 이상의 18칸입니다. */
export const AGE_GROUPS = [...Array(17).keys()].map(index => `${index * 5}~${index * 5 + 4}`).concat("85+");
export type Pyramid = { male: number[]; female: number[] };

export type PyramidModel = "pyramid" | "bell" | "spindle" | "star" | "gourd";
export const pyramidModels: Record<PyramidModel, { name: string; note: string }> = {
  pyramid: { name: "피라미드형", note: "출생률과 사망률이 모두 높아 유소년층 비율이 높아요. 개발 도상국에서 나타나요." },
  bell: { name: "종형", note: "출생률과 사망률이 모두 낮아 연령층별 인구 차이가 작아요. 인구 증가가 정체돼요." },
  spindle: { name: "방추형(항아리형)", note: "출생률이 사망률보다 낮아 유소년층이 줄어들어요. 저출산·고령화가 진행된 선진국에서 나타나요." },
  star: { name: "별형", note: "청장년층이 많이 들어와 20~30대 비율이 높아요. 도시 지역에서 나타나요." },
  gourd: { name: "표주박형", note: "청장년층이 빠져나가 20~30대 비율이 낮고 노년층 비율이 높아요. 농어촌 지역에서 나타나요." },
};

/** 모형 모양의 가상 인구(천 명)입니다. 여자는 노년층으로 갈수록 조금 더 많게 둡니다. */
export function modelPyramid(model: PyramidModel): Pyramid {
  const male = AGE_GROUPS.map((_, index) => {
    if (model === "pyramid") return 1000 * 0.83 ** index;
    if (model === "bell") return index < 11 ? 600 - index * 6 : 540 * 0.72 ** (index - 10);
    if (model === "spindle") return index <= 9 ? 350 + index * 28 : 602 * 0.86 ** (index - 9);
    if (model === "star") { const base = index < 11 ? 520 - index * 8 : 440 * 0.74 ** (index - 10); return index >= 4 && index <= 7 ? base * 1.7 : base; }
    // 표주박형: 청장년층(20~39세)이 빠져나가 허리가 잘록하고 노년층은 오래 남습니다.
    const base = index <= 12 ? 520 - index * 8 : 424 * 0.8 ** (index - 12);
    return index >= 4 && index <= 7 ? base * 0.45 : index === 8 ? base * 0.7 : base;
  }).map(value => Math.round(value));
  const female = male.map((value, index) => Math.round(value * (index >= 13 ? 1 + 0.1 * (index - 12) : 0.96)));
  return { male, female };
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
export type AgingStage = "none" | "aging" | "aged" | "super";
export const agingNames: Record<AgingStage, string> = { none: "고령화 사회 이전", aging: "고령화 사회", aged: "고령 사회", super: "초고령 사회" };
/** 65세 이상 인구 비율(%)로 정하는 사회 단계(UN 기준 7·14·20%)입니다. */
export const agingStage = (oldShare: number): AgingStage => oldShare >= 20 ? "super" : oldShare >= 14 ? "aged" : oldShare >= 7 ? "aging" : "none";

/** 유소년(0~14세)·청장년(15~64세)·노년(65세 이상) 인구와 부양비·노령화 지수입니다. */
export function dependency(youth: number, working: number, old: number) {
  const total = youth + working + old;
  const oldShare = total > 0 ? (old / total) * 100 : 0;
  return {
    youth, working, old, total,
    youthRatio: working > 0 ? (youth / working) * 100 : 0,
    oldRatio: working > 0 ? (old / working) * 100 : 0,
    totalRatio: working > 0 ? ((youth + old) / working) * 100 : 0,
    agingIndex: youth > 0 ? (old / youth) * 100 : 0,
    oldShare, stage: agingStage(oldShare),
  };
}
export function pyramidStats(pyramid: Pyramid) {
  const both = pyramid.male.map((value, index) => value + (pyramid.female[index] ?? 0));
  return dependency(sum(both.slice(0, 3)), sum(both.slice(3, 13)), sum(both.slice(13)));
}

/** 인구 피라미드(남자 왼쪽, 여자 오른쪽, 전체 인구에 대한 %)입니다. */
export function pyramidSvg(pyramid: Pyramid, options: { title?: string; width?: number } = {}) {
  const width = options.width ?? 420;
  const rows = AGE_GROUPS.length;
  const rowH = 13;
  const top = options.title ? 30 : 12;
  const height = top + rows * rowH + 34;
  const labelW = 44;
  const half = (width - labelW - 24) / 2;
  const center = width / 2;
  const total = sum(pyramid.male) + sum(pyramid.female) || 1;
  const shares = [...pyramid.male, ...pyramid.female].map(value => (value / total) * 100);
  const maxShare = Math.max(2, Math.ceil(Math.max(...shares) / 2) * 2);
  const scale = (share: number) => (share / maxShare) * half;
  const f = (value: number) => value.toFixed(1);
  const parts: string[] = [];
  if (options.title) parts.push(svgText(center, 18, options.title, { size: 12.5, anchor: "middle", weight: 700 }));
  AGE_GROUPS.forEach((label, index) => {
    const y = top + (rows - 1 - index) * rowH;
    const m = scale((pyramid.male[index] / total) * 100);
    const w = scale(((pyramid.female[index] ?? 0) / total) * 100);
    parts.push(`<rect x="${f(center - labelW / 2 - m)}" y="${y + 1}" width="${f(m)}" height="${rowH - 2}" fill="#60a5fa"/>`);
    parts.push(`<rect x="${f(center + labelW / 2)}" y="${y + 1}" width="${f(w)}" height="${rowH - 2}" fill="#f87171"/>`);
    parts.push(svgText(center, y + rowH - 3, label, { size: 8.5, anchor: "middle", color: "#333" }));
  });
  const base = top + rows * rowH;
  parts.push(`<line x1="${f(center - labelW / 2 - half)}" y1="${base}" x2="${f(center - labelW / 2)}" y2="${base}" stroke="#111"/><line x1="${f(center + labelW / 2)}" y1="${base}" x2="${f(center + labelW / 2 + half)}" y2="${base}" stroke="#111"/>`);
  for (let share = 0; share <= maxShare; share += maxShare / 2) {
    parts.push(svgText(center - labelW / 2 - scale(share), base + 12, num(share), { size: 9, anchor: "middle", color: "#555" }));
    parts.push(svgText(center + labelW / 2 + scale(share), base + 12, num(share), { size: 9, anchor: "middle", color: "#555" }));
  }
  parts.push(svgText(center - labelW / 2 - half / 2, base + 26, "남자(%)", { size: 10.5, anchor: "middle", color: "#1d4ed8", weight: 700 }));
  parts.push(svgText(center + labelW / 2 + half / 2, base + 26, "여자(%)", { size: 10.5, anchor: "middle", color: "#b91c1c", weight: 700 }));
  parts.push(svgText(center, base + 26, "(세)", { size: 9, anchor: "middle", color: "#555" }));
  return svgWrap(width, height, parts.join(""));
}

/* ───── 인구 변천 모형 ───── */
export const TRANSITION_STAGES = [
  { name: "1단계(고위 정지기)", note: "출생률과 사망률이 모두 높아 인구가 거의 늘지 않아요(다산다사)." },
  { name: "2단계(초기 확장기)", note: "사망률이 빠르게 낮아지고 출생률은 높아 인구가 빠르게 늘어요(다산감사)." },
  { name: "3단계(후기 확장기)", note: "출생률도 낮아지기 시작해 인구 증가가 느려져요(감산소사)." },
  { name: "4단계(저위 정지기)", note: "출생률과 사망률이 모두 낮아 인구 증가가 정체돼요(소산소사)." },
  { name: "5단계(인구 감소기)", note: "출생률이 사망률보다 낮아져 인구가 줄어들어요." },
];
/** 인구 변천 모형 그림입니다. 곡선은 모양을 보여 주는 가상 값입니다. */
export function transitionSvg(options: { stages?: 4 | 5; marks?: boolean } = {}) {
  const stages = options.stages ?? 4;
  const width = 520;
  const height = 270;
  const left = 46; const right = 18; const top = 20; const bottom = 48;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const X = (t: number) => left + (t / stages) * plotW;
  const Y = (rate: number) => top + plotH - (rate / 45) * plotH;
  const smooth = (t: number, from: number, to: number, start: number, end: number) => { const s = Math.min(1, Math.max(0, (t - start) / (end - start))); return from + (to - from) * (s * s * (3 - 2 * s)); };
  const birth = (t: number) => t < 1.8 ? 40 + Math.sin(t * 5) * 0.6 : smooth(t, 40, 12, 1.8, 3.2) - (stages === 5 ? smooth(t, 0, 4, 4, 4.6) : 0);
  const death = (t: number) => t < 1 ? 37 + Math.sin(t * 7) * 2.5 : smooth(t, 37, 10, 1, 2.8) + (stages === 5 ? smooth(t, 0, 3, 4, 4.8) : 0);
  const steps = 120;
  const points = (rate: (t: number) => number) => [...Array(steps + 1).keys()].map(index => { const t = (index / steps) * stages; return [X(t), Y(rate(t))] as const; });
  const bp = points(birth); const dp = points(death);
  const f = (value: number) => value.toFixed(1);
  const parts: string[] = [];
  // 자연 증가(출생률 − 사망률)는 연한 색으로 칠합니다.
  parts.push(`<path d="${bp.map(([x, y], index) => `${index ? "L" : "M"}${f(x)} ${f(y)}`).join(" ")} ${[...dp].reverse().map(([x, y]) => `L${f(x)} ${f(y)}`).join(" ")} Z" fill="#fde68a" opacity=".7"/>`);
  for (let stage = 1; stage < stages; stage += 1) parts.push(`<line x1="${f(X(stage))}" y1="${top}" x2="${f(X(stage))}" y2="${top + plotH}" stroke="#9ca3af" stroke-dasharray="4 3"/>`);
  parts.push(`<path d="${bp.map(([x, y], index) => `${index ? "L" : "M"}${f(x)} ${f(y)}`).join(" ")}" fill="none" stroke="#dc2626" stroke-width="2.4"/>`);
  parts.push(`<path d="${dp.map(([x, y], index) => `${index ? "L" : "M"}${f(x)} ${f(y)}`).join(" ")}" fill="none" stroke="#1d4ed8" stroke-width="2.4" stroke-dasharray="7 4"/>`);
  parts.push(`<line x1="${left}" y1="${top + plotH}" x2="${left + plotW}" y2="${top + plotH}" stroke="#111"/>` + arrowSvg(left, top + plotH, left, top - 8, "#111", 1.3));
  parts.push(svgText(left - 6, top + 4, "(‰)", { size: 10, anchor: "end" }));
  parts.push(svgText(X(0.5), Y(42) - 4, "출생률", { size: 11, anchor: "middle", color: "#b91c1c", weight: 700 }));
  parts.push(svgText(X(1.45) - 6, Y(death(1.45)) + 6, "사망률", { size: 11, anchor: "end", color: "#1d4ed8", weight: 700 }));
  parts.push(svgText(X(2.25), Y(27), "자연 증가", { size: 10.5, anchor: "middle", color: "#92400e", weight: 700 }));
  for (let stage = 0; stage < stages; stage += 1) {
    const label = options.marks ? `(${"가나다라마"[stage]})` : TRANSITION_STAGES[stage].name.replace(/\(.*\)/, "");
    parts.push(svgText(X(stage + 0.5), top + plotH + 16, label, { size: 11, anchor: "middle", weight: 700 }));
  }
  parts.push(svgText(left + plotW / 2, height - 8, "시간 →", { size: 10.5, anchor: "middle", italic: true }));
  return svgWrap(width, height, parts.join(""));
}

/* ───── 문제 ───── */
export type PopulationAsk = "ratio" | "type" | "aging" | "transition";
export const populationAsks: Record<PopulationAsk, string> = { ratio: "부양비·노령화 지수", type: "피라미드 유형", aging: "고령 사회 단계", transition: "인구 변천 단계" };

export function populationProblems(asks: PopulationAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 43 + 7);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const models = shuffled(Object.keys(pyramidModels) as PyramidModel[], seed * 5 + 2);
  const stages = shuffled([0, 1, 2, 3], seed * 3 + 1);
  const sections: SheetSection[] = [];
  for (const ask of asks) {
    const problems = [];
    for (let index = 0; index < perAsk; index += 1) {
      if (ask === "ratio") {
        // 청장년 인구를 100의 배수로 두어 부양비가 깔끔한 수가 되게 합니다.
        const working = pick([500, 600, 700, 800, 1000]);
        const youth = working * pick([0.15, 0.2, 0.25, 0.3, 0.4, 0.5]);
        const old = working * pick([0.1, 0.15, 0.2, 0.3, 0.4]);
        const d = dependency(youth, working, old);
        const table = sheetTable(["구분", "유소년(0~14세)", "청장년(15~64세)", "노년(65세 이상)"], [["인구(만 명)", num(youth, 0), num(working, 0), num(old, 0)]]);
        problems.push(problem(`다음은 어느 국가의 연령층별 인구이다. 유소년 부양비, 노년 부양비, 총부양비, 노령화 지수를 구하시오.${table}`,
          `유소년 부양비 ${num(d.youthRatio, 1)}, 노년 부양비 ${num(d.oldRatio, 1)}, 총부양비 ${num(d.totalRatio, 1)}, 노령화 지수 ${num(d.agingIndex, 1)} (부양비 = 부양 인구 ÷ 청장년 인구 × 100, 노령화 지수 = 노년 ÷ 유소년 × 100)`, { space: 16 }));
      } else if (ask === "type") {
        const model = models[index % models.length];
        const label = `(${"가나다라마"[index % 5]})`;
        problems.push(problem(`다음 인구 피라미드 ${label}의 유형을 쓰고, 이런 인구 구조가 나타나는 지역의 특징을 설명하시오.`,
          `${escapeHtml(pyramidModels[model].name)} — ${escapeHtml(pyramidModels[model].note)}`, { figure: pyramidSvg(modelPyramid(model), { title: label, width: 360 }), space: 14 }));
      } else if (ask === "aging") {
        const total = pick([1000, 2000, 4000, 5000]);
        const share = pick([5, 8, 12, 15, 18, 21, 25]);
        const old = (total * share) / 100;
        const stage = agingStage(share);
        problems.push(problem(`전체 인구가 ${num(total, 0)}만 명이고 65세 이상 인구가 ${num(old, 0)}만 명인 국가가 있다. 65세 이상 인구 비율을 구하고, 어떤 사회에 해당하는지 쓰시오. (기준: 7% 이상 고령화 사회, 14% 이상 고령 사회, 20% 이상 초고령 사회)`,
          `${num(share, 1)}% → ${agingNames[stage]}`, { space: 10 }));
      } else {
        const stage = stages[index % stages.length];
        problems.push(problem(`그림은 인구 변천 모형이다. ‘${escapeHtml(TRANSITION_STAGES[stage].note)}’에 해당하는 단계를 (가)~(라)에서 고르시오.`,
          `(${"가나다라"[stage]}) ${escapeHtml(TRANSITION_STAGES[stage].name)}`, { figure: transitionSvg({ marks: true }), space: 6 }));
      }
    }
    sections.push({ heading: populationAsks[ask], problems });
  }
  return sections;
}
