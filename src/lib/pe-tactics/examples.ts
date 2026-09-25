import {
  addFrame, addItem, applyFormation, blankTactics, formations, hitRadius, newId, type ArrowStyle, type CourtKind, type Point, type TacticsDoc, type Team,
} from "./model";

/* 수업에서 바로 쓰는 전술 보드 예시입니다. 단계는 화살표대로 움직여 만들어, 예시와 ‘화살표대로 다음 단계’ 결과가 같습니다. */

type Ref = string | Point;

function builder(court: CourtKind, title: string, half = false) {
  let doc: TacticsDoc = { ...blankTactics(court), title, half };
  const last = () => doc.frames.length - 1;
  const find = (ref: string) => {
    if (ref === "ball") return doc.items.find((item) => item.kind === "ball")!.id;
    const [team, label] = ref.split(":");
    const item = doc.items.find((candidate) => candidate.kind === "player" && candidate.team === team && candidate.label === label);
    if (!item) throw new Error(`예시에 없는 선수: ${ref}`);
    return item.id;
  };
  const at = (ref: Ref): Point => typeof ref === "string" ? doc.frames[last()].pos[find(ref)] : ref;
  const api = {
    team(team: Team, name: string, color?: string) { doc = { ...doc, teams: { ...doc.teams, [team]: { name, color: color ?? doc.teams[team].color } } }; return api; },
    player(team: Team, label: string, point: Point) { doc = addItem(doc, { id: newId(team.toLowerCase()), kind: "player", team, label }, point); return api; },
    ball(point: Point) { doc = addItem(doc, { id: newId("ball"), kind: "ball", label: "" }, point); return api; },
    formation(team: Team, id: string) { doc = applyFormation(doc, last(), team, formations.find((item) => item.id === id)!); return api; },
    arrow(style: ArrowStyle, from: Ref, to: Ref, bend = 0) {
      const start = at(from);
      const end = at(to);
      doc = { ...doc, frames: doc.frames.map((item, index) => index === last() ? { ...item, arrows: [...item.arrows, { id: newId("a"), style, from: start, to: end, bend }] } : item) };
      return api;
    },
    note(text: string) { doc = { ...doc, frames: doc.frames.map((item, index) => index === last() ? { ...item, note: text } : item) }; return api; },
    next() { doc = addFrame(doc, last(), true, hitRadius(doc)); return api; },
    done: () => doc,
  };
  return api;
}

/** 두 대형 사이에서 이동 거리 제곱의 합이 가장 작게 짝짓습니다(12명까지 정확히, 비트마스크 동적 계획법). 화살표가 덜 엇갈립니다. */
export function nearestPairs(from: Point[], to: Point[]) {
  const n = Math.min(from.length, to.length);
  const cost = (i: number, j: number) => (from[i][0] - to[j][0]) ** 2 + (from[i][1] - to[j][1]) ** 2;
  if (n > 12) return from.map((_, index) => index % to.length);
  const size = 1 << n;
  const best = new Array<number>(size).fill(Infinity);
  const choice = new Array<number>(size).fill(-1);
  best[0] = 0;
  for (let mask = 0; mask < size; mask += 1) {
    if (best[mask] === Infinity) continue;
    const i = popcount(mask);
    if (i >= n) continue;
    for (let j = 0; j < n; j += 1) {
      if (mask & (1 << j)) continue;
      const next = mask | (1 << j);
      const value = best[mask] + cost(i, j);
      if (value < best[next]) { best[next] = value; choice[next] = j; }
    }
  }
  const target = new Array<number>(n).fill(-1);
  let mask = size - 1;
  for (let i = n - 1; i >= 0; i -= 1) { const j = choice[mask]; target[i] = j; mask &= ~(1 << j); }
  return target;
}
const popcount = (value: number) => { let count = 0; for (let rest = value; rest; rest &= rest - 1) count += 1; return count; };

