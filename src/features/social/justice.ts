/* 윤리·통합사회: 사회 A·B·C의 계층별 소득 분배를 공리주의·롤스(최소 수혜자)·평등 기준으로 비교하고, 교정적 정의와 정의관 문제를 만듭니다. */
import { circled, escapeHtml, grouped, num, problem, seededRandom, sheetTable, shuffled, svgText, svgWrap, type SheetProblem, type SheetSection } from "./sheet";

export type IncomeGroup = { people: number; income: number };
export type Society = { name: string; groups: IncomeGroup[] };

/** 기본 예시: 총합은 B, 최소 수혜자 몫은 C, 평등은 A가 가장 큽니다. */
export const DEFAULT_SOCIETIES: Society[] = [
  { name: "A 사회", groups: [35, 35, 35, 35, 35].map(income => ({ people: 20, income })) },
  { name: "B 사회", groups: [10, 30, 60, 100, 200].map(income => ({ people: 20, income })) },
  { name: "C 사회", groups: [40, 50, 60, 80, 100].map(income => ({ people: 20, income })) },
];
export const GROUP_NAMES = ["1계층(가장 낮음)", "2계층", "3계층", "4계층", "5계층(가장 높음)"];

export type SocietyStats = { people: number; total: number; average: number; min: number; max: number; ratio: number; gini: number };
/** 계층별 인원과 소득으로 총소득·평균·최소 소득·최고/최저 비·지니 계수를 구합니다(같은 계층 안은 소득이 같다고 봅니다). */
export function societyStats(society: Society): SocietyStats {
  const groups = society.groups.filter(group => group.people > 0);
  const people = groups.reduce((sum, group) => sum + group.people, 0);
  const total = groups.reduce((sum, group) => sum + group.people * group.income, 0);
  const average = people ? total / people : 0;
  const incomes = groups.map(group => group.income);
  const min = incomes.length ? Math.min(...incomes) : 0;
  const max = incomes.length ? Math.max(...incomes) : 0;
  let spread = 0;
  for (const a of groups) for (const b of groups) spread += a.people * b.people * Math.abs(a.income - b.income);
  const gini = people && average ? spread / (2 * people * people * average) : 0;
  return { people, total, average, min, max, ratio: min > 0 ? max / min : Infinity, gini };
}

export type JusticeCriterion = "total" | "average" | "maximin" | "equality";
export const justiceCriteria: Record<JusticeCriterion, { label: string; view: string; rule: string }> = {
  total: { label: "총소득이 가장 큰 사회", view: "공리주의(총합)", rule: "사회 전체의 행복(소득) 총량이 가장 큰 사회를 고릅니다." },
  average: { label: "1인당 평균 소득이 가장 큰 사회", view: "공리주의(평균)", rule: "구성원 한 사람의 평균 몫이 가장 큰 사회를 고릅니다." },
  maximin: { label: "최소 수혜자의 몫이 가장 큰 사회", view: "롤스(차등 원칙)", rule: "가장 불리한 계층의 소득이 가장 큰 사회를 고릅니다(최소 극대화)." },
  equality: { label: "지니 계수가 가장 작은 사회", view: "평등주의(결과의 평등)", rule: "소득 격차가 가장 작은 사회를 고릅니다." },
};
const criterionValue = (stats: SocietyStats, criterion: JusticeCriterion) =>
  criterion === "total" ? stats.total : criterion === "average" ? stats.average : criterion === "maximin" ? stats.min : -stats.gini;
/** 기준마다 가장 알맞은 사회의 번호입니다. 같은 값이 여럿이면 모두 돌려줍니다. */
export function bestSocieties(societies: Society[], criterion: JusticeCriterion) {
  const values = societies.map(society => criterionValue(societyStats(society), criterion));
  const top = Math.max(...values);
  return values.flatMap((value, index) => Math.abs(value - top) < 1e-9 ? [index] : []);
}

