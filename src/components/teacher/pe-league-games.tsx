"use client";

import { useMemo, useRef, useState } from "react";
import { ClipboardCopy, Download, Eraser, Printer, Shuffle, Trophy, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  matchResult, pairKey, parseTeamNames, resolveBracket, roundName, roundRobin, seedTeams, standings,
  type BracketMatch, type LeagueScore, type Team, type TournamentResult,
} from "@/lib/pe-league/model";
import { cn } from "@/lib/utils";
import { download, escapeHtml, printHtml } from "./pe-league-export";
import { Card, Range, Segmented, Toggle } from "./tool-panel";

export type GamesState = {
  teamText: string;
  mode: "league" | "tournament";
  league: { double: boolean; courts: number; win: number; draw: number; loss: number; allowDraw: boolean };
  tournament: { random: boolean; seed: number; thirdPlace: boolean };
  leagueScores: Record<string, LeagueScore>;
  tournamentResults: Record<string, TournamentResult>;
};

const sans = "Pretendard, 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif";
const areaClass = "w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-[.84rem] leading-6 text-ink outline-none focus-visible:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/10";
const scoreClass = "figure h-9 w-12 rounded-lg border border-line bg-white text-center text-[.95rem] font-extrabold text-ink outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10";
const cleanScore = (text: string) => text.replace(/[^\d]/g, "").slice(0, 3);

