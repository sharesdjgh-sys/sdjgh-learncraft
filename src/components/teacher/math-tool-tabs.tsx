import Link from "next/link";
import { Box, Dices, DraftingCompass, Sigma, Spline, SquareFunction, Variable } from "lucide-react";
import { cn } from "@/lib/utils";

// 과목마다 교사 지원실 메뉴가 하나이므로 수학 도구는 제목 아래 하위 탭으로 나눕니다. 도형 제작은 모든 수학 과목이 함께 씁니다.
const tools = [
  { key: "figure", label: "도형 제작", icon: DraftingCompass, color: "#475569", soft: "#edf1f5" },
  { key: "common1", label: "공통수학 1", icon: Variable, color: "#245ac1", soft: "#e7efff" },
  { key: "common2", label: "공통수학 2", icon: SquareFunction, color: "#08758c", soft: "#e2f3f8" },
  { key: "algebra", label: "대수", icon: Sigma, color: "#5947b5", soft: "#eeeafb" },
  { key: "calculus", label: "미적분Ⅰ", icon: Spline, color: "#8b408d", soft: "#f7eaf7" },
  { key: "probability", label: "확률과 통계", icon: Dices, color: "#976012", soft: "#fff1d8" },
  { key: "geometry", label: "기하", icon: Box, color: "#217751", soft: "#e2f3e9" },
] as const;
export type MathTool = (typeof tools)[number]["key"];
export const mathToolKeys = tools.map(tool => tool.key) as MathTool[];

export function MathToolTabs({ current }: { current: MathTool }) {
  return (
    <nav data-tool-tabs aria-label="수학 도구" className="mt-5 flex w-fit max-w-full flex-wrap gap-1 rounded-2xl border border-line bg-surface-2 p-1">
      {tools.map(({ key, label, icon: Icon, color, soft }) => (
        <Link key={key} href={`/teacher/math?tool=${key}`} aria-current={current === key ? "page" : undefined}
          style={{ color: current === key ? "#fff" : color, backgroundColor: current === key ? color : soft }}
          className={cn("flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-[.86rem] font-bold transition-colors", current === key ? "bg-surface text-brand-dark shadow-[var(--lift-1)]" : "text-ink-3 hover:text-brand-dark")}>
          <Icon size={16} aria-hidden="true" /> {label}
        </Link>
      ))}
    </nav>
  );
}
