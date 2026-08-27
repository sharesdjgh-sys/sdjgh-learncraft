import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2.5 rounded-lg", className)} aria-label="LearnCraft 홈">
      <span className="font-learning relative grid size-8 place-items-center rounded-[10px] border border-line bg-surface text-sm font-bold text-brand-dark shadow-[var(--lift-1)]" aria-hidden="true">
        L
        <span className="absolute inset-x-1.5 bottom-1 h-px bg-brand/55" />
      </span>
      {!compact && (
        <span className="text-[1.08rem] font-bold tracking-[-0.035em] text-ink">LearnCraft</span>
      )}
    </Link>
  );
}
