"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ClipboardCopy, FileDown, Printer, Shuffle, Sparkles, Trophy, Users, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  balanceGap, defaultTeamName, makeTeams, parseRoster, teamColorHex, teamColors, teamCountFor, teamsToCsv, teamsToText, teamStats,
  type Gender, type Team, type TeamOptions,
} from "@/lib/pe-league/model";
import { cn } from "@/lib/utils";
import { download, escapeHtml, printHtml } from "./pe-league-export";
import { PeLeagueGames, type GamesState } from "./pe-league-games";
import { Card, Range, Segmented, Toggle } from "./tool-panel";

/* 체육 팀·대진표: 명단으로 팀을 나누고(팀 편성), 그 팀으로 리그전·토너먼트를 운영합니다(대진표). */

const draftKey = "learncraft_pe_league_draft";
const areaClass = "w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-[.84rem] leading-6 text-ink outline-none focus-visible:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/10";

const sampleRoster = [
  "이름, 성별, 실력",
  "김민준, 남, 5", "이서연, 여, 4", "박도윤, 남, 3", "최하은, 여, 5", "정우진, 남, 2", "강지우, 여, 3",
  "조예준, 남, 4", "윤서아, 여, 2", "장시우, 남, 1", "임하린, 여, 4", "한주원, 남, 3", "오지안, 여, 1",
  "서건우, 남, 5", "신수아, 여, 3", "권도현, 남, 2", "황지유, 여, 2", "안은우, 남, 4", "송채원, 여, 5",
  "홍유준, 남, 3", "전다은, 여, 3", "고승현, 남, 2", "문예린, 여, 4", "양태윤, 남, 1", "손나윤, 여, 2",
].join("\n");

export type Draft = {
  version: 1;
  view: "teams" | "games";
  roster: string;
  teamOptions: TeamOptions;
  naming: "color" | "number";
  teams: Team[] | null;
  games: GamesState;
};

const defaultDraft = (): Draft => ({
  version: 1,
  view: "teams",
  roster: "",
  teamOptions: { basis: "count", count: 4, size: 6, balanceSkill: true, balanceGender: true, seed: 1 },
  naming: "color",
  teams: null,
  games: {
    teamText: "",
    mode: "league",
    league: { double: false, courts: 1, win: 3, draw: 1, loss: 0, allowDraw: true },
    tournament: { random: false, seed: 1, thirdPlace: true },
    leagueScores: {},
    tournamentResults: {},
  },
});

function readDraft(): Draft {
  const base = defaultDraft();
  try {
    const saved = JSON.parse(window.localStorage.getItem(draftKey) ?? "null") as Partial<Draft> | null;
    if (!saved || saved.version !== 1) return base;
    return {
      ...base,
      ...saved,
      teamOptions: { ...base.teamOptions, ...saved.teamOptions },
      games: {
        ...base.games,
        ...saved.games,
        league: { ...base.games.league, ...saved.games?.league },
        tournament: { ...base.games.tournament, ...saved.games?.tournament },
      },
    };
  } catch { return base; }
}

const genderText: Record<Gender, string> = { M: "남", F: "여", "": "" };

export function PeLeagueLab() {
  const [draft, setDraft] = useState(readDraft);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { window.localStorage.setItem(draftKey, JSON.stringify(draft)); } catch { /* 저장 공간이 없으면 이번 화면에서만 유지합니다. */ }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [draft]);
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 3000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const set = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));
  const setGames = (patch: Partial<GamesState>) => setDraft((current) => ({ ...current, games: { ...current.games, ...patch } }));

  return <div className="space-y-4">
    <div role="tablist" aria-label="팀·대진표 단계" className="grid w-full max-w-xl grid-cols-2 gap-1 rounded-2xl border border-line bg-surface p-1 shadow-[var(--lift-1)]">
      {([["teams", "팀 편성", UsersRound], ["games", "대진표·순위", Trophy]] as const).map(([view, label, Icon]) => (
        <button key={view} type="button" role="tab" aria-selected={draft.view === view} onClick={() => set({ view })}
          className={cn("flex min-h-11 items-center justify-center gap-2 rounded-xl text-[.9rem] font-extrabold transition-colors", draft.view === view ? "bg-brand-soft text-brand-dark" : "text-ink-3 hover:text-brand-dark")}>
          <Icon size={17} aria-hidden="true" /> {label}
        </button>
      ))}
    </div>
    {draft.view === "teams"
      ? <TeamMaker draft={draft} set={set} setMessage={setMessage} onUseTeams={(teams) => {
        setDraft((current) => ({ ...current, view: "games", games: { ...current.games, teamText: teams.map((team) => team.name).join("\n") } }));
        setMessage("팀 이름을 대진표로 가져왔어요.");
      }} />
      : <PeLeagueGames state={draft.games} set={setGames} teams={draft.teams} setMessage={setMessage} />}
    <p role="status" className="min-h-5 px-1 text-[.8rem] font-semibold text-brand-dark">{message}</p>
  </div>;
}

