"use client";

import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/components/ui/api";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui/chrome";
import { FormEvent, useEffect, useState } from "react";

export default function AccountPage() {
  const [me, setMe] = useState<{ email: string; displayName: string; publicName: string; role: string } | null>(
    null,
  );
  const [sessions, setSessions] = useState<
    { id: string; createdAt: string; revokedAt: string | null; userAgent: string | null }[]
  >([]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<{ user: typeof me & { email: string } }>("/api/auth/me").then((d) => setMe(d.user));
    void api<{ sessions: typeof sessions }>("/api/account/sessions").then((d) => setSessions(d.sessions));
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
    <AppShell>
      <div className="mx-auto max-w-xl space-y-8">
        <PageHeader kicker="Profile" title="Account" description="Your identity, password, and active sessions." />
        <section className="card p-5 text-sm">
          <p className="text-lg font-semibold">{me?.displayName}</p>
          <p className="mt-1 text-brand-muted">{me?.email}</p>
          <p className="mt-3 text-brand-muted">
            Public name {me?.publicName} · {me?.role}
          </p>
        </section>
        <form onSubmit={onPassword} className="card space-y-4 p-5">
          <h2 className="text-sm font-semibold text-brand-wine">Change password</h2>
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
              placeholder="10+ mixed case + number"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <button className="btn-primary">Update password</button>
          {msg ? <p className="alert-ok">{msg}</p> : null}
          {error ? <p className="alert-error">{error}</p> : null}
        </form>
        <section>
          <h2 className="text-sm font-semibold text-brand-wine">Sessions</h2>
          <ul className="mt-3 space-y-2">
            {sessions.map((s) => (
              <li key={s.id} className="list-row flex-col items-start">
                <div className="flex w-full items-center justify-between gap-2">
                  <span>{new Date(s.createdAt).toLocaleString()}</span>
                  <StatusBadge tone={s.revokedAt ? "neutral" : "ok"}>{s.revokedAt ? "revoked" : "active"}</StatusBadge>
                </div>
                <div className="w-full truncate text-xs text-brand-muted">{s.userAgent}</div>
              </li>
            ))}
            {sessions.length === 0 ? <EmptyState>No sessions loaded.</EmptyState> : null}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
