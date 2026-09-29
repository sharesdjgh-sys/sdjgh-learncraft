import { blankAiFigure, type AiFigureDoc, type AiFigureKind } from "./model";

/* 인공지능 기초 교과서 단원에서 자주 쓰는 그림을 바로 불러오는 수업 예시입니다. */

type Example = { name: string; kind: AiFigureKind; build: () => AiFigureDoc };

function example(kind: AiFigureKind, title: string, change: (doc: AiFigureDoc) => void): () => AiFigureDoc {
  return () => {
    const doc = blankAiFigure(kind);
    doc.title = title;
    change(doc);
    return doc;
  };
}

const searchTree = [
  "A",
  "  B",
  "    D",
  "    E",
  "      H",
  "  C",
  "    F",
  "    G *",
  "      I",
].join("\n");

export const aiFigureExamples: Example[] = [
  { name: "기본 다층 신경망 (3-4-2)", kind: "network", build: example("network", "다층 신경망의 구조", () => {}) },
  { name: "XOR 문제를 푸는 신경망", kind: "network", build: example("network", "XOR 문제를 푸는 신경망", (doc) => {
    doc.network = { ...doc.network, layers: [2, 2, 1], hiddenSymbols: true, bias: true };
  }) },
  { name: "붓꽃 품종 분류 신경망", kind: "network", build: example("network", "붓꽃 품종 분류 신경망", (doc) => {
    doc.network = { ...doc.network, layers: [4, 5, 5, 3], inputNames: "꽃받침 길이, 꽃받침 너비, 꽃잎 길이, 꽃잎 너비", outputNames: "세토사, 버시컬러, 버지니카" };
  }) },
  { name: "기호로 나타낸 퍼셉트론", kind: "perceptron", build: example("perceptron", "퍼셉트론의 구조", () => {}) },
  { name: "AND 게이트 퍼셉트론", kind: "perceptron", build: example("perceptron", "AND 게이트 퍼셉트론", (doc) => {
    doc.perceptron = {
      ...doc.perceptron,
      inputs: [{ name: "x₁", value: "1", weight: "0.5" }, { name: "x₂", value: "1", weight: "0.5" }],
      bias: "-0.7",
      activation: "step",
    };
  }) },
  { name: "시그모이드 뉴런 계산", kind: "perceptron", build: example("perceptron", "시그모이드 뉴런의 출력", (doc) => {
    doc.perceptron = {
      ...doc.perceptron,
      inputs: [{ name: "x₁", value: "2", weight: "0.4" }, { name: "x₂", value: "1", weight: "-0.3" }, { name: "x₃", value: "3", weight: "0.2" }],
      bias: "-0.5",
      activation: "sigmoid",
    };
  }) },
  { name: "야외 활동 결정 트리", kind: "tree", build: example("tree", "야외 활동 결정 트리", () => {}) },
  { name: "동물 분류 결정 트리", kind: "tree", build: example("tree", "동물 분류 결정 트리", (doc) => {
    doc.tree.outline = [
      "날개가 있는가?",
      "  [예] 날 수 있는가?",
      "    [예] 독수리",
      "    [아니요] 펭귄",
      "  [아니요] 물속에 사는가?",
      "    [예] 돌고래",
      "    [아니요] 다리가 네 개인가?",
      "      [예] 호랑이",
      "      [아니요] 뱀",
    ].join("\n");
  }) },
  { name: "너비 우선 탐색 순서", kind: "tree", build: example("tree", "너비 우선 탐색", (doc) => {
    doc.tree = { ...doc.tree, outline: searchTree, shape: "circle", order: "bfs", arrows: true };
  }) },
  { name: "깊이 우선 탐색 순서", kind: "tree", build: example("tree", "깊이 우선 탐색", (doc) => {
    doc.tree = { ...doc.tree, outline: searchTree, shape: "circle", order: "dfs", arrows: true };
  }) },
  { name: "k-최근접 이웃 분류", kind: "scatter", build: example("scatter", "k-최근접 이웃 분류", () => {}) },
  { name: "선형 회귀 (공부 시간과 점수)", kind: "scatter", build: example("scatter", "공부 시간과 시험 점수", (doc) => {
    doc.scatter = {
      ...doc.scatter,
      points: ["1, 52", "2, 55", "2.5, 61", "3, 60", "4, 68", "4.5, 71", "5, 70", "6, 78", "7, 83", "8, 88"].join("\n"),
      xLabel: "공부 시간(시간)", yLabel: "점수(점)", overlay: "regression", equation: true, residuals: true,
    };
  }) },
  { name: "k-평균 군집 (3개)", kind: "scatter", build: example("scatter", "k-평균 군집", (doc) => {
    doc.scatter = {
      ...doc.scatter,
      points: [
        "1.2, 1.5", "1.8, 2.4", "2.5, 1.2", "1.5, 3", "2.8, 2.2", "2.1, 1.8",
        "6.5, 2", "7.2, 1.4", "7.8, 2.6", "6.8, 3", "8.2, 1.8", "7.4, 2.3",
        "4.2, 7.5", "4.8, 8.4", "5.6, 7.2", "3.8, 8.1", "5.2, 6.6", "4.6, 7.8",
      ].join("\n"),
      xLabel: "x₁", yLabel: "x₂", overlay: "kmeans", clusters: 3, iterations: 3,
    };
  }) },
  { name: "스팸 메일 분류 결과", kind: "confusion", build: example("confusion", "스팸 메일 분류의 혼동 행렬", () => {}) },
  { name: "질병 진단 모델 평가", kind: "confusion", build: example("confusion", "질병 진단 모델의 혼동 행렬", (doc) => {
    doc.confusion = { ...doc.confusion, positive: "질병 있음", negative: "질병 없음", tp: 18, fn: 7, fp: 12, tn: 163 };
  }) },
  { name: "계단·시그모이드·ReLU 비교", kind: "activation", build: example("activation", "대표적인 활성화 함수", () => {}) },
  { name: "시그모이드와 tanh 겹쳐 보기", kind: "activation", build: example("activation", "시그모이드와 tanh", (doc) => {
    doc.activation = { ...doc.activation, functions: ["sigmoid", "tanh"], layout: "overlay", range: 6 };
  }) },
];