function TeamMaker({ draft, set, setMessage, onUseTeams }: { draft: Draft; set: (patch: Partial<Draft>) => void; setMessage: (text: string) => void; onUseTeams: (teams: Team[]) => void }) {
  const { students, warnings } = useMemo(() => parseRoster(draft.roster), [draft.roster]);
  const options = draft.teamOptions;
  const count = teamCountFor(students.length, options);
  const teams = draft.teams;
  const hasSkill = students.some((student) => student.skill !== null);
  const hasGender = students.some((student) => student.gender);
  const setOptions = (patch: Partial<TeamOptions>) => set({ teamOptions: { ...options, ...patch } });

  const build = (seed = options.seed) => {
    if (!students.length) return;
    set({ teams: makeTeams(students, { ...options, seed }, draft.naming), teamOptions: { ...options, seed } });
    setMessage(`${students.length}명을 ${count}팀으로 나눴어요.`);
  };
  const renameAll = (naming: "color" | "number") => set({ naming, teams: teams?.map((team, index) => ({ ...team, name: defaultTeamName(index, naming) })) ?? null });
  const moveMember = (from: number, memberId: string, to: number) => {
    if (!teams) return;
    const member = teams[from].members.find((item) => item.id === memberId)!;
    set({ teams: teams.map((team, index) => index === from ? { ...team, members: team.members.filter((item) => item.id !== memberId) }
      : index === to ? { ...team, members: [...team.members, member].sort((a, b) => a.name.localeCompare(b.name, "ko")) } : team) });
  };
  const gap = teams ? balanceGap(teams) : null;
  const sizes = teams?.map((team) => team.members.length) ?? [];

  const copy = async () => {
    if (!teams) return;
    try { await navigator.clipboard.writeText(teamsToText(teams)); setMessage("팀 명단을 복사했어요. 메신저나 한글에 붙여 넣으세요."); }
    catch { setMessage("복사하지 못했어요. 브라우저 권한을 확인해 주세요."); }
  };
  const print = () => {
    if (!teams) return;
    const body = `<div class="grid">${teams.map((team) => {
      const stats = teamStats(team);
      return `<div class="team"><b>${escapeHtml(team.name)}</b> <span class="muted">${stats.size}명${stats.male || stats.female ? ` · 남 ${stats.male} 여 ${stats.female}` : ""}${stats.average !== null ? ` · 평균 ${stats.average.toFixed(1)}` : ""}</span><br>${team.members.map((member) => escapeHtml(member.name)).join(", ")}</div>`;
    }).join("")}</div>`;
    if (!printHtml("팀 편성", body)) setMessage("팝업이 막혀 인쇄 창을 열지 못했어요.");
  };

  return <section className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)] xl:items-start">
    <div className="space-y-4 xl:sticky xl:top-24">
      <Card title="명단" help="한 줄에 한 명씩 ‘이름, 성별, 실력’을 적어요. 엑셀에서 이름·성별·실력 칸을 복사해 붙여 넣어도 돼요. 성별(남/여)과 실력(1~5)은 비워도 돼요."
        action={<Button variant="ghost" size="sm" onClick={() => { set({ roster: sampleRoster, teams: null }); setMessage("예시 명단 24명을 넣었어요."); }}><Sparkles size={13} /> 예시 명단</Button>}>
        <textarea value={draft.roster} rows={12} spellCheck={false} onChange={(event) => set({ roster: event.target.value })} placeholder={"김민준, 남, 5\n이서연, 여, 4\n박도윤, 남, 3"} className={areaClass} aria-label="학생 명단" />
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[.76rem]">
          <span className="font-bold text-ink-2"><Users size={13} className="mr-1 inline" />{students.length}명</span>
          {hasGender && <span className="text-ink-4">남 {students.filter((student) => student.gender === "M").length} · 여 {students.filter((student) => student.gender === "F").length}{students.some((student) => !student.gender) ? ` · 미입력 ${students.filter((student) => !student.gender).length}` : ""}</span>}
          {hasSkill && <span className="text-ink-4">실력 입력 {students.filter((student) => student.skill !== null).length}명</span>}
        </div>
        {warnings.length > 0 && <ul className="mt-2 max-h-28 space-y-0.5 overflow-y-auto rounded-lg bg-[#fff9db] px-3 py-2 text-[.72rem] leading-5 text-[#8a5a00]">
          {warnings.slice(0, 20).map((warning, index) => <li key={index}>{warning}</li>)}
        </ul>}
        <p className="mt-2 break-keep text-[.7rem] leading-5 text-ink-5">명단은 서버로 보내지 않고 이 브라우저에만 저장돼요. 공용 컴퓨터라면 수업 뒤 명단을 지워 주세요.</p>
      </Card>

      <Card title="나누는 방법">
        <Segmented label="나누는 기준" value={options.basis} onChange={(basis) => setOptions({ basis })} options={[{ value: "count", label: "팀 수로" }, { value: "size", label: "팀당 인원으로" }]} />
        <div className="mt-3">
          {options.basis === "count"
            ? <Range label="팀 수" value={options.count} min={2} max={12} suffix="팀" onChange={(value) => setOptions({ count: value })} />
            : <Range label="팀당 인원" value={options.size} min={2} max={15} suffix="명" onChange={(value) => setOptions({ size: value })} />}
          {students.length > 0 && <p className="mt-1 text-[.72rem] text-ink-4">{students.length}명 → {count}팀 ({Math.floor(students.length / Math.max(1, count))}{students.length % Math.max(1, count) ? `~${Math.ceil(students.length / Math.max(1, count))}` : ""}명씩)</p>}
        </div>
        <div className="mt-2">
          <Toggle label="실력 고르게" checked={options.balanceSkill} onChange={(balanceSkill) => setOptions({ balanceSkill })} help="잘하는 학생부터 실력 합이 낮은 팀에 넣고, 마지막에 학생을 맞바꿔 팀 평균 실력을 비슷하게 맞춰요. 실력을 적지 않은 학생은 평균으로 봐요." />
          <Toggle label="성별 고르게" checked={options.balanceGender} onChange={(balanceGender) => setOptions({ balanceGender })} help="남학생·여학생을 따로 나눠 팀마다 수가 비슷하게 들어가요." />
        </div>
        <div className="mt-2">
          <p className="mb-1 text-xs font-semibold text-ink-4">팀 이름</p>
          <Segmented label="팀 이름" value={draft.naming} onChange={renameAll} options={[{ value: "color", label: "색 (빨강팀…)" }, { value: "number", label: "숫자 (1팀…)" }]} />
        </div>
        <div className="mt-4 flex gap-2">
          <Button className="flex-1" onClick={() => build()} disabled={!students.length}><UsersRound size={15} /> 팀 나누기</Button>
          <Button variant="secondary" onClick={() => build(options.seed + 1)} disabled={!students.length} title="같은 조건으로 다시 섞어요"><Shuffle size={15} /> 다시 섞기</Button>
        </div>
      </Card>
    </div>

    <div className="min-w-0 space-y-3">
      {!teams
        ? <div className="grid min-h-[420px] place-items-center rounded-[18px] border border-dashed border-line bg-surface p-8 text-center">
          <div>
            <UsersRound size={30} className="mx-auto text-brand/60" />
            <p className="mt-3 text-[.95rem] font-bold text-ink-2">왼쪽에 명단을 넣고 ‘팀 나누기’를 누르세요</p>
            <p className="mt-1 text-[.8rem] text-ink-4">처음이면 ‘예시 명단’으로 바로 해 볼 수 있어요.</p>
          </div>
        </div>
        : <>
          <div className="flex flex-wrap items-center gap-2 rounded-[18px] border border-line bg-surface p-2 pl-4 shadow-[var(--lift-1)]">
            <p className="text-[.82rem] font-bold text-ink-2">{teams.length}팀 · {sizes.reduce((sum, size) => sum + size, 0)}명
              <span className="ml-2 font-semibold text-ink-4">팀 인원 {Math.min(...sizes)}{Math.max(...sizes) !== Math.min(...sizes) ? `~${Math.max(...sizes)}` : ""}명{gap !== null ? ` · 팀 평균 실력 차이 ${gap.toFixed(2)}` : ""}</span>
            </p>
            <div className="ml-auto flex flex-wrap gap-1">
              <Button variant="secondary" size="sm" onClick={() => void copy()}><ClipboardCopy size={14} /> 복사</Button>
              <Button variant="secondary" size="sm" onClick={() => { download(new Blob([teamsToCsv(teams)], { type: "text/csv;charset=utf-8" }), "팀 편성.csv"); setMessage("CSV로 저장했어요. 엑셀에서 열 수 있어요."); }}><FileDown size={14} /> CSV</Button>
              <Button variant="ghost" size="sm" className="px-2" onClick={print} title="인쇄" aria-label="인쇄"><Printer size={15} /></Button>
              <Button size="sm" onClick={() => onUseTeams(teams)}>이 팀으로 대진표 만들기 <ArrowRight size={14} /></Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {teams.map((team, teamIndex) => {
              const stats = teamStats(team);
              const color = teamColorHex[team.name.replace(/팀$/, "")] ?? (draft.naming === "color" && teamIndex < teamColors.length ? teamColorHex[teamColors[teamIndex]] : "#7048e8");
              return <article key={teamIndex} className="overflow-hidden rounded-[18px] border border-line bg-surface shadow-[var(--lift-1)]">
                <div className="flex items-center gap-2 border-b border-line px-3 py-2" style={{ background: `${color}14` }}>
                  <span className="size-3.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
                  <input aria-label={`${teamIndex + 1}번째 팀 이름`} value={team.name} maxLength={20} onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) => set({ teams: teams.map((item, index) => index === teamIndex ? { ...item, name: event.target.value } : item) })}
                    className="min-w-0 flex-1 rounded-md bg-transparent px-1 text-[.95rem] font-extrabold text-ink outline-none focus:bg-white" />
                  <span className="shrink-0 text-[.72rem] font-bold text-ink-3">{stats.size}명</span>
                </div>
                <p className="flex flex-wrap gap-x-3 px-3 pt-2 text-[.72rem] text-ink-4">
                  {(stats.male > 0 || stats.female > 0) && <span>남 {stats.male} · 여 {stats.female}</span>}
                  {stats.average !== null && <span>평균 실력 <b className="figure text-ink-2">{stats.average.toFixed(1)}</b></span>}
                </p>
                <ul className="space-y-0.5 px-2 py-2">
                  {team.members.map((member) => <li key={member.id} className="group flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-surface-2">
                    <span className="min-w-0 flex-1 truncate text-[.84rem] font-semibold text-ink-2">{member.name}</span>
                    {member.gender && <span className={cn("rounded px-1 text-[.66rem] font-bold", member.gender === "M" ? "bg-[#e7f5ff] text-[#1864ab]" : "bg-[#fff0f6] text-[#a61e4d]")}>{genderText[member.gender]}</span>}
                    {member.skill !== null && <span className="flex gap-px" title={`실력 ${member.skill}`} aria-label={`실력 ${member.skill}`}>
                      {[1, 2, 3, 4, 5].map((dot) => <span key={dot} className={cn("size-1.5 rounded-full", dot <= Math.round(member.skill!) ? "bg-brand" : "bg-line")} />)}
                    </span>}
                    <select aria-label={`${member.name} 다른 팀으로 옮기기`} value={teamIndex} onChange={(event) => moveMember(teamIndex, member.id, Number(event.target.value))}
                      className="w-[4.6rem] shrink-0 rounded-md border border-transparent bg-transparent text-[.7rem] text-ink-4 group-hover:border-line group-hover:bg-white focus:border-line focus:bg-white">
                      {teams.map((other, index) => <option key={index} value={index}>{index === teamIndex ? "옮기기" : `→ ${other.name}`}</option>)}
                    </select>
                  </li>)}
                  {!team.members.length && <li className="px-1.5 py-2 text-[.76rem] text-ink-5">아직 학생이 없어요.</li>}
                </ul>
              </article>;
            })}
          </div>
          <p className="px-1 text-[.72rem] text-ink-5">학생 옆 ‘옮기기’로 다른 팀에 보낼 수 있어요. 팀 이름을 누르면 바꿀 수 있어요.</p>
        </>}
    </div>
  </section>;
}
