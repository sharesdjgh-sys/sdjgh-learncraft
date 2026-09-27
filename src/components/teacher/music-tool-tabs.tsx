import Link from "next/link";
import { Drum, Headphones, Music, Piano, Waves } from "lucide-react";
import { cn } from "@/lib/utils";

const tools = [{ key: "score", label: "악보 제작", icon: Music }, { key: "rhythm", label: "리듬 합주", icon: Drum }, { key: "jangdan", label: "국악 장단", icon: Waves }, { key: "theory", label: "음정·화음", icon: Piano }, { key: "listening", label: "감상·연주 활동지", icon: Headphones }] as const;
export type MusicTool = (typeof tools)[number]["key"];
export function MusicToolTabs({ current }: { current: MusicTool }) {
  return <nav data-tool-tabs aria-label="음악 도구" className="mt-5 flex w-fit max-w-full flex-wrap gap-1 rounded-2xl border border-line bg-surface-2 p-1">{tools.map(({ key, label, icon: Icon }) => <Link key={key} href={`/teacher/music-score?tool=${key}`} aria-current={key === current ? "page" : undefined} className={cn("flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-[.86rem] font-bold", key === current ? "bg-surface text-brand-dark shadow-[var(--lift-1)]" : "text-ink-3 hover:text-brand-dark")}><Icon size={16} aria-hidden="true" />{label}</Link>)}</nav>;
}
