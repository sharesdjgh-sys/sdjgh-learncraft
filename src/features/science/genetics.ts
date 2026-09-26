/* 생명과학: 독립 유전하는 유전자 1~3쌍의 교배(생식세포, 펀넷 사각형, 유전자형·표현형 비)와 문제입니다. */
import { particle } from "@/features/language-sheet";
import { escapeHtml, fraction, ratio, seededRandom, sheetTable, type SheetProblem, type SheetSection } from "./sheet";

export type GeneKind = "complete" | "incomplete" | "abo";
export type Gene = { id: string; kind: GeneKind; letter: string; trait: string; dominant: string; recessive: string; middle: string };
/** 무작위 문제에서 두 형질을 고를 때 같은 생물끼리 묶습니다. */
export type GenePreset = Omit<Gene, "id"> & { group: "완두" | "분꽃" | "사람" };
export type Cross = { genes: Gene[]; mother: string[]; father: string[] };

export const geneKinds: Record<GeneKind, string> = { complete: "완전 우성", incomplete: "불완전 우성(중간 유전)", abo: "ABO식 혈액형(복대립)" };

export const genePresets: GenePreset[] = [
  { group: "완두", kind: "complete", letter: "R", trait: "완두 모양", dominant: "둥근", recessive: "주름진", middle: "" },
  { group: "완두", kind: "complete", letter: "Y", trait: "완두 색", dominant: "노란색", recessive: "초록색", middle: "" },
  { group: "완두", kind: "complete", letter: "T", trait: "완두 키", dominant: "큰 키", recessive: "작은 키", middle: "" },
  { group: "완두", kind: "complete", letter: "P", trait: "완두 꽃 색", dominant: "보라색 꽃", recessive: "흰색 꽃", middle: "" },
  { group: "분꽃", kind: "incomplete", letter: "R", trait: "분꽃 색", dominant: "빨간색", recessive: "흰색", middle: "분홍색" },
  { group: "분꽃", kind: "complete", letter: "T", trait: "분꽃 키", dominant: "큰 키", recessive: "작은 키", middle: "" },
  { group: "사람", kind: "abo", letter: "", trait: "ABO식 혈액형", dominant: "", recessive: "", middle: "" },
  { group: "사람", kind: "complete", letter: "E", trait: "귓불 모양", dominant: "분리형 귓불", recessive: "부착형 귓불", middle: "" },
  { group: "사람", kind: "complete", letter: "D", trait: "보조개", dominant: "보조개 있음", recessive: "보조개 없음", middle: "" },
];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const presetGene = ({ group, ...gene }: GenePreset, id: string): Gene => ({ ...gene, id });

/** 유전자 하나에 가능한 유전자형(대립유전자 두 개)입니다. */
export function genotypeOptions(gene: Gene) {
  if (gene.kind === "abo") return ["AA", "AO", "BB", "BO", "AB", "OO"];
  const big = gene.letter.toUpperCase();
  const small = gene.letter.toLowerCase();
  return [big + big, big + small, small + small];
}
/** 대립유전자 두 개를 교과서 순서(우성 먼저, A·B·O 순)로 맞춥니다. */
function normalizePair(gene: Gene, a: string, b: string) {
  if (gene.kind === "abo") { const order = "ABO"; return order.indexOf(a) <= order.indexOf(b) ? a + b : b + a; }
  return a === a.toUpperCase() ? a + b : b + a;
}
export function phenotypeOf(gene: Gene, pair: string) {
  if (gene.kind === "abo") {
    if (pair === "AB") return "AB형";
    if (pair.includes("A")) return "A형";
    if (pair.includes("B")) return "B형";
    return "O형";
  }
  const dominantCount = [...pair].filter(char => char === char.toUpperCase()).length;
  if (gene.kind === "incomplete") return dominantCount === 2 ? gene.dominant : dominantCount === 1 ? gene.middle : gene.recessive;
  return dominantCount ? gene.dominant : gene.recessive;
}

