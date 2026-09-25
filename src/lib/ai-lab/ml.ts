import { gaussian, round, seededRandom } from "./random";

/* 지도·비지도학습 체험: 지도학습인 회귀(최소제곱·경사 하강법)·분류(k-최근접 이웃), 비지도학습인 군집(k-평균). 좌표는 0~10 범위입니다. */

export const PLOT_MIN = 0;
export const PLOT_MAX = 10;
export type DataPoint = { x: number; y: number; label: number };
export const classNames = ["A", "B", "C"] as const;
export const classColors = ["#1c7ed6", "#e8590c", "#2f9e44"] as const;
export const clusterColors = ["#1c7ed6", "#e8590c", "#2f9e44", "#7048e8", "#e64980", "#0c8599"] as const;

const clamp = (value: number) => Math.min(PLOT_MAX - 0.2, Math.max(PLOT_MIN + 0.2, value));

/* ───── 수업 예시 데이터 ───── */

/**
 * note: 이 자료로 무엇을 보여 줄 수 있는지(화면에 한 줄로 보여 줍니다).
 * classes: 분류 자료의 무리 이름(없으면 A·B·C). k: 군집 자료에 알맞은 무리 수.
 */
export type DatasetInfo = { id: string; name: string; xLabel: string; yLabel: string; note: string; classes?: string[]; k?: number; build: () => DataPoint[] };

/** x를 고르게(또는 무작위로) 놓고 y = f(x) + 잡음으로 만든 회귀 자료. */
function relation(seed: number, count: number, from: number, to: number, f: (x: number) => number, noise: number, spacing: "even" | "random" = "even") {
  const random = seededRandom(seed);
  return Array.from({ length: count }, (_, index) => {
    const x = spacing === "even" ? from + ((to - from) * index) / Math.max(1, count - 1) : from + random() * (to - from);
    return { x: round(x), y: round(clamp(f(x) + gaussian(random) * noise)), label: 0 };
  });
}

