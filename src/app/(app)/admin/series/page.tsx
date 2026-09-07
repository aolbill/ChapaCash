"use client";

import { api, formatBp } from "@/components/ui/api";
import { AdminNav, EmptyState, PageHeader, StatusBadge } from "@/components/ui/chrome";
import { historyClass } from "@/components/play/historyTone";
import { FormEvent, useCallback, useEffect, useState } from "react";

type PreviewPoint = {
  nonce: string;
  roundNumber: number;
  crashMultiplierBp: number;
  promoCrashMultiplierBp: number;
  current: boolean;
};

type SeriesPayload = {
  queued?: boolean;
  rotated?: boolean;
  series: {
    id: string;
    serverSeed: string;
    serverSeedHash: string;
    clientSeed: string;
    algorithmVersion: string;
    startRoundNumber: number;
    rotateRequested: boolean;
  };
  liveRound: {
    roundNumber: number;
    status: string;
    crashMultiplierBp: number;
  } | null;
  upcoming: PreviewPoint[];
};

export default function AdminSeriesPage() {
  const [data, setData] = useState<SeriesPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSeed, setShowSeed] = useState(false);
  const [customSeed, setCustomSeed] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    return api<SeriesPayload>("/api/admin/series")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Forbidden"));
  }, []);

  useEffect(() => {
    void load();
    const poll = window.setInterval(() => void load(), 3000);
    return () => window.clearInterval(poll);
  }, [load]);

  async function rotate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const next = await api<SeriesPayload>("/api/admin/series", {
        method: "POST",
        body: JSON.stringify({
          action: "rotate",
          ...(customSeed.trim() ? { serverSeed: customSeed.trim() } : {}),
        }),
      });
      setData(next);
      setCustomSeed("");
      setShowSeed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rotate series");
    } finally {
      setBusy(false);
    }
  }

  async function copySeed() {
    if (!data?.series.serverSeed) return;
    await navigator.clipboard.writeText(data.series.serverSeed);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        kicker="Ops"
        title="Multiplier series"
        description="One server seed, nonce = round number. Only this page shows the seed and the upcoming crash list. Players see the hash until you rotate."
        actions={<AdminNav />}
      />
      {error ? <p className="alert-error">{error}</p> : null}
      {data ? (
        <>
          <section className="card space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={data.series.rotateRequested ? "warn" : "ok"}>
                {data.series.rotateRequested ? "rotates after this round" : "active"}
              </StatusBadge>
              {data.liveRound ? (
                <StatusBadge tone="live">
                  round #{data.liveRound.roundNumber} · {data.liveRound.status} ·{" "}
                  {formatBp(data.liveRound.crashMultiplierBp)}
                </StatusBadge>
              ) : (
                <StatusBadge>no live round</StatusBadge>
              )}
            </div>
            <label className="label">
              Commitment hash (public)
              <input className="field font-mono text-xs" readOnly value={data.series.serverSeedHash} />
            </label>
            <label className="label">
              Server seed (admin only)
              <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                <input
                  className="field mt-0 flex-1 font-mono text-xs"
                  readOnly
                  type={showSeed ? "text" : "password"}
                  value={data.series.serverSeed}
                />
                <button type="button" className="btn-ghost shrink-0" onClick={() => setShowSeed((v) => !v)}>
                  {showSeed ? "Hide" : "Show"}
                </button>
                <button type="button" className="btn-ghost shrink-0" onClick={() => void copySeed()}>
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </label>
            <p className="text-xs text-brand-muted">
              Algorithm {data.series.algorithmVersion} · client seed {data.series.clientSeed} · series starts at round #
              {data.series.startRoundNumber}
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-brand-wine">Upcoming crashes</h2>
            <p className="mt-1 text-xs text-brand-muted">
              Cash play. Free-credit rounds use a gentler curve.
              {data.series.rotateRequested ? " After the live round, chips switch to the next series." : ""}
            </p>
            {data.upcoming.length === 0 ? (
              <EmptyState>No preview yet.</EmptyState>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {data.upcoming.map((p) => (
                  <span
                    key={p.nonce}
                    title={`Round ${p.roundNumber} · free ${formatBp(p.promoCrashMultiplierBp)}`}
                    className={`rounded-full px-2.5 py-1 font-mono text-xs font-bold tabular-nums ${historyClass(p.crashMultiplierBp)} ${
                      p.current ? "ring-2 ring-brand-wine bg-brand-wine/10" : "bg-brand-sand/25"
                    }`}
                  >
            {p.current ? "now " : `#${p.roundNumber} `}
                    {formatBp(p.crashMultiplierBp)}
                  </span>
                ))}
              </div>
            )}
          </section>

          <form onSubmit={rotate} className="card space-y-3 p-5">
            <h2 className="text-sm font-semibold text-brand-wine">Start a new series</h2>
            <p className="text-sm text-brand-muted">
              Reveals the current seed for fairness checks and begins a new list. If a round is in progress, the switch
              waits until that round is archived.
            </p>
            <label className="label">
              Optional custom seed
              <input
                className="field font-mono text-sm"
                value={customSeed}
                onChange={(e) => setCustomSeed(e.target.value)}
                placeholder="Leave blank to generate a random seed"
                minLength={16}
              />
            </label>
            <button className="btn-primary" disabled={busy}>
              {data.series.rotateRequested ? "Rotation already queued" : "Rotate series"}
            </button>
          </form>
        </>
      ) : null}
    </div>
  );
}