export type Gamete = { alleles: string[]; count: number };
/** 독립의 법칙에 따라 만들어지는 생식세포와 그 비입니다. */
export function gametes(genes: Gene[], genotype: string[]): Gamete[] {
  let result: Gamete[] = [{ alleles: [], count: 1 }];
  genes.forEach((gene, index) => {
    const pair = [...genotype[index]];
    const next: Gamete[] = [];
    for (const item of result) for (const allele of pair) {
      const alleles_ = [...item.alleles, allele];
      const same = next.find(other => other.alleles.join("") === alleles_.join(""));
      if (same) same.count += item.count;
      else next.push({ alleles: alleles_, count: item.count });
    }
    result = next;
  });
  return result;
}
export const gameteText = (gamete: Gamete) => gamete.alleles.join("");

export type Offspring = { genotype: string; phenotype: string; count: number };
export type CrossResult = {
  motherGametes: Gamete[]; fatherGametes: Gamete[];
  /** 행(어머니 생식세포) × 열(아버지 생식세포) 칸의 유전자형 */
  square: string[][];
  genotypes: Offspring[]; phenotypes: { phenotype: string; count: number }[]; total: number;
};

export function solveCross(cross: Cross): CrossResult {
  const motherGametes = gametes(cross.genes, cross.mother);
  const fatherGametes = gametes(cross.genes, cross.father);
  const square = motherGametes.map(egg => fatherGametes.map(sperm => cross.genes.map((gene, index) => normalizePair(gene, egg.alleles[index], sperm.alleles[index])).join("")));
  const genotypeMap = new Map<string, Offspring>();
  motherGametes.forEach((egg, row) => fatherGametes.forEach((sperm, column) => {
    const genotype = square[row][column];
    const count = egg.count * sperm.count;
    const pairs = cross.genes.map((_, index) => genotype.slice(index * 2, index * 2 + 2));
    const phenotype = cross.genes.map((gene, index) => phenotypeOf(gene, pairs[index])).join(", ");
    const found = genotypeMap.get(genotype);
    if (found) found.count += count; else genotypeMap.set(genotype, { genotype, phenotype, count });
  }));
  const genotypes = [...genotypeMap.values()].sort((a, b) => b.count - a.count || a.genotype.localeCompare(b.genotype));
  const phenotypeMap = new Map<string, number>();
  for (const item of genotypes) phenotypeMap.set(item.phenotype, (phenotypeMap.get(item.phenotype) ?? 0) + item.count);
  const phenotypes = [...phenotypeMap].map(([phenotype, count]) => ({ phenotype, count })).sort((a, b) => b.count - a.count || a.phenotype.localeCompare(b.phenotype));
  const total = genotypes.reduce((sum, item) => sum + item.count, 0);
  return { motherGametes, fatherGametes, square, genotypes, phenotypes, total };
}

export const ratioText = (counts: number[]) => ratio(counts).join(" : ");
export const probability = (count: number, total: number) => fraction(count, total);
export const parentPhenotype = (genes: Gene[], genotype: string[]) => genes.map((gene, index) => phenotypeOf(gene, genotype[index])).join(", ");

/* ───── 펀넷 사각형 HTML ───── */
export function punnettHtml(cross: Cross, result: CrossResult, options: { blank?: boolean; compact?: boolean } = {}) {
  const size = options.compact ? "9pt" : "10.5pt";
  const cell = (content: string, head = false) => `<td style="border:1px solid #444;padding:1.4mm 2mm;text-align:center;font-size:${size};${head ? "background:#f1f1f1;font-weight:700;" : ""}${options.blank && !head ? "height:8mm;" : ""}">${content}</td>`;
  const gameteLabel = (gamete: Gamete, list: Gamete[]) => `${escapeHtml(gameteText(gamete))}${list.some(item => item.count !== list[0].count) ? ` <span style="font-weight:400;color:#555">(${gamete.count})</span>` : ""}`;
  const head = `<tr>${cell("♀ \\ ♂", true)}${result.fatherGametes.map(gamete => cell(gameteLabel(gamete, result.fatherGametes), true)).join("")}</tr>`;
  const rows = result.motherGametes.map((egg, row) => `<tr>${cell(gameteLabel(egg, result.motherGametes), true)}${result.square[row].map(genotype => cell(options.blank ? "" : escapeHtml(genotype))).join("")}</tr>`).join("");
  return `<table style="border-collapse:collapse;margin:1.5mm 0">${head}${rows}</table>`;
}

