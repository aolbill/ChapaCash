"use client";

import { api } from "@/components/ui/api";
import { PublicHeader } from "@/components/layout/PublicHeader";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          phone,
          email: email || undefined,
          password,
          displayName,
          ageConfirmed,
        }),
      });
      router.push("/play");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PublicHeader active="register" />
      <main className="mx-auto max-w-md px-4 py-12">
        <div className="card p-6 sm:p-8">
          <p className="kicker">Get started</p>
          <h1 className="page-title">Create account</h1>
          <p className="page-lead">You get free credits to practice. Deposits are real M-PESA cash.</p>
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <label className="label">
              Display name
              <input
                className="field"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                minLength={2}
              />
            </label>
            <label className="label">
              Phone (M-PESA)
              <input
                className="field"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                inputMode="tel"
                placeholder="0712 345 678 or 0112 345 678"
                required
                autoComplete="tel"
              />
            </label>
            <label className="label">
              Email <span className="font-normal text-brand-muted">(optional)</span>
              <input
                className="field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
              />
            </label>
            <label className="label">
              Password
              <input
                className="field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>
            <label className="flex items-start gap-3 text-sm leading-relaxed text-brand-wineDark">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-brand-sand text-brand-wine"
                checked={ageConfirmed}
                onChange={(e) => setAgeConfirmed(e.target.checked)}
                required
              />
              I am 18 or older and I understand deposits are real money via M-PESA.
            </label>
            {error ? <p className="alert-error">{error}</p> : null}
            <button disabled={busy} className="btn-primary w-full py-3">
              {busy ? "Creating…" : "Create account"}
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-brand-muted">
          Already registered?{" "}
          <Link className="link-quiet" href="/login">
            Log in
          </Link>
        </p>
      </main>
    </>
  );
}
