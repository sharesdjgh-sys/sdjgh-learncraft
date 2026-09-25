import { seededRandom } from "./random";

/*
 * 강화학습 체험: 격자 세상에서 로봇(에이전트)이 보상을 받으며 길을 스스로 익히는 Q-러닝입니다.
 * 상태 = 로봇이 있는 칸, 행동 = 위·오른쪽·아래·왼쪽, 보상 = 한 걸음마다 작은 벌점, 함정은 큰 벌점, 도착은 큰 상.
 * Q(s, a) ← Q(s, a) + α · (r + γ · max Q(s′, ·) − Q(s, a))
 */

export type CellType = "empty" | "wall" | "trap" | "coin" | "goal";
export type World = { cols: number; rows: number; cells: CellType[]; start: number };
export type Rewards = { step: number; trap: number; coin: number; goal: number };
export type LearnParams = { alpha: number; gamma: number; epsilon: number };

export const actions = [
  { name: "위", arrow: "↑", dx: 0, dy: -1 },
  { name: "오른쪽", arrow: "→", dx: 1, dy: 0 },
  { name: "아래", arrow: "↓", dx: 0, dy: 1 },
  { name: "왼쪽", arrow: "←", dx: -1, dy: 0 },
] as const;

export const defaultRewards: Rewards = { step: -1, trap: -20, coin: 5, goal: 20 };
export const defaultParams: LearnParams = { alpha: 0.5, gamma: 0.9, epsilon: 0.2 };
export const MAX_STEPS = 200;

export const cellIndex = (world: Pick<World, "cols">, column: number, row: number) => row * world.cols + column;
export const cellPosition = (world: Pick<World, "cols">, index: number) => ({ column: index % world.cols, row: Math.floor(index / world.cols) });
/** 함정·동전·보물 칸에 닿으면 에피소드가 끝납니다. */
export const isTerminal = (world: World, state: number) => world.cells[state] === "trap" || world.cells[state] === "coin" || world.cells[state] === "goal";

export type QTable = number[][];
export const createQ = (world: World): QTable => world.cells.map(() => [0, 0, 0, 0]);

/** 한 걸음: 벽이나 바깥으로 가려 하면 제자리에 머물고 한 걸음 벌점만 받습니다. */
export function move(world: World, state: number, action: number, rewards: Rewards) {
  const { column, row } = cellPosition(world, state);
  const next = { column: column + actions[action].dx, row: row + actions[action].dy };
  const blocked = next.column < 0 || next.row < 0 || next.column >= world.cols || next.row >= world.rows || world.cells[cellIndex(world, next.column, next.row)] === "wall";
  const nextState = blocked ? state : cellIndex(world, next.column, next.row);
  const type = world.cells[nextState];
  const reward = rewards.step + (type === "trap" ? rewards.trap : type === "coin" ? rewards.coin : type === "goal" ? rewards.goal : 0);
  return { nextState, reward, done: isTerminal(world, nextState), blocked };
}

/** Q값이 가장 큰 행동(같으면 앞 순서). */
export function bestAction(values: number[]) {
  let best = 0;
  for (let index = 1; index < values.length; index += 1) if (values[index] > values[best] + 1e-12) best = index;
  return best;
}

/** ε-탐욕: ε의 확률로 아무 행동이나(탐험), 나머지는 지금까지 가장 좋았던 행동(이용). 같은 값이면 무작위로 고릅니다. */
export function chooseAction(q: QTable, state: number, epsilon: number, random: () => number) {
  if (random() < epsilon) return Math.floor(random() * actions.length);
  const values = q[state];
  const max = Math.max(...values);
  const ties = values.map((value, index) => ({ value, index })).filter((item) => Math.abs(item.value - max) < 1e-9).map((item) => item.index);
  return ties[Math.floor(random() * ties.length)];
}

/** before·after: 이 걸음에서 고친 Q(s, a) 값, target: r + γ·max Q(s′, ·), future: max Q(s′, ·). */
export type EpisodeStep = { state: number; action: number; reward: number; nextState: number; explored: boolean; before: number; after: number; target: number; future: number };
export type Episode = { steps: EpisodeStep[]; totalReward: number; reachedGoal: boolean; fellInTrap: boolean; end: CellType };

/** 한 에피소드: 출발 칸에서 도착·함정에 닿거나 최대 걸음 수가 될 때까지 움직이며 q를 직접 고칩니다. */
export function runEpisode(world: World, q: QTable, rewards: Rewards, params: LearnParams, random: () => number): Episode {
  const steps: EpisodeStep[] = [];
  let state = world.start;
  let totalReward = 0;
  for (let count = 0; count < MAX_STEPS; count += 1) {
    const greedy = bestAction(q[state]);
    const action = chooseAction(q, state, params.epsilon, random);
    const { nextState, reward, done } = move(world, state, action, rewards);
    const future = done ? 0 : Math.max(...q[nextState]);
    const before = q[state][action];
    const target = reward + params.gamma * future;
    q[state][action] = before + params.alpha * (target - before);
    steps.push({ state, action, reward, nextState, explored: action !== greedy, before, after: q[state][action], target, future });
    totalReward += reward;
    state = nextState;
    if (done) break;
  }
  const last = world.cells[state];
  return { steps, totalReward, reachedGoal: last === "goal" || last === "coin", fellInTrap: last === "trap", end: last };
}

