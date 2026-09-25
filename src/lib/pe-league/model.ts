import { seededRandom } from "@/lib/ai-lab/random";

/* 체육 팀 편성·리그전·토너먼트 계산입니다. 화면과 떨어져 있어 테스트로 확인합니다.
   같은 씨앗(seed)이면 늘 같은 팀·대진이 나옵니다. */

/* ───── 명단 ───── */

export type Gender = "M" | "F" | "";
export type Student = { id: string; name: string; gender: Gender; skill: number | null };

const maleWords = new Set(["남", "남자", "남학생", "남성", "m", "male", "boy"]);
const femaleWords = new Set(["여", "여자", "여학생", "여성", "f", "female", "girl"]);
const headerWords = /^(이름|성명|학생|name|성별|gender|sex|실력|수준|skill|level|번호|no\.?|#)$/i;

export function parseGender(text: string): Gender | null {
  const word = text.trim().toLowerCase();
  if (maleWords.has(word)) return "M";
  if (femaleWords.has(word)) return "F";
  return null;
}

function parseSkill(text: string): number | null {
  const cleaned = text.trim().replace(/점$/, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}

/**
 * 한 줄에 한 명씩 "이름, 성별, 실력"을 읽습니다. 엑셀에서 복사한 탭 구분, 머리글 줄, 앞의 번호 칸도 받습니다.
 * 성별·실력은 칸 순서와 상관없이 알아봅니다. 실력은 1~5로 맞춥니다.
 */
export function parseRoster(text: string) {
  const students: Student[] = [];
  const warnings: string[] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((raw, lineIndex) => {
    const line = raw.trim();
    if (!line) return;
    const cells = (line.includes("\t") ? line.split("\t") : line.split(/[,，]/)).map((cell) => cell.trim());
    while (cells.length && !cells[cells.length - 1]) cells.pop();
    if (!cells.length) return;
    // 첫 줄이 "이름, 성별, 실력" 같은 머리글이면 건너뜁니다.
    if (students.length === 0 && cells.some((cell) => headerWords.test(cell))) return;
    let rest = [...cells];
    // 맨 앞이 번호이고 뒤에 이름이 있으면 번호는 건너뜁니다.
    if (rest.length >= 2 && /^\d+\.?$/.test(rest[0]) && rest[1] && parseSkill(rest[1]) === null && parseGender(rest[1]) === null) rest = rest.slice(1);
    const name = rest[0]?.slice(0, 20) ?? "";
    if (!name || parseSkill(name) !== null) { warnings.push(`${lineIndex + 1}번째 줄: 이름을 읽지 못했어요.`); return; }
    let gender: Gender = "";
    let skill: number | null = null;
    for (const cell of rest.slice(1)) {
      if (!cell) continue;
      const g = parseGender(cell);
      if (g) { gender = g; continue; }
      const s = parseSkill(cell);
      if (s !== null) {
        if (s < 1 || s > 5) warnings.push(`${name}: 실력 ${cell}은 1~5 사이로 맞췄어요.`);
        skill = Math.min(5, Math.max(1, Math.round(s * 10) / 10));
        continue;
      }
      warnings.push(`${name}: ‘${cell}’은(는) 성별·실력으로 읽지 못했어요.`);
    }
    students.push({ id: `s${students.length + 1}`, name, gender, skill });
  });
  const counts = new Map<string, number>();
  for (const student of students) counts.set(student.name, (counts.get(student.name) ?? 0) + 1);
  for (const [name, count] of counts) if (count > 1) warnings.push(`같은 이름이 ${count}명 있어요: ${name}`);
  return { students, warnings };
}

/* ───── 팀 편성 ───── */

export type TeamOptions = { basis: "count" | "size"; count: number; size: number; balanceSkill: boolean; balanceGender: boolean; seed: number };
export type Team = { name: string; members: Student[] };

export const teamColors = ["빨강", "파랑", "노랑", "초록", "보라", "주황", "분홍", "하늘", "검정", "하양", "회색", "갈색"] as const;
export const teamColorHex: Record<string, string> = {
  빨강: "#e03131", 파랑: "#1c7ed6", 노랑: "#f59f00", 초록: "#2f9e44", 보라: "#7048e8", 주황: "#f76707",
  분홍: "#e64980", 하늘: "#15aabf", 검정: "#343a40", 하양: "#adb5bd", 회색: "#868e96", 갈색: "#8d5a2b",
};

export function defaultTeamName(index: number, naming: "color" | "number") {
  return naming === "color" && index < teamColors.length ? `${teamColors[index]}팀` : `${index + 1}팀`;
}

export function teamCountFor(studentCount: number, options: Pick<TeamOptions, "basis" | "count" | "size">) {
  if (studentCount === 0) return 0;
  const wanted = options.basis === "count" ? options.count : Math.ceil(studentCount / Math.max(1, options.size));
  return Math.max(1, Math.min(wanted, studentCount));
}

function shuffle<T>(items: T[], random: () => number) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

/**
 * 팀을 나눕니다. 팀 인원은 많아야 1명 차이입니다.
 * 성별을 고르게 하면 남·여·미입력을 따로 나눠 돌리고, 실력을 고르게 하면 잘하는 학생부터 실력 합이 가장 낮은 팀에 넣습니다.
 */
export function makeTeams(students: Student[], options: TeamOptions, naming: "color" | "number" = "color"): Team[] {
  const count = teamCountFor(students.length, options);
  if (!count) return [];
  const random = seededRandom(options.seed);
  const known = students.filter((student) => student.skill !== null);
  const average = known.length ? known.reduce((sum, student) => sum + student.skill!, 0) / known.length : 3;
  const skillOf = (student: Student) => student.skill ?? average;
  const base = Math.floor(students.length / count);
  const extra = students.length % count;
  const members: Student[][] = Array.from({ length: count }, () => []);
  const skillSum = Array(count).fill(0) as number[];
  const tieBreak = shuffle(Array.from({ length: count }, (_, index) => index), random);
  const order = new Map(tieBreak.map((team, rank) => [team, rank]));

  const shuffled = shuffle(students, random);
  const groups = options.balanceGender
    ? (["M", "F", ""] as Gender[]).map((gender) => shuffled.filter((student) => student.gender === gender))
    : [shuffled];
  for (const group of groups) {
    const queue = options.balanceSkill ? [...group].sort((a, b) => skillOf(b) - skillOf(a)) : group;
    const inGroup = Array(count).fill(0) as number[];
    for (const student of queue) {
      const atCeil = members.filter((list) => list.length > base).length;
      const eligible = members.map((list, team) => team).filter((team) => members[team].length < base || (members[team].length === base && atCeil < extra));
      eligible.sort((a, b) =>
        inGroup[a] - inGroup[b]
        || (options.balanceSkill ? skillSum[a] - skillSum[b] : 0)
        || members[a].length - members[b].length
        || order.get(a)! - order.get(b)!);
      const team = eligible[0];
      members[team].push(student);
      inGroup[team] += 1;
      skillSum[team] += skillOf(student);
    }
  }
  if (options.balanceSkill) improveBalance(members, skillOf, options.balanceGender);
  // 한 팀 안에서는 이름 순으로 보여 줍니다.
  return members.map((list, index) => ({ name: defaultTeamName(index, naming), members: [...list].sort((a, b) => a.name.localeCompare(b.name, "ko")) }));
}

/**
 * 팀 인원이 다르면 실력 합을 맞춰도 평균이 벌어지므로, 두 팀의 학생을 맞바꿔 팀 평균이 고르게 되도록 다듬습니다.
 * 성별을 고르게 할 때는 같은 성별끼리만 바꿔 성별 균형을 지킵니다.
 */
function improveBalance(members: Student[][], skillOf: (student: Student) => number, sameGender: boolean) {
  const sums = members.map((list) => list.reduce((sum, student) => sum + skillOf(student), 0));
  const spread = () => {
    const averages = members.map((list, team) => list.length ? sums[team] / list.length : 0);
    const mean = averages.reduce((sum, value) => sum + value, 0) / averages.length;
    return averages.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  };
  let current = spread();
  for (let pass = 0; pass < 50; pass += 1) {
    let improved = false;
    for (let a = 0; a < members.length; a += 1) {
      for (let b = a + 1; b < members.length; b += 1) {
        for (let i = 0; i < members[a].length; i += 1) {
          for (let j = 0; j < members[b].length; j += 1) {
            const x = members[a][i];
            const y = members[b][j];
            if (sameGender && x.gender !== y.gender) continue;
            const delta = skillOf(y) - skillOf(x);
            if (delta === 0) continue;
            sums[a] += delta; sums[b] -= delta;
            const next = spread();
            if (next < current - 1e-9) {
              members[a][i] = y; members[b][j] = x;
              current = next;
              improved = true;
            } else { sums[a] -= delta; sums[b] += delta; }
          }
        }
      }
    }
    if (!improved) break;
  }
}

export function teamStats(team: Team) {
  const skills = team.members.map((member) => member.skill).filter((skill): skill is number => skill !== null);
  return {
    size: team.members.length,
    male: team.members.filter((member) => member.gender === "M").length,
    female: team.members.filter((member) => member.gender === "F").length,
    average: skills.length ? skills.reduce((sum, skill) => sum + skill, 0) / skills.length : null,
  };
}

/** 팀 평균 실력 중 가장 높은 팀과 낮은 팀의 차이. 실력을 적지 않았으면 null입니다. */
export function balanceGap(teams: Team[]) {
  const averages = teams.map((team) => teamStats(team).average).filter((value): value is number => value !== null);
  return averages.length >= 2 ? Math.max(...averages) - Math.min(...averages) : null;
}

const genderLabel = (gender: Gender) => gender === "M" ? "남" : gender === "F" ? "여" : "";

export function teamsToText(teams: Team[]) {
  return teams.map((team) => {
    const stats = teamStats(team);
    const info = [`${stats.size}명`, stats.male || stats.female ? `남 ${stats.male}·여 ${stats.female}` : "", stats.average !== null ? `평균 실력 ${stats.average.toFixed(1)}` : ""].filter(Boolean).join(", ");
    return `${team.name} (${info})\n${team.members.map((member) => member.name).join(", ")}`;
  }).join("\n\n");
}

const csvCell = (value: string) => /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
export function teamsToCsv(teams: Team[]) {
  const rows = [["팀", "이름", "성별", "실력"], ...teams.flatMap((team) => team.members.map((member) => [team.name, member.name, genderLabel(member.gender), member.skill === null ? "" : String(member.skill)]))];
  return `﻿${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

/* ───── 참가 팀 목록 ───── */

/** 한 줄에 한 팀. 같은 이름은 (2), (3)을 붙여 구분합니다. */
export function parseTeamNames(text: string) {
  const names: string[] = [];
  const seen = new Map<string, number>();
  for (const raw of text.split(/\r?\n/)) {
    const name = raw.trim().replace(/^\d+[.)]\s*/, "").slice(0, 20);
    if (!name) continue;
    const count = (seen.get(name) ?? 0) + 1;
    seen.set(name, count);
    names.push(count > 1 ? `${name} (${count})` : name);
    if (names.length >= 64) break;
  }
  return names;
}

/* ───── 리그전 ───── */

export type LeagueMatch = { id: string; round: number; index: number; slot: number; court: number; home: number; away: number };
export type LeagueRound = { round: number; matches: LeagueMatch[]; rest: number[] };

/** 원형 방식(circle method) 리그 일정. 팀 수가 홀수면 라운드마다 한 팀이 쉽니다. double이면 홈·원정을 바꿔 한 번 더 합니다. */
export function roundRobin(teamCount: number, options: { double?: boolean; courts?: number } = {}): LeagueRound[] {
  if (teamCount < 2) return [];
  const courts = Math.max(1, options.courts ?? 1);
  const slots = teamCount % 2 ? [...Array(teamCount).keys(), -1] : [...Array(teamCount).keys()];
  const size = slots.length;
  const first: { pairs: [number, number][]; rest: number[] }[] = [];
  let rotation = slots.slice(1);
  for (let round = 0; round < size - 1; round += 1) {
    const circle = [slots[0], ...rotation];
    const pairs: [number, number][] = [];
    const rest: number[] = [];
    for (let index = 0; index < size / 2; index += 1) {
      let home = circle[index];
      let away = circle[size - 1 - index];
      // 고정된 첫 팀이 늘 홈이 되지 않도록 라운드마다 바꿉니다.
      if (index === 0 && round % 2 === 1) [home, away] = [away, home];
      if (home === -1 || away === -1) { rest.push(home === -1 ? away : home); continue; }
      pairs.push([home, away]);
    }
    first.push({ pairs, rest });
    rotation = [rotation[rotation.length - 1], ...rotation.slice(0, -1)];
  }
  const all = options.double ? [...first, ...first.map((item) => ({ pairs: item.pairs.map(([home, away]) => [away, home] as [number, number]), rest: item.rest }))] : first;
  return all.map((item, round) => ({
    round: round + 1,
    rest: item.rest,
    matches: item.pairs.map(([home, away], index) => ({ id: `r${round + 1}-${index + 1}`, round: round + 1, index, slot: Math.floor(index / courts) + 1, court: (index % courts) + 1, home, away })),
  }));
}

export type LeagueScore = { home: string; away: string; pair: string };
export type Points = { win: number; draw: number; loss: number };
export type StandingRow = { team: number; played: number; win: number; draw: number; loss: number; goalsFor: number; goalsAgainst: number; diff: number; points: number; rank: number };

export const pairKey = (home: string, away: string) => `${home}|${away}`;

function scoreValue(text: string | undefined) {
  if (text === undefined) return null;
  const trimmed = text.trim();
  if (!/^\d{1,4}$/.test(trimmed)) return null;
  return Number(trimmed);
}

/** 경기 결과를 읽습니다. 무승부가 없는 종목에서 같은 점수는 잘못된 결과(invalid)로 봅니다. */
export function matchResult(score: LeagueScore | undefined, pair: string, allowDraw: boolean) {
  if (!score || score.pair !== pair) return { state: "empty" as const };
  const home = scoreValue(score.home);
  const away = scoreValue(score.away);
  if (home === null || away === null) return { state: score.home.trim() || score.away.trim() ? "partial" as const : "empty" as const };
  if (home === away && !allowDraw) return { state: "invalid" as const, home, away };
  return { state: "done" as const, home, away };
}

/**
 * 순위표. 승점 → 득실차 → 다득점 → 승자승(같은 팀끼리 경기의 승점) → 이름 순입니다.
 * 이름 말고 모든 기준이 같으면 같은 순위입니다.
 */
export function standings(teams: string[], rounds: LeagueRound[], scores: Record<string, LeagueScore>, points: Points, allowDraw: boolean): StandingRow[] {
  const rows: StandingRow[] = teams.map((_, team) => ({ team, played: 0, win: 0, draw: 0, loss: 0, goalsFor: 0, goalsAgainst: 0, diff: 0, points: 0, rank: 0 }));
  const done: { home: number; away: number; hs: number; as: number }[] = [];
  for (const match of rounds.flatMap((round) => round.matches)) {
    const result = matchResult(scores[match.id], pairKey(teams[match.home], teams[match.away]), allowDraw);
    if (result.state !== "done") continue;
    done.push({ home: match.home, away: match.away, hs: result.home, as: result.away });
    const home = rows[match.home];
    const away = rows[match.away];
    home.played += 1; away.played += 1;
    home.goalsFor += result.home; home.goalsAgainst += result.away;
    away.goalsFor += result.away; away.goalsAgainst += result.home;
    if (result.home > result.away) { home.win += 1; away.loss += 1; home.points += points.win; away.points += points.loss; }
    else if (result.home < result.away) { away.win += 1; home.loss += 1; away.points += points.win; home.points += points.loss; }
    else { home.draw += 1; away.draw += 1; home.points += points.draw; away.points += points.draw; }
  }
  rows.forEach((row) => { row.diff = row.goalsFor - row.goalsAgainst; });
  const primary = (a: StandingRow, b: StandingRow) => b.points - a.points || b.diff - a.diff || b.goalsFor - a.goalsFor;
  const headToHead = (group: StandingRow[]) => {
    const members = new Set(group.map((row) => row.team));
    const h2h = new Map(group.map((row) => [row.team, 0]));
    for (const match of done) {
      if (!members.has(match.home) || !members.has(match.away)) continue;
      if (match.hs > match.as) { h2h.set(match.home, h2h.get(match.home)! + points.win); h2h.set(match.away, h2h.get(match.away)! + points.loss); }
      else if (match.hs < match.as) { h2h.set(match.away, h2h.get(match.away)! + points.win); h2h.set(match.home, h2h.get(match.home)! + points.loss); }
      else { h2h.set(match.home, h2h.get(match.home)! + points.draw); h2h.set(match.away, h2h.get(match.away)! + points.draw); }
    }
    return h2h;
  };
  const sorted = [...rows].sort(primary);
  const result: StandingRow[] = [];
  for (let start = 0; start < sorted.length;) {
    let end = start + 1;
    while (end < sorted.length && primary(sorted[start], sorted[end]) === 0) end += 1;
    const group = sorted.slice(start, end);
    const h2h = headToHead(group);
    group.sort((a, b) => h2h.get(b.team)! - h2h.get(a.team)! || teams[a.team].localeCompare(teams[b.team], "ko"));
    group.forEach((row, index) => {
      const previous = group[index - 1];
      row.rank = previous && h2h.get(previous.team) === h2h.get(row.team) ? previous.rank : start + index + 1;
    });
    result.push(...group);
    start = end;
  }
  return result;
}

/* ───── 토너먼트 ───── */

export const nextPowerOfTwo = (count: number) => { let size = 2; while (size < count) size *= 2; return size; };

/** 시드 배치 순서. 1번과 2번 시드는 서로 다른 반쪽에 놓여 결승에서야 만납니다. 예: 8강이면 1,8,4,5,2,7,3,6 */
export function seedOrder(size: number) {
  let order = [1];
  while (order.length < size) {
    const length = order.length * 2;
    order = order.flatMap((seed) => [seed, length + 1 - seed]);
  }
  return order;
}

/** 시드 순서대로 팀 번호를 정합니다. random이면 씨앗으로 섞습니다. */
export function seedTeams(teamCount: number, random: boolean, seed: number) {
  const teams = [...Array(teamCount).keys()];
  return random ? shuffle(teams, seededRandom(seed)) : teams;
}

export type BracketSide = { team: number | null; bye: boolean };
export type BracketMatch = { id: string; round: number; index: number; a: BracketSide; b: BracketSide; scoreA: number | null; scoreB: number | null; winner: "a" | "b" | null; needsChoice: boolean; auto: boolean };
export type TournamentResult = { a: string; b: string; winner?: "a" | "b"; pair: string };

export function roundName(matchCount: number, round: number) {
  if (matchCount === 1) return "결승";
  if (matchCount === 2) return "준결승";
  if (matchCount >= 4 && matchCount <= 64) return `${matchCount * 2}강`;
  return `${round}회전`;
}

/**
 * 결과를 반영한 대진표. 부전승은 자동으로 올라가고, 점수가 같으면 선생님이 고른 승자(winner)로 올라갑니다.
 * 앞 경기 결과가 바뀌어 만나는 팀이 달라지면 예전 점수는 쓰지 않습니다(pair로 확인).
 */
export function resolveBracket(teams: string[], seeds: number[], results: Record<string, TournamentResult>, thirdPlace: boolean) {
  const count = teams.length;
  if (count < 2) return { size: 0, rounds: [] as BracketMatch[][], third: null as BracketMatch | null, champion: null as number | null, podium: [] as number[] };
  const size = nextPowerOfTwo(count);
  const order = seedOrder(size);
  const sideOf = (seed: number): BracketSide => seed <= count ? { team: seeds[seed - 1], bye: false } : { team: null, bye: true };
  const rounds: BracketMatch[][] = [];
  const decide = (id: string, round: number, index: number, a: BracketSide, b: BracketSide): BracketMatch => {
    const match: BracketMatch = { id, round, index, a, b, scoreA: null, scoreB: null, winner: null, needsChoice: false, auto: false };
    if (a.bye || b.bye) {
      if (a.team !== null && b.bye) { match.winner = "a"; match.auto = true; }
      else if (b.team !== null && a.bye) { match.winner = "b"; match.auto = true; }
      return match;
    }
    if (a.team === null || b.team === null) return match;
    const result = results[id];
    if (!result || result.pair !== pairKey(teams[a.team], teams[b.team])) return match;
    match.scoreA = scoreValue(result.a);
    match.scoreB = scoreValue(result.b);
    if (match.scoreA === null || match.scoreB === null) return match;
    if (match.scoreA > match.scoreB) match.winner = "a";
    else if (match.scoreA < match.scoreB) match.winner = "b";
    else if (result.winner) match.winner = result.winner;
    else match.needsChoice = true;
    return match;
  };
  const advance = (match: BracketMatch | undefined): BracketSide => {
    if (!match) return { team: null, bye: false };
    // 양쪽이 모두 부전승 자리인 경기는 없지만, 있으면 부전승으로 넘깁니다.
    if (match.a.bye && match.b.bye) return { team: null, bye: true };
    if (!match.winner) return { team: null, bye: false };
    return { team: match.winner === "a" ? match.a.team : match.b.team, bye: false };
  };
  const loser = (match: BracketMatch | undefined): BracketSide => {
    if (!match?.winner || match.auto) return { team: null, bye: false };
    return { team: match.winner === "a" ? match.b.team : match.a.team, bye: false };
  };
  const first: BracketMatch[] = [];
  for (let index = 0; index < size / 2; index += 1) first.push(decide(`t1-${index + 1}`, 1, index, sideOf(order[index * 2]), sideOf(order[index * 2 + 1])));
  rounds.push(first);
  while (rounds[rounds.length - 1].length > 1) {
    const previous = rounds[rounds.length - 1];
    const round = rounds.length + 1;
    const next: BracketMatch[] = [];
    for (let index = 0; index < previous.length / 2; index += 1) next.push(decide(`t${round}-${index + 1}`, round, index, advance(previous[index * 2]), advance(previous[index * 2 + 1])));
    rounds.push(next);
  }
  const final = rounds[rounds.length - 1][0];
  let third: BracketMatch | null = null;
  if (thirdPlace && rounds.length >= 2) {
    const semis = rounds[rounds.length - 2];
    // 준결승이 부전승이면 3·4위전을 치를 팀이 없습니다.
    if (!semis.some((match) => match.auto)) third = decide("third", rounds.length, 0, loser(semis[0]), loser(semis[1]));
  }
  const champion = final.winner ? (final.winner === "a" ? final.a.team : final.b.team) : null;
  const runnerUp = final.winner ? (final.winner === "a" ? final.b.team : final.a.team) : null;
  const podium: number[] = [];
  if (champion !== null) podium.push(champion);
  if (runnerUp !== null) podium.push(runnerUp);
  if (third?.winner) podium.push((third.winner === "a" ? third.a.team : third.b.team)!);
  return { size, rounds, third, champion, podium };
}
