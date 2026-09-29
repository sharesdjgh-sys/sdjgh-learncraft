import { gaussian, seededRandom } from "./random";

/* 신경망 놀이터: 2차원 점을 두 무리로 나누는 작은 다층 신경망을 브라우저에서 학습합니다.
   좌표는 -1~1, 출력층은 시그모이드 한 개(1 = 파랑, 0 = 주황), 손실은 이진 교차 엔트로피입니다. */

export type Sample = { x: number; y: number; label: 0 | 1 };

export const nnDatasets = [
  { id: "blobs", name: "두 무리", help: "직선 하나로 나눌 수 있어요. 은닉층 없이(퍼셉트론)도 풀려요." },
  { id: "circle", name: "원", help: "안쪽과 바깥쪽. 직선으로는 못 나눠서 은닉층이나 x₁²·x₂² 특성이 필요해요." },
  { id: "xor", name: "XOR", help: "대각선끼리 같은 무리. 퍼셉트론이 풀지 못한 유명한 문제예요." },
  { id: "spiral", name: "나선", help: "가장 어려운 문제. 은닉층을 여러 개, 뉴런을 넉넉히 두어야 해요." },
] as const;
export type NnDatasetId = typeof nnDatasets[number]["id"];

export function buildNnDataset(id: NnDatasetId, noise: number, seed = 1, count = 200): Sample[] {
  const random = seededRandom(seed);
  const jitter = () => gaussian(random) * noise;
  const clamp = (value: number) => Math.max(-0.98, Math.min(0.98, value));
  return Array.from({ length: count }, (_, index) => {
    const label = (index % 2) as 0 | 1;
    let x: number; let y: number;
    if (id === "blobs") {
      const center = label ? 0.45 : -0.45;
      x = center + gaussian(random) * 0.22; y = center + gaussian(random) * 0.22;
    } else if (id === "circle") {
      const angle = random() * Math.PI * 2;
      const radius = label ? random() * 0.38 : 0.62 + random() * 0.3;
      x = Math.cos(angle) * radius; y = Math.sin(angle) * radius;
    } else if (id === "xor") {
      // 파랑(1)은 x·y가 같은 부호인 사분면, 주황(0)은 다른 부호인 사분면에 둡니다.
      const sx = random() < 0.5 ? -1 : 1;
      const sy = label ? sx : -sx;
      x = sx * (0.08 + random() * 0.87); y = sy * (0.08 + random() * 0.87);
    } else {
      const t = (Math.floor(index / 2) / (count / 2)) * 1.75 * Math.PI;
      const radius = 0.12 + (t / (1.75 * Math.PI)) * 0.8;
      const angle = t + (label ? Math.PI : 0);
      x = Math.cos(angle) * radius; y = Math.sin(angle) * radius;
    }
    return { x: clamp(x + jitter()), y: clamp(y + jitter()), label };
  });
}

export const featureKinds = ["x1", "x2", "x1sq", "x2sq", "x1x2", "sin1", "sin2"] as const;
export type FeatureKind = typeof featureKinds[number];
export const featureNames: Record<FeatureKind, string> = { x1: "x₁", x2: "x₂", x1sq: "x₁²", x2sq: "x₂²", x1x2: "x₁x₂", sin1: "sin(x₁)", sin2: "sin(x₂)" };
export function featureValue(kind: FeatureKind, x: number, y: number) {
  switch (kind) {
    case "x1": return x;
    case "x2": return y;
    case "x1sq": return x * x;
    case "x2sq": return y * y;
    case "x1x2": return x * y;
    case "sin1": return Math.sin(Math.PI * x);
    default: return Math.sin(Math.PI * y);
  }
}

export const hiddenActivations = ["tanh", "relu", "sigmoid", "linear"] as const;
export type HiddenActivation = typeof hiddenActivations[number];
export const activationNames: Record<HiddenActivation, string> = { tanh: "tanh", relu: "ReLU", sigmoid: "시그모이드", linear: "선형(활성화 없음)" };

const sigmoid = (value: number) => 1 / (1 + Math.exp(-value));
function activate(kind: HiddenActivation, value: number) {
  if (kind === "tanh") return Math.tanh(value);
  if (kind === "relu") return value > 0 ? value : 0;
  if (kind === "sigmoid") return sigmoid(value);
  return value;
}
/** 활성화 함수의 도함수를 ‘출력값’으로 나타낸 것(역전파에서 씁니다). */
function derivative(kind: HiddenActivation, output: number) {
  if (kind === "tanh") return 1 - output * output;
  if (kind === "relu") return output > 0 ? 1 : 0;
  if (kind === "sigmoid") return output * (1 - output);
  return 1;
}

/** weights[l][j][i]: l번째 층 사이에서 앞 층 i번 뉴런 → 다음 층 j번 뉴런의 가중치. */
export type Network = { sizes: number[]; weights: number[][][]; biases: number[][]; activation: HiddenActivation };

export function createNetwork(sizes: number[], activation: HiddenActivation, seed: number): Network {
  const random = seededRandom(seed);
  const weights: number[][][] = [];
  const biases: number[][] = [];
  for (let layer = 1; layer < sizes.length; layer += 1) {
    const scale = Math.sqrt(2 / (sizes[layer - 1] + sizes[layer]));
    weights.push(Array.from({ length: sizes[layer] }, () => Array.from({ length: sizes[layer - 1] }, () => gaussian(random) * scale)));
    biases.push(Array.from({ length: sizes[layer] }, () => 0.01));
  }
  return { sizes, weights, biases, activation };
}

