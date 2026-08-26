import Link from "next/link";
import { Blocks } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2.5 rounded-lg", className)} aria-label="LearnCraft 홈">
      <span className="grid size-9 place-items-center rounded-xl bg-brand text-white shadow-[0_7px_18px_rgba(44,75,165,.24)]">
        <Blocks size={19} strokeWidth={2.3} />
      </span>
      {!compact && (
        <span className="text-[1.08rem] font-extrabold tracking-[-0.035em] text-ink">
          Learn<span className="text-brand">Craft</span>
        </span>
      )}
    </Link>
  );
}