export function PeLeagueGames({ state, set, teams, setMessage }: { state: GamesState; set: (patch: Partial<GamesState>) => void; teams: Team[] | null; setMessage: (text: string) => void }) {
  const names = useMemo(() => parseTeamNames(state.teamText), [state.teamText]);
  const [confirmClear, setConfirmClear] = useState(false);
  const clearScores = () => {
    if (!confirmClear) { setConfirmClear(true); window.setTimeout(() => setConfirmClear(false), 3000); return; }
    setConfirmClear(false);
    set(state.mode === "league" ? { leagueScores: {} } : { tournamentResults: {} });
    setMessage("점수를 모두 지웠어요.");
  };
  const league = state.league;
  const tournament = state.tournament;

  return <section className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)] xl:items-start">
    <div className="space-y-4 xl:sticky xl:top-24">
      <Card title="참가 팀" help="한 줄에 한 팀씩 적어요. 토너먼트에서 ‘입력 순서대로’를 고르면 위에 적은 팀이 1번 시드예요."
        action={teams && <Button variant="ghost" size="sm" onClick={() => { set({ teamText: teams.map((team) => team.name).join("\n") }); setMessage("팀 편성의 팀 이름을 가져왔어요."); }}><UsersRound size={13} /> 팀 편성에서</Button>}>
        <textarea value={state.teamText} rows={8} spellCheck={false} onChange={(event) => set({ teamText: event.target.value })} placeholder={"1반\n2반\n3반\n4반"} className={areaClass} aria-label="참가 팀" />
        <p className="mt-1 text-[.74rem] text-ink-4">{names.length}팀{names.length < 2 ? " · 두 팀 이상 적어 주세요" : ""}{names.length >= 64 ? " · 64팀까지만 써요" : ""}</p>
      </Card>

      <Card title="경기 방식">
        <Segmented label="경기 방식" value={state.mode} onChange={(mode) => set({ mode })} options={[{ value: "league", label: "리그전 (풀리그)" }, { value: "tournament", label: "토너먼트" }]} />
        {state.mode === "league" ? <div className="mt-3 space-y-2">
          <Toggle label="두 번씩 (홈·원정)" checked={league.double} onChange={(double) => set({ league: { ...league, double } })} help="모든 팀과 두 번 경기해요. 두 번째에는 홈·원정(먼저 공격 등)을 바꿔요." />
          <Range label="경기장 수 (동시에 하는 경기)" value={league.courts} min={1} max={6} suffix="곳" onChange={(courts) => set({ league: { ...league, courts } })} />
          <Toggle label="무승부 없음 (배구·배드민턴 등)" checked={!league.allowDraw} onChange={(noDraw) => set({ league: { ...league, allowDraw: !noDraw } })} help="같은 점수를 넣으면 잘못된 결과로 표시하고 순위에서 빼요." />
          <div>
            <p className="mb-1 text-xs font-semibold text-ink-4">승점</p>
            <div className="grid grid-cols-3 gap-2">
              {([["win", "승"], ["draw", "무"], ["loss", "패"]] as const).map(([key, label]) => <label key={key} className={cn("flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2 py-1 text-[.78rem] font-bold text-ink-3", key === "draw" && !league.allowDraw && "opacity-40")}>
                {label}
                <input type="number" min={0} max={9} value={league[key]} disabled={key === "draw" && !league.allowDraw} onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) => set({ league: { ...league, [key]: Math.max(0, Math.min(9, Math.floor(Number(event.target.value) || 0))) } })}
                  className="figure w-full min-w-0 rounded-md bg-white px-1 py-0.5 text-center text-sm text-ink outline-none" />
              </label>)}
            </div>
          </div>
          <p className="break-keep text-[.7rem] leading-5 text-ink-5">순위: 승점 → 득실차 → 다득점 → 승자승(같은 팀끼리 경기) 순으로 정해요.</p>
        </div> : <div className="mt-3 space-y-2">
          <div>
            <p className="mb-1 text-xs font-semibold text-ink-4">대진 배치</p>
            <Segmented label="대진 배치" value={tournament.random ? "random" : "order"} onChange={(value) => set({ tournament: { ...tournament, random: value === "random" } })}
              options={[{ value: "order", label: "입력 순서 = 시드" }, { value: "random", label: "무작위 추첨" }]} />
          </div>
          {tournament.random && <Button variant="secondary" size="sm" className="w-full" onClick={() => { set({ tournament: { ...tournament, seed: tournament.seed + 1 } }); setMessage("대진을 다시 추첨했어요."); }}><Shuffle size={14} /> 다시 추첨</Button>}
          <Toggle label="3·4위전" checked={tournament.thirdPlace} onChange={(thirdPlace) => set({ tournament: { ...tournament, thirdPlace } })} />
          <p className="break-keep text-[.7rem] leading-5 text-ink-5">팀 수가 2·4·8·16…이 아니면 높은 시드가 부전승으로 올라가요. 점수가 같으면 승부차기 등으로 이긴 팀을 골라 주세요.</p>
        </div>}
        <Button variant={confirmClear ? "danger" : "ghost"} size="sm" className="mt-3 w-full" onClick={clearScores}><Eraser size={14} /> {confirmClear ? "한 번 더 누르면 지워요" : "점수 모두 지우기"}</Button>
      </Card>
    </div>

    <div className="min-w-0 space-y-4">
      {names.length < 2
        ? <div className="grid min-h-[420px] place-items-center rounded-[18px] border border-dashed border-line bg-surface p-8 text-center">
          <div>
            <Trophy size={30} className="mx-auto text-brand/60" />
            <p className="mt-3 text-[.95rem] font-bold text-ink-2">왼쪽에 참가 팀을 두 팀 이상 적어 주세요</p>
            <p className="mt-1 text-[.8rem] text-ink-4">‘팀 편성’에서 나눈 팀을 그대로 가져올 수도 있어요.</p>
          </div>
        </div>
        : state.mode === "league"
          ? <LeagueView names={names} state={state} set={set} setMessage={setMessage} />
          : <TournamentView names={names} state={state} set={set} setMessage={setMessage} />}
    </div>
  </section>;
}

type ViewProps = { names: string[]; state: GamesState; set: (patch: Partial<GamesState>) => void; setMessage: (text: string) => void };

async function copyText(text: string, setMessage: (text: string) => void, done: string) {
  try { await navigator.clipboard.writeText(text); setMessage(done); }
  catch { setMessage("복사하지 못했어요. 브라우저 권한을 확인해 주세요."); }
}

/* ───── 리그전 ───── */

