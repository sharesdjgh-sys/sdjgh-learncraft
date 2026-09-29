/* 정치: 비례 대표 의석 배분(헤어-니마이어·동트·생트라게·우리나라 준연동형)과 소선거구 사표, 선거구 제도 문제입니다. */
import { escapeHtml, grouped, jamo, num, percent, plainText, seededRandom, sheetTable, shuffled, svgText, svgWrap, type SheetProblem, type SheetSection } from "./sheet";

export type Party = { name: string; votes: number; districts: number };
export type Method = "hare" | "dhondt" | "sainte";
export const methodNames: Record<Method, string> = { hare: "헤어-니마이어(최대 잔여)", dhondt: "동트(d'Hondt)", sainte: "생트라게(Sainte-Laguë)" };
export const PARTY_COLORS = ["#2563eb", "#dc2626", "#f59e0b", "#059669", "#7c3aed", "#db2777", "#0891b2", "#65a30d"];

/** 가상의 자료입니다(실제 선거 결과가 아닙니다). 지역구 254석 가운데 무소속 3석. */
export const DEFAULT_PARTIES: Party[] = [
  { name: "가당", votes: 9_800_000, districts: 160 },
  { name: "나당", votes: 7_900_000, districts: 90 },
  { name: "다당", votes: 3_900_000, districts: 0 },
  { name: "라당", votes: 1_200_000, districts: 1 },
  { name: "마당", votes: 600_000, districts: 0 },
];
export type District = { name: string; votes: number[] };
export const DEFAULT_DISTRICTS: District[] = [
  { name: "제1선거구", votes: [42_000, 38_000, 20_000] },
  { name: "제2선거구", votes: [35_000, 40_000, 25_000] },
  { name: "제3선거구", votes: [45_000, 30_000, 25_000] },
  { name: "제4선거구", votes: [36_000, 34_000, 30_000] },
  { name: "제5선거구", votes: [30_000, 28_000, 42_000] },
];

const sum = (values: number[]) => values.reduce((acc, value) => acc + value, 0);

/** 최대 잔여 방식: 몫(값 × 의석 ÷ 합)의 정수 부분을 먼저 주고, 남은 의석은 나머지가 큰 순서로 줍니다. 값은 정수여야 나머지를 정확히 비교합니다. */
export function largestRemainder(values: number[], seats: number) {
  const total = sum(values);
  if (!(total > 0) || seats <= 0) return { seats: values.map(() => 0), quotas: values.map(() => 0), tie: false };
  const whole = values.map(value => Math.floor((value * seats) / total));
  const rest = values.map(value => (value * seats) % total);
  let left = seats - sum(whole);
  const order = values.map((_, index) => index).filter(index => values[index] > 0).sort((a, b) => rest[b] - rest[a] || values[b] - values[a] || a - b);
  const result = [...whole];
  for (const index of order) { if (left <= 0) break; result[index] += 1; left -= 1; }
  // 마지막으로 받은 곳과 못 받은 곳의 나머지가 같으면 동률(추첨)입니다.
  const given = order.filter(index => result[index] > whole[index]);
  const missed = order.filter(index => result[index] === whole[index]);
  const tie = given.length > 0 && missed.length > 0 && rest[given[given.length - 1]] === rest[missed[0]];
  return { seats: result, quotas: values.map(value => (value * seats) / total), tie };
}

const divisors: Record<Exclude<Method, "hare">, (k: number) => number> = { dhondt: k => k + 1, sainte: k => 2 * k + 1 };
/** 나눗셈 표: 각 정당 득표를 1, 2, 3…(생트라게는 1, 3, 5…)로 나눈 몫과 당선 몫 표시입니다. */
export function divisorTable(values: number[], seats: number, method: Exclude<Method, "hare">, columns = seats) {
  const cells = values.map((value, party) => Array.from({ length: columns }, (_, k) => ({ party, k, value: value / divisors[method](k), won: false })));
  const all = cells.flat().filter(cell => values[cell.party] > 0);
  // 몫이 큰 순서(같으면 득표가 많은 정당)로 의석을 줍니다.
  const everything = values.flatMap((value, party) => value > 0 ? Array.from({ length: seats + 1 }, (_, k) => ({ party, k, value: value / divisors[method](k) })) : []);
  everything.sort((a, b) => b.value - a.value || values[b.party] - values[a.party] || a.party - b.party);
  const winners = everything.slice(0, seats);
  for (const winner of winners) { const cell = all.find(item => item.party === winner.party && item.k === winner.k); if (cell) cell.won = true; }
  const result = values.map((_, party) => winners.filter(winner => winner.party === party).length);
  const tie = seats > 0 && everything.length > seats && Math.abs(everything[seats - 1].value - everything[seats].value) < 1e-9;
  return { cells, seats: result, winners, tie };
}

