"use client";

import { AppShell } from "@/components/layout/AppShell";
import { api, formatBp, formatKes } from "@/components/ui/api";
import { DepositPanel } from "@/components/wallet/DepositPanel";
import { WithdrawPanel } from "@/components/wallet/WithdrawPanel";
import { EmptyState, PageHeader } from "@/components/ui/chrome";
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
        <PageHeader kicker="Dashboard" title="Your wallet" description="Cash is M-PESA. Free credits are for practice only." />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card p-5">
            <p className="kicker">Cash (M-PESA)</p>
            <p className="mt-3 font-mono text-3xl font-semibold tabular-nums">{formatKes(data?.cashCredits)}</p>
            <p className="mt-2 text-sm text-brand-muted">
              {data?.hasDeposited
                ? `Lifetime deposited ${formatKes(data.lifetimeDepositedKes)}`
                : "No M-PESA deposit yet"}
            </p>
          </div>
          <div className="card p-5">
            <p className="kicker">Free credits</p>
            <p className="mt-3 font-mono text-3xl font-semibold tabular-nums">{formatKes(data?.promoCredits)}</p>
            <p className="mt-2 text-sm text-brand-muted">Practice play with a gentler crash curve.</p>
          </div>
          <div className="card p-5">
            <p className="kicker">How to play</p>
            <p className="mt-3 text-sm leading-relaxed text-brand-wineDark">
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
            <h2 className="text-sm font-semibold text-brand-wine">Deposits</h2>
            <ul className="mt-3 space-y-2">
              {(data?.deposits ?? []).map((d) => (
                <li key={d.id} className="list-row">
                  <span className="font-semibold tabular-nums">{formatKes(d.amountKes)}</span>
                  <span className="text-right text-brand-muted">
                    {d.status} · {new Date(d.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
              {(data?.deposits ?? []).length === 0 ? <EmptyState>No STK deposits yet.</EmptyState> : null}
            </ul>
          </section>
          <section>
            <h2 className="text-sm font-semibold text-brand-wine">Withdrawals</h2>
            <ul className="mt-3 space-y-2">
              {(data?.withdrawals ?? []).map((w) => (
                <li key={w.id} className="list-row">
                  <span className="font-semibold tabular-nums">{formatKes(w.amountKes)}</span>
                  <span className="text-right text-brand-muted">
                    {w.status} · {new Date(w.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
              {(data?.withdrawals ?? []).length === 0 ? <EmptyState>No withdrawals yet.</EmptyState> : null}
            </ul>
          </section>
          <section className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-brand-wine">Recent activity</h2>
            <ul className="mt-3 space-y-2">
              {(data?.entries ?? []).slice(0, 12).map((e) => (
                <li key={e.id} className="list-row flex-col items-start sm:flex-row sm:items-start">
                  <span className="font-medium text-brand-success">{e.type.replace(/_/g, " ")}</span>
                  <p className="text-brand-muted">{e.reason}</p>
                </li>
              ))}
              {(data?.entries ?? []).length === 0 ? <EmptyState>No ledger activity yet.</EmptyState> : null}
            </ul>
          </section>
        </div>

        <section>
          <h2 className="text-sm font-semibold text-brand-wine">Bets</h2>
          <ul className="mt-3 space-y-2">
            {(data?.bets ?? []).map((b) => (
              <li key={b.id} className="list-row">
                <span>
                  Slot {b.slotIndex + 1} · {b.walletKind === "PROMO" ? "Free" : "Cash"} · {formatKes(b.stakeCredits)}
                </span>
                <span className="text-brand-muted">{b.status}</span>
              </li>
            ))}
            {(data?.bets ?? []).length === 0 ? <EmptyState>No bets yet.</EmptyState> : null}
          </ul>
        </section>
        <section>
          <h2 className="text-sm font-semibold text-brand-wine">Cash-outs</h2>
          <ul className="mt-3 space-y-2">
            {(data?.cashouts ?? []).map((c) => (
              <li key={c.id} className="list-row">
                <span className="tabular-nums">
                  {formatKes(c.payoutCredits)} @ {formatBp(c.multiplierBp)}
                </span>
              </li>
            ))}
            {(data?.cashouts ?? []).length === 0 ? <EmptyState>No cash-outs yet.</EmptyState> : null}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
