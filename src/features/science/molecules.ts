/* 화학: 루이스 전자점식·구조식, 전자쌍 반발 이론(분자 모양·결합각), 분자의 극성과 학습지입니다.
 * 분자는 교과서에 자주 나오는 것만 골라 원자 배치를 직접 적었습니다(자동 생성보다 틀리지 않게). */
import { particle } from "@/features/language-sheet";
import { escapeHtml, sheetTable, subDigits, svgWrap, type SheetProblem, type SheetSection } from "./sheet";

type Terminal = { symbol: string; bond: 1 | 2 | 3; lone: number };
export type Molecule = {
  formula: string; name: string;
  center: string; centerLone: number;
  /** 중심 원자에 결합한 원자들. 두 원자 분자는 center가 한쪽 원자입니다. */
  terminals: Terminal[];
  shape: string; angle: string; polar: boolean;
};

export const MOLECULES: Molecule[] = [
  { formula: "H2", name: "수소", center: "H", centerLone: 0, terminals: [{ symbol: "H", bond: 1, lone: 0 }], shape: "직선형", angle: "180°", polar: false },
  { formula: "HCl", name: "염화 수소", center: "H", centerLone: 0, terminals: [{ symbol: "Cl", bond: 1, lone: 3 }], shape: "직선형", angle: "180°", polar: true },
  { formula: "O2", name: "산소", center: "O", centerLone: 2, terminals: [{ symbol: "O", bond: 2, lone: 2 }], shape: "직선형", angle: "180°", polar: false },
  { formula: "N2", name: "질소", center: "N", centerLone: 1, terminals: [{ symbol: "N", bond: 3, lone: 1 }], shape: "직선형", angle: "180°", polar: false },
  { formula: "H2O", name: "물", center: "O", centerLone: 2, terminals: [{ symbol: "H", bond: 1, lone: 0 }, { symbol: "H", bond: 1, lone: 0 }], shape: "굽은형", angle: "104.5°", polar: true },
  { formula: "NH3", name: "암모니아", center: "N", centerLone: 1, terminals: [{ symbol: "H", bond: 1, lone: 0 }, { symbol: "H", bond: 1, lone: 0 }, { symbol: "H", bond: 1, lone: 0 }], shape: "삼각뿔형", angle: "107°", polar: true },
  { formula: "CH4", name: "메테인", center: "C", centerLone: 0, terminals: [{ symbol: "H", bond: 1, lone: 0 }, { symbol: "H", bond: 1, lone: 0 }, { symbol: "H", bond: 1, lone: 0 }, { symbol: "H", bond: 1, lone: 0 }], shape: "정사면체형", angle: "109.5°", polar: false },
  { formula: "CO2", name: "이산화 탄소", center: "C", centerLone: 0, terminals: [{ symbol: "O", bond: 2, lone: 2 }, { symbol: "O", bond: 2, lone: 2 }], shape: "직선형", angle: "180°", polar: false },
  { formula: "BF3", name: "삼플루오린화 붕소", center: "B", centerLone: 0, terminals: [{ symbol: "F", bond: 1, lone: 3 }, { symbol: "F", bond: 1, lone: 3 }, { symbol: "F", bond: 1, lone: 3 }], shape: "평면 삼각형", angle: "120°", polar: false },
  { formula: "BeCl2", name: "염화 베릴륨", center: "Be", centerLone: 0, terminals: [{ symbol: "Cl", bond: 1, lone: 3 }, { symbol: "Cl", bond: 1, lone: 3 }], shape: "직선형", angle: "180°", polar: false },
  { formula: "HCN", name: "사이안화 수소", center: "C", centerLone: 0, terminals: [{ symbol: "H", bond: 1, lone: 0 }, { symbol: "N", bond: 3, lone: 1 }], shape: "직선형", angle: "180°", polar: true },
  { formula: "HCHO", name: "폼알데하이드", center: "C", centerLone: 0, terminals: [{ symbol: "H", bond: 1, lone: 0 }, { symbol: "H", bond: 1, lone: 0 }, { symbol: "O", bond: 2, lone: 2 }], shape: "평면 삼각형", angle: "약 120°", polar: true },
  { formula: "CCl4", name: "사염화 탄소", center: "C", centerLone: 0, terminals: [{ symbol: "Cl", bond: 1, lone: 3 }, { symbol: "Cl", bond: 1, lone: 3 }, { symbol: "Cl", bond: 1, lone: 3 }, { symbol: "Cl", bond: 1, lone: 3 }], shape: "정사면체형", angle: "109.5°", polar: false },
  { formula: "CH3Cl", name: "클로로메테인", center: "C", centerLone: 0, terminals: [{ symbol: "H", bond: 1, lone: 0 }, { symbol: "H", bond: 1, lone: 0 }, { symbol: "H", bond: 1, lone: 0 }, { symbol: "Cl", bond: 1, lone: 3 }], shape: "사면체형", angle: "약 109.5°", polar: true },
  { formula: "NF3", name: "삼플루오린화 질소", center: "N", centerLone: 1, terminals: [{ symbol: "F", bond: 1, lone: 3 }, { symbol: "F", bond: 1, lone: 3 }, { symbol: "F", bond: 1, lone: 3 }], shape: "삼각뿔형", angle: "약 102°", polar: true },
  { formula: "OF2", name: "플루오린화 산소", center: "O", centerLone: 2, terminals: [{ symbol: "F", bond: 1, lone: 3 }, { symbol: "F", bond: 1, lone: 3 }], shape: "굽은형", angle: "약 103°", polar: true },
];
export const moleculeBy = new Map(MOLECULES.map(molecule => [molecule.formula, molecule]));
export const formulaLabel = (formula: string) => subDigits(formula);
const diatomic = (molecule: Molecule) => molecule.terminals.length === 1;

