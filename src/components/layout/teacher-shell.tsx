"use client";

import Link from "next/link";
import { BookA, BookOpenText, DraftingCompass, FlaskConical, GraduationCap, Languages, MapIcon, Music, Palette } from "lucide-react";
import { ConsoleShell, type ConsoleLink } from "@/components/layout/console-shell";
import { clearLearningSessions } from "@/lib/learning-session-cache";
import type { SessionUser } from "@/types";

// 과목별 교사 지원 도구가 늘어나면 이 목록에 추가합니다. subject는 과목 배지, label은 도구 이름입니다.
const links: readonly ConsoleLink[] = [
  { href: "/teacher/korean-vocabulary", subject: "국어", label: "어휘 카드", icon: BookA },
  { href: "/teacher/english", subject: "영어", label: "독해 문제", icon: Languages },
  { href: "/teacher/math-figures", subject: "수학", label: "도형 제작", icon: DraftingCompass },
  { href: "/teacher/social-map", subject: "사회", label: "지도 제작", icon: MapIcon },
  { href: "/teacher/science-figures", subject: "과학", label: "실험 그림", icon: FlaskConical },
  { href: "/teacher/music-score", subject: "음악", label: "악보 제작", icon: Music },
  { href: "/teacher/art-works", subject: "미술", label: "작품 감상", icon: Palette },
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
        <Link href="/learn" className="flex min-h-10 items-center gap-1.5 rounded-[11px] px-2.5 text-[.78rem] font-bold text-ink-3 transition hover:bg-surface-2 hover:text-brand-dark" title="학습 화면으로 돌아가기" aria-label="학습 화면으로 돌아가기">
          <BookOpenText size={16} aria-hidden="true" />
          <span className="hidden sm:inline lg:hidden xl:inline">학습 화면</span>
        </Link>
      )}
    >
      {children}
    </ConsoleShell>
  );
}
