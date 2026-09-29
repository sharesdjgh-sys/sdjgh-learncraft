import assert from "node:assert/strict";
import { aiFigureExamples } from "../src/lib/ai-figure/examples";
import { buildImagePrompt, describeFigure, MAX_IMAGE_REQUEST } from "../src/lib/ai-figure/image-prompt";
import {
  blankAiFigure, confusionMetrics, figureKindInfo, flattenTree, layoutTree, linearRegression, nearestNeighbors, parseAiFigureDoc, parseOutline, parsePoints, parseQuery,
  perceptronResult, visitOrder,
} from "../src/lib/ai-figure/model";
import {
  classificationDatasets, clusterDatasets, gradientStep, inertia, initKMeans, kMeansStep, knnPredict, leastSquares, leaveOneOutAccuracy,
  meanSquaredError, regressionDatasets, rSquared, runKMeans, type DataPoint,
} from "../src/lib/ai-lab/ml";
import { buildNnDataset, createNetwork, evaluate, nnDatasets, trainEpoch, type FeatureKind } from "../src/lib/ai-lab/nn";
import { axisTicks, dataRange, decimalsFor, fromUnit, niceRange, realLine, realMeanSquaredError, toUnit, toUnitPoints } from "../src/lib/ai-lab/axis";
import { seededRandom } from "../src/lib/ai-lab/random";
import { bestAction, createQ, defaultParams, defaultRewards, greedyPath, MAX_STEPS, move, runEpisode, shortestSteps, train as trainRl, worldExamples } from "../src/lib/ai-lab/rl";
import { applyPastedRows, parseLabel, parseNumber, parsePastedTable, toCsv, toTsv } from "../src/lib/ai-lab/table";
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

/* 데이터 표: 실제 값에 맞춘 축, 그래프 좌표로 학습해도 실제 단위의 결과가 같아야 합니다. */
assert.deepEqual(niceRange([152, 188]), { lo: 150, hi: 190, step: 10 }, "키 축");
assert.deepEqual(niceRange([40, 100]), { lo: 0, hi: 100, step: 20 }, "점수 축은 0부터");
assert.deepEqual(niceRange([0.8, 8.9]), { lo: 0, hi: 10, step: 2 }, "예시 자료 축");
assert.deepEqual(niceRange([-3, 7]).lo < -3 && niceRange([-3, 7]).hi >= 7, true, "음수 축");
assert.deepEqual(niceRange([]), { lo: 0, hi: 10, step: 2 }, "빈 자료");
assert.ok(niceRange([5, 5]).lo < 5 && niceRange([5, 5]).hi > 5, "값이 하나뿐이어도 범위");
assert.deepEqual(axisTicks(niceRange([1200, 5400])).map((tick) => tick.label).slice(0, 3), ["0", "1,000", "2,000"]);
assert.deepEqual(axisTicks({ lo: 0, hi: 1, step: 0.25 }).map((tick) => tick.label), ["0", "0.25", "0.5", "0.75", "1"]);
assert.equal(decimalsFor({ lo: 150, hi: 190, step: 10 }), 0);
const heights: DataPoint[] = [[150, 45], [158, 50], [163, 57], [171, 62], [176, 69], [184, 74]].map(([x, y]) => ({ x, y, label: 0 }));
const heightRange = dataRange(heights);
near(fromUnit(toUnit(163, heightRange.x), heightRange.x), 163, 1e-9, "좌표 왕복");
const heightUnit = toUnitPoints(heights, heightRange);
assert.ok(heightUnit.every((point) => point.x >= 0 && point.x <= 10 && point.y >= 0 && point.y <= 10), "그래프 좌표는 0~10");
const direct = leastSquares(heights)!;
const viaUnit = realLine(leastSquares(heightUnit)!, heightRange);
near(viaUnit.slope, direct.slope, 1e-9, "실제 단위 기울기"); near(viaUnit.intercept, direct.intercept, 1e-9, "실제 단위 절편");
near(realMeanSquaredError(meanSquaredError(heightUnit, leastSquares(heightUnit)!), heightRange), meanSquaredError(heights, direct), 1e-9, "실제 단위 평균제곱오차");
let unitLine = { slope: 0, intercept: 0 };
for (let step = 0; step < 6000; step += 1) unitLine = gradientStep(heightUnit, unitLine, 0.01);
near(realLine(unitLine, heightRange).slope, direct.slope, 0.02, "값이 커도 경사 하강법이 발산하지 않음");

