import { seededRandom } from "./random";

/* 탐색 알고리즘: 격자 위에서 너비 우선·깊이 우선·탐욕·A* 탐색이 칸을 펼치는 순서를 기록합니다.
   이웃은 위 → 오른쪽 → 아래 → 왼쪽 순서로 봅니다(한 칸 이동 비용은 모두 1). */

export const GRID_COLUMNS = 25;
export const GRID_ROWS = 15;
export type Grid = { walls: boolean[]; start: number; goal: number };

export const algorithms = ["bfs", "dfs", "greedy", "astar"] as const;
export type Algorithm = typeof algorithms[number];
export const algorithmInfo: Record<Algorithm, { name: string; short: string; help: string }> = {
  bfs: { name: "너비 우선 탐색 (BFS)", short: "BFS", help: "출발점에서 가까운 칸부터 한 겹씩 넓혀 가요(큐 사용). 칸마다 비용이 같으면 가장 짧은 길을 찾아요." },
  dfs: { name: "깊이 우선 탐색 (DFS)", short: "DFS", help: "한 방향으로 끝까지 파고들다가 막히면 되돌아와요(스택 사용). 길을 찾아도 가장 짧다는 보장은 없어요." },
  greedy: { name: "탐욕 탐색 (최고 우선)", short: "탐욕", help: "도착점까지 남은 거리(휴리스틱)만 보고 가장 가까워 보이는 칸을 먼저 펼쳐요. 빠르지만 돌아가는 길을 고를 수 있어요." },
  astar: { name: "A* 탐색", short: "A*", help: "지금까지 온 거리 g와 남은 거리 추정 h를 더한 f = g + h가 가장 작은 칸부터 펼쳐요. 가장 짧은 길을 적은 방문으로 찾아요." },
};

export const toIndex = (column: number, row: number) => row * GRID_COLUMNS + column;
export const toCell = (index: number) => ({ column: index % GRID_COLUMNS, row: Math.floor(index / GRID_COLUMNS) });

export function manhattan(a: number, b: number) {
  const [p, q] = [toCell(a), toCell(b)];
  return Math.abs(p.column - q.column) + Math.abs(p.row - q.row);
}

export function neighbors(grid: Grid, index: number) {
  const { column, row } = toCell(index);
  const candidates: [number, number][] = [[column, row - 1], [column + 1, row], [column, row + 1], [column - 1, row]];
  return candidates
    .filter(([c, r]) => c >= 0 && r >= 0 && c < GRID_COLUMNS && r < GRID_ROWS)
    .map(([c, r]) => toIndex(c, r))
    .filter((next) => !grid.walls[next]);
}

export type SearchStep = { node: number; added: number[]; addedG: number[]; g: number };
export type SearchTrace = { algorithm: Algorithm; steps: SearchStep[]; path: number[]; found: boolean };

function buildPath(parent: Map<number, number>, goal: number) {
  const path = [goal];
  while (parent.has(path[0])) path.unshift(parent.get(path[0])!);
  return path;
}

