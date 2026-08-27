"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpenText, LogOut, NotebookTabs, UserRound } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types";

export const studentNavItems = [
  { href: "/learn", label: "학습", icon: BookOpenText },
  { href: "/notebook", label: "오답 노트", icon: NotebookTabs },
  { href: "/profile", label: "내 정보", icon: UserRound },
] as const;

export function StudentTopNavigation({ actions, user }: { actions?: React.ReactNode; user: Pick<SessionUser, "name" | "schoolName"> }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    sessionStorage.removeItem("learncraft_chat");
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="veil z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-line px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-7">
        <Logo />
        <nav className="hidden items-center gap-1 min-[1024px]:flex" aria-label="학생 메뉴">
          {studentNavItems.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={cn("border-b-2 px-3 py-2.5 text-sm font-semibold transition-all duration-300", active ? "border-brand text-ink" : "border-transparent text-ink-4 hover:border-[var(--line-2)] hover:text-ink")}>
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {actions}
        <Link href="/profile" className="flex min-h-10 items-center gap-2 rounded-[12px] border border-line bg-surface px-1.5 pr-2.5 shadow-[var(--lift-1)] transition-all duration-300 hover:-translate-y-px hover:border-[var(--line-2)]" aria-label={`로그인 사용자 ${user.name}, 내 정보 보기`}>
          <span className="font-learning grid size-7 shrink-0 place-items-center rounded-[8px] bg-brand-soft text-[.78rem] font-bold text-brand-dark">{user.name.slice(0, 1)}</span>
          <span className="hidden min-w-0 leading-tight min-[520px]:block">
            <span className="block truncate text-[.78rem] font-bold text-ink">{user.name}</span>
            <span className="hidden max-w-32 truncate text-[.68rem] text-ink-5 xl:block">{user.schoolName}</span>
          </span>
        </Link>
        <button onClick={logout} className="grid size-10 place-items-center rounded-[11px] text-ink-4 transition hover:bg-[var(--danger-page)] hover:text-danger" aria-label="로그아웃" title="로그아웃">
          <LogOut size={17} strokeWidth={1.9} />
        </button>
      </div>
    </header>
  );
}

export function StudentBottomNavigation() {
  const pathname = usePathname();
  return (
    <nav className="veil fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-line px-3 pb-[calc(.45rem+env(safe-area-inset-bottom))] pt-1.5 min-[1024px]:hidden" aria-label="모바일 학생 메뉴">
      {studentNavItems.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link key={href} href={href} className={cn("flex min-h-13 flex-col items-center justify-center gap-1 rounded-[10px] border-t-2 text-[.78rem] font-semibold transition active:scale-[.98]", active ? "border-brand bg-brand-page text-brand-dark" : "border-transparent text-ink-4")}>
            <Icon size={18} strokeWidth={active ? 2.25 : 1.8} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
