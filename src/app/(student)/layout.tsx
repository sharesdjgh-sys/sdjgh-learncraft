import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { StudentShell } from "@/components/layout/student-shell";

export const dynamic = "force-dynamic";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStudent();
  if (!user) redirect("/login");
  return <StudentShell user={user}>{children}</StudentShell>;
}
