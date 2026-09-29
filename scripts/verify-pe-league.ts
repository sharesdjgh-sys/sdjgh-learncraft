import assert from "node:assert/strict";
import {
  balanceGap, makeTeams, matchResult, nextPowerOfTwo, pairKey, parseRoster, parseTeamNames, resolveBracket, roundName, roundRobin, seedOrder, seedTeams,
  standings, teamCountFor, teamsToCsv, teamStats, type LeagueScore, type Student, type TeamOptions, type TournamentResult,
} from "../src/lib/pe-league/model";

/* 명단 읽기: 머리글, 엑셀 탭 붙여넣기, 성별·실력 표기, 번호 칸, 칸 순서, 중복·잘못된 값 */
{
  const { students, warnings } = parseRoster(["이름, 성별, 실력", "김민준, 남, 4", "이서연, 여자, 5", "박도윤,M,2", "최하은, F", "정우진", "", "강지우, 3, 여"].join("\n"));
  assert.deepEqual(students.map((student) => [student.name, student.gender, student.skill]), [
    ["김민준", "M", 4], ["이서연", "F", 5], ["박도윤", "M", 2], ["최하은", "F", null], ["정우진", "", null], ["강지우", "F", 3],
  ]);
  assert.deepEqual(warnings, []);
  const excel = parseRoster(["번호\t이름\t성별\t실력", "1\t한지민\t여\t3", "2\t오세훈\t남학생\t5", "3\t윤아\t\t"].join("\n"));
  assert.deepEqual(excel.students.map((student) => [student.name, student.gender, student.skill]), [["한지민", "F", 3], ["오세훈", "M", 5], ["윤아", "", null]], "엑셀 탭·번호 칸");
  const bad = parseRoster(["김철수, 남, 9", "김철수, 여, 2", "이영희, 키큼"].join("\n"));
  assert.equal(bad.students[0].skill, 5, "실력은 5까지");
  assert.ok(bad.warnings.some((warning) => warning.includes("1~5")));
  assert.ok(bad.warnings.some((warning) => warning.includes("같은 이름이 2명")));
  assert.ok(bad.warnings.some((warning) => warning.includes("키큼")));
  assert.equal(new Set(bad.students.map((student) => student.id)).size, 3, "이름이 같아도 id는 다름");
}

/* 팀 편성: 인원 1명 차이 이내, 실력·성별 고르게, 같은 씨앗이면 같은 결과 */
{
  let state = 7;
  const random = () => { state = (state * 1103515245 + 12345) % 2147483648; return state / 2147483648; };
  const students: Student[] = Array.from({ length: 31 }, (_, index) => ({ id: `s${index}`, name: `학생${String(index).padStart(2, "0")}`, gender: random() < 0.45 ? "F" : "M", skill: 1 + Math.floor(random() * 5) }));
  const options: TeamOptions = { basis: "count", count: 4, size: 5, balanceSkill: true, balanceGender: true, seed: 11 };
  const teams = makeTeams(students, options);
  assert.equal(teams.length, 4);
  const sizes = teams.map((team) => team.members.length);
  assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1, `인원 차이 ≤ 1: ${sizes}`);
  assert.equal(sizes.reduce((sum, size) => sum + size, 0), 31, "모든 학생이 한 팀에");
  assert.equal(new Set(teams.flatMap((team) => team.members.map((member) => member.id))).size, 31, "한 학생은 한 팀에만");
  const females = teams.map((team) => teamStats(team).female);
  assert.ok(Math.max(...females) - Math.min(...females) <= 1, `여학생 수 차이 ≤ 1: ${females}`);
  const gap = balanceGap(teams)!;
  assert.ok(gap < 0.5, `평균 실력 차이 작음: ${gap}`);
  const plain = makeTeams(students, { ...options, balanceSkill: false, balanceGender: false });
  assert.ok(Math.max(...plain.map((team) => team.members.length)) - Math.min(...plain.map((team) => team.members.length)) <= 1, "무작위도 인원 균형");
  assert.deepEqual(makeTeams(students, options), teams, "같은 씨앗이면 같은 팀");
  assert.notDeepEqual(makeTeams(students, { ...options, seed: 12 }).map((team) => team.members.map((member) => member.id)), teams.map((team) => team.members.map((member) => member.id)), "씨앗을 바꾸면 달라짐");
  assert.equal(teamCountFor(31, { basis: "size", count: 2, size: 6 }), 6, "6명씩이면 6팀");
  assert.equal(teamCountFor(3, { basis: "count", count: 8, size: 6 }), 3, "학생보다 팀이 많을 수 없음");
  assert.equal(teams[0].name, "빨강팀");
  assert.equal(makeTeams(students, options, "number")[1].name, "2팀");
  assert.ok(teamsToCsv(teams).startsWith("﻿팀,이름,성별,실력"));
}

