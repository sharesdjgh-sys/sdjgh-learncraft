/* 생명과학: DNA 상보 가닥, 전사(mRNA), 번역(표준 유전 부호)과 유전자 발현 문제입니다. */
import { particle } from "@/features/language-sheet";
import { escapeHtml, seededRandom, sheetTable, type SheetProblem, type SheetSection } from "./sheet";

export const AMINO_ACIDS: Record<string, { name: string; short: string }> = {
  Phe: { name: "페닐알라닌", short: "F" }, Leu: { name: "류신", short: "L" }, Ile: { name: "아이소류신", short: "I" }, Met: { name: "메싸이오닌", short: "M" },
  Val: { name: "발린", short: "V" }, Ser: { name: "세린", short: "S" }, Pro: { name: "프롤린", short: "P" }, Thr: { name: "트레오닌", short: "T" },
  Ala: { name: "알라닌", short: "A" }, Tyr: { name: "타이로신", short: "Y" }, His: { name: "히스티딘", short: "H" }, Gln: { name: "글루타민", short: "Q" },
  Asn: { name: "아스파라진", short: "N" }, Lys: { name: "라이신", short: "K" }, Asp: { name: "아스파르트산", short: "D" }, Glu: { name: "글루탐산", short: "E" },
  Cys: { name: "시스테인", short: "C" }, Trp: { name: "트립토판", short: "W" }, Arg: { name: "아르지닌", short: "R" }, Gly: { name: "글리신", short: "G" },
};
const BASES = "UCAG";
// 첫째·둘째·셋째 염기가 U C A G 순서일 때의 아미노산(표준 유전 부호표)입니다. Stop은 종결 코돈입니다.
const TABLE = [
  "Phe Phe Leu Leu Ser Ser Ser Ser Tyr Tyr Stop Stop Cys Cys Stop Trp",
  "Leu Leu Leu Leu Pro Pro Pro Pro His His Gln Gln Arg Arg Arg Arg",
  "Ile Ile Ile Met Thr Thr Thr Thr Asn Asn Lys Lys Ser Ser Arg Arg",
  "Val Val Val Val Ala Ala Ala Ala Asp Asp Glu Glu Gly Gly Gly Gly",
].map(row => row.split(" "));
/** 코돈 → 아미노산(세 글자 약어, 종결은 Stop) */
export const CODONS = new Map<string, string>();
for (let first = 0; first < 4; first += 1) for (let second = 0; second < 4; second += 1) for (let third = 0; third < 4; third += 1) {
  CODONS.set(BASES[first] + BASES[second] + BASES[third], TABLE[first][second * 4 + third]);
}
export const START = "AUG";

const PAIR_DNA: Record<string, string> = { A: "T", T: "A", G: "C", C: "G" };
const PAIR_RNA: Record<string, string> = { A: "U", T: "A", G: "C", C: "G" };
export const cleanDna = (text: string) => text.toUpperCase().replace(/U/g, "T").replace(/[^ATGC]/g, "");
export const complement = (dna: string) => [...dna].map(base => PAIR_DNA[base]).join("");
/** 주형 가닥(3'→5'로 적은)에서 만든 mRNA(5'→3')입니다. */
export const transcribe = (template: string) => [...template].map(base => PAIR_RNA[base]).join("");

export type Strand = "template" | "coding";
export type Expression = {
  coding: string; template: string; mrna: string;
  /** 번역을 시작한 mRNA 위치(0부터), 시작 코돈이 없으면 -1 */
  start: number;
  codons: { codon: string; amino: string; at: number }[];
  stopped: boolean;
};

/** 입력한 가닥이 주형 가닥(3'→5')인지 암호화 가닥(5'→3')인지에 따라 두 가닥과 mRNA, 번역 결과를 구합니다. */
export function express(input: string, strand: Strand, fromStart = true): Expression {
  const dna = cleanDna(input);
  const template = strand === "template" ? dna : complement(dna);
  const coding = strand === "coding" ? dna : complement(dna);
  const mrna = transcribe(template);
  const start = fromStart ? mrna.indexOf(START) : 0;
  const codons: Expression["codons"] = [];
  let stopped = false;
  if (start >= 0) {
    for (let at = start; at + 3 <= mrna.length; at += 3) {
      const codon = mrna.slice(at, at + 3);
      const amino = CODONS.get(codon)!;
      codons.push({ codon, amino, at });
      if (amino === "Stop") { stopped = true; break; }
    }
  }
  return { coding, template, mrna, start, codons, stopped };
}
export const aminoName = (amino: string) => amino === "Stop" ? "종결" : AMINO_ACIDS[amino]?.name ?? amino;
export const peptideText = (expression: Expression) => expression.codons.filter(item => item.amino !== "Stop").map(item => aminoName(item.amino)).join(" - ");

