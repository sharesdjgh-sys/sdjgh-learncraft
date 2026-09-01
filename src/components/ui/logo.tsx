import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex shrink-0 items-center rounded-lg", className)} aria-label="LearnCraft 홈">
      {compact ? (
        <span className="font-learning relative grid size-8 place-items-center rounded-[10px] border border-line bg-surface text-sm font-bold text-brand-dark shadow-[var(--lift-1)]" aria-hidden="true">
          L
          <span className="absolute inset-x-1.5 bottom-1 h-px bg-brand/55" />
        </span>
      ) : (
        <span className="relative block h-9 w-40 overflow-hidden sm:h-10 sm:w-[11.125rem]" aria-hidden="true">
          <Image
            src="/learncraft-logo-header-theme-v2.png"
            alt=""
            width={1956}
            height={804}
            loading="eager"
            className="absolute max-w-none"
            style={{ width: "108.25%", height: "198.52%", left: "-4.98%", top: "-46.42%" }}
          />
        </span>
      )}
    </Link>
  );
}
