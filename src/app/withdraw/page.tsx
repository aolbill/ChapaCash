"use client";

import { AppShell } from "@/components/layout/AppShell";
import { api, formatKes } from "@/components/ui/api";
import { WithdrawPanel } from "@/components/wallet/WithdrawPanel";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function WithdrawPage() {
  const [cash, setCash] = useState<string>("0");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const w = await api<{ cashCredits: string }>("/api/wallet");
      setCash(w.cashCredits);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load wallet.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppShell>
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-mist-500">Cash out</p>
          <h1 className="mt-1 text-2xl font-semibold">Withdraw to M-PESA</h1>
          <p className="mt-2 text-sm text-mist-300">
            Available cash <span className="font-semibold text-mist-100">{formatKes(cash)}</span>. Free
            credits cannot be withdrawn.
          </p>
        </div>
        {error ? <p className="text-sm text-signal-rose">{error}</p> : null}
        <WithdrawPanel onUpdated={() => void load()} />
        <p className="text-sm text-mist-500">
          Need to add funds first?{" "}
          <Link className="text-signal-teal" href="/wallet#deposit">
            Deposit with M-PESA
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