/** 유전 부호표(mRNA 코돈) HTML. 첫째 염기는 행, 둘째는 열, 셋째는 칸 안입니다. */
export function codonTableHtml() {
  const th = (content: string) => `<th style="border:1px solid #444;padding:1mm;background:#f1f1f1;font-size:9pt">${content}</th>`;
  const rows = [...BASES].map((first, firstIndex) => `<tr>${th(first)}${[...BASES].map((second, secondIndex) => `<td style="border:1px solid #444;padding:0.8mm 1.5mm;font-size:8.3pt;line-height:1.5;vertical-align:top">${[...BASES].map((third, thirdIndex) => {
    const amino = TABLE[firstIndex][secondIndex * 4 + thirdIndex];
    const codon = first + second + third;
    return `<span style="white-space:nowrap">${codon} ${amino === "Stop" ? "<b>종결</b>" : `${escapeHtml(AMINO_ACIDS[amino].name)}${codon === START ? " <b>(개시)</b>" : ""}`}</span>`;
  }).join("<br>")}</td>`).join("")}${th([...BASES].join("<br>"))}</tr>`).join("");
  return `<table style="border-collapse:collapse;width:100%"><thead><tr>${th("첫째")}${[...BASES].map(base => th(`둘째 ${base}`)).join("")}${th("셋째")}</tr></thead><tbody>${rows}</tbody></table>`;
}

/** 두 가닥과 mRNA를 방향 표시와 함께 나란히 보여 줍니다. 코돈마다 띄어 씁니다. */
export function strandsHtml(expression: Expression, options: { blankMrna?: boolean; blankComplement?: boolean; given?: Strand } = {}) {
  const group = (text: string, offset: number) => {
    const head = text.slice(0, offset);
    const rest = text.slice(offset).match(/.{1,3}/g) ?? [];
    return [head, ...rest].filter(Boolean).join(" ");
  };
  const offset = Math.max(expression.start, 0) % 3;
  const line = (label: string, direction: [string, string], text: string, blank: boolean) => `<tr><td style="padding:0.8mm 2mm 0.8mm 0;font-size:9.5pt;white-space:nowrap">${label}</td><td style="font-family:Consolas,'Courier New',monospace;font-size:11pt;letter-spacing:0.5px;padding:0.8mm 0">${direction[0]} ${blank ? `<span style="display:inline-block;min-width:${text.length * 2.2}mm;border-bottom:1px solid #333">&nbsp;</span>` : group(text, offset)} ${direction[1]}</td></tr>`;
  const given = options.given ?? "template";
  return `<table style="border-collapse:collapse;margin:1.5mm 0">${line("DNA 암호화 가닥", ["5′", "3′"], expression.coding, given === "template" && Boolean(options.blankComplement))}${line("DNA 주형 가닥", ["3′", "5′"], expression.template, given === "coding" && Boolean(options.blankComplement))}${line("mRNA", ["5′", "3′"], expression.mrna, Boolean(options.blankMrna))}</table>`;
}

/* ───── 문제 ───── */
export type DnaAsk = "complement" | "mrna" | "peptide" | "codonCount";
export const dnaAsks: Record<DnaAsk, string> = { complement: "상보적인 DNA 가닥", mrna: "mRNA 염기 서열", peptide: "아미노산 서열", codonCount: "코돈 수·아미노산 수" };
const SENSE_AMINOS = Object.keys(AMINO_ACIDS).filter(amino => amino !== "Met");
const codonsFor = (amino: string) => [...CODONS].filter(([, value]) => value === amino).map(([codon]) => codon);

/** 개시 코돈부터 종결 코돈까지 있는 무작위 유전자를 만듭니다. 앞뒤에 번역되지 않는 염기를 조금 붙입니다. */
export function randomGene(random: () => number, length: number) {
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  // 앞뒤 염기에는 A를 쓰지 않아 개시 코돈 AUG가 한 곳에서만 나오게 합니다.
  const flank = (count: number) => Array.from({ length: count }, () => pick([..."UCG"])).join("");
  const body = [START, ...Array.from({ length }, () => pick(codonsFor(pick(SENSE_AMINOS)))), pick(codonsFor("Stop"))].join("");
  const mrna = flank(Math.floor(random() * 3) + 1) + body + flank(Math.floor(random() * 3));
  const template = [...mrna].map(base => ({ A: "T", U: "A", G: "C", C: "G" })[base]!).join("");
  return template;
}

