"use client";

import { api, formatKes } from "@/components/ui/api";
import { FormEvent, useState } from "react";

type Withdrawal = {
  id: string;
  amountKes: string;
  status: string;
  reference: string;
  phone: string;
  failureReason: string | null;
};

export function WithdrawPanel({ onUpdated }: { onUpdated?: () => void }) {
  const [amount, setAmount] = useState("100");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onWithdraw(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await api<{ withdrawal: Withdrawal; message: string }>("/api/wallet/withdraw", {
        method: "POST",
        body: JSON.stringify({
          amountKes: Number(amount),
          phone: phone || undefined,
        }),
      });
      setMsg(`${formatKes(res.withdrawal.amountKes)}. ${res.message}`);
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Withdrawal failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onWithdraw} className="card scroll-mt-28 space-y-4 p-4 sm:p-5" id="withdraw">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Withdraw to M-PESA</h2>
        <p className="mt-1 text-sm leading-relaxed text-brand-muted">
          Cash wallet only. Free credits cannot be withdrawn. After you confirm, the money is sent to
          your M-PESA within 2–3 business days.
        </p>
      </div>
      <label className="label">
        Amount (KES)
        <input
          className="field text-lg"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
          inputMode="numeric"
          min={50}
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
          placeholder="Blank = your account number"
        />
      </label>
      <button disabled={busy} type="submit" className="btn-primary w-full py-3 text-base">
        {busy ? "Confirming withdrawal…" : "Withdraw to M-PESA"}
      </button>
      {msg ? <p className="alert-ok">{msg}</p> : null}
      {error ? <p className="alert-error">{error}</p> : null}
    </form>
  );
}
