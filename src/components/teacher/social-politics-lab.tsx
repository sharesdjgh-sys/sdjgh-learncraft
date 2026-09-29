"use client";

import { z } from "zod";
import { Briefcase, Building2, Gavel, Plus, RotateCcw, Trash2, Users, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  allocate, DEFAULT_DISTRICTS, DEFAULT_PARTIES, districtResults, divisorTable, electionAsks, electionProblems, hemicycleSvg, KOREAN_DEFAULT, koreanMixed, largestRemainder,
  methodNames, PARTY_COLORS, systemFeatureRows, type ElectionAsk, type Method,
} from "@/features/social/election";
import { bequestResult, familySvg, heirsOf, inheritanceAsks, inheritanceProblems, kindNames, krw, shareText, type InheritanceAsk } from "@/features/social/inheritance";
import { fraction, grouped, num, percent } from "@/features/social/sheet";
import { Card, Segmented, Toggle } from "./tool-panel";
import { asksSchema, fieldClass, MultiChips, NumberField, panelClass, ProblemSheet, SheetCard, sheetSchema, Stat, SubjectLab, SvgView, ToolLayout, useStored } from "./science-lab-shared";
import { SOCIAL_AREA } from "./social-lab-shared";
import { GovernmentView, JudiciaryView, LaborView } from "./social-politics-views";

export function SocialPoliticsLab({ tabs }: { tabs?: React.ReactNode }) {
  return (
    <SubjectLab id="politics" area={SOCIAL_AREA} subject="정치·법" title="정치 · 법과 사회 · 통합사회 도구" tabs={tabs}
      description="정치, 법과 사회, 통합사회(인권 보장과 헌법)에서 쓰는 계산 도구와 학습지입니다. 의석 배분·상속분·임금은 법 조문대로 식으로 계산하고, 문제는 정답과 함께 인쇄합니다."
      views={[
        { value: "election", label: "선거·의석 배분", icon: Vote, note: "정당 득표로 비례 대표 의석을 여러 방식(헤어-니마이어·동트·생트라게·우리나라 준연동형)으로 나눠 비교하고, 소선거구 결과로 사표를 계산해요.", render: () => <ElectionView /> },
        { value: "government", label: "정부 형태", icon: Building2, note: "대통령제와 의원 내각제를 비교하고, 우리나라 정부 형태의 특징과 권력 분립 관계도를 보여 줘요.", render: () => <GovernmentView /> },
        { value: "judiciary", label: "법원·헌법 재판", icon: Gavel, note: "심급 제도, 헌법 재판소의 권한과 결정 정족수, 형사 절차와 인권 보장 제도를 다뤄요.", render: () => <JudiciaryView /> },
        { value: "inheritance", label: "상속 계산", icon: Users, note: "가족 구성으로 민법의 법정 상속인과 상속분을 구하고, 유언(유증)이 있을 때 유류분 부족액을 계산해요.", render: () => <InheritanceView /> },
        { value: "labor", label: "근로·임금", icon: Briefcase, note: "시급과 근로 시간으로 주휴 수당·가산 수당을 계산하고, 최저 임금과 청소년 근로 기준을 점검해요.", render: () => <LaborView /> },
      ]} />
  );
}

/* ───── 선거·의석 배분 ───── */
const partySchema = z.object({ name: z.string().max(20), votes: z.number().int().min(0).max(1e9), districts: z.number().int().min(0).max(400) });
const districtSchema = z.object({ name: z.string().max(20), votes: z.array(z.number().int().min(0).max(1e8)).max(8) });
const electionSchema = z.object({
  parties: z.array(partySchema).min(2).max(8).catch(DEFAULT_PARTIES),
  method: z.enum(["korea", "hare", "dhondt", "sainte"]).catch("korea"),
  seats: z.number().int().min(1).max(500).catch(46),
  threshold: z.number().min(0).max(20).catch(3),
  total: z.number().int().min(10).max(600).catch(KOREAN_DEFAULT.seats),
  proportional: z.number().int().min(1).max(300).catch(KOREAN_DEFAULT.proportional),
  districts: z.array(districtSchema).max(12).catch(DEFAULT_DISTRICTS),
  asks: asksSchema(electionAsks, ["dhondt", "hare", "wasted", "system"]),
  sheet: sheetSchema(2),
});
type ElectionState = z.infer<typeof electionSchema>;