function LeagueView({ names, state, set, setMessage }: ViewProps) {
  const league = state.league;
  const rounds = useMemo(() => roundRobin(names.length, { double: league.double, courts: league.courts }), [names.length, league.double, league.courts]);
  const points = { win: league.win, draw: league.draw, loss: league.loss };
  const table = standings(names, rounds, state.leagueScores, points, league.allowDraw);
  const matches = rounds.flatMap((round) => round.matches);
  const doneCount = matches.filter((match) => matchResult(state.leagueScores[match.id], pairKey(names[match.home], names[match.away]), league.allowDraw).state === "done").length;
  const setScore = (id: string, pair: string, side: "home" | "away", value: string) => {
    const previous = state.leagueScores[id];
    const base = previous && previous.pair === pair ? previous : { home: "", away: "", pair };
    set({ leagueScores: { ...state.leagueScores, [id]: { ...base, [side]: cleanScore(value) } } });
  };
  const slotLabel = (slot: number, court: number) => league.courts > 1 ? `${slot}타임 · ${court}경기장` : `${slot}경기`;
  const header = ["순위", "팀", "경기", "승", ...(league.allowDraw ? ["무"] : []), "패", "득점", "실점", "득실차", "승점"];
  const rowCells = (row: (typeof table)[number]) => [String(row.rank), names[row.team], String(row.played), String(row.win), ...(league.allowDraw ? [String(row.draw)] : []), String(row.loss), String(row.goalsFor), String(row.goalsAgainst), row.diff > 0 ? `+${row.diff}` : String(row.diff), String(row.points)];
  const scheduleText = () => rounds.map((round) => `${round.round}라운드${round.rest.length ? ` (휴식: ${round.rest.map((team) => names[team]).join(", ")})` : ""}\n${round.matches.map((match) => {
    const result = matchResult(state.leagueScores[match.id], pairKey(names[match.home], names[match.away]), league.allowDraw);
    return `  ${slotLabel(match.slot, match.court)}  ${names[match.home]} ${result.state === "done" ? `${result.home} : ${result.away}` : "vs"} ${names[match.away]}`;
  }).join("\n")}`).join("\n\n");
  const printAll = () => {
    const standingsHtml = `<h2>순위표</h2><table><tr>${header.map((cell) => `<th>${cell}</th>`).join("")}</tr>${table.map((row) => `<tr>${rowCells(row).map((cell, index) => `<td${index === 1 ? " class=\"left\"" : ""}>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</table>`;
    const scheduleHtml = rounds.map((round) => `<h2>${round.round}라운드${round.rest.length ? ` <span class="muted">휴식: ${escapeHtml(round.rest.map((team) => names[team]).join(", "))}</span>` : ""}</h2><table>${round.matches.map((match) => {
      const result = matchResult(state.leagueScores[match.id], pairKey(names[match.home], names[match.away]), league.allowDraw);
      return `<tr><td style="width:18%">${slotLabel(match.slot, match.court)}</td><td style="width:30%">${escapeHtml(names[match.home])}</td><td style="width:16%">${result.state === "done" ? `${result.home} : ${result.away}` : "&nbsp;:&nbsp;"}</td><td style="width:30%">${escapeHtml(names[match.away])}</td></tr>`;
    }).join("")}</table>`).join("");
    if (!printHtml("리그전 일정과 순위", standingsHtml + scheduleHtml)) setMessage("팝업이 막혀 인쇄 창을 열지 못했어요.");
  };

  return <>
    <Card title="순위표" action={<div className="flex gap-1">
      <Button variant="secondary" size="sm" onClick={() => void copyText([header, ...table.map(rowCells)].map((row) => row.join("\t")).join("\n"), setMessage, "순위표를 복사했어요. 엑셀·한글 표에 붙여 넣으세요.")}><ClipboardCopy size={14} /> 복사</Button>
      <Button variant="ghost" size="sm" className="px-2" onClick={printAll} title="일정과 순위 인쇄" aria-label="일정과 순위 인쇄"><Printer size={15} /></Button>
    </div>}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-center text-[.84rem]">
          <thead><tr className="border-b border-line text-[.72rem] text-ink-4">{header.map((cell) => <th key={cell} className={cn("px-2 py-1.5 font-bold", cell === "팀" && "text-left")}>{cell}</th>)}</tr></thead>
          <tbody>
            {table.map((row) => <tr key={row.team} className={cn("border-b border-line/60", row.rank === 1 && row.played > 0 && "bg-[#fff9db]")}>
              {rowCells(row).map((cell, index) => <td key={index} className={cn("figure px-2 py-1.5", index === 0 && "font-extrabold text-brand-dark", index === 1 && "text-left font-bold text-ink-2", index === rowCells(row).length - 1 && "font-extrabold text-ink")}>{cell}</td>)}
            </tr>)}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[.72rem] text-ink-4">결과 입력 {doneCount} / {matches.length}경기</p>
    </Card>

    <Card title="경기 일정" action={<Button variant="secondary" size="sm" onClick={() => void copyText(scheduleText(), setMessage, "경기 일정을 복사했어요.")}><ClipboardCopy size={14} /> 복사</Button>}>
      <div className="grid gap-3 lg:grid-cols-2">
        {rounds.map((round) => <div key={round.round} className="rounded-xl border border-line bg-surface-2 p-2.5">
          <p className="mb-1.5 flex items-center justify-between px-1 text-[.8rem] font-extrabold text-ink-2">{round.round}라운드
            {round.rest.length > 0 && <span className="text-[.7rem] font-semibold text-ink-4">휴식: {round.rest.map((team) => names[team]).join(", ")}</span>}</p>
          <ul className="space-y-1">
            {round.matches.map((match) => {
              const pair = pairKey(names[match.home], names[match.away]);
              const score = state.leagueScores[match.id]?.pair === pair ? state.leagueScores[match.id] : undefined;
              const result = matchResult(score, pair, league.allowDraw);
              const win = result.state === "done" ? Math.sign(result.home - result.away) : 0;
              return <li key={match.id} className={cn("grid grid-cols-[4.6rem_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 rounded-lg bg-white px-2 py-1", result.state === "invalid" && "ring-2 ring-danger/40")}>
                <span className="text-[.68rem] font-semibold text-ink-4">{slotLabel(match.slot, match.court)}</span>
                <span className={cn("truncate text-right text-[.84rem]", win > 0 ? "font-extrabold text-ink" : "font-semibold text-ink-3")}>{names[match.home]}</span>
                <span className="flex items-center gap-1">
                  <input aria-label={`${names[match.home]} 점수`} inputMode="numeric" value={score?.home ?? ""} onChange={(event) => setScore(match.id, pair, "home", event.target.value)} className={scoreClass} />
                  <span className="text-ink-4">:</span>
                  <input aria-label={`${names[match.away]} 점수`} inputMode="numeric" value={score?.away ?? ""} onChange={(event) => setScore(match.id, pair, "away", event.target.value)} className={scoreClass} />
                </span>
                <span className={cn("truncate text-[.84rem]", win < 0 ? "font-extrabold text-ink" : "font-semibold text-ink-3")}>{names[match.away]}</span>
                {result.state === "invalid" && <span className="col-span-4 text-[.68rem] font-semibold text-danger">무승부가 없는 종목이에요. 점수를 확인해 주세요.</span>}
              </li>;
            })}
          </ul>
        </div>)}
      </div>
    </Card>
  </>;
}

/* ───── 토너먼트 ───── */

function TournamentView({ names, state, set, setMessage }: ViewProps) {
  const tournament = state.tournament;
  const seeds = useMemo(() => seedTeams(names.length, tournament.random, tournament.seed), [names.length, tournament.random, tournament.seed]);
  const bracket = resolveBracket(names, seeds, state.tournamentResults, tournament.thirdPlace);
  const svgRef = useRef<SVGSVGElement>(null);
  const setResult = (match: BracketMatch, patch: Partial<TournamentResult>) => {
    const pair = pairKey(names[match.a.team!], names[match.b.team!]);
    const previous = state.tournamentResults[match.id];
    const base: TournamentResult = previous && previous.pair === pair ? previous : { a: "", b: "", pair };
    const next = { ...base, ...patch };
    // 점수를 고쳐 더 이상 동점이 아니면 골라 둔 승자는 지웁니다.
    if ((patch.a !== undefined || patch.b !== undefined) && next.a !== next.b) delete next.winner;
    set({ tournamentResults: { ...state.tournamentResults, [match.id]: next } });
  };
  const all = [...bracket.rounds.flat(), ...(bracket.third ? [bracket.third] : [])];
  const playable = all.filter((match) => !match.auto && !(match.a.bye || match.b.bye));
  const doneCount = playable.filter((match) => match.winner).length;

  const savePng = async () => {
    if (!svgRef.current) return;
    try { download(await svgToPng(svgRef.current), "토너먼트 대진표.png"); setMessage("대진표를 PNG로 저장했어요."); }
    catch { setMessage("그림을 만들지 못했어요. 다시 시도해 주세요."); }
  };
  const print = () => {
    if (!svgRef.current) return;
    const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
    clone.removeAttribute("class");
    if (!printHtml("토너먼트 대진표", new XMLSerializer().serializeToString(clone))) setMessage("팝업이 막혀 인쇄 창을 열지 못했어요.");
  };
  const resultText = () => [
    ...bracket.rounds.map((round, index) => `${roundName(round.length, index + 1)}\n${round.filter((match) => !match.a.bye && !match.b.bye).map((match) => `  ${teamLabel(names, match.a)} ${match.scoreA ?? ""}${match.scoreA !== null ? " : " : " vs "}${match.scoreB ?? ""} ${teamLabel(names, match.b)}${match.winner ? `  → ${teamLabel(names, match.winner === "a" ? match.a : match.b)}` : ""}`).join("\n")}`),
    ...(bracket.third ? [`3·4위전\n  ${teamLabel(names, bracket.third.a)} vs ${teamLabel(names, bracket.third.b)}${bracket.third.winner ? `  → ${teamLabel(names, bracket.third.winner === "a" ? bracket.third.a : bracket.third.b)}` : ""}`] : []),
    ...(bracket.podium.length ? [`최종 순위: ${bracket.podium.map((team, index) => `${index + 1}위 ${names[team]}`).join(", ")}`] : []),
  ].join("\n\n");

  return <>
    {bracket.champion !== null && <div className="flex items-center gap-3 rounded-[18px] border border-[#fcc419] bg-[#fff9db] px-4 py-3">
      <Trophy size={24} className="text-[#e67700]" />
      <p className="text-[.95rem] font-extrabold text-ink">우승 {names[bracket.champion]}
        <span className="ml-3 text-[.8rem] font-semibold text-ink-3">{bracket.podium.slice(1).map((team, index) => `${index + 2}위 ${names[team]}`).join(" · ")}</span></p>
    </div>}
    <Card title={`대진표 (${names.length}팀 · ${bracket.size}강 기준)`} action={<div className="flex gap-1">
      <Button variant="secondary" size="sm" onClick={() => void savePng()}><Download size={14} /> PNG</Button>
      <Button variant="secondary" size="sm" onClick={() => void copyText(resultText(), setMessage, "경기 결과를 복사했어요.")}><ClipboardCopy size={14} /> 복사</Button>
      <Button variant="ghost" size="sm" className="px-2" onClick={print} title="인쇄" aria-label="인쇄"><Printer size={15} /></Button>
    </div>}>
      <div className="scrollbar-subtle max-h-[70vh] overflow-auto rounded-xl border border-line bg-white">
        <BracketSvg names={names} bracket={bracket} svgRef={svgRef} />
      </div>
      <p className="mt-2 text-[.72rem] text-ink-4">결과 입력 {doneCount} / {playable.length}경기{names.length !== bracket.size ? ` · 부전승 ${bracket.size - names.length}팀` : ""}</p>
    </Card>

    <Card title="경기 결과 입력">
      <div className="grid gap-3 lg:grid-cols-2">
        {[...bracket.rounds.map((round, index) => ({ title: roundName(round.length, index + 1), matches: round })), ...(bracket.third ? [{ title: "3·4위전", matches: [bracket.third] }] : [])].map((group) => {
          const shown = group.matches.filter((match) => !match.auto);
          if (!shown.length) return null;
          return <div key={group.title} className="rounded-xl border border-line bg-surface-2 p-2.5">
            <p className="mb-1.5 px-1 text-[.8rem] font-extrabold text-ink-2">{group.title}</p>
            <ul className="space-y-1">
              {shown.map((match) => {
                const ready = match.a.team !== null && match.b.team !== null;
                const saved = ready ? state.tournamentResults[match.id] : undefined;
                const current = saved && saved.pair === pairKey(names[match.a.team!], names[match.b.team!]) ? saved : undefined;
                return <li key={match.id} className={cn("rounded-lg bg-white px-2 py-1", match.needsChoice && "ring-2 ring-[#fcc419]")}>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
                    <span className={cn("truncate text-right text-[.84rem]", match.winner === "a" ? "font-extrabold text-ink" : ready ? "font-semibold text-ink-3" : "text-ink-5")}>{teamLabel(names, match.a)}</span>
                    <span className="flex items-center gap-1">
                      <input aria-label="왼쪽 팀 점수" inputMode="numeric" disabled={!ready} value={current?.a ?? ""} onChange={(event) => setResult(match, { a: cleanScore(event.target.value) })} className={cn(scoreClass, "disabled:bg-surface-2")} />
                      <span className="text-ink-4">:</span>
                      <input aria-label="오른쪽 팀 점수" inputMode="numeric" disabled={!ready} value={current?.b ?? ""} onChange={(event) => setResult(match, { b: cleanScore(event.target.value) })} className={cn(scoreClass, "disabled:bg-surface-2")} />
                    </span>
                    <span className={cn("truncate text-[.84rem]", match.winner === "b" ? "font-extrabold text-ink" : ready ? "font-semibold text-ink-3" : "text-ink-5")}>{teamLabel(names, match.b)}</span>
                  </div>
                  {(match.needsChoice || (current?.winner && match.scoreA !== null && match.scoreA === match.scoreB)) && <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5 text-[.72rem]">
                    <span className="font-semibold text-[#8a5a00]">동점이에요. 이긴 팀(승부차기 등):</span>
                    {(["a", "b"] as const).map((side) => <button key={side} type="button" aria-pressed={match.winner === side} onClick={() => setResult(match, { winner: side })}
                      className={cn("rounded-full border px-2.5 py-0.5 font-bold", match.winner === side ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-white text-ink-3 hover:border-brand/30")}>{teamLabel(names, side === "a" ? match.a : match.b)}</button>)}
                  </div>}
                </li>;
              })}
            </ul>
          </div>;
        })}
      </div>
      <p className="mt-2 text-[.72rem] text-ink-5">앞 경기 결과를 넣으면 이긴 팀이 다음 경기로 올라가요. 앞 결과를 바꾸면 만나는 팀이 달라진 뒤 경기의 점수는 비워져요.</p>
    </Card>
  </>;
}

const teamLabel = (names: string[], side: { team: number | null; bye: boolean }) => side.bye ? "부전승" : side.team === null ? "(미정)" : names[side.team];

/** 대진표 그림: 왼쪽 1회전부터 오른쪽 결승까지, 이긴 팀은 굵게 표시하고 우승 팀 상자를 오른쪽 끝에 둡니다. */
function BracketSvg({ names, bracket, svgRef }: { names: string[]; bracket: ReturnType<typeof resolveBracket>; svgRef: React.Ref<SVGSVGElement> }) {
  const rounds = bracket.rounds;
  const boxW = 168;
  const rowH = 26;
  const boxH = rowH * 2;
  const colGap = 52;
  const unit = 66;
  const pad = 20;
  const top = 64;
  const x = (round: number) => pad + round * (boxW + colGap);
  const y = (round: number, index: number) => top + (index + 0.5) * unit * 2 ** round;
  const firstCount = rounds[0]?.length ?? 0;
  const finalRound = rounds.length - 1;
  const finalY = y(finalRound, 0);
  const thirdY = finalY + boxH + 64;
  const championX = x(rounds.length);
  const width = championX + 150 + pad;
  const height = Math.max(top + firstCount * unit + pad, bracket.third ? thirdY + boxH / 2 + pad : 0);
  const fit = (text: string) => text.length > 11 ? `${text.slice(0, 10)}…` : text;

  const row = (side: BracketMatch["a"], score: number | null, win: boolean, lose: boolean, cx: number, cy: number) => <g>
    {win && <rect x={cx + 1} y={cy + 1} width={boxW - 2} height={rowH - 2} rx={5} fill="#f3f0ff" />}
    <text x={cx + 10} y={cy + rowH / 2} dy="0.35em" fontSize={13} fontFamily={sans} fontWeight={win ? 800 : 600} fill={side.bye ? "#adb5bd" : side.team === null ? "#ced4da" : lose ? "#868e96" : "#212529"} fontStyle={side.bye ? "italic" : undefined}>
      {teamLabel(names, side) === "(미정)" ? "" : fit(teamLabel(names, side))}
    </text>
    {score !== null && <text x={cx + boxW - 10} y={cy + rowH / 2} dy="0.35em" textAnchor="end" fontSize={13} fontFamily={sans} fontWeight={800} fill={win ? "#5f3dc4" : "#868e96"}>{score}</text>}
  </g>;
  const box = (match: BracketMatch, cx: number, cy: number) => {
    const faded = match.auto;
    return <g key={match.id} opacity={faded ? 0.55 : 1}>
      <rect x={cx} y={cy - boxH / 2} width={boxW} height={boxH} rx={7} fill="#ffffff" stroke={match.needsChoice ? "#fab005" : "#adb5bd"} strokeWidth={match.needsChoice ? 2 : 1.2} />
      <line x1={cx} y1={cy} x2={cx + boxW} y2={cy} stroke="#e9ecef" />
      {row(match.a, match.scoreA, match.winner === "a" && !match.auto, match.winner === "b", cx, cy - boxH / 2)}
      {row(match.b, match.scoreB, match.winner === "b" && !match.auto, match.winner === "a", cx, cy)}
    </g>;
  };

  return <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} width={width} height={height} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="토너먼트 대진표" className="block">
    <rect x={0} y={0} width={width} height={height} fill="#ffffff" />
    {rounds.map((round, index) => <text key={`t${index}`} x={x(index) + boxW / 2} y={30} textAnchor="middle" fontSize={14} fontWeight={800} fontFamily={sans} fill="#495057">{roundName(round.length, index + 1)}</text>)}
    <text x={championX + 75} y={30} textAnchor="middle" fontSize={14} fontWeight={800} fontFamily={sans} fill="#e67700">우승</text>
    {rounds.slice(0, -1).map((round, index) => round.map((match, i) => {
      if (i % 2) return null;
      const a = y(index, i);
      const b = y(index, i + 1);
      const mid = x(index) + boxW + colGap / 2;
      const next = y(index + 1, i / 2);
      const lineColor = (m: BracketMatch) => m.winner && !m.auto ? "#7048e8" : "#ced4da";
      return <g key={`c${index}-${i}`} fill="none" strokeWidth={1.6}>
        <path d={`M${x(index) + boxW} ${a} H${mid} V${next}`} stroke={lineColor(match)} />
        <path d={`M${x(index) + boxW} ${b} H${mid} V${next}`} stroke={lineColor(round[i + 1])} />
        <path d={`M${mid} ${next} H${x(index + 1)}`} stroke="#ced4da" />
      </g>;
    }))}
    {rounds.map((round, index) => round.map((match, i) => box(match, x(index), y(index, i))))}
    <path d={`M${x(finalRound) + boxW} ${finalY} H${championX}`} stroke={bracket.champion !== null ? "#7048e8" : "#ced4da"} strokeWidth={1.6} fill="none" />
    <rect x={championX} y={finalY - 24} width={150} height={48} rx={10} fill={bracket.champion !== null ? "#fff9db" : "#f8f9fa"} stroke={bracket.champion !== null ? "#fcc419" : "#dee2e6"} strokeWidth={2} />
    <text x={championX + 75} y={finalY} dy="0.35em" textAnchor="middle" fontSize={15} fontWeight={800} fontFamily={sans} fill={bracket.champion !== null ? "#212529" : "#ced4da"}>{bracket.champion !== null ? fit(names[bracket.champion]) : "?"}</text>
    {bracket.third && <g>
      <text x={x(finalRound) + boxW / 2} y={thirdY - boxH / 2 - 10} textAnchor="middle" fontSize={13} fontWeight={800} fontFamily={sans} fill="#495057">3·4위전</text>
      {box(bracket.third, x(finalRound), thirdY)}
    </g>}
  </svg>;
}

/** SVG를 PNG로 바꿉니다(2배, 긴 변 4000px 안쪽). */
async function svgToPng(svg: SVGSVGElement) {
  const width = Number(svg.getAttribute("width"));
  const height = Number(svg.getAttribute("height"));
  const scale = Math.min(2, 4000 / Math.max(width, height));
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.removeAttribute("class");
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("그림을 만들지 못했어요.")); image.src = url; });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("그림을 만들지 못했어요.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("그림을 만들지 못했어요.");
    return blob;
  } finally { URL.revokeObjectURL(url); }
}
