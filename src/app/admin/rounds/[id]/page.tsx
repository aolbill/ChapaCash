"use client";

import { AppShell } from "@/components/layout/AppShell";
import { api, formatBp } from "@/components/ui/api";
import { AdminNav, EmptyState, PageHeader } from "@/components/ui/chrome";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminRoundPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{
    round: {
      roundNumber: number;
      status: string;
      serverSeedHash: string;
      crashMultiplierBp: number | null;
      serverSeed: string | null;
    };
    events: { seq: number; type: string }[];
    note: string;
  } | null>(null);

  useEffect(() => {
    void api<NonNullable<typeof data>>(`/api/admin/rounds/${id}`).then(setData);
  }, [id]);

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader
          kicker="Ops"
          title={`Round ${data?.round.roundNumber ?? "—"}`}
          description={data?.round.status}
          actions={<AdminNav />}
        />
        <div className="card space-y-3 p-5 text-sm">
          <p className="break-all font-mono text-xs text-brand-muted">commit {data?.round.serverSeedHash}</p>
          {data?.round.crashMultiplierBp != null ? (
            <p className="font-mono text-2xl font-semibold">{formatBp(data.round.crashMultiplierBp)}</p>
          ) : (
            <p className="text-brand-muted">Crash point hidden until the round crashes.</p>
          )}
          <p className="text-xs text-brand-muted">{data?.note}</p>
        </div>
        <ul className="space-y-2">
          {data?.events.map((e) => (
            <li key={e.seq} className="list-row">
              <span className="tabular-nums text-brand-muted">{e.seq}</span>
              <span>{e.type}</span>
            </li>
          ))}
          {(data?.events.length ?? 0) === 0 ? <EmptyState>No events.</EmptyState> : null}
        </ul>
      </div>
    </AppShell>
  );
}