/* ───── 문제 만들기 ───── */
export type GeneticsAsk = "gametes" | "square" | "genotypeRatio" | "phenotypeRatio" | "probability";
export const geneticsAsks: Record<GeneticsAsk, string> = { gametes: "생식세포와 비", square: "펀넷 사각형 완성", genotypeRatio: "유전자형 비", phenotypeRatio: "표현형 비", probability: "특정 자손의 확률" };

const describeParent = (cross: Cross, genotype: string[]) => `${genotype.join("")}(${parentPhenotype(cross.genes, genotype)})`;

export function crossProblem(cross: Cross, asks: GeneticsAsk[], random: () => number): SheetProblem {
  const result = solveCross(cross);
  const traits = cross.genes.map(gene => gene.kind === "abo" ? "ABO식 혈액형(대립유전자 A, B, O)" : `${gene.trait}(${gene.letter.toUpperCase()}: ${gene.kind === "incomplete" ? `${gene.dominant}, ${gene.letter.toLowerCase()}: ${gene.recessive}, 중간 유전` : `${gene.dominant} > ${gene.letter.toLowerCase()}: ${gene.recessive}`})`).join(", ");
  const last = cross.genes[cross.genes.length - 1];
  const lead = `${traits}${particle(last.kind === "abo" ? "혈액형" : last.trait, "을", "를")} 결정하는 유전자는 ${cross.genes.length > 1 ? "서로 다른 상염색체에 있어 독립적으로 유전된다" : "상염색체에 있다"}. 유전자형이 ${describeParent(cross, cross.mother)}인 개체(♀)와 ${describeParent(cross, cross.father)}인 개체(♂)를 교배하였다.`;
  const parts: { q: string; aHtml: string; aText: string; qHtml?: string }[] = [];
  const letters = "㉠㉡㉢㉣㉤";
  const gameteList = (list: Gamete[]) => { const counts = list.map(item => item.count); return `${list.map(gameteText).join(" : ")} = ${ratioText(counts)}`; };
  if (asks.includes("gametes")) parts.push({ q: "♀과 ♂이 만드는 생식세포의 유전자형과 그 비를 각각 쓰시오.", aHtml: `♀ ${escapeHtml(gameteList(result.motherGametes))}, ♂ ${escapeHtml(gameteList(result.fatherGametes))}`, aText: `♀ ${gameteList(result.motherGametes)}, ♂ ${gameteList(result.fatherGametes)}` });
  if (asks.includes("square") && result.motherGametes.length * result.fatherGametes.length <= 16) parts.push({ q: "펀넷 사각형을 완성하시오.", qHtml: `펀넷 사각형을 완성하시오.${punnettHtml(cross, result, { blank: true, compact: true })}`, aHtml: punnettHtml(cross, result, { compact: true }), aText: result.square.map(row => row.join(" ")).join(" / ") });
  if (asks.includes("genotypeRatio")) parts.push({ q: "자손의 유전자형 비를 쓰시오.", aHtml: escapeHtml(`${result.genotypes.map(item => item.genotype).join(" : ")} = ${ratioText(result.genotypes.map(item => item.count))}`), aText: `${result.genotypes.map(item => item.genotype).join(" : ")} = ${ratioText(result.genotypes.map(item => item.count))}` });
  if (asks.includes("phenotypeRatio")) parts.push({ q: "자손의 표현형 비를 쓰시오.", aHtml: escapeHtml(`${result.phenotypes.map(item => `[${item.phenotype}]`).join(" : ")} = ${ratioText(result.phenotypes.map(item => item.count))}`), aText: `${result.phenotypes.map(item => `[${item.phenotype}]`).join(" : ")} = ${ratioText(result.phenotypes.map(item => item.count))}` });
  if (asks.includes("probability")) {
    const target = result.phenotypes[Math.floor(random() * result.phenotypes.length)];
    parts.push({ q: `자손의 표현형이 [${target.phenotype}]일 확률을 구하시오.`, aHtml: probability(target.count, result.total), aText: probability(target.count, result.total) });
  }
  const numbered = parts.length > 1;
  const qHtml = parts.map((part, index) => `${numbered ? `<br>${letters[index]} ` : " "}${part.qHtml ?? escapeHtml(part.q)}`).join("");
  return {
    html: escapeHtml(lead) + qHtml,
    text: `${lead} ${parts.map((part, index) => `${numbered ? letters[index] + " " : ""}${part.q}`).join(" ")}`,
    answerHtml: parts.map((part, index) => `${numbered ? letters[index] + " " : ""}${part.aHtml}`).join("<br>"),
    answerText: parts.map((part, index) => `${numbered ? letters[index] + " " : ""}${part.aText}`).join(" / "),
    space: asks.includes("square") ? 4 : 10,
  };
}

