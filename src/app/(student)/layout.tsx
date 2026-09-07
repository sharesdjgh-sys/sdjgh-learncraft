import { redirect } from "next/navigation";
import { requireLearner } from "@/lib/auth";
import { StudentShell } from "@/components/layout/student-shell";

export const dynamic = "force-dynamic";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireLearner();
  if (!user) redirect("/login");
  return <StudentShell user={user}>{children}</StudentShell>;
}
