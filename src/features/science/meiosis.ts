/* 생명과학: 체세포 분열과 감수 분열의 DNA 상대량 그래프, 단계별 핵상·염색체 수·염색 분체 수, 세포 그림, 문제입니다. */
import { escapeHtml, plotSvg, seededRandom, sheetTable, svgText, svgWrap, type SheetProblem, type SheetSection } from "./sheet";

export type DivisionKind = "mitosis" | "meiosis";
type Stage = { name: string; ploidy: string; chromosomes: (n: number) => number; chromatids: (n: number) => number; dna: number };
/** n은 반수 염색체 수(2n = 4이면 n = 2). DNA 상대량은 G1기를 2로 둡니다. */
export const STAGES: Record<DivisionKind, Stage[]> = {
  mitosis: [
    { name: "G₁기", ploidy: "2n", chromosomes: n => 2 * n, chromatids: () => 0, dna: 2 },
    { name: "G₂기(복제 뒤)", ploidy: "2n", chromosomes: n => 2 * n, chromatids: n => 4 * n, dna: 4 },
    { name: "중기", ploidy: "2n", chromosomes: n => 2 * n, chromatids: n => 4 * n, dna: 4 },
    { name: "딸세포", ploidy: "2n", chromosomes: n => 2 * n, chromatids: () => 0, dna: 2 },
  ],
  meiosis: [
    { name: "G₁기", ploidy: "2n", chromosomes: n => 2 * n, chromatids: () => 0, dna: 2 },
    { name: "감수 1분열 중기", ploidy: "2n", chromosomes: n => 2 * n, chromatids: n => 4 * n, dna: 4 },
    { name: "감수 2분열 중기", ploidy: "n", chromosomes: n => n, chromatids: n => 2 * n, dna: 2 },
    { name: "생식세포", ploidy: "n", chromosomes: n => n, chromatids: () => 0, dna: 1 },
  ],
};

/** 세포 한 개당 DNA 상대량 그래프(간기 S기에 복제, 분열 끝에 반으로)입니다. */
export function dnaGraphSvg(kind: DivisionKind, options: { blank?: boolean } = {}) {
  const points: [number, number][] = kind === "mitosis"
    ? [[0, 2], [2, 2], [3, 4], [6, 4], [6, 2], [8, 2]]
    : [[0, 2], [2, 2], [3, 4], [6, 4], [6, 2], [8, 2], [8, 1], [10, 1]];
  const labels = kind === "mitosis" ? [[1, "G₁"], [2.5, "S"], [4.5, "G₂·분열기"], [7, "딸세포"]] : [[1, "G₁"], [2.5, "S"], [4.5, "G₂·감수 1분열"], [7, "감수 2분열"], [9, "생식세포"]];
  return plotSvg({
    xLabel: "시간", yLabel: "세포 1개당 DNA 상대량", xMax: kind === "mitosis" ? 8.5 : 10.5, xStep: 20, yMin: 0, yMax: 5, yStep: 1,
    series: options.blank ? [] : [{ points, color: "#2563eb", width: 2.6 }],
    extra: (sx, sy) => labels.map(([x, text]) => svgText(sx(Number(x)), sy(0) + 14, String(text), { size: 10, anchor: "middle", color: "#444" })).join(""),
    width: 460, height: 250, hideTicks: false,
  });
}

/** 세포 그림: 염색체를 어머니(빨강)·아버지(파랑) 것으로 칠합니다. replicated면 X자(염색 분체 두 개)로 그립니다. */
export function cellSvg(n: number, stage: "g1" | "metaphase1" | "metaphase2" | "gamete" | "mitosis") {
  const size = 150;
  const c = size / 2;
  const parts = [`<circle cx="${c}" cy="${c}" r="66" fill="#f8fafc" stroke="#475569" stroke-width="1.5"/>`];
  const lengths = Array.from({ length: n }, (_, index) => 30 - index * (16 / Math.max(1, n)));
  const chromosome = (x: number, y: number, length: number, color: string, replicated: boolean) => replicated
    ? `<line x1="${x - 3}" y1="${y - length / 2}" x2="${x + 3}" y2="${y + length / 2}" stroke="${color}" stroke-width="4.5" stroke-linecap="round"/><line x1="${x + 3}" y1="${y - length / 2}" x2="${x - 3}" y2="${y + length / 2}" stroke="${color}" stroke-width="4.5" stroke-linecap="round"/>`
    : `<line x1="${x}" y1="${y - length / 2}" x2="${x}" y2="${y + length / 2}" stroke="${color}" stroke-width="4.5" stroke-linecap="round"/>`;
  const spread = (count: number) => Array.from({ length: count }, (_, index) => c - ((count - 1) * 18) / 2 + index * 18);
  if (stage === "g1" || stage === "mitosis") {
    const replicated = stage === "mitosis";
    const xs = spread(n);
    xs.forEach((x, index) => { parts.push(chromosome(x, c - 22, lengths[index], "#dc2626", replicated), chromosome(x, c + 22, lengths[index], "#2563eb", replicated)); });
  } else if (stage === "metaphase1") {
    // 상동 염색체가 짝(2가 염색체)을 지어 적도판 양쪽에 늘어섭니다.
    parts.push(`<line x1="${c}" y1="16" x2="${c}" y2="${size - 16}" stroke="#cbd5e1" stroke-dasharray="3 3"/>`);
    lengths.forEach((length, index) => { const y = c - ((n - 1) * 34) / 2 + index * 34; parts.push(chromosome(c - 9, y, length * 0.9, index % 2 ? "#2563eb" : "#dc2626", true), chromosome(c + 9, y, length * 0.9, index % 2 ? "#dc2626" : "#2563eb", true)); });
  } else {
    const replicated = stage === "metaphase2";
    const xs = spread(n);
    xs.forEach((x, index) => parts.push(chromosome(x, c, lengths[index], index % 2 ? "#2563eb" : "#dc2626", replicated)));
  }
  return svgWrap(size, size, parts.join(""));
}
const stageCells: Record<DivisionKind, ("g1" | "metaphase1" | "metaphase2" | "gamete" | "mitosis")[]> = { mitosis: ["g1", "mitosis", "mitosis", "g1"], meiosis: ["g1", "metaphase1", "metaphase2", "gamete"] };
export const stageCell = (kind: DivisionKind, index: number, n: number) => cellSvg(n, stageCells[kind][index]);