/** 무작위 교배 문제. 같은 seed면 같은 문제입니다. 유전자 수와 종류를 고릅니다. */
export function randomCross(random: () => number, geneCount: 1 | 2, kinds: GeneKind[]): Cross {
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const allowed = kinds.length ? kinds : (["complete"] as GeneKind[]);
  // 첫 형질의 종류를 고르고, 두 번째 형질은 같은 생물의 완전 우성 형질에서 고릅니다(혈액형 + 귓불, 분꽃 색 + 분꽃 키).
  const firstKind = pick(allowed);
  const first = pick(genePresets.filter(preset => preset.kind === firstKind));
  const chosen = [first];
  if (geneCount === 2) {
    const partners = genePresets.filter(preset => preset.group === first.group && preset.trait !== first.trait);
    const complete = partners.filter(preset => preset.kind === "complete");
    chosen.push(pick(complete.length ? complete : partners));
  }
  const genes = chosen.map((preset, index) => presetGene(preset, `r${index}`));
  // 이형 접합이 적어도 하나 있어야 비가 나옵니다.
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const mother = genes.map(gene => pick(genotypeOptions(gene)));
    const father = genes.map(gene => pick(genotypeOptions(gene)));
    const hetero = [...mother, ...father].filter(pair => pair[0] !== pair[1]).length;
    if (hetero >= Math.min(2, geneCount + 1)) return { genes, mother, father };
  }
  return { genes, mother: genes.map(gene => genotypeOptions(gene)[1]), father: genes.map(gene => genotypeOptions(gene)[1]) };
}

export type GeneticsSheetSettings = { count: number; geneCount: 1 | 2; kinds: GeneKind[]; asks: GeneticsAsk[]; seed: number; answers: boolean };
export function geneticsSheet(settings: GeneticsSheetSettings, extra: Cross | null): SheetSection[] {
  if (!settings.asks.length) return [];
  const random = seededRandom(settings.seed * 131 + settings.geneCount);
  const problems: SheetProblem[] = [];
  if (extra) problems.push(crossProblem(extra, settings.asks, random));
  while (problems.length < settings.count) problems.push(crossProblem(randomCross(random, settings.geneCount, settings.kinds), settings.asks, random));
  return [{ heading: "교배와 유전", problems }];
}

/** 표현형 비를 표로(학습지·화면 공용) 보여 줍니다. */
export function resultTables(result: CrossResult) {
  const genotypeRatio = ratio(result.genotypes.map(item => item.count));
  const phenotypeRatio = ratio(result.phenotypes.map(item => item.count));
  return {
    genotype: sheetTable(["유전자형", "표현형", "비", "확률"], result.genotypes.map((item, index) => [escapeHtml(item.genotype), escapeHtml(item.phenotype), String(genotypeRatio[index]), probability(item.count, result.total)])),
    phenotype: sheetTable(["표현형", "비", "확률"], result.phenotypes.map((item, index) => [escapeHtml(item.phenotype), String(phenotypeRatio[index]), probability(item.count, result.total)])),
  };
}