const COLORS = ["#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c"];
/** 계층별 소득 막대그래프(사회마다 한 묶음)입니다. */
export function distributionSvg(societies: Society[], width = 640) {
  const height = 260;
  const pad = { left: 44, right: 16, top: 26, bottom: 44 };
  const maxIncome = Math.max(1, ...societies.flatMap(society => society.groups.map(group => group.income)));
  const step = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000, 2000, 5000].find(value => maxIncome / value <= 6) ?? 10000;
  const yMax = Math.ceil(maxIncome / step) * step;
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const sy = (value: number) => pad.top + plotH - (value / yMax) * plotH;
  const parts: string[] = [];
  for (let value = 0; value <= yMax + 1e-9; value += step) {
    parts.push(`<line x1="${pad.left}" y1="${sy(value).toFixed(1)}" x2="${width - pad.right}" y2="${sy(value).toFixed(1)}" stroke="${value ? "#e5e7eb" : "#111"}" stroke-width="${value ? 1 : 1.4}"/>`);
    parts.push(svgText(pad.left - 5, sy(value) + 3.5, num(value, 0), { size: 10, anchor: "end", color: "#333" }));
  }
  parts.push(svgText(pad.left, 14, "소득", { size: 11, italic: true }));
  const slot = plotW / Math.max(1, societies.length);
  societies.forEach((society, index) => {
    const count = Math.max(1, society.groups.length);
    const barW = Math.min(26, (slot * 0.78) / count);
    const start = pad.left + slot * index + (slot - barW * count) / 2;
    society.groups.forEach((group, at) => {
      const x = start + at * barW;
      parts.push(`<rect x="${x.toFixed(1)}" y="${sy(group.income).toFixed(1)}" width="${(barW - 2).toFixed(1)}" height="${(sy(0) - sy(group.income)).toFixed(1)}" fill="${COLORS[at % COLORS.length]}" opacity="0.8"/>`);
    });
    parts.push(svgText(pad.left + slot * index + slot / 2, height - pad.bottom + 16, society.name, { size: 12, anchor: "middle", weight: 700 }));
  });
  const legendY = height - 10;
  legendLabels(Math.max(0, ...societies.map(society => society.groups.length))).forEach((label, at) => {
    const x = pad.left + at * 112;
    parts.push(`<rect x="${x}" y="${legendY - 8}" width="10" height="10" fill="${COLORS[at % COLORS.length]}" opacity="0.8"/>`, svgText(x + 13, legendY + 1, label, { size: 9.5, color: "#333" }));
  });
  return svgWrap(width, height, parts.join(""));
}
const legendLabels = (count: number) => Array.from({ length: count }, (_, at) => `${at + 1}계층`);

export function societyTableHtml(societies: Society[]) {
  const head = ["구분", ...societies.map(society => escapeHtml(society.name))];
  const count = Math.max(...societies.map(society => society.groups.length));
  const rows = Array.from({ length: count }, (_, at) => [`${at + 1}계층`, ...societies.map(society => society.groups[at] ? `${grouped(society.groups[at].income)} (${grouped(society.groups[at].people)}명)` : "—")]);
  return sheetTable(head, rows, { font: "9.5pt" });
}

/* ───── 교정적 정의 ───── */
export const PUNISHMENT_VIEWS = {
  head: ["구분", "응보주의", "공리주의"],
  rows: [
    ["대표 사상가", "칸트", "벤담, 베카리아"],
    ["처벌의 근거", "범죄를 저질렀다는 사실 그 자체", "처벌이 가져올 사회적 이익(범죄 예방·교화)"],
    ["처벌의 정도", "범죄의 무게와 같은 만큼(동등성의 원리)", "사회 전체의 이익을 가장 크게 하는 만큼"],
    ["인간을 보는 관점", "범죄자도 자기 행위에 책임지는 이성적 인격체", "처벌은 고통이므로 더 큰 이익이 있을 때만 정당화"],
    ["사형에 대한 입장", "살인죄에는 사형이 정당하다고 봄", "예방 효과로 판단함(베카리아는 종신 노역형이 더 효과적이라며 폐지 주장)"],
  ],
};

/* ───── 정의관 판단 문제 ───── */
export const JUSTICE_STATEMENTS: { text: string; view: string; note: string }[] = [
  { text: "사회적·경제적 불평등은 그 사회에서 가장 불리한 사람에게 최대의 이익이 될 때만 허용된다.", view: "롤스", note: "차등 원칙" },
  { text: "자신의 처지를 모르는 상태에서 합의한 원칙이어야 공정한 정의의 원칙이 된다.", view: "롤스", note: "원초적 입장·무지의 베일" },
  { text: "정당하게 번 소득에 세금을 매겨 다른 사람에게 나누어 주는 것은 개인의 권리를 침해한다.", view: "노직", note: "소유 권리론·재분배 반대" },
  { text: "정당하게 취득하고 이전받았다면 분배의 결과가 어떻든 그 소유는 정의롭다.", view: "노직", note: "취득·이전·교정의 원칙" },
  { text: "돈으로 공직이나 명예를 살 수 없어야 하듯, 각 가치는 그 영역의 고유한 기준에 따라 나누어야 한다.", view: "왈처", note: "복합 평등" },
  { text: "분배는 사회 전체의 행복 총량을 가장 크게 만드는 방식이어야 한다.", view: "공리주의", note: "최대 다수의 최대 행복" },
  { text: "능력에 따라 일하고 필요에 따라 분배받는 사회가 이상적이다.", view: "마르크스", note: "필요에 따른 분배" },
  { text: "죄를 지은 사람은 그 행위의 무게만큼 처벌받아야 하며, 처벌은 그 자체로 정당하다.", view: "칸트", note: "응보주의" },
  { text: "처벌은 범죄를 예방하고 사회 전체의 이익을 늘릴 때만 정당하다.", view: "벤담", note: "공리주의 형벌관" },
];
export const JUSTICE_VIEWS = ["롤스", "노직", "왈처", "공리주의", "마르크스", "칸트", "벤담"];

