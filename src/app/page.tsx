import { homeForRole } from "@/lib/roles";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getSession();
  if (!user) redirect("/login");
  redirect(homeForRole(user.role));
}