/** 학습한 정책(가장 좋은 행동만)으로 출발부터 따라가 본 길. 같은 칸을 다시 밟으면 멈춥니다(아직 다 배우지 못함). */
export function greedyPath(world: World, q: QTable, rewards: Rewards) {
  const path = [world.start];
  const seen = new Set(path);
  let state = world.start;
  let total = 0;
  for (let count = 0; count < MAX_STEPS; count += 1) {
    const { nextState, reward, done } = move(world, state, bestAction(q[state]), rewards);
    total += reward;
    path.push(nextState);
    if (done) return { path, reachedGoal: world.cells[nextState] !== "trap", end: world.cells[nextState], total, looped: false };
    if (seen.has(nextState)) return { path, reachedGoal: false, end: world.cells[nextState], total, looped: true };
    seen.add(nextState);
    state = nextState;
  }
  return { path, reachedGoal: false, end: world.cells[state], total, looped: true };
}

/** 도착까지 가장 짧은 걸음 수(벽을 피한 너비 우선 탐색, 함정은 지나갈 수 없음). 없으면 null. */
export function shortestSteps(world: World) {
  const distance = new Map<number, number>([[world.start, 0]]);
  const queue = [world.start];
  while (queue.length) {
    const state = queue.shift()!;
    if (world.cells[state] === "goal") return distance.get(state)!;
    if (world.cells[state] === "trap" || world.cells[state] === "coin") continue;
    for (let action = 0; action < actions.length; action += 1) {
      const { nextState } = move(world, state, action, defaultRewards);
      if (!distance.has(nextState)) { distance.set(nextState, distance.get(state)! + 1); queue.push(nextState); }
    }
  }
  return null;
}

/** 여러 에피소드를 한꺼번에 학습합니다(ε을 조금씩 줄이는 선택 포함). */
export function train(world: World, q: QTable, rewards: Rewards, params: LearnParams, episodes: number, seed: number, decay = false) {
  const random = seededRandom(seed);
  const results: Episode[] = [];
  let epsilon = params.epsilon;
  for (let index = 0; index < episodes; index += 1) {
    results.push(runEpisode(world, q, rewards, { ...params, epsilon }, random));
    if (decay) epsilon = Math.max(0.01, epsilon * 0.97);
  }
  return { results, epsilon };
}

/* ───── 세상 예시 ───── */

function world(cols: number, rows: number, layout: Partial<Record<CellType, [number, number][]>>, start: [number, number]): World {
  const cells: CellType[] = Array.from({ length: cols * rows }, () => "empty");
  for (const [type, positions] of Object.entries(layout) as [CellType, [number, number][]][]) {
    for (const [column, row] of positions) cells[row * cols + column] = type;
  }
  return { cols, rows, cells, start: start[1] * cols + start[0] };
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, index) => from + index);

/** params: 이 예시를 불러올 때 함께 맞출 학습 설정. */
export const worldExamples: { id: string; name: string; note: string; params?: Partial<LearnParams>; build: () => World }[] = [
  {
    id: "basic", name: "보물 찾기 (기본)", note: "함정을 피해 보물까지 가는 가장 짧은 길을 익혀요. 처음에는 헤매다가 에피소드가 쌓일수록 화살표가 보물 쪽을 가리켜요.",
    build: () => world(7, 5, { wall: [[2, 1], [2, 2], [4, 2], [4, 3]], trap: [[3, 4], [5, 1]], goal: [[6, 0]] }, [0, 4]),
  },
  {
    id: "cliff", name: "절벽 걷기", note: "강화학습 교과서에 나오는 유명한 예시예요. 아래쪽 절벽에 떨어지면 큰 벌점! Q-러닝은 절벽 바로 옆의 가장 짧은 길을 배워요.",
    build: () => world(10, 4, { trap: range(1, 8).map((column) => [column, 3] as [number, number]), goal: [[9, 3]] }, [0, 3]),
  },
  {
    id: "choice", name: "가까운 동전 vs 먼 보물 (탐험·할인율)", params: { epsilon: 0.5, gamma: 0.9 },
    note: "왼쪽 동전(+5)은 가깝고 오른쪽 보물(+20)은 멀어요. ε 0.5·γ 0.9로 학습하면 보물을 골라요. γ를 0.5로 낮추면 가까운 동전을, ε를 0.2로 줄이면 보물을 찾기 전에 동전에 안주해요.",
    build: () => world(9, 3, { coin: [[0, 1]], goal: [[8, 1]] }, [3, 1]),
  },
  {
    id: "maze", name: "작은 미로", note: "막다른 길이 많은 미로예요. 한 걸음마다 받는 벌점(−1) 때문에 이미 가 본 길은 점수가 깎여, 로봇이 안 가 본 길을 먼저 시도해요. 걸음 벌점을 0으로 바꾸면 처음에 훨씬 오래 헤매요.",
    build: () => world(8, 6, { wall: [[1, 1], [1, 2], [1, 3], [1, 4], [3, 0], [3, 1], [3, 2], [3, 4], [3, 5], [5, 1], [5, 2], [5, 3], [5, 4], [6, 1]], trap: [[7, 1]], goal: [[7, 0]] }, [0, 0]),
  },
  { id: "empty", name: "빈 방", note: "벽도 함정도 없는 방이에요. 직접 벽·함정·보물을 그려 나만의 세상을 만들어 보세요.", build: () => world(7, 5, { goal: [[6, 2]] }, [0, 2]) },
];
