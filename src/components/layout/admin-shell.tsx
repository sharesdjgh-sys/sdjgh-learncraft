"use client";

import { BarChart3, LibraryBig, Settings, ShieldCheck, UsersRound, MessageSquareText } from "lucide-react";
import { ConsoleShell, type ConsoleLink } from "@/components/layout/console-shell";
import type { SessionUser } from "@/types";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import colors from "@/components/admin/admin-colors.module.css";

const links: readonly ConsoleLink[] = [
  { href: "/admin/dashboard", label: "사용 현황", icon: BarChart3, tone: { color: "#245ac1", soft: "#e7efff" } },
  { href: "/admin/curriculum", label: "교육과정", icon: LibraryBig, tone: { color: "#277a45", soft: "#e4f4e8" } },
  { href: "/admin/accounts", label: "계정 관리", icon: UsersRound, tone: { color: "#6943b9", soft: "#eee7fb" } },
  { href: "/admin/feedback", label: "피드백", icon: MessageSquareText, tone: { color: "#087573", soft: "#e0f4f1" } },
  { href: "/admin/settings", label: "운영 설정", icon: Settings, tone: { color: "#976012", soft: "#fff1d8" } },
];

export function AdminShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const tone = links.find(link => pathname.startsWith(link.href))?.tone;
  const colorStyle = tone ? {
    "--brand": tone.color,
    "--brand-dark": tone.color,
    "--brand-soft": tone.soft,
    "--brand-page": `color-mix(in srgb, ${tone.soft} 45%, white)`,
  } as CSSProperties : undefined;
  return <ConsoleShell user={user} links={links} menuLabel="관리자 메뉴" badgeIcon={ShieldCheck}>
    <div className={colors.scope} style={colorStyle}>{children}</div>
  </ConsoleShell>;
}
