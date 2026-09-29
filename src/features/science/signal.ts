/* 통합·탐구: 아날로그 신호를 디지털로 바꾸는 과정(표본화·양자화·부호화)과 데이터 크기 문제입니다. */
import { escapeHtml, grouped, num, seededRandom, svgText, svgWrap, type SheetProblem, type SheetSection } from "./sheet";

export type SignalSettings = { samples: number; bits: number; wave: "sine" | "mixed" };

/** 0~1 사이 시간에서 신호 값(0~1)입니다. */
export function analog(t: number, wave: SignalSettings["wave"]) {
  const value = wave === "sine" ? Math.sin(2 * Math.PI * t) : 0.7 * Math.sin(2 * Math.PI * t) + 0.3 * Math.sin(6 * Math.PI * t + 0.6);
  return (value + 1) / 2;
}
/** 표본마다 가장 가까운 양자화 단계(0 ~ 2^bits − 1)입니다. */
export function quantize(settings: SignalSettings) {
  const levels = 2 ** settings.bits;
  return Array.from({ length: settings.samples }, (_, index) => {
    const t = (index + 0.5) / settings.samples;
    const value = analog(t, settings.wave);
    const level = Math.min(levels - 1, Math.round(value * (levels - 1)));
    return { t, value, level, code: level.toString(2).padStart(settings.bits, "0") };
  });
}

/** 아날로그 곡선, 표본(막대), 양자화된 계단, 부호(2진수)를 한 그림에 그립니다. */
export function signalSvg(settings: SignalSettings, options: { codes?: boolean; stair?: boolean } = {}) {
  const width = 620;
  const height = 300;
  const left = 50;
  const right = 20;
  const top = 20;
  const plot = 210;
  const levels = 2 ** settings.bits;
  const sx = (t: number) => left + t * (width - left - right);
  const sy = (value: number) => top + (1 - value) * plot;
  const parts: string[] = [];
  for (let level = 0; level < levels; level += 1) {
    const y = sy(level / (levels - 1));
    parts.push(`<line x1="${left}" y1="${y.toFixed(1)}" x2="${width - right}" y2="${y.toFixed(1)}" stroke="#e5e7eb"/>`);
    if (levels <= 16) parts.push(svgText(left - 6, y + 4, String(level), { size: 10, anchor: "end", color: "#555" }));
  }
  parts.push(`<line x1="${left}" y1="${top + plot}" x2="${width - right}" y2="${top + plot}" stroke="#111" stroke-width="1.3"/><line x1="${left}" y1="${top}" x2="${left}" y2="${top + plot}" stroke="#111" stroke-width="1.3"/>`);
  const curve = Array.from({ length: 201 }, (_, index) => { const t = index / 200; return `${index ? "L" : "M"}${sx(t).toFixed(1)} ${sy(analog(t, settings.wave)).toFixed(1)}`; }).join(" ");
  parts.push(`<path d="${curve}" fill="none" stroke="#94a3b8" stroke-width="2"/>`);
  const samples = quantize(settings);
  const step = 1 / settings.samples;
  if (options.stair !== false) {
    const stair = samples.map((sample, index) => `${index ? "L" : "M"}${sx(sample.t - step / 2).toFixed(1)} ${sy(sample.level / (levels - 1)).toFixed(1)} L${sx(sample.t + step / 2).toFixed(1)} ${sy(sample.level / (levels - 1)).toFixed(1)}`).join(" ");
    parts.push(`<path d="${stair}" fill="none" stroke="#2563eb" stroke-width="2.2"/>`);
  }
  for (const sample of samples) {
    parts.push(`<line x1="${sx(sample.t).toFixed(1)}" y1="${top + plot}" x2="${sx(sample.t).toFixed(1)}" y2="${sy(sample.value).toFixed(1)}" stroke="#dc2626" stroke-dasharray="3 3"/><circle cx="${sx(sample.t).toFixed(1)}" cy="${sy(sample.value).toFixed(1)}" r="3.2" fill="#dc2626"/>`);
    if (options.codes !== false && settings.samples <= 16) parts.push(svgText(sx(sample.t), top + plot + 18, sample.code, { size: settings.bits > 4 ? 8.5 : 10, anchor: "middle", color: "#1e3a8a" }));
  }
  parts.push(svgText(left, height - 14, "회색: 아날로그 신호 · 빨강: 표본화 · 파랑: 양자화", { size: 10.5, color: "#444" }));
  parts.push(svgText(width - right, height - 14, `표본 ${settings.samples}개 · ${settings.bits}비트(${levels}단계)`, { size: 10.5, anchor: "end", color: "#444" }));
  return svgWrap(width, height, parts.join(""));
}

/* ───── 문제 ───── */
export type SignalAsk = "levels" | "size" | "binary" | "quantize";
export const signalAsks: Record<SignalAsk, string> = { levels: "비트 수와 단계", size: "데이터 크기", binary: "2진수 변환", quantize: "양자화 값 읽기" };

export function signalProblems(asks: SignalAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 29 + 3);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const problems: SheetProblem[] = [];
  const add = (html: string, answer: string, extra: Partial<SheetProblem> = {}) => problems.push({ html, text: html.replace(/<[^>]+>/g, ""), answerHtml: answer, answerText: answer.replace(/<[^>]+>/g, ""), space: 10, ...extra });
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "levels") {
      const bits = pick([2, 3, 4, 8, 16]);
      add(`${bits}비트로 양자화하면 신호를 몇 단계로 나타낼 수 있는지 구하시오.`, `2<sup>${bits}</sup> = ${grouped(2 ** bits, 0)}단계`);
    } else if (ask === "size") {
      const rate = pick([8000, 11025, 22050, 44100, 48000]);
      const bits = pick([8, 16, 24]);
      const channels = pick([1, 2]);
      const seconds = pick([1, 10, 60]);
      const bytes = (rate * bits * channels * seconds) / 8;
      add(`표본화 주파수 ${grouped(rate, 0)} Hz, ${bits}비트, ${channels === 1 ? "모노(1채널)" : "스테레오(2채널)"}로 ${seconds}초 동안 녹음한 소리의 데이터 크기(바이트)를 구하시오. (압축하지 않음)`, `${grouped(bytes, 0)} 바이트 (${grouped(rate, 0)} × ${bits} × ${channels} × ${seconds} ÷ 8)`);
    } else if (ask === "binary") {
      const value = Math.floor(random() * 250) + 3;
      if (random() < 0.5) add(`다음 10진수를 2진수로 나타내시오. ${value}`, value.toString(2));
      else add(`다음 2진수를 10진수로 나타내시오. ${value.toString(2)}₍₂₎`, String(value));
    } else {
      const settings: SignalSettings = { samples: 8, bits: pick([2, 3]), wave: pick(["sine", "mixed"] as const) };
      const samples = quantize(settings);
      add(`그림은 아날로그 신호를 표본화하고 ${settings.bits}비트로 양자화한 것이다. 각 표본의 양자화 값을 2진수로 쓰시오.`, samples.map(sample => sample.code).join(", "), {
        figure: signalSvg(settings, { codes: false, stair: false }), answerFigure: signalSvg(settings), space: 6,
      });
    }
  }
  return [{ heading: "신호와 정보", problems }];
}

export const bitsTable = (bits: number) => `${escapeHtml(String(bits))}비트 = ${grouped(2 ** bits, 0)}단계, 1초 44.1 kHz 16비트 스테레오 = ${num((44100 * 16 * 2) / 8 / 1024, 1)} KB`;
