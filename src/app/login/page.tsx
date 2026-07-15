import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { auth, googleEnabled } from "@/auth";
import { isPublicAccessEnabled } from "@/lib/access-mode";
import { isValidAdminSession } from "@/lib/admin-session";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  if (isPublicAccessEnabled()) {
    redirect("/");
  }

  const [{ error, next }, oauthSession, cookieStore] = await Promise.all([
    searchParams,
    auth(),
    cookies(),
  ]);
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/";
  const passwordSession = cookieStore.get("recomp_admin_session")?.value;

  if (oauthSession?.user || isValidAdminSession(passwordSession)) {
    redirect(safeNext);
  }

  return (
    <LoginForm
      authError={error ? "Google sign-in could not be completed." : null}
      googleEnabled={googleEnabled}
      next={safeNext}
      passwordEnabled={Boolean(process.env.RECOMP_PASSWORD)}
    />
  );
}
