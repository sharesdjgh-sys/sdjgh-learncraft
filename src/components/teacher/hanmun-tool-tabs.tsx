import Link from "next/link";
import { Grid3x3, ScrollText, MessagesSquare, Puzzle, SpellCheck } from "lucide-react";
import { cn } from "@/lib/utils";

// 과목마다 교사 지원실 메뉴가 하나이므로 한문 도구는 제목 아래 하위 탭으로 나눕니다.
const tools = [
  { key: "text", label: "원문 풀이", icon: ScrollText },
  { key: "hanja", label: "한자 학습지", icon: Grid3x3 },
  { key: "grammar", label: "허사·문장 형식", icon: SpellCheck },
  { key: "idioms", label: "성어·생활 적용", icon: MessagesSquare },
  { key: "sentence", label: "문장 재구성", icon: Puzzle },
] as const;
export type HanmunTool = (typeof tools)[number]["key"];

export function HanmunToolTabs({ current }: { current: HanmunTool }) {
  return (
    <nav data-tool-tabs aria-label="한문 도구" className="mt-5 flex w-fit max-w-full flex-wrap gap-1 rounded-2xl border border-line bg-surface-2 p-1">
      {tools.map(({ key, label, icon: Icon }) => (
        <Link key={key} href={`/teacher/hanmun?tool=${key}`} aria-current={current === key ? "page" : undefined}
          className={cn("flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-[.86rem] font-bold transition-colors", current === key ? "bg-surface text-brand-dark shadow-[var(--lift-1)]" : "text-ink-3 hover:text-brand-dark")}>
          <Icon size={16} aria-hidden="true" /> {label}
        </Link>
      ))}
    </nav>
  );
}