assert.equal(parseNumber(" 1,234.5 "), 1234.5); assert.equal(parseNumber("１７０"), 170); assert.equal(parseNumber("abc"), null); assert.equal(parseNumber(""), null);
assert.equal(parseLabel("스팸 메일", ["정상 메일", "스팸 메일"]), 1); assert.equal(parseLabel("B", ["정상 메일", "스팸 메일"]), 1); assert.equal(parseLabel("1", ["가", "나"]), 0); assert.equal(parseLabel("사과", ["가", "나"]), null);
const pasted = parsePastedTable("키\t몸무게\n150\t45\n160\t52\n\n170\t61", [], false);
assert.equal(pasted.skippedHeader, true); assert.equal(pasted.rows.length, 3); assert.deepEqual(pasted.rows[2], { x: 170, y: 61, label: null });
const csv = parsePastedTable("3,4,스팸 메일\n1,2,정상 메일", ["정상 메일", "스팸 메일"], true);
assert.deepEqual(csv.rows.map((row) => row.label), [1, 0]);
assert.equal(parsePastedTable("1\t9999999", [], false).outOfRange, 1, "너무 큰 값은 건너뜀");
const base: DataPoint[] = [{ x: 1, y: 1, label: 0 }, { x: 2, y: 2, label: 0 }];
const merged = applyPastedRows(base, [{ x: 5, y: 6, label: null }, { x: 7, y: 8, label: null }], 1, null);
assert.deepEqual(merged.points.map((point) => [point.x, point.y]), [[1, 1], [5, 6], [7, 8]], "그 줄부터 덮어쓰고 이어 붙임");
assert.equal(merged.added, 1); assert.equal(merged.changed, 1);
assert.deepEqual(applyPastedRows(base, [{ x: 9, y: null, label: null }, { x: 8, y: null, label: null }], 0, "y").points.map((point) => point.y), [9, 8], "한 열만 붙이면 그 열만 채움");
assert.equal(toTsv(base, ["x", "y"], null), "x\ty\n1\t1\n2\t2");
assert.ok(toCsv(base, ["키", "무리"], ["A"]).startsWith("﻿키,무리"), "CSV는 한글이 깨지지 않게 BOM");

