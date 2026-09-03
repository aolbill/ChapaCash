"use client";

import { api } from "@/components/ui/api";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password }),
      });
      router.push("/play");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PublicHeader active="login" />
      <main className="mx-auto max-w-md px-3 py-8 sm:px-4 sm:py-12">
        <div className="card p-5 sm:p-8">
          <p className="kicker">Welcome back</p>
          <h1 className="page-title">Log in</h1>
          <p className="page-lead">Use your Kenyan phone number or email.</p>
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <label className="label">
              Phone or email
              <input
                className="field"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                required
                placeholder="0712 345 678 or 0112 345 678"
              />
            </label>
            <label className="label">
              Password
              <input
                className="field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            {error ? <p className="alert-error">{error}</p> : null}
            <button disabled={busy} className="btn-primary w-full py-3">
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-brand-muted">
          No account?{" "}
          <Link className="link-quiet" href="/register">
            Register
          </Link>
        </p>
      </main>
    </>
  );
}