export const regressionDatasets: DatasetInfo[] = [
  {
    id: "study", name: "공부 시간과 시험 점수", xLabel: "공부 시간(시간)", yLabel: "점수(×10점)",
    note: "양의 상관: 공부 시간이 늘수록 점수가 오르는 경향이에요. 직선으로 새 학생의 점수를 예측해 보세요.",
    build: () => relation(7, 14, 0.8, 8.9, (x) => 1.6 + 0.72 * x, 0.7),
  },
  {
    id: "height", name: "키와 몸무게", xLabel: "키(×20cm, 140cm부터)", yLabel: "몸무게(×10kg)",
    note: "양의 상관이지만 흩어짐이 커요. 결정 계수 R²가 1보다 꽤 작게 나오는 이유를 이야기해 보세요.",
    build: () => relation(21, 16, 1.5, 8.5, (x) => 2 + 0.6 * x, 0.8, "random"),
  },
  {
    id: "ads", name: "광고비와 판매량", xLabel: "광고비(백만 원)", yLabel: "판매량(천 개)",
    note: "강한 양의 상관: 점들이 직선 가까이 모여 R²가 1에 가까워요.",
    build: () => relation(31, 15, 1, 9, (x) => 1 + 0.85 * x, 0.45, "random"),
  },
  {
    id: "temperature", name: "기온과 난방비 (음의 상관)", xLabel: "평균 기온(×3℃)", yLabel: "난방비(만 원)",
    note: "음의 상관: 기온이 오를수록 난방비가 줄어서 기울기가 음수가 돼요.",
    build: () => relation(5, 13, 1, 8.8, (x) => 8.8 - 0.75 * x, 0.6),
  },
  {
    id: "phone", name: "스마트폰 사용 시간과 수면 시간", xLabel: "하루 스마트폰 사용(시간)", yLabel: "수면 시간(시간)",
    note: "약한 음의 상관: 경향은 보이지만 예외가 많아요. 상관이 있다고 원인이라 단정할 수 있을지 토론해 보세요.",
    build: () => relation(44, 18, 0.5, 9, (x) => 8.4 - 0.42 * x, 0.9, "random"),
  },
  {
    id: "none", name: "신발 크기와 수학 점수 (상관 없음)", xLabel: "신발 크기(×10mm, 200mm부터)", yLabel: "수학 점수(×10점)",
    note: "상관 없음: 최소제곱 직선이 거의 수평이고 R²가 0에 가까워요. 이런 자료로는 예측하기 어려워요.",
    build: () => relation(52, 18, 1, 9, () => 5.2, 1.7, "random"),
  },
  {
    id: "outlier", name: "이상치가 섞인 자료", xLabel: "공부 시간(시간)", yLabel: "점수(×10점)",
    note: "오른쪽 아래의 점 하나(이상치)가 직선을 끌어내려요. ‘점 지우기’로 그 점을 지우고 직선이 어떻게 바뀌는지 비교해 보세요.",
    build: () => [...relation(63, 12, 1, 7.5, (x) => 1.8 + 0.8 * x, 0.4), { x: 9, y: 1.2, label: 0 }],
  },
  {
    id: "curve", name: "과제 난이도와 몰입도 (곡선)", xLabel: "과제 난이도", yLabel: "몰입도",
    note: "곡선 관계: 너무 쉽거나 어려우면 몰입이 떨어져서 최소제곱 직선이 거의 수평, R²가 0에 가까워요. 관계가 없는 게 아니라 ‘직선이 아닌’ 관계예요.",
    build: () => relation(71, 17, 1, 9.5, (x) => 8.4 - 0.3 * (x - 5.25) ** 2, 0.4),
  },
  {
    id: "braking", name: "자동차 속도와 제동 거리 (위로 휘는 곡선)", xLabel: "속도(×10km/h)", yLabel: "제동 거리(×10m)",
    note: "R²가 0.9를 넘어 직선이 잘 맞아 보이지만, 점들은 위로 휘어요. 잔차가 양 끝에서는 위, 가운데서는 아래로 쏠리는 것을 확인해 보세요.",
    build: () => relation(83, 14, 1, 9, (x) => 0.4 + 0.1 * x * x, 0.35),
  },
];

function blobs(seed: number, centers: { x: number; y: number; label: number }[], perCluster: number, spread: number | [number, number]) {
  const random = seededRandom(seed);
  const [sx, sy] = Array.isArray(spread) ? spread : [spread, spread];
  return centers.flatMap((center) => Array.from({ length: perCluster }, () => ({
    x: round(clamp(center.x + gaussian(random) * sx)), y: round(clamp(center.y + gaussian(random) * sy)), label: center.label,
  })));
}

