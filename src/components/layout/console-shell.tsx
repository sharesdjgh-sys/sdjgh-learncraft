"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { Route } from "next";
import type { LucideIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types";

/** subject: optional small badge (e.g. "국어") shown before the tool label so tools read differently from subject names. */
export type ConsoleLink = { href: Route; label: string; icon: LucideIcon; subject?: string; tone?: { color: string; soft: string } };

// alone: 도구 이름 없이 배지만 보여 줄 때는 배지를 조금 크게 그립니다.
function SubjectBadge({ subject, active, stacked = false, alone = false, tone }: { subject: string; active: boolean; stacked?: boolean; alone?: boolean; tone?: ConsoleLink["tone"] }) {
  return (
    <span style={tone ? { backgroundColor: active ? tone.color : tone.soft, color: active ? "#fff" : tone.color } : undefined} className={cn(
      "shrink-0 whitespace-nowrap rounded-[6px] font-bold leading-none",
      alone ? stacked ? "px-2 py-1.5 text-[.72rem]" : "px-2.5 py-1.5 text-[.8rem]" : stacked ? "px-1.5 py-[3px] text-[.62rem] sm:text-[.66rem]" : "px-1.5 py-1 text-[.68rem]",
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
  // 메뉴가 많으면(지금의 교사 지원실) 과목 배지만 보여 주고 도구 이름은 마우스를 올렸을 때 보여 줍니다.
  // 선생님 교과만 남겨 메뉴가 7개 이하가 되면 배지와 도구 이름을 두 줄로 모두 보여 줍니다.
  // 휴대폰 아래 메뉴는 가로로 밀어 보게 하고, 지금 메뉴가 보이도록 옮겨 둡니다.
  const crowded = links.length > 7;
  const scrollable = crowded;
  const mobileNav = useRef<HTMLElement>(null);
  useEffect(() => {
    if (scrollable) mobileNav.current?.querySelector("[aria-current=page]")?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pathname, scrollable]);
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
        <div className="flex min-w-0 items-center gap-4 max-[439px]:overflow-hidden xl:gap-7">
          {/* 추가 버튼이 있는 좁은 휴대폰에서는 로고를 같은 비율로 조금 줄여 버튼 자리를 만듭니다. */}
          <Logo className={actions ? "max-[399px]:[&>span]:h-8 max-[399px]:[&>span]:w-[8.9rem]" : undefined} />
          <nav className={cn("hidden items-center min-[1024px]:flex", crowded ? "gap-0.5 xl:gap-1.5 2xl:gap-3" : links.some((link) => link.subject) ? "gap-0.5 min-[1160px]:gap-1.5 xl:gap-2 2xl:gap-5" : "gap-0.5 xl:gap-1")} aria-label={menuLabel}>
            {links.map(({ href, label, icon: Icon, subject, tone }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  aria-label={subject ? `${subject} ${label}` : undefined}
                  title={subject ? `${subject} ${label}` : undefined}
                  style={tone ? { color: tone.color, borderBottomColor: active ? tone.color : "transparent" } : undefined}
                  className={cn(
                    "flex items-center border-b-2 text-sm font-semibold transition-[border-color,color] duration-200 active:scale-[.98]",
                    // Badge+label tools always stack (badge above label) so many tools fit with room between them.
                    subject ? crowded ? "px-1 py-2.5 xl:px-1.5" : "flex-col gap-1 px-1.5 py-1 min-[1160px]:px-2 xl:px-2.5 2xl:px-3" : "gap-2 px-3 py-2.5",
                    active
                      ? "border-[#3217c9] text-[#3217c9]"
                      : "border-transparent text-[#996bf5] hover:border-[#996bf5]/40 hover:text-[#6847e8]",
                  )}
                >
                  {subject
                    ? <SubjectBadge subject={subject} active={active} alone={crowded} tone={tone} />
                    : <Icon size={17} strokeWidth={active ? 2.25 : 1.8} aria-hidden="true" />}
                  {!(subject && crowded) && <span className="whitespace-nowrap">{label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className={cn("flex shrink-0 items-center gap-2", actions && "max-[439px]:gap-1")}>
          {actions}
          {/* 1024~1159px에서는 메뉴 자리를 위해 이름을 숨기고 아이콘만 둡니다(마우스를 올리면 이름이 보여요). 추가 버튼이 있으면 440px 미만 휴대폰에서도 같게 합니다. */}
          <div className={cn("flex min-h-10 items-center gap-2 rounded-[12px] border border-line bg-surface px-1.5 pr-3 shadow-[var(--lift-1)] min-[1024px]:max-[1159px]:pr-1.5", actions && "max-[439px]:pr-1.5")} aria-label={`로그인 사용자 ${user.name}`} title={user.name}>
            <span className="grid size-7 place-items-center rounded-[8px] bg-brand-soft text-brand-dark"><BadgeIcon size={14} /></span>
            <span className={cn("min-w-0 leading-tight min-[1024px]:max-[1159px]:hidden", actions && "max-[439px]:hidden")}>
              <span className="block max-w-28 truncate text-[.78rem] font-bold text-ink">{user.name}</span>
              <span className="hidden max-w-36 truncate text-[.68rem] text-ink-5 xl:block">{user.schoolName}</span>
            </span>
          </div>
          <button onClick={logout} className="grid size-10 place-items-center rounded-[11px] text-ink-4 transition hover:bg-[var(--danger-page)] hover:text-danger" aria-label="로그아웃"><LogOut size={17} /></button>
        </div>
      </header>
      <main className="pb-[calc(4.8rem+env(safe-area-inset-bottom))] min-[1024px]:pb-0">{children}</main>
      <nav
        ref={mobileNav}
        className={cn("veil fixed inset-x-0 bottom-0 z-40 grid border-t border-line px-1 pb-[calc(.45rem+env(safe-area-inset-bottom))] pt-1.5 min-[1024px]:hidden", scrollable && "auto-cols-[minmax(3.4rem,1fr)] grid-flow-col overflow-x-auto overscroll-x-contain [scrollbar-width:none]")}
        style={scrollable ? undefined : { gridTemplateColumns: `repeat(${Math.max(links.length, 1)}, minmax(0, 1fr))` }}
        aria-label={`모바일 ${menuLabel}`}
      >
        {links.map(({ href, label, icon: Icon, subject, tone }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              style={tone ? { color: tone.color, borderBottomColor: active ? tone.color : "transparent" } : undefined}
                  aria-label={subject ? `${subject} ${label}` : undefined}
              className={cn(
                "flex min-h-13 flex-col items-center justify-center gap-1 border-b-2 text-[.72rem] font-semibold transition-[border-color,color] duration-200 active:scale-[.98] sm:text-[.78rem]",
                active
                  ? "border-[#3217c9] text-[#3217c9]"
                  : "border-transparent text-[#996bf5] hover:border-[#996bf5]/40 hover:text-[#6847e8]",
              )}
            >
              {subject
                ? <SubjectBadge subject={subject} active={active} stacked alone={crowded} tone={tone} />
                : <Icon size={18} strokeWidth={active ? 2.25 : 1.8} aria-hidden="true" />}
              {!(subject && crowded) && <span className={cn(subject && "whitespace-nowrap text-[.68rem] sm:text-[.76rem]")}>{label}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
