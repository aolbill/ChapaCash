"use client";

import { AppShell } from "@/components/layout/AppShell";
import { api, formatBp } from "@/components/ui/api";
import { EmptyState, PageHeader } from "@/components/ui/chrome";
import { FormEvent, useEffect, useState } from "react";

const FIELD_LABELS: Record<string, string> = {
  algorithmVersion: "Algorithm",
  serverSeed: "Server seed",
  clientSeed: "Client seed",
  nonce: "Nonce",
};

export default function FairnessPage() {
  const [proofs, setProofs] = useState<
    {
      roundId: string;
      serverSeed: string;
      clientSeed: string;
      nonce: string;
      algorithmVersion: string;
      crashMultiplierBp: number;
      serverSeedHash: string;
    }[]
  >([]);
  const [form, setForm] = useState({
    algorithmVersion: "hmac-sha256-crash-v1",
    serverSeed: "",
    clientSeed: "chapacash-public-v1",
    nonce: "",
  });
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    void api<{ proofs: typeof proofs }>("/api/fairness/verify").then((d) => {
      setProofs(d.proofs);
      const first = d.proofs[0];
      if (first) {
        setForm({
          algorithmVersion: first.algorithmVersion,
          serverSeed: first.serverSeed,
          clientSeed: first.clientSeed,
          nonce: first.nonce,
        });
      }
    });
  }, []);

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    const r = await api<{ crashMultiplierBp: number; serverSeedHash: string }>("/api/fairness/verify", {
      method: "POST",
      body: JSON.stringify(form),
    });
    setResult(`${formatBp(r.crashMultiplierBp)} (hash ${r.serverSeedHash.slice(0, 16)}…)`);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-8">
        <PageHeader
          kicker="Provably fair"
          title="Fairness verification"
          description="After a round is archived, the server seed is revealed. This page re-derives the crash point with HMAC-SHA256. A matching number means the published inputs reproduce the result — it is not a licensing or regulatory claim."
        />
        <form onSubmit={onVerify} className="card space-y-4 p-5">
          {(["algorithmVersion", "serverSeed", "clientSeed", "nonce"] as const).map((k) => (
            <label key={k} className="label">
              {FIELD_LABELS[k]}
              <input
                className="field font-mono text-xs"
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              />
            </label>
          ))}
          <button className="btn-primary">Verify locally via API</button>
        </form>
        {result ? <p className="alert-ok">{result}</p> : null}
        <section>
          <h2 className="text-sm font-semibold text-brand-wine">Archived proofs</h2>
          <ul className="mt-3 space-y-2">
            {proofs.map((p) => (
              <li key={p.roundId} className="list-row">
                <span>Round {p.roundId.slice(-6)}</span>
                <span className="tabular-nums text-brand-muted">
                  {formatBp(p.crashMultiplierBp)} · nonce {p.nonce}
                </span>
              </li>
            ))}
            {proofs.length === 0 ? <EmptyState>No archived rounds yet.</EmptyState> : null}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
