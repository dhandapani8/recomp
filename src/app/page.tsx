import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RecompApp } from "@/components/RecompApp";
import { isValidAdminSession } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export default async function Page() {
  const password = process.env.RECOMP_PASSWORD;

  if (password) {
    const cookieStore = await cookies();
    const session = cookieStore.get("recomp_admin_session")?.value;

    if (!isValidAdminSession(session)) {
      redirect("/login?next=/");
    }
  }

  return <RecompApp />;
}
