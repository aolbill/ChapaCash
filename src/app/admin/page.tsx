"use client";

import { AppShell } from "@/components/layout/AppShell";
import { api, formatBp } from "@/components/ui/api";
import { AdminNav, EmptyState, PageHeader, StatusBadge } from "@/components/ui/chrome";
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
      <div className="mx-auto max-w-4xl space-y-8">
        <PageHeader kicker="Ops" title="Admin" description="No outcome controls. No direct balance edits." actions={<AdminNav />} />
        {error ? <p className="alert-error">{error}</p> : null}
        {data ? (
          <>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div className="card p-4">
                <dt className="kicker">Mongo</dt>
                <dd className="mt-2 font-semibold">
                  <StatusBadge tone={data.mongo ? "ok" : "danger"}>{data.mongo ? "up" : "down"}</StatusBadge>
                </dd>
              </div>
              <div className="card p-4">
                <dt className="kicker">Users</dt>
                <dd className="mt-2 text-xl font-semibold">{data.userCount}</dd>
              </div>
              <div className="card p-4">
                <dt className="kicker">Virtual bets</dt>
                <dd className="mt-2 text-xl font-semibold tabular-nums">{data.totalVirtualBets}</dd>
              </div>
              <div className="card p-4">
                <dt className="kicker">Virtual payouts</dt>
                <dd className="mt-2 text-xl font-semibold tabular-nums">{data.totalVirtualPayouts}</dd>
              </div>
            </dl>
            <p className="text-sm text-brand-muted">
              Active round {data.activeRound?.roundNumber ?? "—"} · {data.activeRound?.status ?? "none"}
            </p>
            <section>
              <h2 className="text-sm font-semibold text-brand-wine">Recent rounds</h2>
              <ul className="mt-3 space-y-2">
                {data.recentRounds.map((r) => (
                  <li key={r.id} className="list-row">
                    <Link className="link-quiet" href={`/admin/rounds/${r.id}`}>
                      #{r.roundNumber}
                    </Link>
                    <span className="text-brand-muted">
                      {r.status} {r.crashMultiplierBp != null ? formatBp(r.crashMultiplierBp) : ""}
                    </span>
                  </li>
                ))}
                {data.recentRounds.length === 0 ? <EmptyState>No rounds yet.</EmptyState> : null}
              </ul>
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
