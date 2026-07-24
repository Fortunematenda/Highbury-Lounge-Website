"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const ERROR_MESSAGES: Record<string, string> = {
  missing: "Email and password are required.",
  invalid: "Invalid email or password.",
  session:
    "Signed in but the session cookie was not kept. Use http:// (not https://) and set COOKIE_SECURE=false.",
};

export default function LoginForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const initialError = useMemo(
    () => (urlError ? ERROR_MESSAGES[urlError] || "Login failed." : null),
    [urlError],
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      const me = await fetch("/api/admin/auth/me", {
        credentials: "include",
        cache: "no-store",
      });
      if (!me.ok) {
        setError(ERROR_MESSAGES.session);
        return;
      }

      window.location.assign("/admin");
      return;
    } catch {
      // Fall back to a normal form POST if fetch/JS path fails.
      form.submit();
      return;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="admin-login-logo"
            src="/images/highbury-lounge-logo.png"
            alt="Highbury Lounge"
          />
        </div>
        <h1 className="admin-login-title">Admin portal</h1>
        <p className="page-sub">Sign in to manage Highbury Lounge</p>
        {error ? (
          <div className="admin-error" role="alert">
            {error}
          </div>
        ) : null}
        <form
          className="admin-form"
          method="post"
          action="/api/admin/auth/login"
          onSubmit={onSubmit}
        >
          <label>
            Email
            <input
              className="admin-input"
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              className="admin-input"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className="admin-btn" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