/** 층마다의 출력(입력층 포함). 마지막 층은 시그모이드를 거친 확률입니다. */
export function forward(network: Network, input: number[]) {
  const outputs = [input];
  for (let layer = 0; layer < network.weights.length; layer += 1) {
    const previous = outputs[layer];
    const last = layer === network.weights.length - 1;
    outputs.push(network.weights[layer].map((row, neuron) => {
      let sum = network.biases[layer][neuron];
      for (let index = 0; index < row.length; index += 1) sum += row[index] * previous[index];
      return last ? sigmoid(sum) : activate(network.activation, sum);
    }));
  }
  return outputs;
}

export const toInput = (features: FeatureKind[], x: number, y: number) => features.map((kind) => featureValue(kind, x, y));
export const predict = (network: Network, features: FeatureKind[], x: number, y: number) => forward(network, toInput(features, x, y)).at(-1)![0];

/** 이진 교차 엔트로피 평균 손실과 정확도. */
export function evaluate(network: Network, features: FeatureKind[], samples: Sample[]) {
  let loss = 0;
  let correct = 0;
  for (const sample of samples) {
    const output = Math.min(1 - 1e-7, Math.max(1e-7, predict(network, features, sample.x, sample.y)));
    loss += -(sample.label * Math.log(output) + (1 - sample.label) * Math.log(1 - output));
    if ((output >= 0.5 ? 1 : 0) === sample.label) correct += 1;
  }
  return { loss: samples.length ? loss / samples.length : 0, accuracy: samples.length ? correct / samples.length : 0 };
}

/** 한 에포크: 자료를 섞어 작은 묶음(batch)마다 경사 하강법으로 가중치를 고칩니다. network를 직접 바꿉니다. */
export function trainEpoch(network: Network, features: FeatureKind[], samples: Sample[], learningRate: number, random: () => number, batchSize = 10) {
  const order = samples.map((_, index) => index);
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  for (let start = 0; start < order.length; start += batchSize) {
    const batch = order.slice(start, start + batchSize);
    const weightGrad = network.weights.map((layer) => layer.map((row) => row.map(() => 0)));
    const biasGrad = network.biases.map((layer) => layer.map(() => 0));
    for (const sampleIndex of batch) {
      const sample = samples[sampleIndex];
      const outputs = forward(network, toInput(features, sample.x, sample.y));
      // 시그모이드 + 교차 엔트로피의 출력층 오차는 (예측 − 정답)으로 간단해집니다.
      let delta = [outputs.at(-1)![0] - sample.label];
      for (let layer = network.weights.length - 1; layer >= 0; layer -= 1) {
        const previous = outputs[layer];
        delta.forEach((value, neuron) => {
          biasGrad[layer][neuron] += value;
          for (let input = 0; input < previous.length; input += 1) weightGrad[layer][neuron][input] += value * previous[input];
        });
        if (layer === 0) break;
        delta = previous.map((output, input) => {
          let sum = 0;
          for (let neuron = 0; neuron < delta.length; neuron += 1) sum += network.weights[layer][neuron][input] * delta[neuron];
          return sum * derivative(network.activation, output);
        });
      }
    }
    const step = learningRate / batch.length;
    network.weights.forEach((layer, l) => layer.forEach((row, j) => row.forEach((_, i) => { row[i] -= step * weightGrad[l][j][i]; })));
    network.biases.forEach((layer, l) => layer.forEach((_, j) => { layer[j] -= step * biasGrad[l][j]; }));
  }
}

/** 특정 뉴런(층 layer, 번호 neuron)이 평면의 각 점에서 내는 값. 결정 경계와 뉴런 미리보기에 씁니다. */
export function neuronGrid(network: Network, features: FeatureKind[], layer: number, neuron: number, resolution: number) {
  const values = new Float32Array(resolution * resolution);
  for (let row = 0; row < resolution; row += 1) {
    for (let column = 0; column < resolution; column += 1) {
      const x = -1 + ((column + 0.5) / resolution) * 2;
      const y = 1 - ((row + 0.5) / resolution) * 2;
      values[row * resolution + column] = forward(network, toInput(features, x, y))[layer][neuron];
    }
  }
  return values;
}

/** 평면을 resolution×resolution 칸으로 나눠, 모든 층·모든 뉴런의 출력을 한 번의 순전파로 모읍니다. */
export function allNeuronGrids(network: Network, features: FeatureKind[], resolution: number) {
  const grids = network.sizes.map((size) => Array.from({ length: size }, () => new Float32Array(resolution * resolution)));
  for (let row = 0; row < resolution; row += 1) {
    for (let column = 0; column < resolution; column += 1) {
      const x = -1 + ((column + 0.5) / resolution) * 2;
      const y = 1 - ((row + 0.5) / resolution) * 2;
      const outputs = forward(network, toInput(features, x, y));
      outputs.forEach((layer, l) => layer.forEach((value, n) => { grids[l][n][row * resolution + column] = value; }));
    }
  }
  return grids;
}
