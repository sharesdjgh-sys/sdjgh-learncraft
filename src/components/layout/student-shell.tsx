"use client";

import { usePathname } from "next/navigation";
import { School } from "lucide-react";
import { StudentBottomNavigation, StudentTopNavigation } from "@/components/layout/student-navigation";
import type { SessionUser } from "@/types";

export function StudentShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const isLearningPage = pathname.startsWith("/learn");

  return (
    <div className="app-canvas min-h-dvh">
      {!isLearningPage && (
        <StudentTopNavigation actions={(
          <div className="hidden items-center gap-2 rounded-full bg-surface-3 px-3 py-2 text-[.8rem] font-semibold text-ink-3 sm:flex">
            <School size={14} className="text-brand" />
            <span className="max-w-36 truncate">{user.schoolName}</span>
          </div>
        )} />
      )}
      <main className={isLearningPage ? "min-h-dvh" : "min-h-[calc(100dvh-3.75rem)] pb-[calc(4.8rem+env(safe-area-inset-bottom))] min-[1024px]:pb-0"}>{children}</main>
      <StudentBottomNavigation />
    </div>
  );
}