export type DnaSheetSettings = { count: number; length: number; given: Strand; asks: DnaAsk[]; table: boolean; seed: number; answers: boolean };
export function dnaSheet(settings: DnaSheetSettings, custom: string | null): SheetSection[] {
  if (!settings.asks.length) return [];
  const random = seededRandom(settings.seed * 53 + settings.length);
  const templates = custom ? [custom] : [];
  while (templates.length < settings.count) templates.push(randomGene(random, settings.length));
  const problems: SheetProblem[] = templates.map(template => {
    const expression = express(template, "template");
    const givenStrand = settings.given === "template" ? expression.template : expression.coding;
    const givenLabel = settings.given === "template" ? "주형 가닥(3′→5′)" : "암호화 가닥(5′→3′)";
    const direction = settings.given === "template" ? ["3′", "5′"] : ["5′", "3′"];
    const asks = settings.asks;
    const peptide = peptideText(expression);
    const aminoCount = expression.codons.filter(item => item.amino !== "Stop").length;
    const questions = asks.map(ask => ask === "complement" ? `이 가닥과 상보적인 DNA 가닥` : ask === "mrna" ? "전사되어 만들어지는 mRNA의 염기 서열(5′→3′)" : ask === "peptide" ? "번역되어 만들어지는 폴리펩타이드의 아미노산 서열(개시 코돈부터)" : "번역되는 코돈 수(종결 코돈 포함)와 아미노산 수");
    const answers = asks.map(ask => ask === "complement" ? `${settings.given === "template" ? "5′" : "3′"}-${settings.given === "template" ? expression.coding : expression.template}-${settings.given === "template" ? "3′" : "5′"}` : ask === "mrna" ? `5′-${expression.mrna}-3′` : ask === "peptide" ? peptide : `코돈 ${expression.codons.length}개, 아미노산 ${aminoCount}개`);
    const marks = "㉠㉡㉢㉣";
    const ending = `${particle(questions[questions.length - 1].replace(/\([^)]*\)$/, ""), "을", "를")} 쓰시오.`;
    const many = questions.length > 1;
    return {
      html: `다음은 어떤 유전자의 DNA ${givenLabel} 염기 서열이다.<br><span style="font-family:Consolas,'Courier New',monospace;font-size:11pt">${direction[0]}-${givenStrand}-${direction[1]}</span>${questions.map((question, index) => `<br>${many ? marks[index] + " " : ""}${escapeHtml(question)}${index === questions.length - 1 ? ending : ""}`).join("")}`,
      text: `다음은 어떤 유전자의 DNA ${givenLabel} 염기 서열이다. ${direction[0]}-${givenStrand}-${direction[1]} ${questions.map((question, index) => `${many ? marks[index] + " " : ""}${question}`).join(", ")}${ending}`,
      answerHtml: `${answers.map((answer, index) => `${many ? marks[index] + " " : ""}<span style="${asks[index] === "peptide" || asks[index] === "codonCount" ? "" : "font-family:Consolas,monospace;"}">${escapeHtml(answer)}</span>`).join("<br>")}${asks.includes("mrna") || asks.includes("peptide") ? strandsHtml(expression) : ""}`,
      answerText: answers.map((answer, index) => `${many ? marks[index] + " " : ""}${answer}`).join(" / "),
      space: 14 + asks.length * 4,
    };
  });
  const sections: SheetSection[] = [{ heading: "유전자 발현 (전사와 번역)", problems }];
  if (settings.table) sections.push({ heading: "유전 부호표 (mRNA 코돈)", problems: [], intro: { html: codonTableHtml(), text: "(유전 부호표는 인쇄본 참고)" } });
  return sections;
}

export const expressionTable = (expression: Expression) => sheetTable(["순서", "코돈", "아미노산"], expression.codons.map((item, index) => [String(index + 1), item.codon, item.amino === "Stop" ? "종결 코돈" : `${escapeHtml(AMINO_ACIDS[item.amino].name)} (${item.amino})`]));
