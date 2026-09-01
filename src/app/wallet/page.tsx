"use client";

import { AppShell } from "@/components/layout/AppShell";
import { api, formatBp, formatKes } from "@/components/ui/api";
import { DepositPanel } from "@/components/wallet/DepositPanel";
import { WithdrawPanel } from "@/components/wallet/WithdrawPanel";
import { useCallback, useEffect, useState } from "react";

type Wallet = {
  cashCredits: string;
  promoCredits: string;
  hasDeposited: boolean;
  lifetimeDepositedKes: string;
  deposits: { id: string; amountKes: string; status: string; createdAt: string }[];
  withdrawals: { id: string; amountKes: string; status: string; createdAt: string }[];
  entries: { id: string; type: string; reason: string; createdAt: string }[];
  bets: { id: string; stakeCredits: string; status: string; slotIndex: number; walletKind: string }[];
  cashouts: { id: string; payoutCredits: string; multiplierBp: number }[];
};

export default function WalletPage() {
  const [data, setData] = useState<Wallet | null>(null);

  const load = useCallback(async () => {
    try {
      const w = await api<Wallet>("/api/wallet");
      setData(w);
    } catch {
      setData(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#withdraw") return;
    const t = window.setTimeout(() => {
      document.getElementById("withdraw")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
    return () => window.clearTimeout(t);
  }, [data]);

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-mist-500">Dashboard</p>
          <h1 className="mt-1 text-2xl font-semibold">Your wallet</h1>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card p-5">
            <p className="text-xs uppercase tracking-wide text-mist-500">Cash (M-PESA)</p>
            <p className="mt-2 font-mono text-3xl font-semibold">{formatKes(data?.cashCredits)}</p>
            <p className="mt-2 text-sm text-mist-400">
              {data?.hasDeposited
                ? `Lifetime deposited ${formatKes(data.lifetimeDepositedKes)}`
                : "No M-PESA deposit yet"}
            </p>
          </div>
          <div className="card p-5">
            <p className="text-xs uppercase tracking-wide text-mist-500">Free credits</p>
            <p className="mt-2 font-mono text-3xl font-semibold text-brand-wine">
              {formatKes(data?.promoCredits)}
            </p>
            <p className="mt-2 text-sm text-mist-400">Practice play with a gentler crash curve.</p>
          </div>
          <div className="card p-5">
            <p className="text-xs uppercase tracking-wide text-mist-500">How to play</p>
            <p className="mt-2 text-sm leading-relaxed text-mist-300">
              Deposit to stake real shillings. Until then, use free credits on the Play screen.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <DepositPanel onCredited={() => void load()} />
          <WithdrawPanel onUpdated={() => void load()} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section>
            <h2 className="text-sm font-medium text-mist-300">Deposits</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {(data?.deposits ?? []).map((d) => (
                <li key={d.id} className="card flex justify-between px-4 py-3">
                  <span>{formatKes(d.amountKes)}</span>
                  <span className="text-mist-400">
                    {d.status} · {new Date(d.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
              {(data?.deposits ?? []).length === 0 ? (
                <li className="text-sm text-mist-500">No STK deposits yet.</li>
              ) : null}
            </ul>
          </section>
          <section>
            <h2 className="text-sm font-medium text-mist-300">Withdrawals</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {(data?.withdrawals ?? []).map((w) => (
                <li key={w.id} className="card flex justify-between px-4 py-3">
                  <span>{formatKes(w.amountKes)}</span>
                  <span className="text-mist-400">
                    {w.status} · {new Date(w.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
              {(data?.withdrawals ?? []).length === 0 ? (
                <li className="text-sm text-mist-500">No withdrawals yet.</li>
              ) : null}
            </ul>
          </section>
          <section>
            <h2 className="text-sm font-medium text-mist-300">Recent activity</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {(data?.entries ?? []).slice(0, 12).map((e) => (
                <li key={e.id} className="card px-4 py-3">
                  <span className="text-signal-teal">{e.type.replace(/_/g, " ")}</span>
                  <p className="text-mist-400">{e.reason}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section>
          <h2 className="text-sm font-medium text-mist-300">Bets</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {(data?.bets ?? []).map((b) => (
              <li key={b.id} className="flex justify-between border-b border-ink-800 py-2">
                <span>
                  Slot {b.slotIndex + 1} · {b.walletKind === "PROMO" ? "Free" : "Cash"} · {formatKes(b.stakeCredits)}
                </span>
                <span className="text-mist-400">{b.status}</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="text-sm font-medium text-mist-300">Cash-outs</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {(data?.cashouts ?? []).map((c) => (
              <li key={c.id}>
                {formatKes(c.payoutCredits)} @ {formatBp(c.multiplierBp)}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
