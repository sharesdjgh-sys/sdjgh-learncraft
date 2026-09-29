"use client";

import { CircleQuestionMark } from "lucide-react";
import { cn } from "@/lib/utils";

/* 교사 지원실 도구(사회 지도, 과학 실험 그림)가 함께 쓰는 설정 패널 조각입니다. */

export function Card({ title, help, children, action }: { title: string; help?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return <section className="rounded-[18px] border border-line bg-surface p-4 shadow-[var(--lift-1)]">
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-extrabold text-ink">{title}{help && <HelpTip label={title} text={help} />}</h2>
      {action}
    </div>
    {children}
  </section>;
}
export function HelpTip({ label, text }: { label: string; text: string }) {
  return <span className="group relative">
    <button type="button" aria-label={`${label} 설명`} className="grid size-5 place-items-center rounded-full text-ink-4 transition-colors hover:text-brand-dark focus-visible:text-brand-dark"><CircleQuestionMark size={13} /></button>
    <span role="tooltip" className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden w-64 break-keep rounded-lg bg-[#2b2740] px-3 py-2 text-xs font-medium leading-5 text-white shadow-[0_10px_30px_rgba(20,16,40,.3)] group-hover:block group-focus-within:block">{text}</span>
  </span>;
}
export function Segmented<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string; title?: string }[]; onChange: (value: T) => void }) {
  return <div role="group" aria-label={label} className="flex flex-wrap gap-1 rounded-xl border border-line bg-surface-2 p-1">
    {options.map(option => <button key={String(option.value)} type="button" title={option.title} aria-pressed={value === option.value} onClick={() => onChange(option.value)}
      className={cn("min-h-8 flex-1 whitespace-nowrap rounded-lg px-2 text-xs font-bold transition-colors", value === option.value ? "bg-surface text-brand-dark shadow-[var(--lift-1)]" : "text-ink-3 hover:text-brand-dark")}>{option.label}</button>)}
  </div>;
}
export function Toggle({ label, checked, onChange, help }: { label: string; checked: boolean; onChange: (checked: boolean) => void; help?: string }) {
  return <label className="flex min-h-9 cursor-pointer items-center justify-between gap-3 rounded-lg px-1 text-[.8rem] font-semibold text-ink-2">
    <span className="flex items-center gap-1">{label}{help && <HelpTip label={label} text={help} />}</span>
    <span className="relative inline-flex">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={event => onChange(event.target.checked)} />
      <span className="h-5 w-9 rounded-full bg-line transition-colors peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand/30" />
      <span className="absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
    </span>
  </label>;
}
export function Range({ label, value, min, max, step = 1, suffix = "", onChange, onStart, onCommit }: { label: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (value: number) => void; onStart?: () => void; onCommit?: () => void }) {
  return <label className="block">
    <span className="mb-1 flex items-center justify-between text-xs font-semibold text-ink-4"><span>{label}</span><span className="font-bold text-ink-2">{value}{suffix}</span></span>
    <input type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))} onPointerDown={onStart} onKeyDown={onStart} onPointerUp={onCommit} onKeyUp={onCommit} onBlur={onCommit} className="w-full accent-[var(--brand)]" />
  </label>;
}
