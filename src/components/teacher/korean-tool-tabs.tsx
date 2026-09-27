import Link from "next/link";
import { BookA, BookOpenCheck, Feather, MessagesSquare, SpellCheck } from "lucide-react";
import { cn } from "@/lib/utils";

// 과목마다 교사 지원실 메뉴가 하나이므로 국어 도구는 제목 아래 하위 탭으로 나눕니다. 어휘 카드는 모든 국어 과목이 함께 씁니다.
const tools = [
  { key: "vocabulary", label: "어휘 카드", icon: BookA },
  { key: "grammar", label: "문법", icon: SpellCheck },
  { key: "literature", label: "문학", icon: Feather },
  { key: "speech", label: "화법·작문", icon: MessagesSquare },
  { key: "reading", label: "독서", icon: BookOpenCheck },
] as const;
export type KoreanTool = (typeof tools)[number]["key"];
export const koreanToolKeys = tools.map(tool => tool.key) as KoreanTool[];

export function KoreanToolTabs({ current }: { current: KoreanTool }) {
  return (
    <nav data-tool-tabs aria-label="국어 도구" className="mt-5 flex w-fit max-w-full flex-wrap gap-1 rounded-2xl border border-line bg-surface-2 p-1">
      {tools.map(({ key, label, icon: Icon }) => (
        <Link key={key} href={`/teacher/korean?tool=${key}`} aria-current={current === key ? "page" : undefined}
          className={cn("flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-[.86rem] font-bold transition-colors", current === key ? "bg-surface text-brand-dark shadow-[var(--lift-1)]" : "text-ink-3 hover:text-brand-dark")}>
          <Icon size={16} aria-hidden="true" /> {label}
        </Link>
      ))}
    </nav>
  );
}
