"use client";

import { AppShell } from "@/components/layout/AppShell";
import { api, formatBp } from "@/components/ui/api";
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
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold">Round {data?.round.roundNumber}</h1>
        <p className="text-sm text-mist-300">{data?.round.status}</p>
        <p className="mt-2 font-mono text-xs">commit {data?.round.serverSeedHash}</p>
        {data?.round.crashMultiplierBp != null ? (
          <p className="mt-2">Crash {formatBp(data.round.crashMultiplierBp)}</p>
        ) : (
          <p className="mt-2 text-mist-500">Crash point hidden until the round crashes.</p>
        )}
        <p className="mt-4 text-xs text-mist-500">{data?.note}</p>
        <ul className="mt-4 space-y-1 text-sm">
          {data?.events.map((e) => (
            <li key={e.seq}>
              {e.seq} {e.type}
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