/* 리그전: 모든 두 팀이 한 번(두 번씩이면 두 번), 한 라운드에 한 경기, 홀수 팀 휴식 */
for (const count of [2, 3, 4, 5, 6, 7, 8]) {
  for (const double of [false, true]) {
    const rounds = roundRobin(count, { double, courts: 2 });
    assert.equal(rounds.length, (count % 2 ? count : count - 1) * (double ? 2 : 1), `${count}팀 라운드 수`);
    const pairs = new Map<string, number>();
    const homeGames = Array(count).fill(0) as number[];
    for (const round of rounds) {
      const playing = round.matches.flatMap((match) => [match.home, match.away]);
      assert.equal(new Set(playing).size, playing.length, "한 라운드에 한 팀은 한 경기만");
      assert.equal(round.rest.length, count % 2, "홀수면 한 팀 휴식");
      for (const match of round.matches) {
        const key = [match.home, match.away].sort().join("-");
        pairs.set(key, (pairs.get(key) ?? 0) + 1);
        homeGames[match.home] += 1;
        assert.equal(match.court, (match.index % 2) + 1);
        assert.equal(match.slot, Math.floor(match.index / 2) + 1);
      }
    }
    assert.equal(pairs.size, (count * (count - 1)) / 2, `${count}팀 모든 짝`);
    assert.ok([...pairs.values()].every((times) => times === (double ? 2 : 1)), "짝마다 정해진 횟수");
    if (double) assert.ok(homeGames.every((games) => games === count - 1), "두 번씩이면 홈 경기 수가 같음");
  }
}

/* 순위표: 승점 → 득실차 → 다득점 → 승자승 → 이름, 무승부 없는 종목 */
{
  const teams = ["가", "나", "다", "라"];
  const rounds = roundRobin(4);
  const scores: Record<string, LeagueScore> = {};
  const set = (a: number, b: number, sa: number, sb: number) => {
    const match = rounds.flatMap((round) => round.matches).find((item) => (item.home === a && item.away === b) || (item.home === b && item.away === a))!;
    const [home, away] = match.home === a ? [sa, sb] : [sb, sa];
    scores[match.id] = { home: String(home), away: String(away), pair: pairKey(teams[match.home], teams[match.away]) };
  };
  // 가·나·다가 서로 1승씩(가>나, 나>다, 다>가), 모두 라에게 이김 → 승점·득실 동률은 승자승도 같아 이름 순·같은 순위
  set(0, 1, 1, 0); set(1, 2, 1, 0); set(2, 0, 1, 0); set(0, 3, 2, 0); set(1, 3, 2, 0); set(2, 3, 2, 0);
  const table = standings(teams, rounds, scores, { win: 3, draw: 1, loss: 0 }, true);
  assert.deepEqual(table.map((row) => [teams[row.team], row.points, row.rank]), [["가", 6, 1], ["나", 6, 1], ["다", 6, 1], ["라", 0, 4]], "완전 동률은 같은 순위");
  // 세 팀이 1승 1패씩: 가(4-3)·나(2-2)·다(2-3) → 득실차로 가가 위
  const two = ["가", "나", "다"];
  const r3 = roundRobin(3);
  const s3: Record<string, LeagueScore> = {};
  const set3 = (a: number, b: number, sa: number, sb: number) => {
    const match = r3.flatMap((round) => round.matches).find((item) => (item.home === a && item.away === b) || (item.home === b && item.away === a))!;
    const [home, away] = match.home === a ? [sa, sb] : [sb, sa];
    s3[match.id] = { home: String(home), away: String(away), pair: pairKey(two[match.home], two[match.away]) };
  };
  set3(0, 1, 1, 2); set3(0, 2, 3, 1); set3(1, 2, 0, 1);
  const t3 = standings(two, r3, s3, { win: 3, draw: 1, loss: 0 }, true);
  assert.deepEqual(t3.map((row) => two[row.team]), ["가", "나", "다"]);
  set3(0, 2, 2, 1);
  const h2h = standings(two, r3, s3, { win: 3, draw: 1, loss: 0 }, true);
  // 가(3-3)·나(2-2) 모두 득실 0 → 다득점으로 가가 위
  assert.equal(two[h2h[0].team], "가");
  set3(1, 2, 1, 2);
  const tie = standings(two, r3, s3, { win: 3, draw: 1, loss: 0 }, true);
  // 세 팀 모두 승점 3·득실 0·득점 3이고 서로 1승 1패라 승자승도 같음 → 이름 순, 같은 순위
  assert.deepEqual(tie.map((row) => [two[row.team], row.rank]), [["가", 1], ["나", 1], ["다", 1]]);
  const onlyTwo = ["A", "B", "C"];
  const rr = roundRobin(3);
  const sc: Record<string, LeagueScore> = {};
  const put = (a: number, b: number, sa: number, sb: number) => {
    const match = rr.flatMap((round) => round.matches).find((item) => (item.home === a && item.away === b) || (item.home === b && item.away === a))!;
    const [home, away] = match.home === a ? [sa, sb] : [sb, sa];
    sc[match.id] = { home: String(home), away: String(away), pair: pairKey(onlyTwo[match.home], onlyTwo[match.away]) };
  };
  // A·B 모두 C에게 이기고 서로 비김 → 승점 4·득실 +2로 같고, 다득점으로 B가 위
  put(0, 2, 2, 0); put(1, 2, 3, 1); put(0, 1, 1, 1);
  const byH2h = standings(onlyTwo, rr, sc, { win: 3, draw: 1, loss: 0 }, true);
  assert.deepEqual(byH2h.map((row) => [onlyTwo[row.team], row.points, row.diff, row.goalsFor, row.rank]), [["B", 4, 2, 4, 1], ["A", 4, 2, 3, 2], ["C", 0, -4, 1, 3]], "득실 같으면 다득점");
  assert.equal(matchResult({ home: "2", away: "2", pair: "x" }, "x", false).state, "invalid", "무승부 없는 종목의 같은 점수");
  assert.equal(matchResult({ home: "2", away: "", pair: "x" }, "x", true).state, "partial");
  assert.equal(matchResult({ home: "2", away: "1", pair: "x" }, "y", true).state, "empty", "팀이 바뀌면 예전 점수는 쓰지 않음");
  const noDraw = standings(onlyTwo, rr, sc, { win: 3, draw: 1, loss: 0 }, false);
  assert.equal(noDraw.find((row) => row.team === 0)!.played, 1, "무승부 없는 종목에서 같은 점수 경기는 빼고 계산");
}

