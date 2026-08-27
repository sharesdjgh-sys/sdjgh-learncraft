"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpenText, LogOut, NotebookTabs, UserRound } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

export const studentNavItems = [
  { href: "/learn", label: "학습", icon: BookOpenText },
  { href: "/notebook", label: "오답 노트", icon: NotebookTabs },
  { href: "/profile", label: "내 정보", icon: UserRound },
] as const;

export function StudentTopNavigation({ actions }: { actions?: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    sessionStorage.removeItem("learncraft_chat");
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="veil z-40 flex h-15 shrink-0 items-center justify-between gap-4 border-b border-line px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-7">
        <Logo />
        <nav className="hidden items-center gap-1 min-[1024px]:flex" aria-label="학생 메뉴">
          {studentNavItems.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={cn("rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300", active ? "bg-brand text-white shadow-[0_4px_12px_rgba(107,80,197,.2)]" : "text-ink-3 hover:bg-surface-3 hover:text-ink")}>
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {actions}
        <button onClick={logout} className="grid size-10 place-items-center rounded-full text-ink-4 transition hover:bg-[var(--danger-page)] hover:text-danger" aria-label="로그아웃" title="로그아웃">
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
          <Link key={href} href={href} className={cn("flex min-h-13 flex-col items-center justify-center gap-1 rounded-[14px] text-[.78rem] font-semibold transition active:scale-[.98]", active ? "bg-brand-soft text-brand-dark" : "text-ink-4")}>
            <Icon size={18} strokeWidth={active ? 2.25 : 1.8} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
