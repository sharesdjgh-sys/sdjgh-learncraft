/* 물리학·역학과 에너지: 파동의 그래프(y-x, y-t), 정상파(줄·관), 맥놀이, 도플러 효과, 문제입니다. */
import { num, plotSvg, seededRandom, svgText, svgWrap, type SheetProblem, type SheetSection } from "./sheet";

export const SOUND_SPEED = 340;
export type Wave = { amplitude: number; wavelength: number; speed: number };
export const period = (wave: Wave) => wave.wavelength / wave.speed;

/** 어느 순간의 변위-위치 그래프, 또는 한 점의 변위-시간 그래프입니다. */
export function waveSvg(wave: Wave, kind: "x" | "t", options: { blankTicks?: boolean; cycles?: number } = {}) {
  const cycles = options.cycles ?? 2;
  const span = kind === "x" ? wave.wavelength * cycles : period(wave) * cycles;
  const points = Array.from({ length: 161 }, (_, step) => { const s = (span * step) / 160; return [s, wave.amplitude * Math.sin((2 * Math.PI * s) / (kind === "x" ? wave.wavelength : period(wave)))] as [number, number]; });
  return plotSvg({
    xLabel: kind === "x" ? "위치(m)" : "시간(s)", yLabel: kind === "x" ? "변위(cm)" : "변위(cm)",
    xMax: span * 1.05, yMin: -wave.amplitude * 1.4, yMax: wave.amplitude * 1.4, xStep: (kind === "x" ? wave.wavelength : period(wave)) / 4, yStep: wave.amplitude,
    series: [{ points, color: kind === "x" ? "#2563eb" : "#dc2626" }], hideTicks: options.blankTicks, width: 480, height: 230,
  });
}

/* ───── 정상파 ───── */
export type Resonator = "string" | "open" | "closed";
export const resonators: Record<Resonator, string> = { string: "양 끝이 고정된 줄", open: "양쪽이 열린 관", closed: "한쪽이 닫힌 관" };
/** n번째로 가능한 정상파의 파장입니다. 닫힌 관은 홀수 배 진동만 생깁니다. */
export function harmonic(kind: Resonator, length: number, n: number) {
  const multiple = kind === "closed" ? 2 * n - 1 : n;
  const wavelength = kind === "closed" ? (4 * length) / multiple : (2 * length) / multiple;
  return { multiple, wavelength };
}
/** 정상파 모양(n번째 모드)을 줄·관 그림으로 그립니다. */
export function standingSvg(kind: Resonator, modes: number[]) {
  const width = 520;
  const rowH = 70;
  const height = 24 + rowH * modes.length;
  const left = 80;
  const right = width - 30;
  const parts: string[] = [];
  modes.forEach((n, row) => {
    const y = 24 + rowH * row + rowH / 2 - 8;
    const { multiple } = harmonic(kind, 1, n);
    const amp = 20;
    const k = kind === "closed" ? (multiple * Math.PI) / 2 : multiple * Math.PI;
    const shape = (sign: number) => Array.from({ length: 121 }, (_, step) => {
      const s = step / 120;
      // 줄은 양 끝이 마디, 열린 관은 양 끝이 배, 닫힌 관은 왼쪽(닫힌 쪽)이 마디입니다.
      const value = kind === "string" ? Math.sin(k * s) : kind === "open" ? Math.cos(k * s) : Math.sin(k * s);
      return `${step ? "L" : "M"}${(left + s * (right - left)).toFixed(1)} ${(y - sign * amp * value).toFixed(1)}`;
    }).join(" ");
    if (kind !== "string") parts.push(`<rect x="${left}" y="${y - 26}" width="${right - left}" height="52" fill="#f8fafc" stroke="#475569"/>` + (kind === "closed" ? `<line x1="${left}" y1="${y - 26}" x2="${left}" y2="${y + 26}" stroke="#111" stroke-width="5"/>` : ""));
    else parts.push(`<rect x="${left - 6}" y="${y - 22}" width="6" height="44" fill="#475569"/><rect x="${right}" y="${y - 22}" width="6" height="44" fill="#475569"/>`);
    parts.push(`<path d="${shape(1)}" fill="none" stroke="#2563eb" stroke-width="2"/><path d="${shape(-1)}" fill="none" stroke="#2563eb" stroke-width="1.4" stroke-dasharray="4 3"/>`);
    parts.push(svgText(left - 10, y + 4, kind === "closed" ? `${multiple}배 진동` : `${n}배 진동`, { size: 11, anchor: "end" }));
  });
  return svgWrap(width, height, parts.join(""));
}

