import assert from "node:assert/strict";
import {
  classificationDatasets, clusterDatasets, gradientStep, inertia, initKMeans, kMeansStep, knnPredict, leastSquares, leaveOneOutAccuracy,
  meanSquaredError, regressionDatasets, rSquared, runKMeans, type DataPoint,
} from "../src/lib/ai-lab/ml";
import { buildNnDataset, createNetwork, evaluate, nnDatasets, trainEpoch, type FeatureKind } from "../src/lib/ai-lab/nn";
import { seededRandom } from "../src/lib/ai-lab/random";
import { algorithms, gridExamples, GRID_COLUMNS, GRID_ROWS, mazeGrid, neighbors, runSearch, toIndex, traceState } from "../src/lib/ai-lab/search";

const near = (actual: number, expected: number, tolerance: number, message: string) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} ≠ ${expected}±${tolerance}`);

/* 회귀: 정확한 직선 위의 점은 오차 0, 경사 하강법은 최소제곱 해로 다가갑니다. */
const exact: DataPoint[] = [1, 2, 3, 4].map((x) => ({ x, y: 2 * x + 1, label: 0 }));
const exactLine = leastSquares(exact)!;
near(exactLine.slope, 2, 1e-9, "기울기"); near(exactLine.intercept, 1, 1e-9, "절편");
near(meanSquaredError(exact, exactLine), 0, 1e-12, "오차 0"); near(rSquared(exact, exactLine), 1, 1e-12, "R²");
assert.equal(leastSquares([{ x: 1, y: 1, label: 0 }, { x: 1, y: 3, label: 0 }]), null, "x가 모두 같으면 직선 없음");
for (const dataset of regressionDatasets) {
  const points = dataset.build();
  const best = leastSquares(points)!;
  let line = { slope: 0, intercept: 0 };
  let previous = Infinity;
  for (let step = 0; step < 4000; step += 1) {
    line = gradientStep(points, line, 0.01);
    const error = meanSquaredError(points, line);
    assert.ok(error <= previous + 1e-9, `${dataset.name}: 손실이 커짐`);
    previous = error;
  }
  near(meanSquaredError(points, line), meanSquaredError(points, best), 0.02, `${dataset.name} 경사 하강법 수렴`);
  assert.ok(points.every((point) => point.x > 0 && point.x < 10 && point.y > 0 && point.y < 10), `${dataset.name} 범위`);
}
assert.ok(leastSquares(regressionDatasets.find((item) => item.id === "temperature")!.build())!.slope < 0, "기온과 난방비는 음의 상관");

/* 수업 예시 자료: 모두 그래프 안에 있고, 화면 설명(note)에 적은 성질이 실제로 나와야 합니다. */
const byId = <T extends { id: string }>(list: T[], id: string) => list.find((item) => item.id === id)!;
for (const dataset of [...regressionDatasets, ...classificationDatasets, ...clusterDatasets]) {
  const points = dataset.build();
  assert.ok(dataset.note.length > 10, `${dataset.name} 설명`);
  assert.ok(points.length >= 12 && points.every((point) => point.x > 0 && point.x < 10 && point.y > 0 && point.y < 10), `${dataset.name} 범위`);
  assert.deepEqual(dataset.build(), points, `${dataset.name} 매번 같은 자료`);
}
for (const dataset of classificationDatasets) {
  const labels = new Set(dataset.build().map((point) => point.label));
  assert.equal(labels.size, dataset.classes?.length ?? labels.size, `${dataset.name} 무리 이름 수`);
}
assert.ok(clusterDatasets.every((dataset) => dataset.k && dataset.k >= 2 && dataset.k <= 6), "군집 자료마다 알맞은 k");
const r2 = (id: string) => { const points = byId(regressionDatasets, id).build(); return rSquared(points, leastSquares(points)!); };
assert.ok(r2("ads") > 0.95, "광고비: 강한 상관");
assert.ok(r2("none") < 0.05, "신발 크기: 상관 없음");
assert.ok(r2("curve") < 0.05, "곡선: 직선이 거의 수평");
assert.ok(r2("braking") > 0.9, "제동 거리: R²는 높지만 곡선");
assert.ok(leastSquares(byId(regressionDatasets, "phone").build())!.slope < 0, "스마트폰: 음의 상관");
const outlierPoints = byId(regressionDatasets, "outlier").build();
assert.ok(leastSquares(outlierPoints.slice(0, -1))!.slope - leastSquares(outlierPoints)!.slope > 0.4, "이상치 하나가 기울기를 크게 바꿈");
const checker = byId(classificationDatasets, "checker").build();
assert.ok(leaveOneOutAccuracy(checker, 15, "euclidean")! > 0.9 && leaveOneOutAccuracy(checker, 21, "euclidean")! < 0.5, "체크무늬: k가 19 이상이면 무너짐");
const imbalance = byId(classificationDatasets, "imbalance").build();
const rare = imbalance.filter((point) => point.label === 1);
assert.ok(leaveOneOutAccuracy(imbalance, 15, "euclidean")! > 0.8, "불균형: 정확도는 높게 나옴");
assert.equal(rare.filter((point) => knnPredict(imbalance, point, 15, "euclidean", point).label === 1).length, 0, "불균형: 큰 k는 드문 경우를 못 맞힘");
for (const id of ["elongated", "moons"]) {
  const points = byId(clusterDatasets, id).build();
  const [a, b] = runKMeans(points, initKMeans(points, 2, 1)).centroids;
  assert.ok(Math.abs(a.x - b.x) > 2 && Math.abs(a.y - b.y) < 1.5, `${id}: k-평균이 눈에 보이는 무리 대신 좌우로 자름`);
}

/* k-NN: 가까운 이웃의 다수결, 동점이면 가장 가까운 쪽. */
const tiny: DataPoint[] = [{ x: 1, y: 1, label: 0 }, { x: 1.5, y: 1, label: 0 }, { x: 5, y: 5, label: 1 }, { x: 5.2, y: 5, label: 1 }, { x: 4.8, y: 5.3, label: 1 }];
assert.equal(knnPredict(tiny, { x: 1.2, y: 1.1 }, 3, "euclidean").label, 0);
assert.equal(knnPredict(tiny, { x: 4, y: 4 }, 3, "euclidean").label, 1);
assert.equal(knnPredict(tiny, { x: 2, y: 2 }, 2, "manhattan").label, 0);
const easy = classificationDatasets[0].build();
assert.ok(leaveOneOutAccuracy(easy, 5, "euclidean")! > 0.95, "쉽게 나뉘는 두 무리");
assert.ok(leaveOneOutAccuracy(classificationDatasets.find((item) => item.id === "ring")!.build(), 5, "euclidean")! > 0.9, "원형 자료도 k-NN은 잘 나눔");

/* k-평균: 배정과 중심 이동을 번갈아 하고, 수렴하면 무리 안 거리 합이 줄어듭니다. */
for (const dataset of clusterDatasets) {
  const points = dataset.build();
  const start = initKMeans(points, 3, 1);
  assert.equal(start.centroids.length, 3);
  const first = kMeansStep(points, start);
  assert.equal(first.phase, "update");
  assert.ok(first.assignment.every((value) => value >= 0 && value < 3));
  const done = runKMeans(points, start);
  assert.ok(done.converged, `${dataset.name} 수렴`);
  assert.ok(inertia(points, done) <= inertia(points, kMeansStep(points, first)) + 1e-9, `${dataset.name} 촘촘해짐`);
}
assert.deepEqual(initKMeans(clusterDatasets[0].build(), 3, 7), initKMeans(clusterDatasets[0].build(), 3, 7), "같은 씨앗이면 같은 시작");

/* 탐색: BFS·A*는 가장 짧은 길, 탐욕 탐색은 U자 함정에서 돌아가고, 벽으로 막히면 못 찾습니다. */
for (const example of gridExamples) {
  const grid = example.build(3);
  const traces = Object.fromEntries(algorithms.map((algorithm) => [algorithm, runSearch(grid, algorithm)]));
  for (const algorithm of algorithms) {
    const trace = traces[algorithm];
    assert.ok(trace.found, `${example.name} ${algorithm} 찾음`);
    assert.equal(trace.path[0], grid.start);
    assert.equal(trace.path.at(-1), grid.goal);
    trace.path.slice(1).forEach((node, index) => assert.ok(neighbors(grid, trace.path[index]).includes(node), `${example.name} ${algorithm} 이어진 길`));
    assert.ok(trace.path.every((node) => !grid.walls[node]), "벽을 지나지 않음");
  }
  assert.equal(traces.astar.path.length, traces.bfs.path.length, `${example.name} A* 최단`);
  assert.ok(traces.astar.steps.length <= traces.bfs.steps.length, `${example.name} A*가 BFS보다 적게 펼침`);
  assert.ok(traces.dfs.path.length >= traces.bfs.path.length);
}
// 갈림길 미로: 탐욕 탐색은 최단 경로를 보장하지 않습니다. U자 벽: 휴리스틱을 쓰면 훨씬 적게 펼칩니다.
const branches = gridExamples.find((example) => example.id === "branches")!.build(0);
assert.equal(runSearch(branches, "greedy").path.length - runSearch(branches, "bfs").path.length, 68, "갈림길 미로: 탐욕 탐색이 68칸 먼 길");
const wall = gridExamples.find((example) => example.id === "trap")!.build(0);
assert.ok(runSearch(wall, "astar").steps.length * 2 < runSearch(wall, "bfs").steps.length, "U자 벽: A*는 BFS의 절반도 안 펼침");
const blocked = gridExamples[0].build(0);
for (let row = 0; row < GRID_ROWS; row += 1) blocked.walls[toIndex(12, row)] = true;
assert.equal(runSearch(blocked, "bfs").found, false, "막히면 못 찾음");
const empty = gridExamples[0].build(0);
const bfsEmpty = runSearch(empty, "bfs");
assert.equal(bfsEmpty.path.length - 1, 18, "빈 격자 최단 거리 18칸");
const half = traceState(bfsEmpty, 10);
assert.equal(half.visited.length, 10);
assert.equal(half.done, false);
assert.ok([...half.frontier].every((node) => !half.visited.includes(node)), "후보와 방문이 겹치지 않음");
assert.equal(traceState(bfsEmpty, bfsEmpty.steps.length).path.length, 19);
const maze = mazeGrid(5);
assert.equal(maze.walls.length, GRID_COLUMNS * GRID_ROWS);
assert.ok(runSearch(maze, "bfs").found, "미로는 풀 수 있음");
assert.deepEqual(mazeGrid(5), mazeGrid(5), "같은 씨앗이면 같은 미로");

/* 신경망: 은닉층이 있으면 XOR을 풀고, 은닉층 없는 퍼셉트론은 풀지 못합니다. */
function train(datasetId: typeof nnDatasets[number]["id"], hidden: number[], features: FeatureKind[], epochs: number, rate: number) {
  const samples = buildNnDataset(datasetId, 0.02, 3);
  const network = createNetwork([features.length, ...hidden, 1], "tanh", 2);
  const random = seededRandom(4);
  const before = evaluate(network, features, samples);
  for (let epoch = 0; epoch < epochs; epoch += 1) trainEpoch(network, features, samples, rate, random);
  return { before, after: evaluate(network, features, samples) };
}
const xorDeep = train("xor", [6, 4], ["x1", "x2"], 300, 0.1);
assert.ok(xorDeep.after.accuracy > 0.95, `XOR 은닉층 정확도 ${xorDeep.after.accuracy}`);
assert.ok(xorDeep.after.loss < xorDeep.before.loss, "손실 감소");
const xorFlat = train("xor", [], ["x1", "x2"], 300, 0.1);
assert.ok(xorFlat.after.accuracy < 0.75, `퍼셉트론은 XOR을 못 풂 ${xorFlat.after.accuracy}`);
const circleFeatures = train("circle", [], ["x1sq", "x2sq"], 200, 0.3);
assert.ok(circleFeatures.after.accuracy > 0.95, `원: x₁²·x₂² 특성이면 은닉층 없이도 풀림 ${circleFeatures.after.accuracy}`);
assert.ok(train("blobs", [], ["x1", "x2"], 100, 0.1).after.accuracy > 0.95, "두 무리는 퍼셉트론으로 풀림");
for (const dataset of nnDatasets) {
  const samples = buildNnDataset(dataset.id, 0.05);
  assert.equal(samples.length, 200);
  assert.equal(samples.filter((sample) => sample.label === 1).length, 100, `${dataset.name} 두 무리 반반`);
  assert.ok(samples.every((sample) => Math.abs(sample.x) < 1 && Math.abs(sample.y) < 1), `${dataset.name} 범위`);
}

console.log("AI 원리 체험 검증 완료: 회귀·경사 하강법·k-NN·k-평균·탐색 4종(최단 경로·함정·막힘)·신경망(XOR·퍼셉트론 한계·특성)");