/* 승자승: 승점·득실·득점이 모두 같은 두 팀은 서로의 경기 결과로 가름 */
{
  const teams = ["A", "B", "C", "D"];
  const rounds = roundRobin(4);
  const scores: Record<string, LeagueScore> = {};
  const put = (a: number, b: number, sa: number, sb: number) => {
    const match = rounds.flatMap((round) => round.matches).find((item) => (item.home === a && item.away === b) || (item.home === b && item.away === a))!;
    const [home, away] = match.home === a ? [sa, sb] : [sb, sa];
    scores[match.id] = { home: String(home), away: String(away), pair: pairKey(teams[match.home], teams[match.away]) };
  };
  // A: B에 1-0 승, C에 0-1 패, D에 1-1  → 승점 4, 득 2 실 2
  // B: A에 0-1 패, C에 1-0 승, D에 1-1  → 승점 4, 득 2 실 2
  put(0, 1, 1, 0); put(0, 2, 0, 1); put(0, 3, 1, 1); put(1, 2, 1, 0); put(1, 3, 1, 1); put(2, 3, 0, 0);
  const table = standings(teams, rounds, scores, { win: 3, draw: 1, loss: 0 }, true);
  const a = table.find((row) => row.team === 0)!;
  const b = table.find((row) => row.team === 1)!;
  assert.deepEqual([a.points, a.diff, a.goalsFor], [b.points, b.diff, b.goalsFor], "A·B 기준 동률");
  assert.ok(table.indexOf(a) < table.indexOf(b) && a.rank < b.rank, "승자승으로 A가 위");
}