export const beat = (f1: number, f2: number) => Math.abs(f1 - f2);
/** 도플러 효과: 음원·관찰자가 가까워지면 +, 멀어지면 − 방향 속력입니다. */
export function doppler(frequency: number, sourceSpeed: number, observerSpeed: number, approaching: boolean, speed = SOUND_SPEED) {
  const sign = approaching ? 1 : -1;
  return (frequency * (speed + sign * observerSpeed)) / (speed - sign * sourceSpeed);
}

/* ───── 문제 ───── */
export type WaveAsk = "graph" | "standing" | "beat" | "doppler";
export const waveAsks: Record<WaveAsk, string> = { graph: "파동 그래프 읽기", standing: "정상파", beat: "맥놀이", doppler: "도플러 효과" };

export function waveProblems(asks: WaveAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 67 + 5);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const problems: SheetProblem[] = [];
  const add = (html: string, answer: string, extra: Partial<SheetProblem> = {}) => problems.push({ html, text: html.replace(/<[^>]+>/g, ""), answerHtml: answer, answerText: answer.replace(/<[^>]+>/g, ""), space: 14, ...extra });
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "graph") {
      const wave = { amplitude: pick([2, 3, 5]), wavelength: pick([2, 4, 8]), speed: pick([2, 4, 8, 16]) };
      add(`그림은 오른쪽으로 ${wave.speed} m/s의 속력으로 진행하는 파동의 어느 순간 모습이다. 이 파동의 진폭, 파장, 주기, 진동수를 구하시오.`, `진폭 ${wave.amplitude} cm, 파장 ${wave.wavelength} m, 주기 ${num(period(wave), 3)} s, 진동수 ${num(1 / period(wave), 3)} Hz`, { figure: waveSvg(wave, "x") });
    } else if (ask === "standing") {
      const kind = pick(["string", "open", "closed"] as Resonator[]); const length = pick([0.5, 0.85, 1, 1.7]); const n = pick([1, 2, 3]);
      const h = harmonic(kind, length, n);
      const v = kind === "string" ? pick([100, 200, 340]) : SOUND_SPEED;
      add(`길이가 ${length} m인 ${resonators[kind]}에서 ${kind === "closed" ? `${n}번째로 낮은 진동수(${h.multiple}배 진동)` : `${n}배 진동`}의 정상파가 생겼다. 파장과 진동수를 구하시오. (파동의 속력 ${v} m/s)`, `파장 ${num(h.wavelength, 3)} m, 진동수 ${num(v / h.wavelength, 1)} Hz`, { figure: standingSvg(kind, [n]) });
    } else if (ask === "beat") {
      const f1 = pick([256, 440, 512]); const d = pick([2, 3, 4, 5]);
      add(`진동수가 ${f1} Hz인 소리굽쇠와 ${f1 + d} Hz인 소리굽쇠를 동시에 울렸다. 1초에 들리는 맥놀이 수를 구하시오.`, `${d}회 (|f₁ − f₂|)`);
    } else {
      const f = pick([500, 680, 1000]); const vs = pick([20, 34, 40]); const approaching = random() < 0.5;
      add(`진동수 ${f} Hz의 소리를 내는 구급차가 ${vs} m/s의 속력으로 정지한 관찰자에게서 ${approaching ? "다가올" : "멀어질"} 때 관찰자가 듣는 소리의 진동수를 구하시오. (소리의 속력 340 m/s)`, `${num(doppler(f, vs, 0, approaching), 1)} Hz`);
    }
  }
  return [{ heading: "파동과 소리", problems }];
}