/* 강화학습(Q-러닝): 충분히 배우면 가장 짧은 길, 예시 설명에 적은 성질이 실제로 나와야 합니다. */
{
  const example = (id: string) => worldExamples.find((item) => item.id === id)!;
  const basic = example("basic").build();
  assert.equal(basic.cells.length, basic.cols * basic.rows);
  const firstMove = move(basic, basic.start, 3, defaultRewards);
  assert.equal(firstMove.nextState, basic.start, "바깥으로는 못 나가고 제자리");
  assert.equal(firstMove.reward, defaultRewards.step, "한 걸음 벌점");
  const q = createQ(basic);
  const random = seededRandom(1);
  const episode = runEpisode(basic, q, defaultRewards, defaultParams, random);
  assert.ok(episode.steps.length > 0 && episode.steps.length <= MAX_STEPS);
  assert.ok(q.some((values) => values.some((value) => value !== 0)), "한 에피소드로 Q값이 바뀜");
  assert.equal(bestAction([0, 2, 2, -1]), 1, "같으면 앞 순서");
  for (const id of ["basic", "cliff", "maze"]) {
    const world = example(id).build();
    const table = createQ(world);
    const { results } = trainRl(world, table, defaultRewards, defaultParams, 400, 1, true);
    const path = greedyPath(world, table, defaultRewards);
    assert.ok(path.reachedGoal && path.end === "goal", `${id}: 학습한 정책으로 보물 도착`);
    assert.equal(path.path.length - 1, shortestSteps(world), `${id}: 가장 짧은 길`);
    assert.ok(results.slice(-50).filter((item) => item.reachedGoal).length >= 45, `${id}: 마지막 50번 대부분 성공`);
    const average = (items: typeof results) => items.reduce((sum, item) => sum + item.totalReward, 0) / items.length;
    assert.ok(average(results.slice(-50)) > average(results.slice(0, 20)), `${id}: 처음보다 받는 보상이 커짐`);
  }
  const cliff = example("cliff").build();
  const cliffQ = createQ(cliff);
  trainRl(cliff, cliffQ, defaultRewards, defaultParams, 400, 1, true);
  assert.ok(greedyPath(cliff, cliffQ, defaultRewards).path.every((state) => cliff.cells[state] !== "trap"), "절벽 걷기: 절벽에 떨어지지 않는 길");
  const choice = example("choice");
  assert.deepEqual(choice.params, { epsilon: 0.5, gamma: 0.9 });
  const choose = (params: Partial<typeof defaultParams>) => [1, 2, 3, 4, 5, 6].map((seed) => {
    const world = choice.build(); const table = createQ(world);
    trainRl(world, table, defaultRewards, { ...defaultParams, ...params }, 600, seed, false);
    return greedyPath(world, table, defaultRewards).end;
  });
  assert.ok(choose({ epsilon: 0.5, gamma: 0.9 }).every((end) => end === "goal"), "ε 0.5·γ 0.9: 먼 보물");
  assert.ok(choose({ epsilon: 0.5, gamma: 0.5 }).every((end) => end === "coin"), "γ 0.5: 가까운 동전");
  assert.ok(choose({ epsilon: 0.2, gamma: 0.9 }).filter((end) => end === "coin").length >= 4, "ε 0.2: 대부분 동전에 안주");
  const wander = (step: number) => [1, 2, 3, 4, 5].reduce((sum, seed) => {
    const world = example("maze").build(); const table = createQ(world);
    return sum + trainRl(world, table, { ...defaultRewards, step }, { ...defaultParams, epsilon: 0.02 }, 10, seed, false).results.reduce((total, item) => total + item.steps.length, 0);
  }, 0);
  assert.ok(wander(0) > wander(-1) * 1.3, "미로: 걸음 벌점이 없으면 처음에 훨씬 오래 헤맴");
  for (const item of worldExamples) {
    const world = item.build();
    assert.ok(world.cells[world.start] === "empty", `${item.name}: 출발 칸은 빈 칸`);
    assert.ok(world.cells.some((cell) => cell === "goal"), `${item.name}: 보물 칸`);
    assert.ok(shortestSteps(world) !== null, `${item.name}: 보물까지 갈 수 있음`);
  }
}

