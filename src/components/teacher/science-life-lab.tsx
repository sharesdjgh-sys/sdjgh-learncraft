"use client";

import { z } from "zod";
import { Dna, FlaskRound, Grid2x2, Leaf, Plus, Shuffle, Split, Trash2, Trees, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { browserRandomUUID } from "@/lib/browser-random-uuid";
import { cleanDna, codonTableHtml, dnaAsks, dnaSheet, express, expressionTable, peptideText, randomGene, strandsHtml, type DnaAsk } from "@/features/science/dna";
import {
  gameteText, geneKinds, genePresets, geneticsAsks, geneticsSheet, genotypeOptions, parentPhenotype, presetGene, punnettHtml, ratioText, resultTables, solveCross,
  type Gene, type GeneKind, type GeneticsAsk,
} from "@/features/science/genetics";
import { seededRandom } from "@/features/science/sheet";
import { Card, Segmented, Toggle } from "./tool-panel";
import { DivisionView, EcologyView, EnzymeView, MetabolismView, NeuronView } from "./science-life-views";
import { chipClass, fieldClass, panelClass, ProblemSheet, SubjectLab, useStored } from "./science-lab-shared";

const storageKey = "learncraft_science_life_v1";
const kindKeys = Object.keys(geneKinds) as GeneKind[];
const geneSchema = z.object({
  id: z.string(), kind: z.enum(kindKeys as [GeneKind, ...GeneKind[]]), letter: z.string().max(1),
  trait: z.string().max(40), dominant: z.string().max(40), recessive: z.string().max(40), middle: z.string().max(40),
});
const firstGenes = [presetGene(genePresets[0], "g1"), presetGene(genePresets[1], "g2")];
const storedSchema = z.object({
  cross: z.object({ genes: z.array(geneSchema).min(1).max(3), mother: z.array(z.string()), father: z.array(z.string()) }).catch({ genes: firstGenes, mother: ["Rr", "Yy"], father: ["Rr", "Yy"] }),
  crossSheet: z.object({
    title: z.string().max(100).catch(""),
    count: z.number().int().min(1).max(10).catch(4), geneCount: z.union([z.literal(1), z.literal(2)]).catch(1),
    kinds: z.array(z.enum(kindKeys as [GeneKind, ...GeneKind[]])).catch(["complete", "incomplete", "abo"]),
    asks: z.array(z.enum(Object.keys(geneticsAsks) as [GeneticsAsk, ...GeneticsAsk[]])).catch(["gametes", "square", "phenotypeRatio", "probability"]),
    includeCurrent: z.boolean().catch(true), seed: z.number().int().catch(1), answers: z.boolean().catch(true),
  }).catch({ title: "", count: 4, geneCount: 1, kinds: ["complete", "incomplete", "abo"], asks: ["gametes", "square", "phenotypeRatio", "probability"], includeCurrent: true, seed: 1, answers: true }),
  dna: z.object({
    input: z.string().max(300).catch("TACGGATTTCACATT"), strand: z.enum(["template", "coding"]).catch("template"), fromStart: z.boolean().catch(true),
    title: z.string().max(100).catch(""), count: z.number().int().min(1).max(8).catch(3), length: z.number().int().min(2).max(10).catch(4),
    given: z.enum(["template", "coding"]).catch("template"),
    asks: z.array(z.enum(Object.keys(dnaAsks) as [DnaAsk, ...DnaAsk[]])).catch(["mrna", "peptide"]),
    table: z.boolean().catch(true), includeCurrent: z.boolean().catch(false), seed: z.number().int().catch(1), answers: z.boolean().catch(true),
  }).catch({ input: "TACGGATTTCACATT", strand: "template", fromStart: true, title: "", count: 3, length: 4, given: "template", asks: ["mrna", "peptide"], table: true, includeCurrent: false, seed: 1, answers: true }),
});
type Stored = z.infer<typeof storedSchema>;

export function ScienceLifeLab({ tabs }: { tabs?: React.ReactNode }) {
  return (
    <SubjectLab id="life" subject="생명과학" title="생명과학 · 세포와 물질대사 도구" tabs={tabs}
      description="유전과 유전자 발현, 흥분의 전도, 세포 분열, 군집과 개체군, 효소, 세포 호흡과 광합성의 계산 도구와 학습지입니다. 문제는 정답과 함께 인쇄합니다."
      views={[
        { value: "cross", label: "유전 교배", icon: Grid2x2, note: "유전자 1~3쌍의 교배에서 생식세포, 펀넷 사각형, 유전자형·표현형 비를 구해요.", render: () => <CrossView /> },
        { value: "dna", label: "전사·번역", icon: Dna, note: "DNA를 전사·번역해 mRNA와 아미노산 서열을 찾아요.", render: () => <DnaView /> },
        { value: "division", label: "세포 분열", icon: Split, note: "체세포 분열·감수 분열의 단계별 핵상, 염색체 수, DNA 상대량 그래프를 정리해요.", render: () => <DivisionView /> },
        { value: "neuron", label: "흥분 전도", icon: Zap, note: "막전위 변화 그래프와 전도 속도·거리·시간으로 지점별 막전위를 구하는 문제를 만들어요.", render: () => <NeuronView /> },
        { value: "ecology", label: "군집·개체군", icon: Trees, note: "방형구법으로 밀도·빈도·피도·중요치를 계산하고, 개체군 생장 곡선을 그려요.", render: () => <EcologyView /> },
        { value: "enzyme", label: "효소", icon: FlaskRound, note: "기질 농도·저해제·온도·pH에 따른 효소의 반응 속도 그래프를 그려요.", render: () => <EnzymeView /> },
        { value: "metabolism", label: "세포 호흡·광합성", icon: Leaf, note: "세포 호흡과 광합성 도식을 보여 주고, 원하는 칸을 빈칸으로 만든 학습지를 만들어요.", render: () => <MetabolismView /> },
      ]} />
  );
}


/** 유전자 종류나 글자가 바뀌면 그 자리의 부모 유전자형을 새 선택지의 이형 접합으로 맞춥니다. */
function fitGenotypes(genes: Gene[], list: string[]) {
  return genes.map((gene, index) => genotypeOptions(gene).includes(list[index]) ? list[index] : genotypeOptions(gene)[1]);
}

function CrossView() {
  const [state, update] = useStored(storageKey, storedSchema);
  const genes = state.cross.genes;
  const cross = { genes, mother: fitGenotypes(genes, state.cross.mother), father: fitGenotypes(genes, state.cross.father) };
  const setGenes = (next: Gene[], mother = cross.mother, father = cross.father) => update({ cross: { genes: next, mother: fitGenotypes(next, mother), father: fitGenotypes(next, father) } });
  const setGene = (index: number, patch: Partial<Gene>) => setGenes(genes.map((gene, at) => at === index ? { ...gene, ...patch } : gene));
  const setParent = (key: "mother" | "father", index: number, value: string) => update({ cross: { ...cross, [key]: cross[key].map((item, at) => at === index ? value : item) } });
  const duplicate = genes.some((gene, index) => gene.kind !== "abo" && genes.some((other, at) => at !== index && other.kind !== "abo" && other.letter.toUpperCase() === gene.letter.toUpperCase()));
  const aboClash = genes.some(gene => gene.kind === "abo") && genes.some(gene => gene.kind !== "abo" && "ABO".includes(gene.letter.toUpperCase()));
  const invalid = genes.some(gene => gene.kind !== "abo" && !/^[A-Za-z]$/.test(gene.letter));
  const result = solveCross(cross);
  const tables = resultTables(result);
  const sheet = state.crossSheet;
  const setSheet = (patch: Partial<Stored["crossSheet"]>) => update({ crossSheet: { ...sheet, ...patch } });
  const problemBlocked = duplicate || aboClash || invalid;
  const sections = geneticsSheet(sheet, sheet.includeCurrent && !problemBlocked ? cross : null);
  const usedLetters = new Set(genes.map(gene => gene.letter.toUpperCase()));
  return (
    <section className="mt-5 grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
      <aside className="space-y-4">
        <Card title="형질(유전자)" help="유전자는 서로 다른 상염색체에 있어 독립적으로 유전된다고 봅니다. 불완전 우성은 이형 접합일 때 중간 형질이 나타나요.">
          <div className="space-y-3">
            {genes.map((gene, index) => (
              <div key={gene.id} className="rounded-xl border border-line bg-surface-2 p-2.5">
                <div className="flex items-center gap-1.5">
                  <select aria-label="형질 예시" value="" onChange={event => { const preset = genePresets[Number(event.target.value)]; if (preset) setGene(index, presetGene(preset, gene.id)); }} className="min-h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 text-xs font-semibold text-ink-3">
                    <option value="" disabled>{gene.kind === "abo" ? "ABO식 혈액형" : `${gene.trait || "형질"} (${gene.letter.toUpperCase()})`} · 예시 바꾸기</option>
                    {genePresets.map((preset, at) => <option key={at} value={at}>{preset.trait}{preset.letter ? ` (${preset.letter})` : ""}</option>)}
                  </select>
                  <Button variant="ghost" size="icon" className="size-9" disabled={genes.length === 1} onClick={() => setGenes(genes.filter((_, at) => at !== index), cross.mother.filter((_, at) => at !== index), cross.father.filter((_, at) => at !== index))} aria-label={`${index + 1}번째 형질 지우기`}><Trash2 size={15} /></Button>
                </div>
                <div className="mt-2">
                  <Segmented label="유전 방식" value={gene.kind} onChange={kind => setGene(index, { kind, ...(kind === "incomplete" && !gene.middle ? { middle: "중간" } : {}) })} options={kindKeys.map(key => ({ value: key, label: key === "complete" ? "완전 우성" : key === "incomplete" ? "중간 유전" : "ABO" }))} />
                </div>
                {gene.kind !== "abo" && (
                  <div className="mt-2 grid grid-cols-[3.2rem_minmax(0,1fr)] gap-1.5">
                    <input value={gene.letter} maxLength={1} onChange={event => setGene(index, { letter: event.target.value.replace(/[^A-Za-z]/g, "").toUpperCase() })} aria-label="유전자 기호" className={`${fieldClass} px-2 text-center font-bold`} />
                    <input value={gene.trait} maxLength={40} onChange={event => setGene(index, { trait: event.target.value })} aria-label="형질 이름" placeholder="형질 이름" className={fieldClass} />
                    <span className="self-center text-center text-xs font-bold text-ink-4">{gene.letter.toUpperCase() || "?"}</span>
                    <input value={gene.dominant} maxLength={40} onChange={event => setGene(index, { dominant: event.target.value })} aria-label="우성 형질" placeholder={gene.kind === "incomplete" ? `${gene.letter.toUpperCase()}${gene.letter.toUpperCase()}의 형질` : "우성 형질"} className={fieldClass} />
                    {gene.kind === "incomplete" && <><span className="self-center text-center text-xs font-bold text-ink-4">{gene.letter.toUpperCase()}{gene.letter.toLowerCase()}</span><input value={gene.middle} maxLength={40} onChange={event => setGene(index, { middle: event.target.value })} aria-label="중간 형질" placeholder="중간 형질" className={fieldClass} /></>}
                    <span className="self-center text-center text-xs font-bold text-ink-4">{gene.letter.toLowerCase() || "?"}</span>
                    <input value={gene.recessive} maxLength={40} onChange={event => setGene(index, { recessive: event.target.value })} aria-label="열성 형질" placeholder="열성 형질" className={fieldClass} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="mt-2" disabled={genes.length >= 3} onClick={() => {
            const preset = genePresets.find(item => item.kind === "complete" && !usedLetters.has(item.letter)) ?? genePresets[0];
            setGenes([...genes, presetGene(preset, browserRandomUUID())], [...cross.mother, ""], [...cross.father, ""]);
          }}><Plus size={14} /> 형질 더하기</Button>
          {(duplicate || aboClash || invalid) && <p role="alert" className="mt-2 text-[.76rem] font-semibold text-warn">{invalid ? "유전자 기호는 알파벳 한 글자로 적어 주세요." : duplicate ? "형질마다 다른 유전자 기호를 써 주세요." : "혈액형과 함께 쓸 때는 A·B·O가 아닌 기호를 써 주세요."}</p>}
        </Card>
        <Card title="부모의 유전자형">
          {(["mother", "father"] as const).map(key => (
            <div key={key} className="mb-2">
              <p className="mb-1 text-xs font-semibold text-ink-4">{key === "mother" ? "♀ 암컷(어머니)" : "♂ 수컷(아버지)"} · <span className="text-ink-3">{parentPhenotype(genes, cross[key])}</span></p>
              <div className="flex flex-wrap gap-1.5">
                {genes.map((gene, index) => (
                  <select key={gene.id} aria-label={`${key === "mother" ? "♀" : "♂"} ${gene.trait} 유전자형`} value={cross[key][index]} onChange={event => setParent(key, index, event.target.value)} className="min-h-9 rounded-lg border border-line bg-surface px-2 text-sm font-bold text-ink">
                    {genotypeOptions(gene).map(option => <option key={option} value={option}>{option}</option>)}
                  </select>
                ))}
              </div>
            </div>
          ))}
        </Card>
      </aside>
      <div className="min-w-0 space-y-4">
        <section className={`${panelClass} space-y-3`}>
          <div className="grid gap-2 text-[.84rem] sm:grid-cols-2">
            <p><b className="text-ink-4">♀ 생식세포</b> {result.motherGametes.map(gameteText).join(", ")} <span className="text-ink-4">({ratioText(result.motherGametes.map(item => item.count))})</span></p>
            <p><b className="text-ink-4">♂ 생식세포</b> {result.fatherGametes.map(gameteText).join(", ")} <span className="text-ink-4">({ratioText(result.fatherGametes.map(item => item.count))})</span></p>
          </div>
          <div className="overflow-x-auto text-black" dangerouslySetInnerHTML={{ __html: punnettHtml(cross, result, { compact: result.square.length > 4 }) }} />
          <div className="grid gap-3 xl:grid-cols-2">
            <div><h3 className="mb-1 text-xs font-bold text-ink-3">유전자형 비 · {ratioText(result.genotypes.map(item => item.count))}</h3><div className="text-black [&_td]:bg-white" dangerouslySetInnerHTML={{ __html: tables.genotype }} /></div>
            <div><h3 className="mb-1 text-xs font-bold text-ink-3">표현형 비 · {ratioText(result.phenotypes.map(item => item.count))}</h3><div className="text-black [&_td]:bg-white" dangerouslySetInnerHTML={{ __html: tables.phenotype }} /></div>
          </div>
        </section>
        <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start">
          <Card title="교배 문제 학습지" help="무작위 문제는 같은 생물의 형질끼리 묶어서 만들어요(완두, 분꽃, 사람). ‘지금 교배 넣기’를 켜면 위에서 만든 교배가 1번 문제가 됩니다.">
            <Toggle label="지금 교배를 1번 문제로" checked={sheet.includeCurrent} onChange={includeCurrent => setSheet({ includeCurrent })} />
            <p className="mb-1 mt-2 text-xs font-semibold text-ink-4">무작위 문제의 형질 수</p>
            <Segmented label="형질 수" value={sheet.geneCount} onChange={geneCount => setSheet({ geneCount })} options={[{ value: 1, label: "한 쌍" }, { value: 2, label: "두 쌍" }]} />
            <div className="mt-2 flex flex-wrap gap-1.5">{kindKeys.map(kind => <button key={kind} type="button" aria-pressed={sheet.kinds.includes(kind)} onClick={() => setSheet({ kinds: sheet.kinds.includes(kind) ? sheet.kinds.filter(item => item !== kind) : [...sheet.kinds, kind] })} className={chipClass(sheet.kinds.includes(kind))}>{geneKinds[kind]}</button>)}</div>
            <p className="mb-1 mt-3 text-xs font-semibold text-ink-4">묻는 것</p>
            <div className="flex flex-wrap gap-1.5">{(Object.keys(geneticsAsks) as GeneticsAsk[]).map(ask => <button key={ask} type="button" aria-pressed={sheet.asks.includes(ask)} onClick={() => setSheet({ asks: sheet.asks.includes(ask) ? sheet.asks.filter(item => item !== ask) : [...sheet.asks, ask] })} className={chipClass(sheet.asks.includes(ask))}>{geneticsAsks[ask]}</button>)}</div>
            <p className="mb-1 mt-3 text-xs font-semibold text-ink-4">문항 수</p>
            <Segmented label="문항 수" value={sheet.count} onChange={count => setSheet({ count })} options={[2, 4, 6, 8].map(value => ({ value, label: `${value}개` }))} />
            <input value={sheet.title} maxLength={100} onChange={event => setSheet({ title: event.target.value })} placeholder="학습지 제목 (예: 멘델의 유전)" className={`${fieldClass} mt-3`} />
            <Toggle label="정답지 붙이기" checked={sheet.answers} onChange={answers => setSheet({ answers })} help="인쇄하면 정답은 새 쪽에서 시작합니다." />
            <Button variant="ghost" size="sm" onClick={() => setSheet({ seed: sheet.seed + 1 })}><Shuffle size={14} /> 다른 문제로</Button>
          </Card>
          <ProblemSheet id="life-cross-print" sections={sections} options={{ title: sheet.title || "교배와 유전", answers: sheet.answers }} />
        </div>
      </div>
    </section>
  );
}

function DnaView() {
  const [state, update] = useStored(storageKey, storedSchema);
  const dna = state.dna;
  const setDna = (patch: Partial<Stored["dna"]>) => update({ dna: { ...dna, ...patch } });
  const bases = cleanDna(dna.input);
  const expression = express(bases, dna.strand, dna.fromStart);
  const stray = dna.input.replace(/[\s\-35′']/g, "").length !== bases.length;
  // 학습지 문제는 늘 개시 코돈부터 번역하므로, 그 기준으로 넣을 수 있는지 봅니다.
  const fromStart = express(bases, dna.strand, true);
  const sections = dnaSheet(dna, dna.includeCurrent && fromStart.start >= 0 && fromStart.stopped ? fromStart.template : null);
  return (
    <section className="mt-5 grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
      <aside className="space-y-4">
        <Card title="DNA 염기 서열" help="왼쪽부터 적어요. 주형 가닥은 3′→5′, 암호화 가닥은 5′→3′ 방향으로 읽어 mRNA(5′→3′)를 만듭니다. U는 T로 바꿔 읽어요.">
          <Segmented label="적은 가닥" value={dna.strand} onChange={strand => setDna({ strand })} options={[{ value: "template", label: "주형 가닥 (3′→5′)" }, { value: "coding", label: "암호화 가닥 (5′→3′)" }]} />
          <textarea value={dna.input} maxLength={300} rows={3} onChange={event => setDna({ input: event.target.value })} aria-label="DNA 염기 서열" className={`${fieldClass} mt-2 font-mono uppercase`} />
          {stray && <p role="status" className="text-[.74rem] font-semibold text-warn">A·T·G·C가 아닌 글자는 빼고 읽었어요.</p>}
          <Toggle label="개시 코돈(AUG)부터 번역" checked={dna.fromStart} onChange={fromStart => setDna({ fromStart })} help="끄면 mRNA 첫 염기부터 세 개씩 읽어요." />
          <Button variant="ghost" size="sm" onClick={() => setDna({ input: randomGene(seededRandom(dna.seed * 7 + bases.length), 4), strand: "template", fromStart: true, seed: dna.seed + 1 })}><Shuffle size={14} /> 무작위 유전자</Button>
        </Card>
        <Card title="학습지">
          <p className="mb-1 text-xs font-semibold text-ink-4">주는 가닥</p>
          <Segmented label="주는 가닥" value={dna.given} onChange={given => setDna({ given })} options={[{ value: "template", label: "주형 가닥" }, { value: "coding", label: "암호화 가닥" }]} />
          <div className="mt-2 flex flex-wrap gap-1.5">{(Object.keys(dnaAsks) as DnaAsk[]).map(ask => <button key={ask} type="button" aria-pressed={dna.asks.includes(ask)} onClick={() => setDna({ asks: dna.asks.includes(ask) ? dna.asks.filter(item => item !== ask) : [...dna.asks, ask] })} className={chipClass(dna.asks.includes(ask))}>{dnaAsks[ask]}</button>)}</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div><p className="mb-1 text-xs font-semibold text-ink-4">문항 수</p><Segmented label="문항 수" value={dna.count} onChange={count => setDna({ count })} options={[2, 3, 5].map(value => ({ value, label: `${value}` }))} /></div>
            <div><p className="mb-1 text-xs font-semibold text-ink-4">아미노산 수</p><Segmented label="아미노산 수" value={dna.length} onChange={length => setDna({ length })} options={[3, 4, 6].map(value => ({ value, label: `${value + 1}` }))} /></div>
          </div>
          <Toggle label="지금 서열을 1번 문제로" checked={dna.includeCurrent} onChange={includeCurrent => setDna({ includeCurrent })} help="개시 코돈과 종결 코돈이 모두 있어야 넣을 수 있어요." />
          <Toggle label="유전 부호표 붙이기" checked={dna.table} onChange={table => setDna({ table })} />
          <input value={dna.title} maxLength={100} onChange={event => setDna({ title: event.target.value })} placeholder="학습지 제목 (예: 유전자 발현)" className={`${fieldClass} mt-2`} />
          <Toggle label="정답지 붙이기" checked={dna.answers} onChange={answers => setDna({ answers })} help="인쇄하면 정답은 새 쪽에서 시작합니다." />
          <Button variant="ghost" size="sm" onClick={() => setDna({ seed: dna.seed + 1 })}><Shuffle size={14} /> 다른 문제로</Button>
        </Card>
      </aside>
      <div className="min-w-0 space-y-4">
        <section className={`${panelClass} space-y-3`}>
          {bases.length ? <>
            <div className="overflow-x-auto text-black" dangerouslySetInnerHTML={{ __html: strandsHtml(expression, { given: dna.strand }) }} />
            {expression.start < 0 ? <p role="status" className="text-[.82rem] font-semibold text-warn">mRNA에 개시 코돈(AUG)이 없어 번역이 시작되지 않아요.</p> : <>
              <p className="rounded-xl bg-brand-page px-4 py-3 text-[.95rem] font-bold text-ink">{peptideText(expression) || "아미노산 없음"}{!expression.stopped && <span className="ml-2 text-xs font-semibold text-warn">종결 코돈이 없어 끝까지 읽었어요</span>}</p>
              <div className="max-w-md text-black [&_td]:bg-white" dangerouslySetInnerHTML={{ __html: expressionTable(expression) }} />
            </>}
          </> : <p className="text-[.86rem] text-ink-3">DNA 염기 서열(A·T·G·C)을 적어 주세요.</p>}
          <details className="text-[.8rem]">
            <summary className="cursor-pointer font-semibold text-ink-3">유전 부호표 보기</summary>
            <div className="mt-2 overflow-x-auto text-black [&_td]:bg-white" dangerouslySetInnerHTML={{ __html: codonTableHtml() }} />
          </details>
        </section>
        <ProblemSheet id="life-dna-print" sections={sections} options={{ title: dna.title || "유전자 발현", answers: dna.answers }} />
      </div>
    </section>
  );
}