/** 알고리즘이 칸을 하나씩 펼칠 때마다 무엇을 펼쳤고 어떤 칸을 새로 후보(프런티어)에 넣었는지 기록합니다. */
export function runSearch(grid: Grid, algorithm: Algorithm, limit = GRID_COLUMNS * GRID_ROWS * 4): SearchTrace {
  const steps: SearchStep[] = [];
  const parent = new Map<number, number>();
  const g = new Map<number, number>([[grid.start, 0]]);
  const closed = new Set<number>();
  // 우선순위 탐색은 같은 값이면 먼저 넣은 칸을 먼저 꺼내도록 넣은 순서(order)를 함께 둡니다.
  let frontier: { node: number; order: number }[] = [{ node: grid.start, order: 0 }];
  let order = 1;
  const inFrontier = new Set<number>([grid.start]);
  const priority = (node: number) => algorithm === "greedy" ? manhattan(node, grid.goal) : (g.get(node) ?? 0) + manhattan(node, grid.goal);

  while (frontier.length && steps.length < limit) {
    let pickIndex = 0;
    if (algorithm === "dfs") pickIndex = frontier.length - 1;
    else if (algorithm === "greedy" || algorithm === "astar") {
      // (우선순위, 남은 거리, 넣은 순서)가 작은 칸부터 꺼냅니다. A*는 같은 f면 도착점에 가까운 칸을 먼저 봅니다.
      const key = (entry: { node: number; order: number }) => [priority(entry.node), manhattan(entry.node, grid.goal), entry.order];
      frontier.forEach((entry, index) => {
        const [a, b] = [key(entry), key(frontier[pickIndex])];
        const smaller = a[0] !== b[0] ? a[0] < b[0] : a[1] !== b[1] ? a[1] < b[1] : a[2] < b[2];
        if (smaller) pickIndex = index;
      });
    }
    const { node } = frontier[pickIndex];
    frontier = frontier.filter((_, index) => index !== pickIndex);
    inFrontier.delete(node);
    if (closed.has(node)) continue;
    closed.add(node);
    const added: number[] = [];
    const addedG: number[] = [];
    if (node === grid.goal) {
      steps.push({ node, added, addedG, g: g.get(node) ?? 0 });
      return { algorithm, steps, path: buildPath(parent, grid.goal), found: true };
    }
    const nextNodes = neighbors(grid, node);
    // 스택은 나중에 넣은 칸을 먼저 꺼내므로, 위 → 오른쪽 → 아래 → 왼쪽 순서로 펼치려면 거꾸로 넣습니다.
    for (const next of algorithm === "dfs" ? [...nextNodes].reverse() : nextNodes) {
      if (closed.has(next)) continue;
      const cost = (g.get(node) ?? 0) + 1;
      if (algorithm === "bfs" || algorithm === "greedy") {
        if (inFrontier.has(next)) continue;
        parent.set(next, node);
        g.set(next, cost);
      } else if (algorithm === "dfs") {
        parent.set(next, node);
        g.set(next, cost);
      } else {
        if (inFrontier.has(next) && cost >= (g.get(next) ?? Infinity)) continue;
        parent.set(next, node);
        g.set(next, cost);
        if (inFrontier.has(next)) continue;
      }
      frontier.push({ node: next, order: order++ });
      inFrontier.add(next);
      added.push(next);
      addedG.push(cost);
    }
    steps.push({ node, added, addedG, g: g.get(node) ?? 0 });
  }
  return { algorithm, steps, path: [], found: false };
}

/**
 * t번째 단계까지 진행했을 때 펼친 칸(방문 순서), 후보 칸(넣은 순서대로), 후보마다 g값.
 * 깊이 우선 탐색은 같은 칸을 여러 번 넣을 수 있어 가장 나중에 넣은 것만 남깁니다.
 */
export function traceState(trace: SearchTrace, stepCount: number) {
  const visited: number[] = [];
  const visitedSet = new Set<number>();
  const pending = new Map<number, { order: number; g: number }>();
  let order = 0;
  const shown = trace.steps.slice(0, stepCount);
  for (const step of shown) {
    visited.push(step.node);
    visitedSet.add(step.node);
    pending.delete(step.node);
    step.added.forEach((node, index) => {
      if (trace.algorithm === "dfs") pending.delete(node);
      const known = pending.get(node);
      pending.set(node, { order: trace.algorithm === "astar" && known ? known.order : order++, g: step.addedG[index] });
    });
  }
  const frontierOrder = [...pending.entries()].filter(([node]) => !visitedSet.has(node)).sort((a, b) => a[1].order - b[1].order);
  const done = stepCount >= trace.steps.length;
  return {
    visited,
    frontier: new Set(frontierOrder.map(([node]) => node)),
    frontierOrder: frontierOrder.map(([node, info]) => ({ node, g: info.g })),
    current: shown.at(-1)?.node ?? null,
    done,
    path: done ? trace.path : [],
  };
}

