"use client";

import { api } from "@/components/ui/api";
import { SITE_NAME } from "@/domain/copy";
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
    <main className="mx-auto max-w-md px-6 py-16">
      <Link href="/" className="text-base font-semibold text-brand-wine">
        {SITE_NAME}
      </Link>
      <div className="card mt-6 p-6">
        <h1 className="text-2xl font-semibold">Log in</h1>
        <p className="mt-2 text-sm text-mist-300">Phone number or email.</p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block text-sm text-mist-300">
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
          <label className="block text-sm text-mist-300">
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
          {error ? <p className="text-sm text-signal-rose">{error}</p> : null}
          <button disabled={busy} className="btn-primary w-full py-3">
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
      <p className="mt-6 text-sm text-mist-300">
        No account?{" "}
        <Link className="text-brand-wine" href="/register">
          Register
        </Link>
      </p>
    </main>
  );
}