export const classificationDatasets: DatasetInfo[] = [
  {
    id: "twoGroups", name: "두 무리 (쉽게 나뉨)", xLabel: "특성 1", yLabel: "특성 2",
    note: "두 무리가 뚜렷이 떨어져 있어서 k를 바꿔도 거의 다 맞혀요.",
    build: () => blobs(3, [{ x: 3, y: 3, label: 0 }, { x: 7, y: 7, label: 1 }], 14, 1.1),
  },
  {
    id: "overlap", name: "겹치는 두 무리", xLabel: "특성 1", yLabel: "특성 2",
    note: "무리가 겹쳐요. k가 1이면 경계가 들쭉날쭉(과대적합), k를 키우면 매끈해지는 모습을 비교해 보세요.",
    build: () => blobs(11, [{ x: 4, y: 4.5, label: 0 }, { x: 6, y: 5.5, label: 1 }], 16, 1.4),
  },
  {
    id: "spam", name: "스팸 메일 거르기", xLabel: "메일 속 링크 수", yLabel: "광고 단어 수", classes: ["정상 메일", "스팸 메일"],
    note: "링크와 광고 단어가 많을수록 스팸일 가능성이 높아요. 경계 근처의 메일은 잘못 분류될 수 있어요.",
    build: () => blobs(91, [{ x: 2.8, y: 2.6, label: 0 }, { x: 7, y: 7.2, label: 1 }], 16, 1.35),
  },
  {
    id: "pass", name: "시험 합격 예측", xLabel: "공부 시간(시간)", yLabel: "출석률(×10%)", classes: ["불합격", "합격"],
    note: "공부 시간과 출석률로 합격 여부를 예측해요. ‘새 점 분류’로 한 학생의 결과를 예측해 보세요.",
    build: () => {
      const random = seededRandom(97);
      return Array.from({ length: 36 }, () => {
        const x = 0.6 + random() * 8.8;
        const y = 1 + random() * 8.5;
        const score = 0.55 * x + 0.45 * y + gaussian(random) * 0.9;
        return { x: round(x), y: round(y), label: score > 5.2 ? 1 : 0 };
      });
    },
  },
  {
    id: "iris", name: "붓꽃 세 품종 (꽃잎 길이·너비)", xLabel: "꽃잎 길이", yLabel: "꽃잎 너비", classes: ["세토사", "버시컬러", "버지니카"],
    note: "기계학습에서 가장 유명한 붓꽃 자료를 본뜬 예시예요. 세토사는 쉽게, 나머지 둘은 경계에서 헷갈려요.",
    build: () => blobs(8, [{ x: 2, y: 2, label: 0 }, { x: 5.5, y: 5, label: 1 }, { x: 7.8, y: 7.8, label: 2 }], 12, 0.8),
  },
  {
    id: "fruit", name: "과일 분류 (무게·당도)", xLabel: "무게(×50g)", yLabel: "당도(×2브릭스)", classes: ["귤", "사과", "배"],
    note: "무게와 당도 두 특성으로 과일을 나눠요. 특성을 어떻게 고르느냐가 분류 성능을 좌우해요.",
    build: () => blobs(101, [{ x: 2, y: 5.8, label: 0 }, { x: 5, y: 3.8, label: 1 }, { x: 8, y: 6.5, label: 2 }], 12, [0.75, 0.9]),
  },
  {
    id: "ring", name: "안쪽·바깥쪽 (직선으로 못 나눔)", xLabel: "특성 1", yLabel: "특성 2",
    note: "직선 하나로는 나눌 수 없지만, 가까운 이웃을 보는 k-NN은 잘 나눠요.",
    build: () => {
      const random = seededRandom(17);
      return Array.from({ length: 40 }, (_, index) => {
        const outer = index % 2 === 1;
        const angle = random() * Math.PI * 2;
        const radius = outer ? 3.4 + random() * 0.9 : random() * 1.6;
        return { x: round(clamp(5 + Math.cos(angle) * radius)), y: round(clamp(5 + Math.sin(angle) * radius)), label: outer ? 1 : 0 };
      });
    },
  },
  {
    id: "checker", name: "체크무늬 네 칸", xLabel: "특성 1", yLabel: "특성 2",
    note: "대각선끼리 같은 무리(XOR 모양)예요. k가 15까지는 거의 다 맞히다가, 19 이상이 되면 이웃이 다른 칸까지 넘어가 정확도가 뚝 떨어져요.",
    build: () => blobs(113, [{ x: 2.8, y: 2.8, label: 0 }, { x: 7.2, y: 7.2, label: 0 }, { x: 2.8, y: 7.2, label: 1 }, { x: 7.2, y: 2.8, label: 1 }], 10, 0.95),
  },
  {
    id: "imbalance", name: "불균형 자료 (한쪽이 훨씬 많음)", xLabel: "특성 1", yLabel: "특성 2", classes: ["흔한 경우", "드문 경우"],
    note: "드문 경우가 6개뿐이에요. k를 크게 하면 드문 경우를 거의 예측하지 못해요. 정확도가 높아도 좋은 모델이 아닐 수 있어요.",
    build: () => [...blobs(121, [{ x: 4.2, y: 4.5, label: 0 }], 34, 1.5), ...blobs(122, [{ x: 7, y: 6.8, label: 1 }], 6, 0.6)],
  },
];