function ElectionView() {
  const [state, update] = useStored("learncraft_social_election_v1", electionSchema);
  const parties = state.parties;
  const setParty = (index: number, patch: Partial<ElectionState["parties"][number]>) => update({ parties: parties.map((party, at) => at === index ? { ...party, ...patch } : party) });
  const totalVotes = parties.reduce((acc, party) => acc + party.votes, 0);
  const methods: Method[] = ["hare", "dhondt", "sainte"];
  const general = Object.fromEntries(methods.map(method => [method, allocate(parties, state.seats, method, state.threshold)])) as Record<Method, number[]>;
  const proportional = Math.min(state.proportional, state.total - 1);
  const korea = koreanMixed(parties, { seats: state.total, proportional });
  const color = (index: number) => PARTY_COLORS[index % PARTY_COLORS.length];
  const shown = state.method === "korea" ? [...parties.map((party, index) => ({ label: party.name, seats: korea.total[index], color: color(index) })), ...(korea.independents > 0 ? [{ label: "무소속 등", seats: korea.independents, color: "#9ca3af" }] : [])]
    : parties.map((party, index) => ({ label: party.name, seats: general[state.method as Method][index], color: color(index) }));
  const eligibleVotes = parties.map(party => totalVotes > 0 && party.votes / totalVotes >= state.threshold / 100 ? party.votes : 0);
  const columns = Math.min(state.seats, 10);
  const table = state.method === "dhondt" || state.method === "sainte" ? divisorTable(eligibleVotes, state.seats, state.method, columns) : null;
  const hareTie = state.method === "hare" && largestRemainder(eligibleVotes, state.seats).tie;
  const partyCount = Math.min(parties.length, 4);
  const districts = state.districts.map(district => ({ ...district, votes: Array.from({ length: partyCount }, (_, index) => district.votes[index] ?? 0) }));
  const wasted = districtResults(districts, partyCount);
  const setDistrict = (index: number, patch: Partial<ElectionState["districts"][number]>) => update({ districts: districts.map((district, at) => at === index ? { ...district, ...patch } : district) });
  return (
    <ToolLayout aside={<>
      <Card title="정당별 득표" help="비례 대표 선거의 정당 득표와 지역구 당선자 수예요. 처음 값은 가상의 자료예요." action={<Button variant="ghost" size="sm" onClick={() => update({ parties: DEFAULT_PARTIES, districts: DEFAULT_DISTRICTS })}><RotateCcw size={14} /> 처음대로</Button>}>
        <div className="grid grid-cols-[minmax(0,1fr)_7rem_4rem_auto] gap-1.5 text-[.7rem] font-semibold text-ink-4"><span>정당</span><span>득표 수</span><span>지역구</span><span /></div>
        <div className="mt-1 space-y-1.5">
          {parties.map((party, index) => (
            <div key={index} className="grid grid-cols-[minmax(0,1fr)_7rem_4rem_auto] items-center gap-1.5">
              <span className="flex items-center gap-1"><span className="size-2.5 shrink-0 rounded-full" style={{ background: color(index) }} /><input value={party.name} maxLength={20} onChange={event => setParty(index, { name: event.target.value })} aria-label="정당 이름" className={`${fieldClass} min-w-0 py-1 text-[.8rem]`} /></span>
              <NumberField label="" value={party.votes} min={0} max={1e9} step={1000} onChange={votes => setParty(index, { votes: Math.round(votes) })} />
              <NumberField label="" value={party.districts} min={0} max={400} onChange={value => setParty(index, { districts: Math.round(value) })} />
              <Button variant="ghost" size="icon" className="size-9" disabled={parties.length <= 2} onClick={() => update({ parties: parties.filter((_, at) => at !== index) })} aria-label={`${party.name} 지우기`}><Trash2 size={14} /></Button>
            </div>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="mt-2" disabled={parties.length >= 8} onClick={() => update({ parties: [...parties, { name: `${"가나다라마바사아"[parties.length]}당`, votes: 500_000, districts: 0 }] })}><Plus size={14} /> 정당 더하기</Button>
      </Card>
      <Card title="배분 방식">
        <Segmented label="배분 방식" value={state.method} onChange={method => update({ method })} options={[{ value: "korea", label: "준연동형" }, { value: "hare", label: "헤어" }, { value: "dhondt", label: "동트" }, { value: "sainte", label: "생트라게" }]} />
        {state.method === "korea"
          ? <div className="mt-2 grid grid-cols-2 gap-2"><NumberField label="의원 정수" unit="명" value={state.total} min={10} max={600} onChange={total => update({ total: Math.round(total) })} /><NumberField label="비례 대표" unit="석" value={state.proportional} min={1} max={300} onChange={value => update({ proportional: Math.round(value) })} /></div>
          : <div className="mt-2 grid grid-cols-2 gap-2"><NumberField label="나눌 의석" unit="석" value={state.seats} min={1} max={500} onChange={seats => update({ seats: Math.round(seats) })} /><NumberField label="봉쇄 조항" unit="%" value={state.threshold} min={0} max={20} step={0.5} onChange={threshold => update({ threshold })} /></div>}
        <p className="mt-2 text-[.72rem] leading-5 text-ink-4">{state.method === "korea" ? "공직선거법 제189조(제22대 총선 기준). 의석 할당 정당은 비례 득표 3% 이상 또는 지역구 5석 이상인 정당이에요. 21대 총선에만 있던 30석 상한은 적용하지 않고, 동률 추첨은 반영하지 않아요." : "득표율이 봉쇄 조항보다 낮은 정당은 의석을 받지 못해요."}</p>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 선거 제도와 의석 배분)">
        <MultiChips options={electionAsks} value={state.asks} onChange={asks => update({ asks: asks as ElectionAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} space-y-3`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-[.8rem]">
            <thead><tr className="bg-surface-2 text-ink-3"><th className="px-2 py-1.5 text-left">정당</th><th className="px-2 py-1.5">득표율</th>{methods.map(method => <th key={method} className="px-2 py-1.5">{methodNames[method].split("(")[0]}<span className="block text-[.68rem] font-normal">{state.seats}석</span></th>)}<th className="px-2 py-1.5">준연동형<span className="block text-[.68rem] font-normal">지역구 + 비례 = 합계</span></th></tr></thead>
            <tbody>
              {parties.map((party, index) => (
                <tr key={index} className="border-t border-line text-center">
                  <td className="px-2 py-1 text-left"><span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: color(index) }} />{party.name}</span></td>
                  <td className="px-2 py-1">{totalVotes ? percent(party.votes / totalVotes, 2) : "—"}</td>
                  {methods.map(method => <td key={method} className="px-2 py-1 font-semibold">{general[method][index]}</td>)}
                  <td className="px-2 py-1">{party.districts} + {korea.proportional[index]} = <b>{korea.total[index]}</b>{!korea.eligible[index] && <span className="block text-[.68rem] text-ink-4">의석 할당 정당 아님</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {korea.independents < 0 && <p role="alert" className="text-[.78rem] font-semibold text-warn">정당의 지역구 당선자 합({korea.districtSeats - korea.independents}석)이 지역구 의석({korea.districtSeats}석)보다 많아요. 값을 확인해 주세요.</p>}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-start">
          <div>
            <p className="mb-1 text-xs font-bold text-ink-3">{state.method === "korea" ? `국회 의석(지역구 ${korea.districtSeats} + 비례 ${proportional})` : `${methodNames[state.method]} · ${state.seats}석`}</p>
            <SvgView label="의석 분포" svg={hemicycleSvg(shown)} />
          </div>
          <div className="min-w-0 space-y-2 text-[.8rem]">
            {state.method === "korea" && <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[26rem] border-collapse">
                  <thead><tr className="bg-surface-2 text-ink-3"><th className="px-1.5 py-1 text-left">정당</th><th className="px-1.5 py-1">득표 비율</th><th className="px-1.5 py-1">연동 배분</th><th className="px-1.5 py-1">{korea.kind === "adjusted" ? "조정 의석" : "잔여 배분"}</th><th className="px-1.5 py-1">비례 합</th></tr></thead>
                  <tbody>{parties.map((party, index) => korea.eligible[index] && <tr key={index} className="border-t border-line text-center"><td className="px-1.5 py-1 text-left">{party.name}</td><td className="px-1.5 py-1">{percent(korea.ratio[index], 2)}</td><td className="px-1.5 py-1">{num(korea.raw[index], 2)} → <b>{korea.linked[index]}</b></td><td className="px-1.5 py-1">{korea.kind === "adjusted" ? korea.proportional[index] : `+${korea.extra[index]}`}</td><td className="px-1.5 py-1 font-bold">{korea.proportional[index]}</td></tr>)}</tbody>
                </table>
              </div>
              <p className="leading-5 text-ink-3">연동 배분 의석 = [({state.total} − {korea.nonEligible}) × 득표 비율 − 지역구 당선인] ÷ 2 (1 미만은 0, 소수점 첫째 자리에서 반올림). 합계 {korea.linkedTotal}석이 비례 {proportional}석보다 {korea.kind === "residual" ? `적어 남은 ${proportional - korea.linkedTotal}석을 득표 비율로 더 나눠요` : korea.kind === "adjusted" ? "많아 비례 의석 × 연동 배분 의석 ÷ 합계로 줄여요(조정 의석)" : "같아 그대로 배분해요"}.</p>
              <p className="text-[.72rem] text-ink-4">의석 할당 정당이 추천하지 않은 지역구 당선인 {korea.nonEligible}명(무소속 {Math.max(0, korea.independents)}명 포함)</p>
            </>}
            {table && <>
              <div className="overflow-x-auto">
                <table className="border-collapse">
                  <thead><tr className="bg-surface-2 text-ink-3"><th className="px-1.5 py-1 text-left">÷</th>{Array.from({ length: columns }, (_, k) => <th key={k} className="px-1.5 py-1">{state.method === "dhondt" ? k + 1 : 2 * k + 1}</th>)}</tr></thead>
                  <tbody>{table.cells.map((row, index) => <tr key={index} className="border-t border-line text-center"><td className="px-1.5 py-1 text-left">{parties[index]?.name}</td>{row.map(cell => <td key={cell.k} className={cell.won ? "bg-brand-soft px-1.5 py-1 font-bold text-brand-dark" : "px-1.5 py-1 text-ink-4"}>{eligibleVotes[index] ? grouped(cell.value, 0) : "—"}</td>)}</tr>)}</tbody>
                </table>
              </div>
              <p className="leading-5 text-ink-3">득표 수를 {state.method === "dhondt" ? "1, 2, 3, …" : "1, 3, 5, …"}로 나눈 몫이 큰 순서대로 {state.seats}석을 줘요(색칠한 칸).{state.seats > columns && ` 표는 ÷${state.method === "dhondt" ? columns : 2 * columns - 1}까지만 보여요.`}</p>
              {table.tie && <p role="status" className="font-semibold text-warn">마지막 의석의 몫이 같아요. 실제로는 추첨 등으로 정해요.</p>}
            </>}
            {state.method === "hare" && <>
              <p className="leading-5 text-ink-3">몫 = 득표 × {state.seats} ÷ 봉쇄 조항을 넘은 정당의 득표 합. 정수 부분을 먼저 주고 남은 의석은 소수 부분이 큰 순서로 줘요.</p>
              <ul className="grid gap-1 sm:grid-cols-2">{parties.map((party, index) => <li key={index} className="rounded-lg bg-surface-2 px-2 py-1">{party.name}: 몫 {num(largestRemainder(eligibleVotes, state.seats).quotas[index], 3)} → <b>{general.hare[index]}석</b></li>)}</ul>
              {hareTie && <p role="status" className="font-semibold text-warn">남은 의석을 가를 나머지가 같아요. 실제로는 추첨 등으로 정해요.</p>}
            </>}
          </div>
        </div>
      </section>
      <section className={`${panelClass} space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold text-ink">소선거구 다수 대표제 결과와 사표</h2>
          <Button variant="ghost" size="sm" disabled={districts.length >= 12} onClick={() => update({ districts: [...districts, { name: `제${districts.length + 1}선거구`, votes: Array(partyCount).fill(10_000) }] })}><Plus size={14} /> 선거구 더하기</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-[.8rem]">
            <thead><tr className="bg-surface-2 text-ink-3"><th className="px-1.5 py-1 text-left">선거구</th>{parties.slice(0, partyCount).map((party, index) => <th key={index} className="px-1.5 py-1">{party.name}</th>)}<th className="px-1.5 py-1">당선</th><th className="px-1.5 py-1">사표</th><th /></tr></thead>
            <tbody>
              {wasted.rows.map((row, index) => (
                <tr key={index} className="border-t border-line text-center">
                  <td className="px-1 py-1"><input value={districts[index].name} maxLength={20} onChange={event => setDistrict(index, { name: event.target.value })} aria-label="선거구 이름" className={`${fieldClass} w-24 py-1 text-[.8rem]`} /></td>
                  {row.votes.map((vote, at) => <td key={at} className="px-1 py-1"><NumberField label="" value={vote} min={0} max={1e8} step={1000} onChange={value => setDistrict(index, { votes: row.votes.map((item, i) => i === at ? Math.round(value) : item) })} className="w-24" /></td>)}
                  <td className="px-1.5 py-1 font-semibold">{row.winner >= 0 ? parties[row.winner]?.name : "—"}{row.tie && <span className="block text-[.68rem] text-warn">동률</span>}</td>
                  <td className="px-1.5 py-1">{grouped(row.wasted, 0)}</td>
                  <td className="px-1 py-1"><Button variant="ghost" size="icon" className="size-9" onClick={() => update({ districts: districts.filter((_, at) => at !== index) })} aria-label={`${row.name} 지우기`}><Trash2 size={14} /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="전체 사표" value={`${grouped(wasted.wasted, 0)}표`} />
          <Stat label="사표율" value={percent(wasted.wastedRate)} note="당선자에게 가지 않은 표" />
          {wasted.parties.slice(0, 2).map((item, index) => <Stat key={index} label={parties[index]?.name ?? ""} value={`${item.seats}석`} note={`득표율 ${percent(item.voteShare)} · 의석률 ${percent(item.seatShare)}`} />)}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-[.78rem]">
            <thead><tr className="bg-surface-2 text-ink-3"><th className="px-2 py-1 text-left">제도</th><th className="px-2 py-1 text-left">특징</th></tr></thead>
            <tbody>{systemFeatureRows().map(row => <tr key={row.system} className="border-t border-line align-top"><td className="whitespace-nowrap px-2 py-1 font-semibold">{row.name}</td><td className="px-2 py-1 text-ink-3">{row.features.join(" · ")}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <ProblemSheet id="social-election-print" sections={electionProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "선거 제도와 의석 배분", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 상속 계산 ───── */
const inheritanceSchema = z.object({
  spouse: z.boolean().catch(true), children: z.number().int().min(0).max(6).catch(2), parents: z.number().int().min(0).max(2).catch(1), siblings: z.number().int().min(0).max(6).catch(2),
  estate: z.number().min(0).max(1e13).catch(7e8), bequestOn: z.boolean().catch(false), bequest: z.number().min(0).max(1e13).catch(7e8),
  asks: asksSchema(inheritanceAsks, ["order", "share", "reserve"]), sheet: sheetSchema(2),
});

function InheritanceView() {
  const [state, update] = useStored("learncraft_social_inheritance_v1", inheritanceSchema);
  const family = { spouse: state.spouse, children: state.children, parents: state.parents, siblings: state.siblings };
  const { heirs, order } = heirsOf(family);
  const bequest = state.bequestOn ? Math.min(state.bequest, state.estate) : 0;
  const rows = bequestResult(family, state.estate, bequest);
  return (
    <ToolLayout aside={<>
      <Card title="가족 구성" help="피상속인(사망한 사람)의 가족이에요. 대습 상속(자녀가 먼저 사망한 경우)과 4순위(4촌 이내 방계 혈족)는 다루지 않아요.">
        <Toggle label="배우자" checked={state.spouse} onChange={spouse => update({ spouse })} />
        <div className="mt-1 grid grid-cols-3 gap-2">
          <NumberField label="자녀" unit="명" value={state.children} min={0} max={6} onChange={children => update({ children: Math.round(children) })} />
          <NumberField label="부모(생존)" unit="명" value={state.parents} min={0} max={2} onChange={parents => update({ parents: Math.round(parents) })} />
          <NumberField label="형제자매" unit="명" value={state.siblings} min={0} max={6} onChange={siblings => update({ siblings: Math.round(siblings) })} />
        </div>
        <NumberField className="mt-2" label="상속 재산(빚 없음)" unit="만 원" value={state.estate / 1e4} min={0} max={1e9} step={100} onChange={value => update({ estate: Math.round(value) * 1e4 })} />
      </Card>
      <Card title="유언(유증)" help="재산 일부나 전부를 상속인이 아닌 사람(단체)에게 준다는 유언이에요. 남은 재산은 법정 상속분대로 나눈다고 봐요.">
        <Toggle label="유증이 있음" checked={state.bequestOn} onChange={bequestOn => update({ bequestOn })} />
        {state.bequestOn && <NumberField className="mt-1" label="남에게 준 재산" unit="만 원" value={state.bequest / 1e4} min={0} max={1e9} step={100} onChange={value => update({ bequest: Math.round(value) * 1e4 })} />}
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 상속과 유류분)">
        <MultiChips options={inheritanceAsks} value={state.asks} onChange={asks => update({ asks: asks as InheritanceAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} space-y-3`}>
        <SvgView label="가계도와 상속분" svg={familySvg(family, state.estate)} />
        <p className="rounded-xl bg-brand-page px-4 py-3 text-[.9rem] font-bold">
          {heirs.length === 0 ? "1~3순위 상속인과 배우자가 없어요. 4순위(4촌 이내 방계 혈족)가 상속하고, 그마저 없으면 국가에 귀속돼요."
            : order === 0 ? "1·2순위 상속인이 없어 배우자가 혼자 상속해요(형제자매보다 앞서요)."
              : `${order}순위 ${kindNames[heirs.find(heir => heir.kind !== "spouse")!.kind]}${family.spouse ? "와 배우자가 함께" : "가"} 상속해요.${family.spouse ? " 배우자는 함께 상속하는 사람 몫의 1.5배(5할 가산)를 받아요." : ""}`}
        </p>
        {rows.length > 0 && <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-[.8rem]">
            <thead><tr className="bg-surface-2 text-ink-3"><th className="px-2 py-1.5 text-left">상속인</th><th className="px-2 py-1.5">법정 상속분</th><th className="px-2 py-1.5">상속액</th><th className="px-2 py-1.5">유류분</th><th className="px-2 py-1.5">유류분액</th>{state.bequestOn && <><th className="px-2 py-1.5">유증 뒤 받는 몫</th><th className="px-2 py-1.5">부족액(반환 청구)</th></>}</tr></thead>
            <tbody>{rows.map((row, index) => (
              <tr key={index} className="border-t border-line text-center">
                <td className="px-2 py-1 text-left font-semibold">{row.heir.label}</td>
                <td className="px-2 py-1">{shareText(row.heir)}</td>
                <td className="px-2 py-1">{krw(row.legal)}</td>
                <td className="px-2 py-1">{row.reserve.top ? fraction(row.reserve.top, row.reserve.bottom) : "없음"}</td>
                <td className="px-2 py-1">{krw(row.reserveAmount)}</td>
                {state.bequestOn && <><td className="px-2 py-1">{krw(row.received)}</td><td className={row.shortfall > 0 ? "px-2 py-1 font-bold text-warn" : "px-2 py-1"}>{krw(row.shortfall)}</td></>}
              </tr>
            ))}</tbody>
          </table>
        </div>}
        <ul className="grid gap-1 text-[.74rem] leading-5 text-ink-4 md:grid-cols-2">
          <li>상속 순위(민법 제1000조): 1 직계 비속 → 2 직계 존속 → 3 형제자매 → 4 4촌 이내 방계 혈족. 같은 순위끼리는 똑같이 나눠요.</li>
          <li>배우자(민법 제1003·1009조): 1·2순위와 공동 상속하고 5할을 더 받으며, 그들이 없으면 단독 상속해요.</li>
          <li>유류분(민법 제1112조): 직계 비속·배우자는 법정 상속분의 1/2, 직계 존속은 1/3이에요.</li>
          <li>형제자매의 유류분은 2024년 4월 헌법 재판소 위헌 결정으로 효력을 잃었어요. 빚·생전 증여는 계산에 넣지 않았어요.</li>
        </ul>
      </section>
      <ProblemSheet id="social-inheritance-print" sections={inheritanceProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "상속과 유류분", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}