/** 득표율이 봉쇄 조항(threshold %) 이상인 정당만 의석을 나눕니다. */
export function allocate(parties: Party[], seats: number, method: Method, threshold = 0) {
  const total = sum(parties.map(party => party.votes));
  const values = parties.map(party => total > 0 && party.votes / total >= threshold / 100 ? party.votes : 0);
  if (method === "hare") return largestRemainder(values, seats).seats;
  return divisorTable(values, seats, method).seats;
}

/* ───── 우리나라 준연동형(공직선거법 제189조, 제22대 총선 기준) ───── */
export type KoreanOptions = { seats: number; proportional: number };
export const KOREAN_DEFAULT: KoreanOptions = { seats: 300, proportional: 46 };
export function koreanMixed(parties: Party[], options: KoreanOptions = KOREAN_DEFAULT) {
  const districtSeats = options.seats - options.proportional;
  const totalVotes = sum(parties.map(party => party.votes));
  const eligible = parties.map(party => party.districts >= 5 || (totalVotes > 0 && party.votes / totalVotes >= 0.03));
  const eligibleVotes = sum(parties.map((party, index) => eligible[index] ? party.votes : 0));
  const partyDistricts = sum(parties.map(party => party.districts));
  const independents = districtSeats - partyDistricts;
  // 의석 할당 정당이 추천하지 않은 지역구 당선인(무소속·할당받지 못한 정당)
  const nonEligible = districtSeats - sum(parties.map((party, index) => eligible[index] ? party.districts : 0));
  const ratio = parties.map((party, index) => eligible[index] && eligibleVotes > 0 ? party.votes / eligibleVotes : 0);
  // 연동 배분 의석 = [(의원 정수 − 비할당 지역구 당선인) × 득표 비율 − 지역구 당선인] ÷ 2 → 1 미만은 0, 소수점 첫째 자리에서 반올림. 정수로 계산해 반올림 경계를 정확히 다룹니다.
  const raw = parties.map((party, index) => eligible[index] && eligibleVotes > 0 ? ((options.seats - nonEligible) * party.votes - party.districts * eligibleVotes) / (2 * eligibleVotes) : 0);
  const linked = parties.map((party, index) => {
    if (!eligible[index] || eligibleVotes <= 0) return 0;
    const top = (options.seats - nonEligible) * party.votes - party.districts * eligibleVotes;
    return top < 2 * eligibleVotes ? 0 : Math.floor((top + eligibleVotes) / (2 * eligibleVotes));
  });
  const linkedTotal = sum(linked);
  let kind: "residual" | "adjusted" | "exact" = "exact";
  let extra = parties.map(() => 0);
  let proportional = [...linked];
  if (linkedTotal < options.proportional) {
    kind = "residual";
    extra = largestRemainder(parties.map((party, index) => eligible[index] ? party.votes : 0), options.proportional - linkedTotal).seats;
    proportional = linked.map((value, index) => value + extra[index]);
  } else if (linkedTotal > options.proportional) {
    kind = "adjusted";
    proportional = largestRemainder(linked, options.proportional).seats;
  }
  return { eligible, ratio, raw, linked, linkedTotal, kind, extra, proportional, total: parties.map((party, index) => party.districts + proportional[index]), nonEligible, independents, districtSeats };
}

/* ───── 소선거구 사표 ───── */
export function districtResults(districts: District[], partyCount: number) {
  const rows = districts.map(district => {
    const votes = Array.from({ length: partyCount }, (_, index) => Math.max(0, district.votes[index] ?? 0));
    const total = sum(votes);
    const best = Math.max(...votes);
    const winner = votes.indexOf(best);
    return { name: district.name, votes, total, winner: total > 0 ? winner : -1, tie: total > 0 && votes.filter(vote => vote === best).length > 1, wasted: total - best };
  });
  const allVotes = sum(rows.map(row => row.total));
  const parties = Array.from({ length: partyCount }, (_, index) => {
    const votes = sum(rows.map(row => row.votes[index]));
    const seats = rows.filter(row => row.winner === index).length;
    return { votes, seats, voteShare: allVotes ? votes / allVotes : 0, seatShare: rows.length ? seats / rows.length : 0 };
  });
  const wasted = sum(rows.map(row => row.wasted));
  return { rows, parties, wasted, allVotes, wastedRate: allVotes ? wasted / allVotes : 0 };
}

