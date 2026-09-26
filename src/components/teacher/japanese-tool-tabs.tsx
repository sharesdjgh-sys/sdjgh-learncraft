import Link from "next/link";
import { FileText, Flower2, Grid3x3, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";

// 과목마다 교사 지원실 메뉴가 하나이므로 일본어 도구는 제목 아래 하위 탭으로 나눕니다. 일본문화 과목도 같은 선생님이 맡는 일이 많아 함께 둡니다.
const tools = [
  { key: "kana", label: "가나 학습", icon: Grid3x3 },
  { key: "text", label: "본문 풀이", icon: FileText },
  { key: "verb", label: "활용 연습", icon: Repeat },
  { key: "culture", label: "일본문화", icon: Flower2 },
] as const;
export type JapaneseTool = (typeof tools)[number]["key"];

export function JapaneseToolTabs({ current }: { current: JapaneseTool }) {
  return (
    <nav aria-label="일본어 도구" className="mt-5 flex w-fit max-w-full flex-wrap gap-1 rounded-2xl border border-line bg-surface-2 p-1">
      {tools.map(({ key, label, icon: Icon }) => (
        <Link key={key} href={`/teacher/japanese?tool=${key}`} aria-current={current === key ? "page" : undefined}
          className={cn("flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-[.86rem] font-bold transition-colors", current === key ? "bg-surface text-brand-dark shadow-[var(--lift-1)]" : "text-ink-3 hover:text-brand-dark")}>
          <Icon size={16} aria-hidden="true" /> {label}
        </Link>
      ))}
    </nav>
  );
}
