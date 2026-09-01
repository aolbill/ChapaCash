"use client";

import { AppShell } from "@/components/layout/AppShell";
import { api, formatBp } from "@/components/ui/api";
import { FormEvent, useEffect, useState } from "react";

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
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold">Fairness verification</h1>
        <p className="mt-2 text-sm text-mist-300">
          After a round is archived, the server seed is revealed. This page re-derives the crash point with
          HMAC-SHA256. A matching number means the published inputs reproduce the result — it is not a
          licensing or regulatory claim.
        </p>
        <form onSubmit={onVerify} className="mt-6 space-y-3">
          {(["algorithmVersion", "serverSeed", "clientSeed", "nonce"] as const).map((k) => (
            <label key={k} className="block text-sm">
              {k}
              <input
                className="mt-1 w-full border border-ink-700 bg-ink-900 px-3 py-2 font-mono text-xs"
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              />
            </label>
          ))}
          <button className="bg-brand-wine px-4 py-2 text-brand-paper">Verify locally via API</button>
        </form>
        {result ? <p className="mt-4 text-signal-teal">{result}</p> : null}
        <h2 className="mt-10 text-sm uppercase tracking-wide text-mist-500">Archived proofs</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {proofs.map((p) => (
            <li key={p.roundId} className="border border-ink-700 px-3 py-2">
              Round {p.roundId.slice(-6)} · {formatBp(p.crashMultiplierBp)} · nonce {p.nonce}
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
