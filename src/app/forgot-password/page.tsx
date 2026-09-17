"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { BrandMark } from "@/components/ui/chrome";
import { api } from "@/components/ui/api";
import { RedirectIfAuthed } from "@/components/auth/RedirectIfAuthed";

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8">
        <BrandMark href="/play" />
      </div>
      <div className="card p-6 sm:p-8">
        <p className="kicker">Account</p>
        <h1 className="page-title text-[1.4rem] sm:text-2xl">Forgot password</h1>
        <p className="page-lead">
          Enter the email on your account. We&apos;ll send a reset link if it matches a registered email.
        </p>

        {done ? (
          <div className="mt-6 space-y-4">
            <p className="alert-ok">
              If that email is registered, we sent a reset link. Check your inbox and spam folder.
            </p>
            <Link href="/play?auth=login" className="btn-primary w-full">
              Back to log in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="label">
              Email
              <input
                className="field"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            {error ? <p className="alert-error">{error}</p> : null}
            <button className="btn-primary w-full" disabled={busy}>
              {busy ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-brand-muted">
          Remembered it?{" "}
          <Link href="/play?auth=login" className="link-quiet">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <RedirectIfAuthed>
      <ForgotPasswordForm />
    </RedirectIfAuthed>
  );
}
