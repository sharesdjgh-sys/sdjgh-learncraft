"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { BrainCircuit, ChartScatter, LoaderCircle, Route, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/* AI 원리 체험(기계학습·탐색·신경망)이 함께 쓰는 머리말, 탭, 그래프 도구입니다. */

export const aiLabTools = [
  { key: "ml", label: "기계학습 체험", icon: ChartScatter, title: "기계학습 체험", help: "점을 찍거나 수업 예시를 불러와 회귀·분류·군집이 데이터를 학습하는 과정을 한 단계씩 보여 줍니다." },
  { key: "search", label: "탐색 알고리즘", icon: Route, title: "탐색 알고리즘", help: "미로를 그리고 너비 우선·깊이 우선·탐욕·A* 탐색이 칸을 펼치는 순서와 찾은 길을 비교합니다." },
  { key: "nn", label: "신경망 놀이터", icon: BrainCircuit, title: "신경망 놀이터", help: "은닉층과 뉴런 수, 활성화 함수를 바꿔 가며 신경망이 두 무리를 나누는 경계를 학습하는 모습을 봅니다." },
] as const;
export type AiLabTool = (typeof aiLabTools)[number]["key"];

const noop = () => () => {};

export function AiLabShell({ current, children }: { current: AiLabTool; children: React.ReactNode }) {
  const tool = aiLabTools.find((item) => item.key === current)!;
  // 그래프와 학습 계산은 캔버스를 쓰므로 브라우저에서만 그립니다.
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  return <div className="mx-auto max-w-[1700px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <header className="grid gap-4 border-b border-line pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
      <div>
        <p className="flex items-center gap-2 text-[.82rem] font-bold text-brand"><BrainCircuit size={16} /> 교사 지원실 · 인공지능 기초</p>
        <h1 className="mt-2 text-[1.85rem] font-extrabold tracking-[-0.04em]">{tool.title}</h1>
        <p className="mt-2 break-keep text-[.86rem] leading-6 text-ink-3 lg:min-h-12 xl:min-h-6">{tool.help}</p>
      </div>
      <span className="flex w-fit items-center gap-2 rounded-full border border-brand/15 bg-brand-page px-3 py-2 text-[.78rem] font-bold text-brand-dark"><ShieldCheck size={15} /> 교사·관리자에게만 표시됨</span>
    </header>
    <nav aria-label="AI 원리 체험 도구" className="mt-5 flex w-fit max-w-full flex-wrap gap-1 rounded-2xl border border-line bg-surface-2 p-1">
      {aiLabTools.map(({ key, label, icon: Icon }) => (
        <Link key={key} href={`/teacher/ai-lab?tool=${key}`} aria-current={current === key ? "page" : undefined}
          className={cn("flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-[.86rem] font-bold transition-colors", current === key ? "bg-surface text-brand-dark shadow-[var(--lift-1)]" : "text-ink-3 hover:text-brand-dark")}>
          <Icon size={16} aria-hidden="true" /> {label}
        </Link>
      ))}
    </nav>
    <div className="mt-5">{hydrated ? children : <div className="flex min-h-[50vh] items-center justify-center text-sm text-ink-4"><LoaderCircle size={18} className="mr-2 animate-spin" /> 체험 도구를 준비하는 중…</div>}</div>
  </div>;
}

export function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "ok" | "warn" | "brand" }) {
  return <div className="min-w-0 rounded-xl border border-line bg-surface-2 px-3 py-2">
    <p className="text-[.68rem] font-bold text-ink-4">{label}</p>
    <p className={cn("figure mt-0.5 truncate text-[.95rem] font-extrabold", tone === "ok" ? "text-ok" : tone === "warn" ? "text-[#c2410c]" : tone === "brand" ? "text-brand-dark" : "text-ink")}>{value}</p>
  </div>;
}

/** 값(0~1)을 주황 → 흰색 → 파랑으로 바꿉니다. 결정 경계 그림에 씁니다. */
export function divergingColor(value: number, strength = 0.55): [number, number, number] {
  const orange = [240, 140, 0];
  const blue = [28, 126, 214];
  const t = Math.max(0, Math.min(1, value));
  const target = t >= 0.5 ? blue : orange;
  const amount = Math.abs(t - 0.5) * 2 * strength;
  return [0, 1, 2].map((index) => Math.round(255 + (target[index] - 255) * amount)) as [number, number, number];
}

