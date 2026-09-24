"use client";

import { BarChart3, DraftingCompass, LibraryBig, Settings, ShieldCheck, UsersRound, MessageSquareText } from "lucide-react";
import { ConsoleShell, type ConsoleLink } from "@/components/layout/console-shell";
import type { SessionUser } from "@/types";

const links: readonly ConsoleLink[] = [
  { href: "/admin/dashboard", label: "사용 현황", icon: BarChart3 },
  { href: "/admin/curriculum", label: "교육과정", icon: LibraryBig },
  { href: "/admin/accounts", label: "계정 관리", icon: UsersRound },
  { href: "/admin/feedback", label: "피드백", icon: MessageSquareText },
  { href: "/admin/math-figures", label: "수학 도형", icon: DraftingCompass },
  { href: "/admin/settings", label: "운영 설정", icon: Settings },
];

export function AdminShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return <ConsoleShell user={user} links={links} menuLabel="관리자 메뉴" badgeIcon={ShieldCheck}>{children}</ConsoleShell>;
}