/** 중심 원자 주위의 공유 전자쌍·비공유 전자쌍 수(두 원자 분자는 분자 전체)입니다. */
export function pairCounts(molecule: Molecule) {
  const bonding = molecule.terminals.reduce((sum, item) => sum + item.bond, 0);
  const lone = diatomic(molecule) ? molecule.centerLone + molecule.terminals[0].lone : molecule.centerLone;
  return { bonding, lone, domains: molecule.terminals.length + molecule.centerLone };
}

const DIRECTIONS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
/** 루이스 구조. style "dot"은 공유 전자쌍도 점으로(전자점식), "line"은 결합선(구조식)으로 그립니다. */
export function lewisSvg(molecule: Molecule, style: "dot" | "line" = "line", size = 150) {
  const c = size / 2;
  const gap = size * 0.3;
  const parts: string[] = [];
  const atom = (x: number, y: number, symbol: string) => `<text x="${x.toFixed(1)}" y="${(y + 6).toFixed(1)}" font-size="17" font-weight="700" text-anchor="middle" fill="#111">${escapeHtml(symbol)}</text>`;
  const pair = (x: number, y: number, dx: number, dy: number, color = "#2563eb") => {
    const off = 3.4;
    return `<circle cx="${(x - dy * off).toFixed(1)}" cy="${(y - dx * off).toFixed(1)}" r="2.2" fill="${color}"/><circle cx="${(x + dy * off).toFixed(1)}" cy="${(y + dx * off).toFixed(1)}" r="2.2" fill="${color}"/>`;
  };
  // 두 원자 분자는 가운데에서 양옆으로, 그 밖에는 중심 원자 둘레에 놓습니다.
  const centerX = diatomic(molecule) ? c - gap / 2 : c;
  const used = new Set<number>();
  molecule.terminals.forEach((terminal, index) => {
    const direction = diatomic(molecule) ? 1 : index;
    used.add(direction);
    const [dx, dy] = DIRECTIONS[direction];
    const x = centerX + dx * gap;
    const y = c + dy * gap;
    const [x1, y1, x2, y2] = [centerX + dx * 12, c + dy * 12, x - dx * 12, y - dy * 12];
    for (let order = 0; order < terminal.bond; order += 1) {
      const shift = (order - (terminal.bond - 1) / 2) * (style === "line" ? 5 : 9);
      if (style === "line") parts.push(`<line x1="${(x1 - dy * shift).toFixed(1)}" y1="${(y1 + dx * shift).toFixed(1)}" x2="${(x2 - dy * shift).toFixed(1)}" y2="${(y2 + dx * shift).toFixed(1)}" stroke="#111" stroke-width="2"/>`);
      else parts.push(pair((x1 + x2) / 2 - dy * shift, (y1 + y2) / 2 + dx * shift, dy, dx, "#dc2626"));
    }
    parts.push(atom(x, y, terminal.symbol));
    // 끝 원자의 비공유 전자쌍은 결합 반대쪽과 옆쪽에 놓습니다.
    const around: [number, number][] = [[dx, dy], [dy, dx], [-dy, -dx]];
    for (let lone = 0; lone < terminal.lone; lone += 1) {
      const [ex, ey] = around[lone];
      parts.push(pair(x + ex * 15, y + ey * 15, ex, ey));
    }
  });
  parts.push(atom(centerX, c, molecule.center));
  const free = [0, 1, 2, 3].filter(direction => !used.has(direction));
  for (let lone = 0; lone < molecule.centerLone; lone += 1) {
    const [dx, dy] = DIRECTIONS[free[lone] ?? 2];
    parts.push(pair(centerX + dx * 15, c + dy * 15, dx, dy));
  }
  return svgWrap(size, size, parts.join(""));
}

