"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BrandMark } from "@/components/ui/chrome";
import { api } from "@/components/ui/api";
import { RedirectIfAuthed } from "@/components/auth/RedirectIfAuthed";

function ResetPasswordForm() {
  const search = useSearchParams();
  const token = useMemo(() => search.get("token")?.trim() ?? "", [search]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("This reset link is missing a token. Request a new one.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword: password }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6 sm:p-8">
      <p className="kicker">Account</p>
      <h1 className="page-title text-[1.4rem] sm:text-2xl">Set a new password</h1>
      <p className="page-lead">Choose a strong password, then log in again.</p>

      {!token ? (
        <div className="mt-6 space-y-4">
          <p className="alert-error">This reset link is invalid or incomplete.</p>
          <Link href="/forgot-password" className="btn-primary w-full">
            Request a new link
          </Link>
        </div>
      ) : done ? (
        <div className="mt-6 space-y-4">
          <p className="alert-ok">Password updated. You can log in with your new password.</p>
          <Link href="/play?auth=login" className="btn-primary w-full">
            Log in
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="label">
            New password
            <input
              className="field"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="label">
            Confirm password
            <input
              className="field"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          <p className="text-xs text-brand-muted">
            At least 8 characters, with uppercase, lowercase, and a number.
          </p>
          {error ? <p className="alert-error">{error}</p> : null}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>
      )}

      <p className="mt-5 text-center text-sm text-brand-muted">
        Need a new link?{" "}
        <Link href="/forgot-password" className="link-quiet">
          Forgot password
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <RedirectIfAuthed>
      <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-10">
        <div className="mb-8">
          <BrandMark href="/play" />
        </div>
        <Suspense
          fallback={
            <div className="card p-6 sm:p-8">
              <p className="text-sm text-brand-muted">Loading reset form…</p>
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </RedirectIfAuthed>
  );
}