export const clusterDatasets: DatasetInfo[] = [
  {
    id: "three", name: "세 무리", xLabel: "특성 1", yLabel: "특성 2", k: 3,
    note: "무리가 뚜렷해서 k = 3이면 금방 제자리를 찾아요. k를 2나 4로 바꾸면 어떻게 되는지도 보세요.",
    build: () => blobs(4, [{ x: 2.5, y: 7, label: 0 }, { x: 7, y: 7.5, label: 0 }, { x: 5, y: 2.5, label: 0 }], 13, 0.9),
  },
  {
    id: "customers", name: "고객 나누기 (방문 횟수·구매액)", xLabel: "방문 횟수", yLabel: "구매액", k: 4,
    note: "쇼핑몰 고객을 비슷한 사람끼리 묶어 맞춤 혜택을 줄 때 쓰는 방법이에요. 무리마다 어떤 고객인지 이름을 붙여 보세요.",
    build: () => blobs(9, [{ x: 2, y: 2, label: 0 }, { x: 3, y: 7.5, label: 0 }, { x: 7.5, y: 3, label: 0 }, { x: 8, y: 8, label: 0 }], 10, 0.8),
  },
  {
    id: "grades", name: "학생 성적 유형 (국어·수학)", xLabel: "국어 점수(×10점)", yLabel: "수학 점수(×10점)", k: 3,
    note: "국어가 강한 유형·수학이 강한 유형·고르게 잘하는 유형처럼, 정답 없이 비슷한 학생끼리 묶여요(비지도 학습).",
    build: () => blobs(131, [{ x: 7.8, y: 3.5, label: 0 }, { x: 3.5, y: 7.8, label: 0 }, { x: 7.6, y: 7.8, label: 0 }], 11, 0.85),
  },
  {
    id: "delivery", name: "배달 거점 정하기 (집 위치)", xLabel: "동서 위치(km)", yLabel: "남북 위치(km)", k: 5,
    note: "무리의 중심(✕)이 곧 배달 거점이에요. 거점 수 k를 바꾸면 집에서 거점까지의 거리 합이 어떻게 달라지는지 보세요.",
    build: () => blobs(141, [{ x: 2, y: 2.5, label: 0 }, { x: 2.5, y: 7.5, label: 0 }, { x: 5.2, y: 5, label: 0 }, { x: 8, y: 8, label: 0 }, { x: 8.2, y: 2.2, label: 0 }], 8, 0.75),
  },
  {
    id: "uneven", name: "크기가 다른 무리", xLabel: "특성 1", yLabel: "특성 2", k: 2,
    note: "큰 무리와 작은 무리가 섞여 있어요. 시작점에 따라 큰 무리가 둘로 쪼개지기도 해요.",
    build: () => [...blobs(12, [{ x: 3, y: 4, label: 0 }], 24, 1.3), ...blobs(13, [{ x: 8, y: 7.5, label: 0 }], 8, 0.5)],
  },
  {
    id: "elongated", name: "길쭉한 두 무리 (k-평균의 한계)", xLabel: "특성 1", yLabel: "특성 2", k: 2,
    note: "눈으로는 위·아래 두 줄인데, k-평균은 중심까지의 거리로 나눠서 왼쪽·오른쪽으로 자르기 쉬워요.",
    build: () => blobs(151, [{ x: 5, y: 3.8, label: 0 }, { x: 5, y: 6.2, label: 0 }], 18, [2.4, 0.28]),
  },
  {
    id: "moons", name: "반달 두 개 (k-평균의 한계)", xLabel: "특성 1", yLabel: "특성 2", k: 2,
    note: "휘어진 모양의 무리는 k-평균이 제대로 나누지 못해요. 동그랗게 모인 무리를 가정하기 때문이에요.",
    build: () => {
      const random = seededRandom(161);
      return Array.from({ length: 40 }, (_, index) => {
        const upper = index % 2 === 0;
        const angle = random() * Math.PI;
        const x = upper ? 3.8 + Math.cos(angle) * 2.6 : 6.2 - Math.cos(angle) * 2.6;
        const y = upper ? 5 + Math.sin(angle) * 2.4 : 5.8 - Math.sin(angle) * 2.4;
        return { x: round(clamp(x + gaussian(random) * 0.18)), y: round(clamp(y - 0.4 + gaussian(random) * 0.18)), label: 0 };
      });
    },
  },
  {
    id: "uniform", name: "무리가 없는 고른 자료", xLabel: "특성 1", yLabel: "특성 2", k: 3,
    note: "뚜렷한 무리가 없어도 k-평균은 k개로 억지로 나눠요. 결과를 해석할 때 조심해야 하는 이유예요.",
    build: () => {
      const random = seededRandom(171);
      return Array.from({ length: 40 }, () => ({ x: round(0.8 + random() * 8.4), y: round(0.8 + random() * 8.4), label: 0 }));
    },
  },
];

