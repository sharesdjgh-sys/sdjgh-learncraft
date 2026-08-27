"use client";

import { usePathname } from "next/navigation";
import { StudentBottomNavigation, StudentTopNavigation } from "@/components/layout/student-navigation";
import type { SessionUser } from "@/types";

export function StudentShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const isLearningPage = pathname.startsWith("/learn");

  return (
    <div className="app-canvas min-h-dvh">
      {!isLearningPage && (
        <StudentTopNavigation user={user} />
      )}
      <main className={isLearningPage ? "min-h-dvh" : "min-h-[calc(100dvh-3.75rem)] pb-[calc(4.8rem+env(safe-area-inset-bottom))] min-[1024px]:pb-0"}>{children}</main>
      <StudentBottomNavigation />
    </div>
  );
}
