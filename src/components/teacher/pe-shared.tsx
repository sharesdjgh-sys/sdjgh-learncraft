"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ClipboardPen, LoaderCircle, ShieldCheck, Trophy, Volleyball } from "lucide-react";
import { cn } from "@/lib/utils";

/* 체육 경기 도구(전술 보드, 팀·대진표)가 함께 쓰는 머리말과 탭입니다. */

export const peTools = [
  { key: "tactics", label: "전술 보드", icon: ClipboardPen, title: "전술 보드", help: "경기장에 선수와 공을 놓고 이동·패스 화살표를 그려 작전을 단계별로 보여 줍니다. 댄스·줄넘기 대형과 동선도 짤 수 있어요." },
  { key: "league", label: "팀·대진표", icon: Trophy, title: "팀 편성과 대진표", help: "명단으로 실력·성별이 고른 팀을 나누고, 리그전 일정과 토너먼트 대진표를 만들어 점수와 순위를 기록합니다." },
] as const;
export type PeTool = (typeof peTools)[number]["key"];

const noop = () => () => {};

export function PeShell({ current, children }: { current: PeTool; children: React.ReactNode }) {
  const tool = peTools.find((item) => item.key === current)!;
  // 경기장 그림과 편집은 브라우저 저장소·포인터를 쓰므로 브라우저에서만 그립니다.
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  return <div className="mx-auto max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <header className="grid gap-4 border-b border-line pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
      <div>
        <p className="flex items-center gap-2 text-[.82rem] font-bold text-brand"><Volleyball size={16} /> 교사 지원실 · 체육</p>
        <h1 className="mt-2 text-[1.85rem] font-extrabold tracking-[-0.04em]">{tool.title}</h1>
        <p className="mt-2 break-keep text-[.86rem] leading-6 text-ink-3">{tool.help}</p>
      </div>
      <span className="flex w-fit items-center gap-2 rounded-full border border-brand/15 bg-brand-page px-3 py-2 text-[.78rem] font-bold text-brand-dark"><ShieldCheck size={15} /> 교사·관리자에게만 표시됨</span>
    </header>
    <nav data-tool-tabs aria-label="체육 경기 도구" className="mt-5 flex w-fit max-w-full flex-wrap gap-1 rounded-2xl border border-line bg-surface-2 p-1">
      {peTools.map(({ key, label, icon: Icon }) => (
        <Link key={key} href={`/teacher/pe?tool=${key}`} aria-current={current === key ? "page" : undefined}
          className={cn("flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-[.86rem] font-bold transition-colors", current === key ? "bg-surface text-brand-dark shadow-[var(--lift-1)]" : "text-ink-3 hover:text-brand-dark")}>
          <Icon size={16} aria-hidden="true" /> {label}
        </Link>
      ))}
    </nav>
    <div className="mt-5">{hydrated ? children : <div className="flex min-h-[50vh] items-center justify-center text-sm text-ink-4"><LoaderCircle size={18} className="mr-2 animate-spin" /> 도구를 준비하는 중…</div>}</div>
  </div>;
}
