import Link from "next/link";
import { FileQuestion, Languages } from "lucide-react";
import { cn } from "@/lib/utils";

// 과목마다 교사 지원실 메뉴가 하나이므로 영어 도구는 제목 아래 하위 탭으로 나눕니다.
const tools = [
  { key: "questions", label: "변형 문제", icon: FileQuestion },
  { key: "vocabulary", label: "어원 카드", icon: Languages },
] as const;
export type EnglishTool = (typeof tools)[number]["key"];

export function EnglishToolTabs({ current }: { current: EnglishTool }) {
  return (
    <nav aria-label="영어 독해 도구" className="mt-5 flex w-fit gap-1 rounded-2xl border border-line bg-surface-2 p-1">
      {tools.map(({ key, label, icon: Icon }) => (
        <Link key={key} href={`/teacher/english?tool=${key}`} aria-current={current === key ? "page" : undefined}
          className={cn("flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-[.86rem] font-bold transition-colors", current === key ? "bg-surface text-brand-dark shadow-[var(--lift-1)]" : "text-ink-3 hover:text-brand-dark")}>
          <Icon size={16} aria-hidden="true" /> {label}
        </Link>
      ))}
    </nav>
  );
}