function dance() {
  const shape = (id: string) => formations.find((item) => item.id === id)!.points;
  const b = builder("floor", "표현 활동 · 대형 바꾸기").team("A", "모둠", "#7048e8").formation("A", "floor-two");
  let current = shape("floor-two");
  const steps: [string, string][] = [["floor-circle", "두 줄에서 원으로: 가까운 자리로 8박자 동안 이동해요."], ["floor-v", "원에서 V자로: 가운데 사람이 앞으로 나오며 V를 만들어요."]];
  for (const [id, note] of steps) {
    const next = shape(id);
    const pairs = nearestPairs(current, next);
    current.forEach((point, index) => b.arrow("run", point, next[pairs[index]]));
    b.note(note).next();
    current = current.map((_, index) => next[pairs[index]]);
  }
  return b.note("V자 대형 완성. 관객(무대 앞)을 향해 마무리 동작을 해요.").done();
}

export const tacticsExamples: { name: string; court: CourtKind; build: () => TacticsDoc }[] = [
  { name: "2대1 월 패스로 수비 제치기", court: "soccer", build: () => builder("soccer", "축구 · 2대1 월 패스", true)
    .player("A", "10", [38, 30]).player("A", "9", [30, 42]).player("B", "4", [32, 31]).player("B", "1", [1.5, 34]).ball([37, 31])
    .arrow("pass", "ball", [30.6, 41.2]).arrow("run", "A:10", [24, 28], 2.5).arrow("run", "B:4", [30.5, 37])
    .note("10번이 9번에게 패스하고, 수비수 뒤 빈 곳으로 뛰어 들어가요.").next()
    .arrow("pass", "ball", [24.8, 28.9]).note("9번은 바로 10번에게 되돌려 줘요(원터치 월 패스).").next()
    .arrow("shot", "ball", [0, 32.5]).note("수비수를 제친 10번이 슛!").done() },
  { name: "4-4-2와 4-3-3 기본 대형", court: "soccer", build: () => builder("soccer", "축구 · 4-4-2와 4-3-3").formation("A", "soccer-442").formation("B", "soccer-433").ball([52.5, 34])
    .note("수비 4명·미드필더 4명·공격 2명(4-4-2)과, 공격수를 3명 둔 4-3-3을 비교해요.").done() },
  { name: "픽 앤 롤 (2대2)", court: "basketball", build: () => builder("basketball", "농구 · 픽 앤 롤", true)
    .player("A", "1", [8.8, 7.5]).player("A", "5", [5.6, 9.6]).player("B", "1", [7.9, 7.5]).player("B", "5", [4.9, 9.6]).ball([8.7, 7.1])
    .arrow("screen", "A:5", [8.2, 8.4]).note("5번이 1번 수비수 옆에 서서 스크린(픽)을 걸어요.").next()
    .arrow("dribble", "A:1", [6.4, 11], -1).arrow("run", "A:5", [2.6, 7.9], 0.6).arrow("run", "B:5", [5.9, 10.3])
    .note("1번은 스크린을 돌아 드리블하고, 5번은 골밑으로 굴러 들어가요(롤).").next()
    .arrow("pass", "ball", [2.8, 7.6]).note("수비가 1번에게 몰리면 골밑의 5번에게 패스!").next()
    .arrow("shot", "ball", [1.575, 7.5]).note("5번이 골밑에서 슛.").done() },
  { name: "2-3 지역 방어의 움직임", court: "basketball", build: () => builder("basketball", "농구 · 2-3 지역 방어", true)
    .formation("A", "basketball-122").formation("B", "basketball-23").ball([8.6, 7.1])
    .arrow("pass", "ball", [6.8, 3.4]).arrow("run", "B:1", [5.7, 3.8]).arrow("run", "B:2", [6.4, 6.8]).arrow("run", "B:3", [3.3, 2.8]).arrow("run", "B:5", [2.2, 6]).arrow("run", "B:4", [2.2, 9.8])
    .note("지역 방어는 사람이 아니라 구역을 맡아요. 공이 옆으로 가면…").next()
    .note("다섯 명 모두 공 쪽으로 함께 움직여 빈틈을 줄여요.").done() },
  { name: "서브 리시브 W 대형과 공격", court: "volleyball", build: () => builder("volleyball", "배구 · 서브 받고 공격하기")
    .formation("A", "volleyball-w").formation("B", "volleyball-base").ball([15.8, 1.5])
    .arrow("pass", "ball", [2.4, 7], -2.5).note("상대가 서브하면 우리 팀은 W 대형으로 받을 준비를 해요.").next()
    .arrow("pass", "ball", [8.1, 5.3], -1).note("리시브한 공을 네트 앞 세터(6번)에게 보내요.").next()
    .arrow("pass", "ball", [7.6, 2.4], -1).arrow("run", "A:4", [7.4, 2.8]).note("세터가 4번 쪽으로 공을 올려요(토스).").next()
    .arrow("shot", "ball", [13.5, 6.4]).note("4번이 뛰어올라 빈 곳으로 스파이크!").done() },
  { name: "배드민턴 복식 수비에서 공격으로", court: "badminton", build: () => builder("badminton", "배드민턴 · 복식 대형 바꾸기")
    .formation("A", "badminton-defense").player("B", "1", [8.2, 3.05]).player("B", "2", [11.4, 3.05]).ball([11.1, 2.7])
    .arrow("shot", "ball", [3.3, 1.9]).note("상대가 스매시하면 우리 팀은 좌우로 나란히 서서 수비해요.").next()
    .arrow("pass", "ball", [8.6, 5.3], 0.6).arrow("run", "A:1", [5.2, 3.05]).arrow("run", "A:2", [2, 3.05]).arrow("run", "B:1", [9.6, 1.5]).arrow("run", "B:2", [9.6, 4.6])
    .note("공을 아래로 보내 공격 기회를 잡으면 앞뒤로 서는 공격 대형으로 바꿔요. 상대는 좌우 수비로.").next()
    .note("공격 대형: 앞사람은 네트 앞을, 뒷사람은 스매시를 맡아요.").done() },
  { name: "6-0 수비와 3-3 공격", court: "handball", build: () => builder("handball", "핸드볼 · 6-0 수비 뚫기", true)
    .formation("B", "handball-60").formation("A", "handball-33").ball([11.1, 10.5])
    .arrow("pass", "ball", [10.4, 4.5]).note("공격은 공을 빠르게 옆으로 돌려 수비 사이 틈을 만들어요.").next()
    .arrow("shot", "ball", [0, 9], 0.8).note("수비가 따라오기 전에 뒤쪽 공격수가 점프 슛!").done() },
  { name: "티볼 수비 위치와 1루 송구", court: "teeball", build: () => builder("teeball", "티볼 · 수비 위치")
    .formation("A", "teeball-field").player("B", "타자", [33.4, 57.4]).ball([35, 56.3])
    .note("수비 9명의 자리: 투수(P)·포수(C)·1루수·2루수·유격수(SS)·3루수·외야수(LF·CF·RF)").next()
    .arrow("shot", "ball", [27.6, 32.5], -1.5).arrow("run", "B:타자", [47.4, 44.6]).arrow("run", "A:SS", [27.8, 33.4])
    .note("타자가 친 공이 유격수 쪽으로! 타자는 1루로 달려요.").next()
    .arrow("pass", "ball", [46.3, 45]).note("유격수가 공을 잡아 1루로 던져 타자를 아웃시켜요.").done() },
  { name: "피구 외야 패스와 공격", court: "dodgeball", build: () => builder("dodgeball", "피구 · 외야와 함께 공격하기")
    .formation("A", "dodgeball-8").formation("B", "dodgeball-8").ball([7.1, 2.5])
    .arrow("pass", "ball", [21.3, 5.3], -1.5).note("내야에서 외야로 넘겨 상대를 앞뒤로 흔들어요.").next()
    .arrow("shot", "ball", [14.6, 5.1]).note("상대가 등을 보인 틈에 외야에서 공격!").done() },
  { name: "표현 활동 대형 바꾸기", court: "floor", build: dance },
];
