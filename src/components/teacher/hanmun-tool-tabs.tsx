import Link from "next/link";
import { Grid3x3, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

// 과목마다 교사 지원실 메뉴가 하나이므로 한문 도구는 제목 아래 하위 탭으로 나눕니다.
const tools = [
  { key: "text", label: "원문 풀이", icon: ScrollText },
  { key: "hanja", label: "한자 학습지", icon: Grid3x3 },
] as const;
export type HanmunTool = (typeof tools)[number]["key"];

export function HanmunToolTabs({ current }: { current: HanmunTool }) {
  return (
    <nav aria-label="한문 도구" className="mt-5 flex w-fit gap-1 rounded-2xl border border-line bg-surface-2 p-1">
      {tools.map(({ key, label, icon: Icon }) => (
        <Link key={key} href={`/teacher/hanmun?tool=${key}`} aria-current={current === key ? "page" : undefined}
          className={cn("flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-[.86rem] font-bold transition-colors", current === key ? "bg-surface text-brand-dark shadow-[var(--lift-1)]" : "text-ink-3 hover:text-brand-dark")}>
          <Icon size={16} aria-hidden="true" /> {label}
        </Link>
      ))}
    </nav>
  );
}
