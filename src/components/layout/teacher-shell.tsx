"use client";

import Link from "next/link";
import { BookA, BookOpenText, DraftingCompass, GraduationCap, Languages, MapIcon, Music, Palette } from "lucide-react";
import { ConsoleShell, type ConsoleLink } from "@/components/layout/console-shell";
import { clearLearningSessions } from "@/lib/learning-session-cache";
import type { SessionUser } from "@/types";

// 과목별 교사 지원 도구가 늘어나면 이 목록에 추가합니다.
const links: readonly ConsoleLink[] = [
  { href: "/teacher/korean-vocabulary", label: "국어 어휘", icon: BookA },
  { href: "/teacher/english", label: "영어 독해", icon: Languages },
  { href: "/teacher/math-figures", label: "수학 도형", icon: DraftingCompass },
  { href: "/teacher/music-score", label: "음악 악보", icon: Music },
  { href: "/teacher/social-map", label: "사회 지도", icon: MapIcon },
  { href: "/teacher/art-works", label: "미술 작품", icon: Palette },
];

async function clearLearnerState() {
  sessionStorage.removeItem("learncraft_chat");
  await clearLearningSessions();
}

export function TeacherShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <ConsoleShell
      user={user}
      links={links}
      menuLabel="교사 지원실 메뉴"
      badgeIcon={GraduationCap}
      beforeLogout={clearLearnerState}
      actions={(
        <Link href="/learn" className="flex min-h-10 items-center gap-1.5 rounded-[11px] px-2.5 text-[.78rem] font-bold text-ink-3 transition hover:bg-surface-2 hover:text-brand-dark" title="학습 화면으로 돌아가기">
          <BookOpenText size={16} aria-hidden="true" />
          <span className="hidden sm:inline">학습 화면</span>
        </Link>
      )}
    >
      {children}
    </ConsoleShell>
  );
}