/** 격자 값을 작은 캔버스로 칠해 data URL로 만듭니다(SVG <image>로 넣어 확대해 보여 줍니다). */
export function gridImage(values: ArrayLike<number>, resolution: number, color: (value: number) => [number, number, number]) {
  const canvas = document.createElement("canvas");
  canvas.width = resolution;
  canvas.height = resolution;
  const context = canvas.getContext("2d");
  if (!context) return "";
  const image = context.createImageData(resolution, resolution);
  for (let index = 0; index < resolution * resolution; index += 1) {
    const [r, g, b] = color(values[index]);
    image.data.set([r, g, b, 255], index * 4);
  }
  context.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}

/** 화면의 SVG 그래프를 PNG 파일로 저장합니다. */
export async function saveSvgAsPng(svg: SVGSVGElement, name: string, scale = 2) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll("[data-export='skip']").forEach((node) => node.remove());
  const [, , width, height] = (svg.getAttribute("viewBox") ?? "0 0 600 600").split(/\s+/).map(Number);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width * scale));
  clone.setAttribute("height", String(height * scale));
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("그림을 만들지 못했어요.")); image.src = url; });
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("그림을 만들지 못했어요.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("그림을 만들지 못했어요.");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${name.replace(/[\\/:*?"<>|]+/g, " ").slice(0, 60)}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  } finally { URL.revokeObjectURL(url); }
}

export type Scale = { toX: (value: number) => number; toY: (value: number) => number; fromX: (pixel: number) => number; fromY: (pixel: number) => number };

/** 정사각형 그래프 좌표계: SVG 크기 size, 여백 margin, 값 범위 [min, max]. */
export function makeScale(size: number, margin: number, min: number, max: number): Scale {
  const span = size - margin * 2;
  return {
    toX: (value) => margin + ((value - min) / (max - min)) * span,
    toY: (value) => size - margin - ((value - min) / (max - min)) * span,
    fromX: (pixel) => min + ((pixel - margin) / span) * (max - min),
    fromY: (pixel) => min + ((size - margin - pixel) / span) * (max - min),
  };
}

export function PlotAxes({ size, margin, min, max, step, xLabel, yLabel }: { size: number; margin: number; min: number; max: number; step: number; xLabel: string; yLabel: string }) {
  const scale = makeScale(size, margin, min, max);
  const ticks: number[] = [];
  for (let value = min; value <= max + 1e-9; value += step) ticks.push(Math.round(value * 100) / 100);
  return <g pointerEvents="none" fontFamily="Pretendard, 'Malgun Gothic', sans-serif">
    {ticks.map((tick) => <g key={tick}>
      <line x1={scale.toX(tick)} y1={margin} x2={scale.toX(tick)} y2={size - margin} stroke="#f1f3f5" />
      <line x1={margin} y1={scale.toY(tick)} x2={size - margin} y2={scale.toY(tick)} stroke="#f1f3f5" />
      <text x={scale.toX(tick)} y={size - margin + 16} textAnchor="middle" fontSize={11} fill="#868e96">{tick}</text>
      <text x={margin - 8} y={scale.toY(tick) + 4} textAnchor="end" fontSize={11} fill="#868e96">{tick}</text>
    </g>)}
    <rect x={margin} y={margin} width={size - margin * 2} height={size - margin * 2} fill="none" stroke="#ced4da" />
    <text x={size / 2} y={size - 6} textAnchor="middle" fontSize={12} fontWeight={700} fill="#495057">{xLabel}</text>
    <text x={14} y={size / 2} textAnchor="middle" fontSize={12} fontWeight={700} fill="#495057" transform={`rotate(-90 14 ${size / 2})`}>{yLabel}</text>
  </g>;
}

/** 작은 꺾은선 그래프(손실 변화 등). */
export function Sparkline({ values, width = 280, height = 80, color = "#6847e8", label }: { values: number[]; width?: number; height?: number; color?: string; label: string }) {
  if (values.length < 2) return <div className="grid h-20 place-items-center rounded-xl border border-dashed border-line text-[.72rem] text-ink-4">학습을 시작하면 {label} 변화가 그려져요.</div>;
  const max = Math.max(...values);
  const min = Math.min(0, ...values);
  const points = values.map((value, index) => `${(index / (values.length - 1)) * (width - 8) + 4},${height - 6 - ((value - min) / (max - min || 1)) * (height - 14)}`).join(" ");
  return <svg viewBox={`0 0 ${width} ${height}`} className="h-20 w-full rounded-xl border border-line bg-white" role="img" aria-label={`${label} 변화 그래프`}>
    <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    <text x={width - 6} y={14} textAnchor="end" fontSize={11} fill="#868e96">{label}</text>
  </svg>;
}