/* ───── 회귀 ───── */

export type Line = { slope: number; intercept: number };

/** 최소제곱법으로 구한 가장 잘 맞는 직선(점이 2개 미만이거나 x가 모두 같으면 null). */
export function leastSquares(points: DataPoint[]): Line | null {
  if (points.length < 2) return null;
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const sxx = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
  if (sxx < 1e-9) return null;
  const sxy = points.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0);
  const slope = sxy / sxx;
  return { slope, intercept: meanY - slope * meanX };
}

export function meanSquaredError(points: DataPoint[], line: Line) {
  if (!points.length) return 0;
  return points.reduce((sum, point) => sum + (point.y - (line.slope * point.x + line.intercept)) ** 2, 0) / points.length;
}

/** 결정 계수 R²: 1에 가까울수록 직선이 데이터를 잘 설명합니다. */
export function rSquared(points: DataPoint[], line: Line) {
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const total = points.reduce((sum, point) => sum + (point.y - meanY) ** 2, 0);
  if (total < 1e-12) return 1;
  return 1 - (meanSquaredError(points, line) * points.length) / total;
}

/** 경사 하강법 한 걸음: 평균제곱오차를 기울기·절편으로 미분한 방향의 반대로 움직입니다. */
export function gradientStep(points: DataPoint[], line: Line, learningRate: number): Line {
  if (!points.length) return line;
  let slopeGradient = 0;
  let interceptGradient = 0;
  for (const point of points) {
    const error = line.slope * point.x + line.intercept - point.y;
    slopeGradient += (2 * error * point.x) / points.length;
    interceptGradient += (2 * error) / points.length;
  }
  return { slope: line.slope - learningRate * slopeGradient, intercept: line.intercept - learningRate * interceptGradient };
}

/* ───── k-최근접 이웃 ───── */

export type Metric = "euclidean" | "manhattan";
export const distance = (a: { x: number; y: number }, b: { x: number; y: number }, metric: Metric) =>
  metric === "euclidean" ? Math.hypot(a.x - b.x, a.y - b.y) : Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** 가까운 k개의 표로 분류합니다. 표가 같으면 가장 가까운 이웃이 속한 쪽을 고릅니다. */
