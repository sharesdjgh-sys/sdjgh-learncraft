import Link from "next/link";
import { Coins, Globe2, Hourglass, Landmark, MapIcon, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

// 과목마다 교사 지원실 메뉴가 하나이므로 사회 도구는 제목 아래 하위 탭으로 나눕니다. 지도 제작은 모든 사회 과목이 함께 씁니다.
const tools = [
  { key: "map", label: "지도 제작", icon: MapIcon },
  { key: "history", label: "역사", icon: Hourglass },
  { key: "geography", label: "지리", icon: Globe2 },
  { key: "politics", label: "정치·법", icon: Landmark },
  { key: "economy", label: "경제", icon: Coins },
  { key: "ethics", label: "윤리", icon: Scale },
] as const;
export type SocialTool = (typeof tools)[number]["key"];
export const socialToolKeys = tools.map(tool => tool.key) as SocialTool[];

export function SocialToolTabs({ current }: { current: SocialTool }) {
  return (
    <nav aria-label="사회 도구" className="mt-5 flex w-fit max-w-full flex-wrap gap-1 rounded-2xl border border-line bg-surface-2 p-1">
      {tools.map(({ key, label, icon: Icon }) => (
        <Link key={key} href={`/teacher/social?tool=${key}`} aria-current={current === key ? "page" : undefined}
          className={cn("flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-[.86rem] font-bold transition-colors", current === key ? "bg-surface text-brand-dark shadow-[var(--lift-1)]" : "text-ink-3 hover:text-brand-dark")}>
          <Icon size={16} aria-hidden="true" /> {label}
        </Link>
      ))}
    </nav>
  );
}
