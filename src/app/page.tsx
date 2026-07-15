import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { RecompApp } from "@/components/RecompApp";
import { isValidAdminSession } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [oauthSession, cookieStore] = await Promise.all([auth(), cookies()]);
  const passwordSession = cookieStore.get("recomp_admin_session")?.value;

  if (!oauthSession?.user && !isValidAdminSession(passwordSession)) {
    redirect("/login?next=/");
  }

  return <RecompApp />;
}
