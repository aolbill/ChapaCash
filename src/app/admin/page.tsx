"use client";

import { AppShell } from "@/components/layout/AppShell";
import { api, formatBp } from "@/components/ui/api";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminPage() {
  const [data, setData] = useState<{
    mongo: boolean;
    userCount: number;
    totalVirtualBets: string;
    totalVirtualPayouts: string;
    activeRound: { id: string; status: string; roundNumber: number } | null;
    recentRounds: { id: string; roundNumber: number; status: string; crashMultiplierBp: number | null }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<NonNullable<typeof data>>("/api/admin/dashboard")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Forbidden"));
  }, []);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-sm text-mist-500">No outcome controls. No direct balance edits.</p>
        {error ? <p className="mt-4 text-signal-rose">{error}</p> : null}
        {data ? (
          <>
            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div className="border border-ink-700 p-3">
                <dt className="text-mist-500">Mongo</dt>
                <dd>{data.mongo ? "up" : "down"}</dd>
              </div>
              <div className="border border-ink-700 p-3">
                <dt className="text-mist-500">Users</dt>
                <dd>{data.userCount}</dd>
              </div>
              <div className="border border-ink-700 p-3">
                <dt className="text-mist-500">Virtual bets</dt>
                <dd>{data.totalVirtualBets}</dd>
              </div>
              <div className="border border-ink-700 p-3">
                <dt className="text-mist-500">Virtual payouts</dt>
                <dd>{data.totalVirtualPayouts}</dd>
              </div>
            </dl>
            <p className="mt-6 text-sm">
              Active round {data.activeRound?.roundNumber ?? "—"} · {data.activeRound?.status ?? "none"}
            </p>
            <h2 className="mt-6 text-sm uppercase tracking-wide text-mist-500">Recent rounds</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {data.recentRounds.map((r) => (
                <li key={r.id}>
                  <Link className="text-signal-teal" href={`/admin/rounds/${r.id}`}>
                    #{r.roundNumber}
                  </Link>{" "}
                  {r.status} {r.crashMultiplierBp != null ? formatBp(r.crashMultiplierBp) : ""}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex gap-4 text-sm">
              <Link className="text-signal-teal" href="/admin/users">
                Users
              </Link>
              <Link className="text-signal-teal" href="/admin/audit">
                Audit log
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
