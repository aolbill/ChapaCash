"use client";

import { api } from "@/components/ui/api";
import { FormEvent, useEffect, useState } from "react";

type Deposit = {
  id: string;
  amountKes: string;
  status: string;
  reference: string;
  displayText: string;
  phone: string;
};

export function DepositPanel({ onCredited }: { onCredited?: (cashCredits: string) => void }) {
  const [amount, setAmount] = useState("100");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Deposit | null>(null);

  useEffect(() => {
    if (!pending || pending.status !== "PENDING") return;
    const t = setInterval(() => {
      void api<{ deposit: Deposit; cashCredits: string }>(
        `/api/wallet/deposit/status?reference=${encodeURIComponent(pending.reference)}`,
      )
        .then((r) => {
          setPending(r.deposit);
          if (r.deposit.status === "SUCCESS") {
            setMsg(`KES ${r.deposit.amountKes} added to your cash wallet.`);
            onCredited?.(r.cashCredits);
          }
          if (r.deposit.status === "FAILED") {
            setError("Deposit failed or was cancelled on the phone.");
          }
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Status check failed"));
    }, 3000);
    return () => clearInterval(t);
  }, [pending, onCredited]);

  async function onDeposit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await api<{ deposit: Deposit; message: string }>("/api/wallet/deposit", {
        method: "POST",
        body: JSON.stringify({
          amountKes: Number(amount),
          phone: phone || undefined,
        }),
      });
      setPending(res.deposit);
      setMsg(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deposit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onDeposit} className="card scroll-mt-28 space-y-4 p-4 sm:p-5" id="deposit">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Deposit with M-PESA</h2>
        <p className="mt-1 text-sm leading-relaxed text-brand-muted">
          STK push to your Safaricom number. Credited cash is what you stake on real bets.
        </p>
      </div>
      <label className="label">
        Amount (KES)
        <input
          className="field text-lg"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
          inputMode="numeric"
          min={10}
          required
        />
      </label>
      <label className="label">
        M-PESA phone
        <input
          className="field"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          type="tel"
          placeholder="0712 345 678 or 0112 345 678"
        />
      </label>
      <button disabled={busy} className="btn-primary w-full py-3 text-base">
        {busy ? "Sending STK push…" : "Send M-PESA STK push"}
      </button>
      {msg ? <p className="alert-ok">{msg}</p> : null}
      {error ? <p className="alert-error">{error}</p> : null}
      {pending?.status === "PENDING" ? (
        <p className="alert-wait">Waiting for PIN on {pending.phone}…</p>
      ) : null}
    </form>
  );
}
