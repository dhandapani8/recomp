import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const googleEnabled = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);

export const { auth, handlers } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.RECOMP_SESSION_SECRET,
  trustHost: true,
  providers: googleEnabled ? [Google] : [],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    signIn({ account, profile }) {
      if (account?.provider !== "google") return false;

      const googleProfile = profile as { email?: string; email_verified?: boolean } | undefined;
      return Boolean(googleProfile?.email && googleProfile.email_verified);
    },
  },
});

export { googleEnabled };
