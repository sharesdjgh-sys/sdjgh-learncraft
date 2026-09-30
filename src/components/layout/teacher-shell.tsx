"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import colors from "@/components/teacher/teacher-colors.module.css";
import { BookA, BookOpenText, BrainCircuit, DraftingCompass, FlaskConical, Flower2, Lamp, GraduationCap, Languages, MapIcon, Music, Palette, ScrollText, Trophy } from "lucide-react";
import { ConsoleShell, type ConsoleLink } from "@/components/layout/console-shell";
import { TeacherFeedbackButton } from "@/components/feedback/teacher-feedback-button";
import { TeacherAssistant } from "@/components/teacher/teacher-assistant";
import { clearLearningSessions } from "@/lib/learning-session-cache";
import type { SessionUser } from "@/types";

// 과목별 교사 지원 도구가 늘어나면 이 목록에 추가합니다. subject는 과목 배지, label은 도구 이름입니다.
const links: readonly ConsoleLink[] = [
  { href: "/teacher/korean", subject: "국어", label: "어휘·교과", icon: BookA, tone: { color: "#a33758", soft: "#fbe9ef" } },
  { href: "/teacher/english", subject: "영어", label: "독해·교과", icon: Languages, tone: { color: "#087573", soft: "#e0f4f1" } },
  { href: "/teacher/math", subject: "수학", label: "도형·교과", icon: DraftingCompass, tone: { color: "#245ac1", soft: "#e7efff" } },
  { href: "/teacher/social", subject: "사회", label: "지도·교과", icon: MapIcon, tone: { color: "#976012", soft: "#fff1d8" } },
  { href: "/teacher/science", subject: "과학", label: "실험 그림·교과", icon: FlaskConical, tone: { color: "#277a45", soft: "#e4f4e8" } },
  { href: "/teacher/ai-lab", subject: "AI", label: "원리 체험", icon: BrainCircuit, tone: { color: "#6943b9", soft: "#eee7fb" } },
  { href: "/teacher/music-score", subject: "음악", label: "악보·수업 활동", icon: Music, tone: { color: "#a13e85", soft: "#f9e7f4" } },
  { href: "/teacher/art-works", subject: "미술", label: "작품 감상", icon: Palette, tone: { color: "#ad4e22", soft: "#fff0e5" } },
  { href: "/teacher/pe", subject: "체육", label: "경기 도구", icon: Trophy, tone: { color: "#55751c", soft: "#eef5dc" } },
  { href: "/teacher/hanmun", subject: "한문", label: "학습지 제작", icon: ScrollText, tone: { color: "#806044", soft: "#f4ece2" } },
  { href: "/teacher/japanese", subject: "일본어", label: "학습지·문화", icon: Flower2, tone: { color: "#b43e62", soft: "#ffeaf0" } },
  { href: "/teacher/chinese", subject: "중국어", label: "학습지·문화", icon: Lamp, tone: { color: "#b34235", soft: "#ffebe7" } },
];

async function clearLearnerState() {
  sessionStorage.removeItem("learncraft_chat");
  await clearLearningSessions();
}

export function TeacherShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const subject = links.find(link => pathname.startsWith(link.href));
  const tone = subject?.tone;
  const colorStyle = tone ? {
    "--brand": tone.color,
    "--brand-dark": tone.color,
    "--brand-soft": tone.soft,
    "--brand-page": `color-mix(in srgb, ${tone.soft} 45%, white)`,
  } as CSSProperties : undefined;
  return (
    <ConsoleShell
      user={user}
      links={links}
      menuLabel="교사 지원실 메뉴"
      badgeIcon={GraduationCap}
      beforeLogout={clearLearnerState}
      actions={(<>
        {/* 관리자는 피드백을 받는 쪽이라 보내기 버튼은 선생님 계정에만 둡니다. */}
        {user.role === "TEACHER" && <TeacherFeedbackButton subject={subject?.subject} tool={subject?.label} colorStyle={colorStyle} />}
        <Link href="/learn" className="flex min-h-10 items-center gap-1.5 rounded-[11px] px-2.5 text-[.78rem] font-bold text-ink-3 transition hover:bg-surface-2 hover:text-brand-dark" title="학습 화면으로 돌아가기" aria-label="학습 화면으로 돌아가기">
          <BookOpenText size={16} aria-hidden="true" />
          <span className="hidden sm:inline lg:hidden xl:inline">학습 화면</span>
        </Link>
      </>)}
    >
      <div className={colors.scope} data-subject={subject?.subject} style={colorStyle}>{children}</div>
      <TeacherAssistant subject={subject?.subject} tool={subject?.label} />
    </ConsoleShell>
  );
}