/* ───── 반원 의석 그림 ───── */
export function hemicycleSvg(groups: { label: string; seats: number; color: string }[], width = 440) {
  const total = sum(groups.map(group => Math.max(0, group.seats)));
  const radius = width / 2 - 16;
  const cx = width / 2;
  const cy = radius + 12;
  const legendRows = Math.ceil(groups.length / 3);
  const height = cy + 16 + legendRows * 18;
  if (!total) return svgWrap(width, height, svgText(cx, cy - 20, "의석이 없어요", { anchor: "middle", color: "#666" }));
  const rows = Math.max(1, Math.min(12, Math.ceil(Math.sqrt(total / 2.2))));
  const inner = radius * 0.42;
  const radii = Array.from({ length: rows }, (_, k) => rows === 1 ? radius * 0.8 : inner + ((radius - inner) * k) / (rows - 1));
  // 줄마다 반지름에 비례해 자리를 나눕니다(정수 비교를 위해 반지름을 1000배 정수로).
  const perRow = largestRemainder(radii.map(r => Math.round(r * 1000)), total).seats;
  const spacing = rows > 1 ? (radius - inner) / (rows - 1) : radius * 0.3;
  const outer = perRow[rows - 1];
  const dot = Math.max(1.6, Math.min(spacing * 0.42, outer > 1 ? ((Math.PI * radius) / (outer - 1)) * 0.42 : 10, 12));
  const spots = radii.flatMap((r, row) => Array.from({ length: perRow[row] }, (_, j) => {
    const angle = perRow[row] === 1 ? Math.PI / 2 : Math.PI - (Math.PI * j) / (perRow[row] - 1);
    return { angle, r, x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
  })).sort((a, b) => b.angle - a.angle || a.r - b.r);
  const colors: string[] = [];
  for (const group of groups) for (let index = 0; index < group.seats; index += 1) colors.push(group.color);
  const body = spots.map((spot, index) => `<circle cx="${spot.x.toFixed(1)}" cy="${spot.y.toFixed(1)}" r="${dot.toFixed(1)}" fill="${colors[index] ?? "#ccc"}"/>`).join("")
    + svgText(cx, cy - 4, `${total}석`, { anchor: "middle", size: 18, weight: 800 })
    + groups.map((group, index) => {
      const x = 12 + (index % 3) * ((width - 24) / 3);
      const y = cy + 22 + Math.floor(index / 3) * 18;
      return `<rect x="${x}" y="${y - 10}" width="12" height="12" rx="2" fill="${group.color}"/>` + svgText(x + 17, y, `${group.label} ${group.seats}석`, { size: 12 });
    }).join("");
  return svgWrap(width, height, body);
}

/* ───── 선거구 제도 특징 ───── */
type System = "single" | "multi" | "pr";
export const systemNames: Record<System, string> = { single: "소선거구제", multi: "중·대선거구제", pr: "비례 대표제" };
/** 교과서에 나오는 특징입니다. systems는 그 설명이 들어맞는 제도입니다. */
const SYSTEM_FEATURES: { text: string; systems: System[] }[] = [
  { text: "한 선거구에서 1명의 대표를 뽑는다.", systems: ["single"] },
  { text: "한 선거구에서 2명 이상의 대표를 뽑는다.", systems: ["multi"] },
  { text: "정당의 득표율에 비례하여 의석을 나눈다.", systems: ["pr"] },
  { text: "선거구가 작아 유권자가 후보자를 잘 알 수 있다.", systems: ["single"] },
  { text: "선거 비용이 비교적 적게 든다.", systems: ["single"] },
  { text: "사표가 많이 생긴다.", systems: ["single"] },
  { text: "양당제가 자리 잡기 쉬워 정국이 안정되기 쉽다.", systems: ["single"] },
  { text: "게리맨더링(특정 정당에 유리한 선거구 획정)의 가능성이 크다.", systems: ["single"] },
  { text: "지역의 이익을 대변하는 인물이 당선되기 쉽다.", systems: ["single"] },
  { text: "소수당 후보도 당선될 가능성이 비교적 높다.", systems: ["multi", "pr"] },
  { text: "사표가 적게 생긴다.", systems: ["multi", "pr"] },
  { text: "선거구가 넓어 선거 비용이 많이 들 수 있다.", systems: ["multi"] },
  { text: "유권자가 후보자를 잘 알기 어렵다.", systems: ["multi"] },
  { text: "군소 정당이 난립하여 정국이 불안정해질 수 있다.", systems: ["multi", "pr"] },
  { text: "소수 의견을 의회에 반영하기 쉽다.", systems: ["multi", "pr"] },
  { text: "정당이 정한 후보자 명부 순서에 따라 당선자가 정해진다.", systems: ["pr"] },
  { text: "직능 대표·전문가가 의회에 진출하기 쉽다.", systems: ["pr"] },
];
export const systemFeatureRows = () => (Object.keys(systemNames) as System[]).map(system => ({ system, name: systemNames[system], features: SYSTEM_FEATURES.filter(feature => feature.systems.includes(system)).map(feature => feature.text) }));

/* ───── 문제 ───── */
export type ElectionAsk = "dhondt" | "hare" | "wasted" | "system" | "linked";
export const electionAsks: Record<ElectionAsk, string> = { dhondt: "동트 방식 배분", hare: "헤어-니마이어 배분", wasted: "소선거구 사표", system: "선거구 제도 특징", linked: "준연동형 연동 배분 의석" };

const LETTERS = ["A", "B", "C", "D", "E"];
/** 표가 붙은 문제: 표는 인쇄에 넣고, 한글 복사 글에는 표 내용을 한 줄로 붙입니다. */
function tableProblem(html: string, table: string, tableText: string, answerHtml: string, space = 14): SheetProblem {
  return { html, text: `${plainText(html)} [${tableText}]`, after: table, answerHtml, answerText: plainText(answerHtml), space };
}

export function electionProblems(asks: ElectionAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 53 + 17);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const problems: SheetProblem[] = [];
  const voteSet = (count: number) => {
    const values = new Set<number>();
    while (values.size < count) values.add((6 + Math.floor(random() * 50)) * 1000);
    return [...values].sort((a, b) => b - a);
  };
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "dhondt" || ask === "hare") {
      let seats = 5;
      let votes: number[] = [];
      let result: number[] = [];
      // 동률(추첨)이 없는 문제가 나올 때까지 고릅니다.
      for (let attempt = 0; attempt < 50; attempt += 1) {
        seats = pick([5, 6, 7, 8]);
        votes = voteSet(4);
        if (ask === "dhondt") { const table = divisorTable(votes, seats, "dhondt"); if (table.tie) continue; result = table.seats; }
        else { const lr = largestRemainder(votes, seats); if (lr.tie) continue; result = lr.seats; }
        break;
      }
      const names = LETTERS.slice(0, 4).map(letter => `${letter}당`);
      const table = sheetTable(["정당", ...names], [["득표 수", ...votes.map(vote => grouped(vote, 0))]]);
      const tableText = names.map((name, at) => `${name} ${grouped(votes[at], 0)}표`).join(", ");
      const answer = names.map((name, at) => `${name} ${result[at]}석`).join(", ");
      if (ask === "dhondt") {
        const winners = divisorTable(votes, seats, "dhondt").winners.map(winner => `${names[winner.party]}÷${winner.k + 1}=${grouped(winner.value, 0)}`);
        problems.push(tableProblem(`다음은 ○○국 비례 대표 선거의 정당별 득표 수이다. 동트(d'Hondt) 방식으로 ${seats}석을 배분할 때 각 정당의 의석 수를 구하시오.`, table, tableText, `${answer}<br><span style="font-size:9.5pt">득표 수를 1, 2, 3…으로 나눈 몫이 큰 순서: ${escapeHtml(winners.join(", "))}</span>`));
      } else {
        const total = sum(votes);
        const quotas = votes.map(vote => (vote * seats) / total);
        problems.push(tableProblem(`다음은 ○○국 비례 대표 선거의 정당별 득표 수이다. 헤어-니마이어(최대 잔여) 방식으로 ${seats}석을 배분할 때 각 정당의 의석 수를 구하시오.`, table, tableText, `${answer}<br><span style="font-size:9.5pt">몫(득표 × ${seats} ÷ 전체 ${grouped(total, 0)}): ${names.map((name, at) => `${name} ${num(quotas[at], 3)}`).join(", ")} → 정수 부분을 먼저 주고 남은 의석은 소수 부분이 큰 순서로 줘요.</span>`));
      }
    } else if (ask === "wasted") {
      // 선거구마다 득표가 서로 달라 당선자가 하나로 정해집니다.
      const rows = Array.from({ length: 3 }, () => { const set = new Set<number>(); while (set.size < 3) set.add((10 + Math.floor(random() * 40)) * 100); return [...set]; });
      const names = ["갑당", "을당", "병당"];
      const result = districtResults(rows.map((votes, at) => ({ name: `${at + 1}선거구`, votes })), 3);
      const table = sheetTable(["선거구", ...names], rows.map((votes, at) => [`${at + 1}선거구`, ...votes.map(vote => grouped(vote, 0))]));
      const tableText = rows.map((votes, at) => `${at + 1}선거구 ${votes.map((vote, p) => `${names[p]} ${grouped(vote, 0)}`).join("·")}`).join(" / ");
      const winners = result.rows.map(row => `${row.name} ${names[row.winner]}`).join(", ");
      problems.push(tableProblem("다음은 소선거구 다수 대표제로 치른 선거 결과(득표 수)이다. 각 선거구의 당선 정당과 세 선거구 전체의 사표 수, 사표율을 구하시오.", table, tableText,
        `당선: ${winners} / 사표 ${grouped(result.wasted, 0)}표, 사표율 ${percent(result.wastedRate)} (당선자에게 가지 않은 표 ÷ 전체 ${grouped(result.allVotes, 0)}표)`));
    } else if (ask === "system") {
      const system = pick(Object.keys(systemNames) as System[]);
      const right = shuffled(SYSTEM_FEATURES.filter(feature => feature.systems.includes(system)), Math.floor(random() * 1e6)).slice(0, 2);
      const wrong = shuffled(SYSTEM_FEATURES.filter(feature => !feature.systems.includes(system)), Math.floor(random() * 1e6)).slice(0, 2);
      const items = shuffled([...right, ...wrong], Math.floor(random() * 1e6));
      const answer = items.map((item, at) => item.systems.includes(system) ? jamo(at) : "").filter(Boolean).join(", ");
      const html = `${escapeHtml(systemNames[system])}에 대한 설명으로 옳은 것만을 &lt;보기&gt;에서 있는 대로 고르시오.<br>${items.map((item, at) => `${jamo(at)}. ${escapeHtml(item.text)}`).join("<br>")}`;
      const answerHtml = `${answer} (${items.filter(item => !item.systems.includes(system)).map(item => `‘${escapeHtml(item.text)}’는 ${item.systems.map(key => systemNames[key]).join("·")}의 특징`).join(" / ")})`;
      problems.push({ html, text: plainText(html), answerHtml, answerText: plainText(answerHtml), space: 8 });
    } else {
      // 비할당 지역구 당선인이 없다고 두고, 결과가 정수에 가깝지 않은(반올림이 필요한) 값도 섞습니다.
      const rate = pick([12, 15, 18, 22, 25, 28, 32, 35, 38, 42]);
      const districts = pick([0, 2, 5, 10, 20, 30, 40, 60]);
      const raw = (300 * rate / 100 - districts) / 2;
      const linked = raw < 1 ? 0 : Math.floor(raw + 0.5);
      const html = `우리나라 준연동형 비례 대표제에서 A당의 비례 대표 득표 비율(의석 할당 정당 득표 합 기준)은 ${rate}%, 지역구 당선인은 ${districts}명이다. 의석 할당 정당이 추천하지 않은 지역구 당선인은 없다고 할 때 A당의 연동 배분 의석 수를 구하시오. (의원 정수 300명)`;
      const answerHtml = `${linked}석 (연동 배분 의석 = (300 × ${rate / 100} − ${districts}) ÷ 2 = ${num(raw, 1)}${raw < 1 ? " → 1 미만이면 0" : " → 소수점 첫째 자리에서 반올림"})`;
      problems.push({ html, text: plainText(html), answerHtml, answerText: plainText(answerHtml), space: 12 });
    }
  }
  return [{ heading: "선거와 선거 제도", problems }];
}