/* 토너먼트: 시드 배치, 부전승, 승자 올라가기, 동점이면 승자 선택, 3·4위전 */
{
  assert.deepEqual(seedOrder(8), [1, 8, 4, 5, 2, 7, 3, 6]);
  assert.equal(nextPowerOfTwo(5), 8); assert.equal(nextPowerOfTwo(2), 2); assert.equal(nextPowerOfTwo(16), 16);
  assert.equal(roundName(1, 3), "결승"); assert.equal(roundName(2, 2), "준결승"); assert.equal(roundName(4, 1), "8강"); assert.equal(roundName(8, 1), "16강");
  const order16 = seedOrder(16);
  assert.ok(order16.indexOf(1) < 8 && order16.indexOf(2) >= 8, "1·2번 시드는 서로 다른 반쪽");
  assert.ok(Math.floor(order16.indexOf(3) / 4) !== Math.floor(order16.indexOf(1) / 4) && Math.floor(order16.indexOf(4) / 4) !== Math.floor(order16.indexOf(2) / 4), "3·4번 시드는 1·2번과 다른 4분의 1");

  const teams = ["A", "B", "C", "D", "E", "F"];
  const seeds = seedTeams(teams.length, false, 1);
  let bracket = resolveBracket(teams, seeds, {}, true);
  assert.equal(bracket.size, 8);
  assert.equal(bracket.rounds.length, 3);
  const byes = bracket.rounds[0].filter((match) => match.auto);
  assert.equal(byes.length, 2, "6팀이면 부전승 2경기");
  assert.deepEqual(byes.map((match) => teams[(match.winner === "a" ? match.a.team : match.b.team)!]).sort(), ["A", "B"], "부전승은 1·2번 시드");
  assert.equal(bracket.rounds[1][0].a.team, 0, "1번 시드는 다음 라운드에 올라가 있음");

  const results: Record<string, TournamentResult> = {};
  const play = (id: string, a: number, b: number, winner?: "a" | "b") => {
    bracket = resolveBracket(teams, seeds, results, true);
    const match = [...bracket.rounds.flat(), bracket.third].find((item) => item?.id === id)!;
    results[id] = { a: String(a), b: String(b), winner, pair: pairKey(teams[match.a.team!], teams[match.b.team!]) };
    bracket = resolveBracket(teams, seeds, results, true);
    return [...bracket.rounds.flat(), bracket.third].find((item) => item?.id === id)!;
  };
  // 1회전: 4번(D) vs 5번(E), 3번(C) vs 6번(F)
  const first = bracket.rounds[0].filter((match) => !match.auto);
  assert.deepEqual(first.map((match) => [teams[match.a.team!], teams[match.b.team!]]), [["D", "E"], ["C", "F"]]);
  play(first[0].id, 2, 1);
  const tied = play(first[1].id, 1, 1);
  assert.equal(tied.winner, null); assert.ok(tied.needsChoice, "동점이면 승자를 골라야 함");
  assert.equal(bracket.rounds[1][1].b.team, null, "승자를 고르기 전에는 다음 라운드가 빈칸");
  play(first[1].id, 1, 1, "b");
  assert.equal(teams[bracket.rounds[1][1].b.team!], "F", "고른 승자가 올라감");
  play(bracket.rounds[1][0].id, 3, 0);
  play(bracket.rounds[1][1].id, 0, 2);
  assert.ok(bracket.third, "3·4위전");
  assert.deepEqual([teams[bracket.third!.a.team!], teams[bracket.third!.b.team!]], ["D", "B"], "준결승 패자끼리");
  play(bracket.rounds[2][0].id, 1, 2);
  play("third", 4, 2);
  assert.equal(teams[bracket.champion!], "F", "우승");
  assert.deepEqual(bracket.podium.map((team) => teams[team]), ["F", "A", "D"]);
  // 앞 경기 결과가 바뀌면 뒤 경기 점수는 쓰지 않음
  results[first[0].id] = { ...results[first[0].id], a: "0", b: "5" };
  bracket = resolveBracket(teams, seeds, results, true);
  assert.equal(teams[bracket.rounds[1][0].b.team!], "E");
  assert.equal(bracket.rounds[1][0].winner, null, "만나는 팀이 바뀐 경기의 예전 점수는 버림");
  assert.equal(resolveBracket(["A", "B", "C"], seedTeams(3, false, 1), {}, true).third, null, "준결승이 부전승이면 3·4위전 없음");
  assert.deepEqual(seedTeams(8, true, 5), seedTeams(8, true, 5), "무작위 배치도 같은 씨앗이면 같음");
  assert.equal(resolveBracket(["A"], [0], {}, true).size, 0);
}

assert.deepEqual(parseTeamNames("1. 빨강팀\n파랑팀\n\n빨강팀\n"), ["빨강팀", "파랑팀", "빨강팀 (2)"]);

console.log("체육 팀·대진표 검증 완료: 명단 읽기·팀 편성(인원·실력·성별 균형)·리그전 일정·순위표(승자승)·토너먼트(시드·부전승·동점 승자·3·4위전)");
