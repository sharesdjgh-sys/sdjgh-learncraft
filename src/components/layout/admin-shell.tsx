"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, LogOut, Settings, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types";

const links = [
  { href: "/admin/dashboard", label: "사용 현황", icon: BarChart3 },
  { href: "/admin/settings", label: "운영 설정", icon: Settings },
] as const;

export function AdminShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="app-canvas min-h-dvh">
      <header className="veil sticky top-0 z-40 flex min-h-15 items-center justify-between gap-4 border-b border-line px-4 sm:px-6 lg:px-10">
        <div className="flex min-w-0 items-center gap-5 sm:gap-8">
          <Logo />
          <nav className="flex items-center gap-1" aria-label="관리자 메뉴">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return <Link key={href} href={href} className={cn("flex items-center gap-2 border-b-2 px-3 py-2.5 text-[.82rem] font-semibold transition sm:text-sm", active ? "border-brand text-ink" : "border-transparent text-ink-4 hover:border-[var(--line-2)] hover:text-ink")}><Icon size={16} className="hidden sm:block" />{label}</Link>;
            })}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex min-h-10 items-center gap-2 rounded-[12px] border border-line bg-surface px-1.5 pr-3 shadow-[var(--lift-1)]" aria-label={`로그인 사용자 ${user.name}`}>
            <span className="grid size-7 place-items-center rounded-[8px] bg-brand-soft text-brand-dark"><ShieldCheck size={14} /></span>
            <span className="min-w-0 leading-tight">
              <span className="block max-w-28 truncate text-[.78rem] font-bold text-ink">{user.name}</span>
              <span className="hidden max-w-36 truncate text-[.68rem] text-ink-5 lg:block">{user.schoolName}</span>
            </span>
          </div>
          <button onClick={logout} className="grid size-10 place-items-center rounded-[11px] text-ink-4 transition hover:bg-[var(--danger-page)] hover:text-danger" aria-label="로그아웃"><LogOut size={17} /></button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