export function knnPredict(points: DataPoint[], query: { x: number; y: number }, k: number, metric: Metric, exclude?: DataPoint) {
  const neighbors = points
    .filter((point) => point !== exclude)
    .map((point) => ({ point, distance: distance(point, query, metric) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, Math.max(1, k));
  const votes = new Map<number, number>();
  for (const { point } of neighbors) votes.set(point.label, (votes.get(point.label) ?? 0) + 1);
  const best = Math.max(0, ...votes.values());
  const tied = [...votes.entries()].filter(([, count]) => count === best).map(([label]) => label);
  const label = neighbors.find(({ point }) => tied.includes(point.label))?.point.label ?? 0;
  return { label, neighbors, votes };
}

/** 한 점씩 빼고 나머지로 맞혀 보는 정확도(자기 자신을 이웃으로 쓰지 않음). */
export function leaveOneOutAccuracy(points: DataPoint[], k: number, metric: Metric) {
  if (points.length < 2) return null;
  const correct = points.filter((point) => knnPredict(points, point, k, metric, point).label === point.label).length;
  return correct / points.length;
}

/* ───── k-평균 군집 ───── */

export type Centroid = { x: number; y: number };
export type KMeansState = { centroids: Centroid[]; assignment: number[]; iteration: number; phase: "assign" | "update"; converged: boolean };

/** 데이터 가운데서 서로 멀리 떨어진 점을 골라 처음 중심으로 씁니다(k-means++ 방식, 씨앗 고정). */
export function initKMeans(points: DataPoint[], k: number, seed: number): KMeansState {
  const random = seededRandom(seed);
  const centroids: Centroid[] = [];
  if (points.length) {
    const first = points[Math.floor(random() * points.length)];
    centroids.push({ x: first.x, y: first.y });
    while (centroids.length < Math.min(k, points.length)) {
      const weights = points.map((point) => Math.min(...centroids.map((centroid) => distance(point, centroid, "euclidean") ** 2)));
      const total = weights.reduce((sum, weight) => sum + weight, 0);
      let pick = random() * total;
      let index = 0;
      while (index < points.length - 1 && pick > weights[index]) { pick -= weights[index]; index += 1; }
      centroids.push({ x: points[index].x, y: points[index].y });
    }
  }
  return { centroids, assignment: points.map(() => -1), iteration: 0, phase: "assign", converged: false };
}

export function nearestCentroid(point: { x: number; y: number }, centroids: Centroid[]) {
  let best = 0;
  let bestDistance = Infinity;
  centroids.forEach((centroid, index) => {
    const current = distance(point, centroid, "euclidean");
    if (current < bestDistance) { best = index; bestDistance = current; }
  });
  return best;
}

/** 한 단계: ‘가까운 중심에 배정’과 ‘무리의 평균으로 중심 옮기기’를 번갈아 합니다. */
export function kMeansStep(points: DataPoint[], state: KMeansState): KMeansState {
  if (state.converged || !state.centroids.length) return state;
  if (state.phase === "assign") {
    const assignment = points.map((point) => nearestCentroid(point, state.centroids));
    const unchanged = state.iteration > 0 && assignment.every((value, index) => value === state.assignment[index]);
    return { ...state, assignment, phase: "update", converged: unchanged };
  }
  const centroids = state.centroids.map((centroid, index) => {
    const members = points.filter((_, pointIndex) => state.assignment[pointIndex] === index);
    if (!members.length) return centroid;
    return { x: members.reduce((sum, point) => sum + point.x, 0) / members.length, y: members.reduce((sum, point) => sum + point.y, 0) / members.length };
  });
  return { ...state, centroids, phase: "assign", iteration: state.iteration + 1 };
}

export function runKMeans(points: DataPoint[], state: KMeansState, limit = 100) {
  let current = state;
  for (let step = 0; step < limit * 2 && !current.converged; step += 1) current = kMeansStep(points, current);
  return current;
}

/** 각 점과 자기 무리 중심 사이 거리 제곱의 합(작을수록 무리가 촘촘함). */
export function inertia(points: DataPoint[], state: KMeansState) {
  return points.reduce((sum, point, index) => {
    const centroid = state.centroids[state.assignment[index]];
    return centroid ? sum + distance(point, centroid, "euclidean") ** 2 : sum;
  }, 0);
}
