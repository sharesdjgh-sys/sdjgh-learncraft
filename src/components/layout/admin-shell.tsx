"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, LogOut, Menu, Settings, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types";

const links = [
  { href: "/admin/dashboard", label: "사용 현황", icon: BarChart3 },
  { href: "/admin/settings", label: "운영 설정", icon: Settings },
] as const;

export function AdminShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const sidebar = (
    <div className="flex h-full flex-col px-4 py-5">
      <div className="flex items-center justify-between px-2"><Logo /><button className="grid size-10 place-items-center lg:hidden" onClick={() => setOpen(false)} aria-label="메뉴 닫기"><X size={20} /></button></div>
      <div className="mt-8 rounded-xl bg-[#eff4f2] px-3.5 py-3"><p className="flex items-center gap-2 text-xs font-extrabold text-brand"><ShieldCheck size={15} /> SCHOOL ADMIN</p><p className="mt-1.5 truncate text-sm font-bold text-ink">LearnCraft 고등학교</p></div>
      <nav className="mt-6 grid gap-1.5">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setOpen(false)} className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold", pathname.startsWith(href) ? "bg-brand text-white shadow-[0_8px_20px_rgba(12,110,93,.16)]" : "text-ink-soft hover:bg-surface-muted hover:text-ink")}><Icon size={18} />{label}</Link>)}</nav>
      <div className="mt-auto border-t border-line pt-4"><p className="px-2 text-sm font-bold">{user.name}</p><p className="mt-1 px-2 text-xs text-ink-soft">학교 관리자</p><button onClick={logout} className="mt-3 flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-xs font-semibold text-ink-soft hover:bg-surface-muted"><LogOut size={15} /> 로그아웃</button></div>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15.5rem_1fr]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[15.5rem] border-r border-line bg-white lg:block">{sidebar}</aside>
      <div className="lg:col-start-2">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-white/90 px-4 backdrop-blur-xl lg:hidden"><Logo /><Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="관리자 메뉴 열기"><Menu size={21} /></Button></header>
        <main>{children}</main>
      </div>
      {open && <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-[#112a25]/35" onClick={() => setOpen(false)} aria-label="메뉴 닫기" /><aside className="absolute inset-y-0 left-0 w-[18rem] bg-white shadow-2xl">{sidebar}</aside></div>}
    </div>
  );
}