/* ───── 격자 예시 ───── */

function emptyGrid(start: number, goal: number): Grid {
  return { walls: Array.from({ length: GRID_COLUMNS * GRID_ROWS }, () => false), start, goal };
}

function wallLine(grid: Grid, from: [number, number], to: [number, number]) {
  const [dc, dr] = [Math.sign(to[0] - from[0]), Math.sign(to[1] - from[1])];
  for (let [c, r] = from; ; c += dc, r += dr) {
    grid.walls[toIndex(c, r)] = true;
    if (c === to[0] && r === to[1]) break;
  }
}

/** 구멍 뚫린 막대 미로: 벽을 따라 칸을 파 들어가는 방식(되돌아가기)으로 만듭니다. */
export function mazeGrid(seed: number): Grid {
  const grid = emptyGrid(toIndex(1, 1), toIndex(GRID_COLUMNS - 2, GRID_ROWS - 2));
  grid.walls = grid.walls.map(() => true);
  const random = seededRandom(seed);
  const stack: [number, number][] = [[1, 1]];
  grid.walls[toIndex(1, 1)] = false;
  while (stack.length) {
    const [c, r] = stack[stack.length - 1];
    const options = ([[0, -2], [2, 0], [0, 2], [-2, 0]] as const)
      .map(([dc, dr]) => [c + dc, r + dr, c + dc / 2, r + dr / 2] as const)
      .filter(([nc, nr]) => nc > 0 && nr > 0 && nc < GRID_COLUMNS - 1 && nr < GRID_ROWS - 1 && grid.walls[toIndex(nc, nr)]);
    if (!options.length) { stack.pop(); continue; }
    const [nc, nr, wc, wr] = options[Math.floor(random() * options.length)];
    grid.walls[toIndex(wc, wr)] = false;
    grid.walls[toIndex(nc, nr)] = false;
    stack.push([nc, nr]);
  }
  // 막다른 길만 있으면 알고리즘 차이가 덜 보여서, 벽 몇 개를 더 뚫어 여러 갈래 길을 만듭니다.
  for (let count = 0; count < 18; count += 1) {
    const c = 1 + Math.floor(random() * (GRID_COLUMNS - 2));
    const r = 1 + Math.floor(random() * (GRID_ROWS - 2));
    if ((c + r) % 2 === 1) grid.walls[toIndex(c, r)] = false;
  }
  return grid;
}

export const gridExamples: { id: string; name: string; build: (seed: number) => Grid }[] = [
  { id: "empty", name: "빈 격자", build: () => emptyGrid(toIndex(3, 7), toIndex(21, 7)) },
  {
    id: "wall", name: "가운데 벽", build: () => {
      const grid = emptyGrid(toIndex(3, 7), toIndex(21, 7));
      wallLine(grid, [12, 1], [12, 13]);
      return grid;
    },
  },
  {
    id: "trap", name: "U자 벽 (빙 돌아가는 길)", build: () => {
      const grid = emptyGrid(toIndex(4, 7), toIndex(20, 7));
      wallLine(grid, [9, 2], [15, 2]);
      wallLine(grid, [15, 2], [15, 12]);
      wallLine(grid, [9, 12], [15, 12]);
      return grid;
    },
  },
  // 갈래 길이 여럿이라 남은 거리만 보는 탐욕 탐색이 최단보다 68칸 먼 길을 고르는 미로(씨앗 5)입니다.
  { id: "branches", name: "갈림길 미로 (탐욕 탐색이 먼 길로 가요)", build: () => mazeGrid(5) },
  { id: "maze", name: "새 미로 (누를 때마다 바뀜)", build: (seed) => mazeGrid(seed) },
];