/* AI 수업 그림: 트리 읽기·방문 순서, 퍼셉트론 계산, 혼동 행렬 지표, 예시 문서, GPT에 보낼 설명. */
{
  const roots = parseOutline(["A", "  B", "    D", "    E", "  C", "    F *", "    G"].join("\n"));
  assert.equal(roots.length, 1);
  assert.deepEqual(flattenTree(roots).map((node) => node.text), ["A", "B", "D", "E", "C", "F", "G"]);
  const name = (visits: Map<number, number>) => flattenTree(roots).filter((node) => visits.has(node.id)).sort((a, b) => visits.get(a.id)! - visits.get(b.id)!).map((node) => node.text).join("");
  assert.equal(name(visitOrder(roots, "bfs", true)), "ABCDEF", "너비 우선: 목표 F에서 멈춤");
  assert.equal(name(visitOrder(roots, "dfs", true)), "ABDECF", "깊이 우선: 목표 F에서 멈춤");
  assert.equal(name(visitOrder(roots, "bfs", false)), "ABCDEFG");
  const decision = parseOutline(["날씨?", "  [예] 실내", "  [아니요] 야외"].join("\n"));
  assert.deepEqual(decision[0].children.map((node) => node.edge), ["예", "아니요"], "가지 이름");
  const layout = layoutTree(decision, "box", 16);
  const [top, left, right] = layout.boxes.sort((a, b) => a.node.id - b.node.id);
  near(top.x, (left.x + right.x) / 2, 1e-9, "부모는 자식 가운데");
  assert.ok(left.x + left.w / 2 < right.x - right.w / 2, "형제 노드가 겹치지 않음");

  const and = aiFigureExamples.find((item) => item.name === "AND 게이트 퍼셉트론")!.build();
  const result = perceptronResult(and.perceptron)!;
  near(result.sum, 0.3, 1e-9, "AND 퍼셉트론 가중합"); assert.equal(result.output, 1, "1 AND 1 = 1");
  assert.equal(perceptronResult(blankAiFigure("perceptron").perceptron), null, "기호만 있으면 계산하지 않음");

  const metrics = confusionMetrics({ ...blankAiFigure("confusion").confusion, tp: 40, fn: 10, fp: 5, tn: 45 });
  near(metrics.accuracy!, 0.85, 1e-12, "정확도"); near(metrics.precision!, 40 / 45, 1e-12, "정밀도"); near(metrics.recall!, 0.8, 1e-12, "재현율");
  near(metrics.f1!, (2 * (40 / 45) * 0.8) / (40 / 45 + 0.8), 1e-12, "F1");
  assert.equal(confusionMetrics({ ...blankAiFigure("confusion").confusion, tp: 0, fn: 0, fp: 0, tn: 0 }).accuracy, null, "전체 0이면 계산 불가");

  const knnDoc = blankAiFigure("scatter").scatter;
  assert.equal(nearestNeighbors(parsePoints(knnDoc.points), parseQuery(knnDoc.query)!, 1).prediction, "강아지", "기본 k-NN 예시: k=1이면 강아지");
  assert.equal(nearestNeighbors(parsePoints(knnDoc.points), parseQuery(knnDoc.query)!, knnDoc.k).prediction, "고양이", "기본 k-NN 예시: k=3이면 고양이");
  const line = linearRegression(parsePoints("1, 3\n2, 5\n3, 7"))!;
  near(line.slope, 2, 1e-12, "회귀 기울기"); near(line.intercept, 1, 1e-12, "회귀 절편");

  for (const example of aiFigureExamples) {
    const doc = example.build();
    assert.ok(parseAiFigureDoc(JSON.parse(JSON.stringify(doc))), `${example.name}: 저장·불러오기 형식`);
    const prompt = buildImagePrompt({ mode: "figure", style: "textbook", request: "", doc });
    assert.ok(prompt.includes(figureKindInfo[doc.kind].name) && prompt.includes("Korean"), `${example.name}: 설명에 그림 종류와 한국어 규칙`);
  }
  const network = aiFigureExamples.find((item) => item.name === "붓꽃 품종 분류 신경망")!.build();
  const networkPrompt = describeFigure(network);
  assert.ok(networkPrompt.includes("input layer = 4 nodes") && networkPrompt.includes("output layer = 3 nodes") && networkPrompt.includes("\"세토사\""), "신경망 설명에 층·이름");
  const confusionPrompt = describeFigure(aiFigureExamples.find((item) => item.kind === "confusion")!.build());
  assert.ok(confusionPrompt.includes("TP (참 양성) = 40") && confusionPrompt.includes("정확도 85%"), "혼동 행렬 설명에 숫자·지표");
  const free = buildImagePrompt({ mode: "free", style: "lineart", request: "고양이 사진을 분류하는 신경망", doc: null });
  assert.ok(free.includes("고양이 사진을 분류하는 신경망") && free.includes("black-and-white") && !free.includes("attached"), "글로 만들기: 요청·느낌만");
  assert.ok(buildImagePrompt({ mode: "free", style: "textbook", request: "가".repeat(MAX_IMAGE_REQUEST + 50) }).includes("가".repeat(MAX_IMAGE_REQUEST)) &&
    !buildImagePrompt({ mode: "free", style: "textbook", request: "가".repeat(MAX_IMAGE_REQUEST + 50) }).includes("가".repeat(MAX_IMAGE_REQUEST + 1)), "요청 길이 제한");
}

console.log("AI 원리 체험 검증 완료: 회귀·경사 하강법·k-NN·k-평균·예시 자료·데이터 표(실제 값 축·붙여넣기)·탐색 4종·신경망·강화학습(Q-러닝·절벽·탐험과 할인율)·수업 그림(트리·퍼셉트론·혼동 행렬·GPT 설명)");
