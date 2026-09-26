import Link from "next/link";
import { Atom, Dna, Globe2, Magnet, Microscope, PenTool } from "lucide-react";
import { cn } from "@/lib/utils";

// 과목마다 교사 지원실 메뉴가 하나이므로 과학 도구는 제목 아래 하위 탭으로 나눕니다. 실험 그림은 모든 과학 과목이 함께 씁니다.
const tools = [
  { key: "figure", label: "실험 그림", icon: PenTool },
  { key: "integrated", label: "통합·탐구", icon: Microscope },
  { key: "physics", label: "물리학", icon: Magnet },
  { key: "chemistry", label: "화학", icon: Atom },
  { key: "life", label: "생명과학", icon: Dna },
  { key: "earth", label: "지구과학", icon: Globe2 },
] as const;
export type ScienceTool = (typeof tools)[number]["key"];
export const scienceToolKeys = tools.map(tool => tool.key) as ScienceTool[];

export function ScienceToolTabs({ current }: { current: ScienceTool }) {
  return (
    <nav aria-label="과학 도구" className="mt-5 flex w-fit max-w-full flex-wrap gap-1 rounded-2xl border border-line bg-surface-2 p-1">
      {tools.map(({ key, label, icon: Icon }) => (
        <Link key={key} href={`/teacher/science?tool=${key}`} aria-current={current === key ? "page" : undefined}
          className={cn("flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-[.86rem] font-bold transition-colors", current === key ? "bg-surface text-brand-dark shadow-[var(--lift-1)]" : "text-ink-3 hover:text-brand-dark")}>
          <Icon size={16} aria-hidden="true" /> {label}
        </Link>
      ))}
    </nav>
  );
}
