"use client";

import { patchCachedBalances, useCachedSession } from "@/components/layout/session-cache";
import { api, formatKes } from "@/components/ui/api";
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
};

export default function WalletPage() {
  const me = useCachedSession();
  const [data, setData] = useState<Wallet | null>(null);

  const load = useCallback(async () => {
    try {
      const w = await api<Wallet>("/api/wallet");
      patchCachedBalances(w);
      setData(w);
    } catch {
      setData(null);
    }
  }, []);

  useEffect(() => {
    void load();
    const poll = window.setInterval(() => void load(), 15_000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener("focus", onFocus);
    };
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
    <div className="space-y-8">
      <PageHeader
        kicker="Cashier"
        title="Your wallet"
        description="Deposit with M-PESA to play for real. Free credits are practice only."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card-success p-5 pl-6">
          <p className="kicker">Cash (M-PESA)</p>
          <p className="stat-value mt-3">{formatKes(data?.cashCredits ?? me?.cashCredits)}</p>
          <p className="mt-2 text-sm text-brand-muted">
            {data?.hasDeposited
              ? `Lifetime deposited ${formatKes(data.lifetimeDepositedKes)}`
              : "No M-PESA deposit yet"}
          </p>
        </div>
        <div className="card p-5">
          <p className="kicker">Free credits</p>
          <p className="mt-3 font-mono text-2xl font-extrabold tabular-nums text-brand-ink sm:text-3xl">
            {formatKes(data?.promoCredits ?? me?.promoCredits)}
          </p>
          <p className="mt-2 text-sm text-brand-muted">Practice on Play — cannot be withdrawn.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DepositPanel onCredited={() => void load()} />
        <WithdrawPanel onUpdated={() => void load()} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="section-title">Deposits</h2>
          <ul className="mt-3 space-y-2">
            {(data?.deposits ?? []).map((d) => (
              <li key={d.id} className="list-row">
                <span className="font-semibold tabular-nums text-brand-success">{formatKes(d.amountKes)}</span>
                <span className="min-w-0 break-words text-brand-muted sm:text-right">
                  {d.status} · {new Date(d.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
            {(data?.deposits ?? []).length === 0 ? <EmptyState>No deposits yet.</EmptyState> : null}
          </ul>
        </section>
        <section>
          <h2 className="section-title">Withdrawals</h2>
          <ul className="mt-3 space-y-2">
            {(data?.withdrawals ?? []).map((w) => (
              <li key={w.id} className="list-row">
                <span className="font-semibold tabular-nums">{formatKes(w.amountKes)}</span>
                <span className="min-w-0 break-words text-brand-muted sm:text-right">
                  {w.status} · {new Date(w.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
            {(data?.withdrawals ?? []).length === 0 ? <EmptyState>No withdrawals yet.</EmptyState> : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
