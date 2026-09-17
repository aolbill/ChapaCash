"use client";

import Link from "next/link";
import { api } from "@/components/ui/api";
import { PageHeader } from "@/components/ui/chrome";
import { FormEvent, useEffect, useState } from "react";

export default function AccountPage() {
  const [me, setMe] = useState<{ email: string; displayName: string; publicName: string; role: string } | null>(
    null,
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<{ user: typeof me & { email: string } }>("/api/auth/me").then((d) => setMe(d.user));
  }, []);

  async function onPassword(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setError(null);
    try {
      await api("/api/account/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setMsg("Password updated. Sign in again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <PageHeader kicker="Profile" title="Account" description="Your profile and password." />

      <section className="card-accent p-5 pl-6 text-sm">
        <p className="text-lg font-extrabold text-brand-ink">{me?.displayName ?? "—"}</p>
        <p className="mt-2 font-medium text-brand-success">{me?.email}</p>
        <p className="mt-3 text-brand-muted">
          In-game name <span className="font-semibold text-brand-ink">{me?.publicName}</span>
        </p>
      </section>

      <form onSubmit={onPassword} className="card-success space-y-4 p-5 pl-6">
        <h2 className="section-title">Change password</h2>
        <label className="label">
          Current password
          <input
            className="field"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        <label className="label">
          New password
          <input
            className="field"
            type="password"
            placeholder="8+ mixed case + number"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <button className="btn-primary w-full sm:w-auto">Update password</button>
        {msg ? <p className="alert-ok">{msg}</p> : null}
        {error ? <p className="alert-error">{error}</p> : null}
      </form>

      <section className="card space-y-2 p-5">
        <h2 className="section-title">More</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link href="/fairness" className="btn-ghost justify-start text-left">
            Fairness
          </Link>
          <Link href="/responsible" className="btn-ghost justify-start text-left">
            Responsible play
          </Link>
          <Link href="/wallet#withdraw" className="btn-ghost justify-start text-left sm:col-span-2">
            Withdraw to M-PESA
          </Link>
        </div>
      </section>
    </div>
  );
}