export type JusticeAsk = "choose" | "stats" | "statement";
export const justiceAsks: Record<JusticeAsk, string> = { choose: "기준별로 고르는 사회", stats: "총소득·최소 수혜자 계산", statement: "정의관·사상가 판단" };

/** 기준마다 답이 하나로 정해지는 사회 세 개를 seed로 만듭니다. */
function randomSocieties(random: () => number): Society[] {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const societies = ["갑국", "을국", "병국"].map(name => {
      const base = 10 + Math.floor(random() * 5) * 10;
      const incomes = [base];
      for (let at = 1; at < 4; at += 1) incomes.push(incomes[at - 1] + Math.floor(random() * 6) * 10);
      return { name, groups: incomes.map(income => ({ people: 25, income })) };
    });
    const unique = (["total", "maximin", "equality"] as JusticeCriterion[]).every(criterion => bestSocieties(societies, criterion).length === 1);
    const picks = new Set((["total", "maximin", "equality"] as JusticeCriterion[]).map(criterion => bestSocieties(societies, criterion)[0]));
    if (unique && picks.size >= 2) return societies;
  }
  return DEFAULT_SOCIETIES.map((society, index) => ({ ...society, name: ["갑국", "을국", "병국"][index] }));
}

export function justiceProblems(asks: JusticeAsk[], perAsk: number, seed: number): SheetSection[] {
  const random = seededRandom(seed * 41 + 9);
  const problems: SheetProblem[] = [];
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "statement") {
      const statement = shuffled(JUSTICE_STATEMENTS, seed * 3 + 1)[index % JUSTICE_STATEMENTS.length];
      const choices = shuffled([statement.view, ...shuffled(JUSTICE_VIEWS.filter(view => view !== statement.view), seed + index).slice(0, 3)], seed * 5 + index);
      problems.push(problem(
        `다음 주장과 가장 가까운 입장은?<div style="margin:1.5mm 0;padding:2mm 3mm;border:1px solid #888">${escapeHtml(statement.text)}</div>${choices.map((choice, at) => `${circled(at)} ${escapeHtml(choice)}`).join("&nbsp;&nbsp;&nbsp;")}`,
        `${circled(choices.indexOf(statement.view))} ${escapeHtml(statement.view)} (${escapeHtml(statement.note)})`,
      ));
      continue;
    }
    const societies = randomSocieties(random);
    const table = societyTableHtml(societies);
    const intro = `다음은 인구가 같은 갑국, 을국, 병국의 계층별 1인당 소득(괄호는 인원)이다.${table}`;
    if (ask === "choose") {
      const answer = (["total", "maximin", "equality"] as JusticeCriterion[]).map(criterion => `${justiceCriteria[criterion].view}: ${escapeHtml(societies[bestSocieties(societies, criterion)[0]].name)}`).join(", ");
      problems.push(problem(`${intro}(1) 사회 전체의 소득 총량을 기준으로 하는 공리주의, (2) 최소 수혜자의 몫을 기준으로 하는 롤스의 차등 원칙, (3) 소득 격차가 가장 작은 것을 기준으로 하는 평등주의에 따르면 각각 어느 나라를 선택하는지 쓰시오.`, answer, { space: 10 }));
    } else {
      const stats = societies.map(societyStats);
      const answer = societies.map((society, at) => `${escapeHtml(society.name)}: 총소득 ${grouped(stats[at].total)}, 최소 수혜자 ${grouped(stats[at].min)}`).join(" / ");
      problems.push(problem(`${intro}각 나라의 총소득(인원 × 소득의 합)과 최소 수혜자(1계층)의 소득을 구하시오.`, answer, { space: 16 }));
    }
  }
  return problems.length ? [{ heading: "분배 정의", problems }] : [];
}
