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
              return <Link key={href} href={href} className={cn("flex items-center gap-2 rounded-full px-3 py-2 text-[.82rem] font-semibold transition sm:px-4 sm:text-sm", active ? "bg-brand text-white shadow-[0_4px_12px_rgba(107,80,197,.2)]" : "text-ink-3 hover:bg-surface-3 hover:text-ink")}><Icon size={16} strokeWidth={1.9} className="hidden sm:block" />{label}</Link>;
            })}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full bg-surface-3 px-3 py-2 text-[.8rem] font-semibold text-ink-3 md:flex"><ShieldCheck size={14} className="text-brand" />{user.name}</div>
          <button onClick={logout} className="grid size-10 place-items-center rounded-full text-ink-4 transition hover:bg-[var(--danger-page)] hover:text-danger" aria-label="로그아웃"><LogOut size={17} /></button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
