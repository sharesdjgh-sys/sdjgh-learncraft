"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpenText, LogOut, NotebookTabs, School, UserRound } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types";

const navItems = [
  { href: "/learn", label: "학습", icon: BookOpenText },
  { href: "/notebook", label: "오답 노트", icon: NotebookTabs },
  { href: "/profile", label: "내 정보", icon: UserRound },
] as const;

export function StudentShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLearningPage = pathname.startsWith("/learn");

  async function logout() {
    sessionStorage.removeItem("learncraft_chat");
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[5.5rem_minmax(0,1fr)]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[5.5rem] flex-col border-r border-line bg-white/95 px-2.5 py-5 backdrop-blur-xl lg:flex">
        <Logo compact className="mx-auto" />
        <nav className="mt-9 grid gap-2" aria-label="학생 메뉴">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={cn(
                  "group flex min-h-[3.85rem] flex-col items-center justify-center gap-1.5 rounded-2xl text-[.67rem] font-semibold transition-all duration-300 ease-out active:scale-[.97]",
                  active
                    ? "bg-brand text-white shadow-[0_10px_24px_rgba(44,75,165,.18)]"
                    : "text-ink-soft hover:-translate-y-0.5 hover:bg-surface-muted hover:text-ink",
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.35 : 1.9} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto grid justify-items-center gap-3">
          <Link
            href="/profile"
            title={`${user.name} · ${user.schoolName}`}
            className="grid size-10 place-items-center rounded-2xl bg-brand-soft text-sm font-bold text-brand-dark transition hover:scale-[1.03]"
          >
            {user.name.slice(0, 1)}
          </Link>
          <button
            onClick={logout}
            title="로그아웃"
            className="grid size-10 cursor-pointer place-items-center rounded-2xl text-ink-soft transition-all duration-300 hover:bg-[#fff1f0] hover:text-danger active:scale-95"
            aria-label="로그아웃"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <div className="min-w-0 lg:col-start-2">
        {!isLearningPage && (
          <header className="sticky top-0 z-30 flex h-15 items-center justify-between border-b border-line/80 bg-white/92 px-4 backdrop-blur-xl lg:hidden">
            <Logo />
            <div className="ml-3 flex min-w-0 items-center gap-1.5 text-[.68rem] font-semibold text-ink-soft">
              <School size={14} className="shrink-0 text-brand" />
              <span className="max-w-32 truncate">{user.schoolName}</span>
            </div>
          </header>
        )}
        <main className="min-h-dvh pb-[calc(5.7rem+env(safe-area-inset-bottom))] lg:pb-0">{children}</main>
      </div>

      <nav className="fixed inset-x-3 bottom-[calc(.7rem+env(safe-area-inset-bottom))] z-40 grid h-[4.15rem] grid-cols-3 rounded-[1.35rem] border border-white/80 bg-white/94 p-1.5 shadow-[0_16px_42px_rgba(34,48,84,.16)] backdrop-blur-xl lg:hidden" aria-label="모바일 메뉴">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl text-[.67rem] font-semibold transition-all active:scale-[.97]",
                active ? "bg-brand-soft text-brand-dark" : "text-ink-soft",
              )}
            >
              <Icon size={19} strokeWidth={active ? 2.45 : 1.9} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