export function stageTableHtml(kind: DivisionKind, n: number, blank = false) {
  return sheetTable(["단계", "핵상", "염색체 수", "염색 분체 수", "DNA 상대량"], STAGES[kind].map(stage => [escapeHtml(stage.name), blank ? "" : stage.ploidy, blank ? "" : String(stage.chromosomes(n)), blank ? "" : String(stage.chromatids(n) || "—"), blank ? "" : String(stage.dna)]));
}

/* ───── 문제 ───── */
export type MeiosisAsk = "table" | "graph" | "gametes" | "compare";
export const meiosisAsks: Record<MeiosisAsk, string> = { table: "단계별 염색체·DNA", graph: "DNA 상대량 그래프", gametes: "생식세포 조합 수", compare: "체세포 분열과 비교" };

export function meiosisProblems(asks: MeiosisAsk[], seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 103 + 3);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const problems: SheetProblem[] = [];
  for (const ask of asks) {
    const n = pick([2, 3, 4]);
    if (ask === "table") problems.push({ html: `체세포의 염색체 수가 2n = ${2 * n}인 동물에서 감수 분열이 일어날 때 표를 완성하시오.${stageTableHtml("meiosis", n, true).replace(/<td style="([^"]*)"><\/td>/g, '<td style="$1height:8mm"></td>')}`, text: `2n = ${2 * n}인 동물의 감수 분열 단계별 핵상·염색체 수·염색 분체 수·DNA 상대량 표를 완성하시오.`, answerHtml: stageTableHtml("meiosis", n), answerText: STAGES.meiosis.map(stage => `${stage.name} ${stage.ploidy} ${stage.chromosomes(n)}`).join(", ") });
    else if (ask === "graph") problems.push({ html: "그림은 어떤 세포가 분열할 때 세포 1개당 DNA 상대량의 변화를 나타낸 것이다. 이 분열은 체세포 분열과 감수 분열 중 무엇인지 쓰고, DNA가 복제되는 시기와 상동 염색체가 분리되는 시기를 쓰시오.", text: "DNA 상대량 그래프를 보고 분열의 종류, DNA 복제 시기, 상동 염색체 분리 시기를 쓰시오.", figure: dnaGraphSvg("meiosis"), answerHtml: "감수 분열, 복제: 간기의 S기, 상동 염색체 분리: 감수 1분열(DNA 상대량 4 → 2)", answerText: "감수 분열, S기, 감수 1분열", space: 10 });
    else if (ask === "gametes") problems.push({ html: `2n = ${2 * n}인 생물에서 교차가 일어나지 않을 때, 한 개체가 만들 수 있는 생식세포의 염색체 조합은 최대 몇 가지인가? 또 암수의 수정으로 생길 수 있는 자손의 염색체 조합은 몇 가지인가?`, text: `2n = ${2 * n}인 생물의 생식세포 염색체 조합 수와 수정으로 생기는 조합 수를 구하시오.`, answerHtml: `생식세포 2<sup>${n}</sup> = ${2 ** n}가지, 자손 ${2 ** n} × ${2 ** n} = ${4 ** n}가지`, answerText: `${2 ** n}가지, ${4 ** n}가지`, space: 10 });
    else problems.push({ html: "체세포 분열과 감수 분열을 비교하여 표를 완성하시오." + sheetTable(["구분", "체세포 분열", "감수 분열"], [["분열 횟수", "", ""], ["딸세포 수", "", ""], ["딸세포의 핵상", "", ""], ["상동 염색체의 접합", "", ""], ["DNA 상대량 변화(G₁=2)", "", ""]]).replace(/<td style="([^"]*)"><\/td>/g, '<td style="$1height:8mm"></td>'), text: "체세포 분열과 감수 분열 비교 표를 완성하시오.", answerHtml: sheetTable(["구분", "체세포 분열", "감수 분열"], [["분열 횟수", "1회", "2회(연속)"], ["딸세포 수", "2개", "4개"], ["딸세포의 핵상", "2n", "n"], ["상동 염색체의 접합", "없음", "감수 1분열 전기(2가 염색체)"], ["DNA 상대량 변화(G₁=2)", "2 → 4 → 2", "2 → 4 → 2 → 1"]]), answerText: "1회/2회, 2개/4개, 2n/n, 없음/있음, 2→4→2 / 2→4→2→1" });
  }
  return [{ heading: "세포 분열", problems }];
}
