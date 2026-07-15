"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

type LoginFormProps = {
  authError: string | null;
  googleEnabled: boolean;
  next: string;
  passwordEnabled: boolean;
};

export function LoginForm({ authError, googleEnabled, next, passwordEnabled }: LoginFormProps) {
  const [error, setError] = useState<string | null>(authError);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/access/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: form.get("password") }),
    });

    setIsSubmitting(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Unable to sign in.");
      return;
    }

    window.location.assign(next);
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="login-heading">
          <p className="login-eyebrow">RECOMP</p>
          <h1>Sign in</h1>
          <p>Access your training, nutrition, and progress workspace.</p>
        </div>

        {googleEnabled ? (
          <button
            className="login-google"
            onClick={() => void signIn("google", { callbackUrl: next })}
            type="button"
          >
            <span aria-hidden="true" className="login-google-mark">G</span>
            Continue with Google
          </button>
        ) : null}

        {googleEnabled && passwordEnabled ? <div className="login-divider"><span>or</span></div> : null}

        {passwordEnabled ? (
          <form className="login-password-form" onSubmit={onSubmit}>
            <label htmlFor="password">Access password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
            <button className="login-password-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Continue with password"}
            </button>
          </form>
        ) : null}

        {error ? <p className="login-error" role="alert">{error}</p> : null}
        {!googleEnabled && !passwordEnabled ? (
          <p className="login-error" role="alert">No sign-in method has been configured.</p>
        ) : null}
        <p className="login-privacy">Data is stored in this browser, not your Google account.</p>
      </section>
    </main>
  );
}
