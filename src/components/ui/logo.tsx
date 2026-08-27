import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2.5 rounded-xl", className)} aria-label="LearnCraft 홈">
      <span className="relative grid size-5 place-items-center" aria-hidden="true">
        <span className="absolute size-4 rounded-full bg-brand/15" />
        <span className="relative size-2.5 rounded-full bg-brand shadow-[0_0_0_3px_rgba(123,92,240,.12)]" />
      </span>
      {!compact && (
        <span className="text-[1.08rem] font-extrabold tracking-[-0.04em] text-ink">LearnCraft</span>
      )}
    </Link>
  );
}
