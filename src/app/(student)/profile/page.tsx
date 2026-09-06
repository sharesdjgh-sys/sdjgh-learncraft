import { StudentProfile } from "@/components/profile/student-profile";
import { requireStudent } from "@/lib/auth";

export const metadata = { title: "내 정보" };

export default async function ProfilePage() {
  const user = await requireStudent();
  if (!user) return null;
  return <StudentProfile user={user} />;
}
