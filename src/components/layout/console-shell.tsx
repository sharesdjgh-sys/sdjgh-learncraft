"use client";

import Link from "next/link";
import type { Route } from "next";
import type { LucideIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types";

/** subject: optional small badge (e.g. "국어") shown before the tool label so tools read differently from subject names. */
export type ConsoleLink = { href: Route; label: string; icon: LucideIcon; subject?: string };

function SubjectBadge({ subject, active, stacked = false }: { subject: string; active: boolean; stacked?: boolean }) {
  return (
    <span className={cn(
      "shrink-0 rounded-[6px] font-bold leading-none",
      stacked ? "px-1.5 py-[3px] text-[.62rem] sm:text-[.66rem]" : "px-1.5 py-1 text-[.68rem]",
      active ? "bg-[#3217c9] text-white" : "bg-brand-soft text-brand-dark",
    )}>{subject}</span>
  );
}

export function ConsoleShell({ user, links, menuLabel, badgeIcon: BadgeIcon, actions, beforeLogout, children }: {
  user: SessionUser;
  links: readonly ConsoleLink[];
  menuLabel: string;
  badgeIcon: LucideIcon;
  actions?: React.ReactNode;
  beforeLogout?: () => Promise<unknown>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await Promise.allSettled([
      beforeLogout?.(),
      fetch("/api/auth/logout", { method: "POST" }),
    ]);
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="app-canvas min-h-dvh">
      <header className="veil sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-line px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-4 xl:gap-7">
          <Logo />
          <nav className="hidden items-center gap-0.5 min-[1024px]:flex xl:gap-1" aria-label={menuLabel}>
            {links.map(({ href, label, icon: Icon, subject }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  aria-label={subject ? `${subject} ${label}` : undefined}
                  className={cn(
                    "flex items-center border-b-2 text-sm font-semibold transition-[border-color,color] duration-200 active:scale-[.98]",
                    // Eight badge+label tools do not fit beside the account box below 1536px, so stack them there.
                    subject ? "flex-col gap-1 px-1.5 py-1.5 xl:px-2 2xl:flex-row 2xl:gap-2 2xl:px-3 2xl:py-2.5" : "gap-2 px-3 py-2.5",
                    active
                      ? "border-[#3217c9] text-[#3217c9]"
                      : "border-transparent text-[#996bf5] hover:border-[#996bf5]/40 hover:text-[#6847e8]",
                  )}
                >
                  {subject
                    ? <SubjectBadge subject={subject} active={active} />
                    : <Icon size={17} strokeWidth={active ? 2.25 : 1.8} aria-hidden="true" />}
                  <span className="whitespace-nowrap">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          <div className="flex min-h-10 items-center gap-2 rounded-[12px] border border-line bg-surface px-1.5 pr-3 shadow-[var(--lift-1)]" aria-label={`로그인 사용자 ${user.name}`}>
            <span className="grid size-7 place-items-center rounded-[8px] bg-brand-soft text-brand-dark"><BadgeIcon size={14} /></span>
            <span className="min-w-0 leading-tight">
              <span className="block max-w-28 truncate text-[.78rem] font-bold text-ink">{user.name}</span>
              <span className="hidden max-w-36 truncate text-[.68rem] text-ink-5 xl:block">{user.schoolName}</span>
            </span>
          </div>
          <button onClick={logout} className="grid size-10 place-items-center rounded-[11px] text-ink-4 transition hover:bg-[var(--danger-page)] hover:text-danger" aria-label="로그아웃"><LogOut size={17} /></button>
        </div>
      </header>
      <main className="pb-[calc(4.8rem+env(safe-area-inset-bottom))] min-[1024px]:pb-0">{children}</main>
      <nav
        className="veil fixed inset-x-0 bottom-0 z-40 grid border-t border-line px-1 pb-[calc(.45rem+env(safe-area-inset-bottom))] pt-1.5 min-[1024px]:hidden"
        style={{ gridTemplateColumns: `repeat(${Math.max(links.length, 1)}, minmax(0, 1fr))` }}
        aria-label={`모바일 ${menuLabel}`}
      >
        {links.map(({ href, label, icon: Icon, subject }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
                  aria-label={subject ? `${subject} ${label}` : undefined}
              className={cn(
                "flex min-h-13 flex-col items-center justify-center gap-1 border-b-2 text-[.72rem] font-semibold transition-[border-color,color] duration-200 active:scale-[.98] sm:text-[.78rem]",
                active
                  ? "border-[#3217c9] text-[#3217c9]"
                  : "border-transparent text-[#996bf5] hover:border-[#996bf5]/40 hover:text-[#6847e8]",
              )}
            >
              {subject
                ? <SubjectBadge subject={subject} active={active} stacked />
                : <Icon size={18} strokeWidth={active ? 2.25 : 1.8} aria-hidden="true" />}
              <span className={cn(subject && "whitespace-nowrap text-[.68rem] sm:text-[.76rem]")}>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
