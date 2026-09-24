import { redirect } from "next/navigation";
import { requireTeacherTools } from "@/lib/auth";
import { TeacherShell } from "@/components/layout/teacher-shell";

export const dynamic = "force-dynamic";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireTeacherTools();
  if (!user) redirect("/login");
  return <TeacherShell user={user}>{children}</TeacherShell>;
}
