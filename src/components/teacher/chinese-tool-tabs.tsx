import Link from "next/link";
import { FileText, Grid3x3, Lamp, Music2 } from "lucide-react";
import { cn } from "@/lib/utils";

// 과목마다 교사 지원실 메뉴가 하나이므로 중국어 도구는 제목 아래 하위 탭으로 나눕니다. 중국문화 과목도 같은 선생님이 맡는 일이 많아 함께 둡니다.
const tools = [
  { key: "pinyin", label: "병음 학습", icon: Music2 },
  { key: "text", label: "본문 풀이", icon: FileText },
  { key: "hanzi", label: "간체자 학습지", icon: Grid3x3 },
  { key: "culture", label: "중국문화", icon: Lamp },
] as const;
export type ChineseTool = (typeof tools)[number]["key"];

export function ChineseToolTabs({ current }: { current: ChineseTool }) {
  return (
    <nav aria-label="중국어 도구" className="mt-5 flex w-fit max-w-full flex-wrap gap-1 rounded-2xl border border-line bg-surface-2 p-1">
      {tools.map(({ key, label, icon: Icon }) => (
        <Link key={key} href={`/teacher/chinese?tool=${key}`} aria-current={current === key ? "page" : undefined}
          className={cn("flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-[.86rem] font-bold transition-colors", current === key ? "bg-surface text-brand-dark shadow-[var(--lift-1)]" : "text-ink-3 hover:text-brand-dark")}>
          <Icon size={16} aria-hidden="true" /> {label}
        </Link>
      ))}
    </nav>
  );
}
