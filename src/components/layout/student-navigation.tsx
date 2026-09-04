"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpenText, LogOut, NotebookTabs } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types";

export const studentNavItems = [
  { href: "/learn", label: "학습", icon: BookOpenText },
  { href: "/notebook", label: "학습 북마크", icon: NotebookTabs },
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
    <header className="veil sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-line px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-7">
        <Logo />
        <nav className="hidden items-center gap-1 min-[1024px]:flex" aria-label="학생 메뉴">
          {studentNavItems.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-[border-color,color] duration-200 active:scale-[.98]",
                  active
                    ? "border-[#3217c9] text-[#3217c9]"
                    : "border-transparent text-[#996bf5] hover:border-[#996bf5]/40 hover:text-[#6847e8]",
                )}
              >
                <Icon size={17} strokeWidth={active ? 2.25 : 1.8} aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {actions}
        <Link href="/profile" title="내 정보 보기" className="flex min-h-10 items-center gap-2 rounded-[12px] border border-line bg-surface px-1.5 pr-2.5 shadow-[var(--lift-1)] transition-all duration-300 hover:-translate-y-px hover:border-[var(--line-2)]" aria-label={`로그인 사용자 ${user.name}, 내 정보 보기`}>
          <Image
            src="/images/sdj-school-logo.webp"
            alt={`${user.schoolName} 로고`}
            width={1415}
            height={224}
            className="hidden h-7 w-auto max-w-[10.5rem] shrink-0 object-contain lg:block"
          />
          <span className="hidden h-6 w-px shrink-0 bg-line lg:block" aria-hidden="true" />
          <span className="font-learning grid size-7 shrink-0 place-items-center rounded-[8px] bg-brand-soft text-[.78rem] font-bold text-brand-dark lg:hidden">{user.name.slice(0, 1)}</span>
          <span className="hidden min-w-0 leading-tight min-[520px]:block">
            <span className="block truncate text-[.78rem] font-bold text-ink">{user.name}</span>
            <span className="hidden max-w-32 truncate text-[.68rem] text-ink-5 min-[520px]:block lg:hidden">{user.schoolName}</span>
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
    <nav className="veil fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-line px-3 pb-[calc(.45rem+env(safe-area-inset-bottom))] pt-1.5 min-[1024px]:hidden" aria-label="모바일 학생 메뉴">
      {studentNavItems.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-13 flex-col items-center justify-center gap-1 border-b-2 text-[.78rem] font-semibold transition-[border-color,color] duration-200 active:scale-[.98]",
              active
                ? "border-[#3217c9] text-[#3217c9]"
                : "border-transparent text-[#996bf5] hover:border-[#996bf5]/40 hover:text-[#6847e8]",
            )}
          >
            <Icon size={18} strokeWidth={active ? 2.25 : 1.8} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
