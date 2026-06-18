import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { RecompApp } from "@/components/RecompApp";

// Simple env-var gate. Set RECOMP_PASSWORD in .env.local and pass it via
// the Authorization header or a ?token= query param. Replace with
// better-auth or next-auth for a proper login flow.
export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const password = process.env.RECOMP_PASSWORD;

  if (password) {
    const params = await searchParams;
    const headersList = await headers();
    const authHeader = headersList.get("authorization") ?? "";
    const token = params.token ?? authHeader.replace("Bearer ", "");

    if (token !== password) {
      redirect(`/login?next=/`);
    }
  }

  return <RecompApp />;
}
