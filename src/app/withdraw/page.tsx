"use client";

import { AppShell } from "@/components/layout/AppShell";
import { api, formatKes } from "@/components/ui/api";
import { WithdrawPanel } from "@/components/wallet/WithdrawPanel";
import { PageHeader } from "@/components/ui/chrome";
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
        <PageHeader
          kicker="Cash out"
          title="Withdraw to M-PESA"
          description={
            <>
              Available cash <span className="font-semibold text-brand-wine">{formatKes(cash)}</span>. Free
              credits cannot be withdrawn.
            </>
          }
        />
        {error ? <p className="alert-error">{error}</p> : null}
        <WithdrawPanel onUpdated={() => void load()} />
        <p className="text-sm text-brand-muted">
          Need to add funds first?{" "}
          <Link className="link-quiet" href="/wallet#deposit">
            Deposit with M-PESA
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