/* ───── 학습지 ───── */
export type MoleculeAsk = "lewis" | "pairs" | "shape" | "polar";
export const moleculeAsks: Record<MoleculeAsk, string> = { lewis: "루이스 구조 그리기", pairs: "전자쌍 수", shape: "분자 모양·결합각", polar: "극성" };

export function moleculeSheet(formulas: string[], asks: MoleculeAsk[], style: "dot" | "line"): SheetSection[] {
  const list = formulas.map(formula => moleculeBy.get(formula)).filter((item): item is Molecule => Boolean(item));
  if (!list.length || !asks.length) return [];
  const head = ["분자", ...(asks.includes("lewis") ? ["루이스 구조"] : []), ...(asks.includes("pairs") ? ["공유 전자쌍", "비공유 전자쌍(중심 원자)"] : []), ...(asks.includes("shape") ? ["분자 모양", "결합각"] : []), ...(asks.includes("polar") ? ["극성"] : [])];
  const row = (molecule: Molecule, filled: boolean) => {
    const counts = pairCounts(molecule);
    return [
      `${escapeHtml(molecule.name)}<br>${formulaLabel(molecule.formula)}`,
      ...(asks.includes("lewis") ? [filled ? lewisSvg(molecule, style, 96) : `<div style="height:24mm"></div>`] : []),
      ...(asks.includes("pairs") ? [filled ? String(counts.bonding) : "", filled ? (diatomic(molecule) ? `${counts.lone} (분자 전체)` : String(counts.lone)) : ""] : []),
      ...(asks.includes("shape") ? [filled ? molecule.shape : "", filled ? molecule.angle : ""] : []),
      ...(asks.includes("polar") ? [filled ? (molecule.polar ? "극성" : "무극성") : ""] : []),
    ];
  };
  const askText = asks.map(ask => moleculeAsks[ask]).join(", ");
  const ending = `${particle(moleculeAsks[asks[asks.length - 1]], "을", "를")} 쓰시오.`;
  // 정답 표에는 글만 넣고, 루이스 구조 그림은 따로 모아 붙입니다(한글 복사에서 그림은 빠짐).
  const textAsks = asks.filter(ask => ask !== "lewis");
  const answerHead = head.filter(label => label !== "루이스 구조");
  const answerRow = (molecule: Molecule) => row(molecule, true).filter((_, index) => !(asks.includes("lewis") && index === 1));
  const drawings = `<div style="display:flex;flex-wrap:wrap;gap:3mm">${list.map(molecule => `<div style="text-align:center;font-size:9pt">${lewisSvg(molecule, style, 110)}<br>${formulaLabel(molecule.formula)}</div>`).join("")}</div>`;
  const problem: SheetProblem = {
    html: `다음 분자의 ${askText}${ending}${sheetTable(head, list.map(molecule => row(molecule, false)), { font: "9.5pt" }).replace(/<td style="([^"]*)"><\/td>/g, '<td style="$1height:12mm"></td>')}`,
    text: `다음 분자의 ${askText}${ending} ${list.map(molecule => formulaLabel(molecule.formula)).join(", ")}`,
    answerHtml: textAsks.length ? sheetTable(answerHead, list.map(answerRow), { font: "9.5pt" }) : "루이스 구조",
    answerFigure: asks.includes("lewis") ? drawings : undefined,
    answerText: list.map(molecule => `${formulaLabel(molecule.formula)}: ${molecule.shape}, ${molecule.angle}, ${molecule.polar ? "극성" : "무극성"}`).join(" / "),
  };
  return [{ heading: "분자의 구조와 극성", problems: [problem] }];
}
