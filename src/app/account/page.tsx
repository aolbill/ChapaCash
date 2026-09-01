"use client";

import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/components/ui/api";
import { FormEvent, useEffect, useState } from "react";

export default function AccountPage() {
  const [me, setMe] = useState<{ email: string; displayName: string; publicName: string; role: string } | null>(
    null,
  );
  const [sessions, setSessions] = useState<{ id: string; createdAt: string; revokedAt: string | null; userAgent: string | null }[]>(
    [],
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void api<{ user: typeof me & { email: string } }>("/api/auth/me").then((d) => setMe(d.user));
    void api<{ sessions: typeof sessions }>("/api/account/sessions").then((d) => setSessions(d.sessions));
  }, []);

  async function onPassword(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api("/api/account/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setMsg("Password updated. Sign in again.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-xl space-y-8">
        <h1 className="text-2xl font-semibold">Account</h1>
        <section className="border border-ink-700 p-4 text-sm">
          <p>{me?.displayName}</p>
          <p className="text-mist-300">{me?.email}</p>
          <p className="text-mist-500">
            Public name {me?.publicName} · {me?.role}
          </p>
        </section>
        <form onSubmit={onPassword} className="space-y-3">
          <h2 className="text-sm uppercase tracking-wide text-mist-500">Change password</h2>
          <input
            className="w-full border border-ink-700 bg-ink-900 px-3 py-2"
            type="password"
            placeholder="Current"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <input
            className="w-full border border-ink-700 bg-ink-900 px-3 py-2"
            type="password"
            placeholder="New (10+ mixed case + number)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button className="bg-brand-wine px-4 py-2 text-brand-paper">Update password</button>
          {msg ? <p className="text-sm text-mist-300">{msg}</p> : null}
        </form>
        <section>
          <h2 className="text-sm uppercase tracking-wide text-mist-500">Sessions</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {sessions.map((s) => (
              <li key={s.id} className="border border-ink-700 px-3 py-2">
                {new Date(s.createdAt).toLocaleString()} · {s.revokedAt ? "revoked" : "active"}
                <div className="truncate text-mist-500">{s.userAgent}</div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
