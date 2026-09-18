"use client";

import { api, formatKes } from "@/components/ui/api";
import { FormEvent, useEffect, useState } from "react";

const MIN_WITHDRAW_KES = 500;

type Withdrawal = {
  id: string;
  amountKes: string;
  status: string;
  reference: string;
  phone: string;
  failureReason: string | null;
};

export function WithdrawPanel({ onUpdated }: { onUpdated?: () => void }) {
  const [amount, setAmount] = useState(String(MIN_WITHDRAW_KES));
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showTimingPopup, setShowTimingPopup] = useState(false);
  const [confirmedAmount, setConfirmedAmount] = useState<string | null>(null);

  useEffect(() => {
    if (!showTimingPopup) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowTimingPopup(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [showTimingPopup]);

  async function onWithdraw(e: FormEvent) {
    e.preventDefault();
    const amountKes = Number(amount);
    if (!Number.isInteger(amountKes) || amountKes < MIN_WITHDRAW_KES) {
      setError(`Minimum withdrawal is ${MIN_WITHDRAW_KES.toLocaleString("en-KE")} KES.`);
      setMsg(null);
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await api<{ withdrawal: Withdrawal; message: string }>("/api/wallet/withdraw", {
        method: "POST",
        body: JSON.stringify({
          amountKes,
          phone: phone || undefined,
        }),
      });
      setConfirmedAmount(res.withdrawal.amountKes);
      setMsg(`${formatKes(res.withdrawal.amountKes)}. ${res.message}`);
      setShowTimingPopup(true);
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Withdrawal failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form onSubmit={onWithdraw} className="card-accent scroll-mt-28 space-y-4 p-4 pl-6 sm:p-5 sm:pl-6" id="withdraw">
        <div>
          <h2 className="section-title text-base">Withdraw to M-PESA</h2>
          <p className="mt-1 text-sm leading-relaxed text-brand-muted">
            Cash wallet only. Free credits cannot be withdrawn. Minimum withdrawal is{" "}
            {MIN_WITHDRAW_KES.toLocaleString("en-KE")} KES. After you confirm, processing takes 3 to 4
            days.
          </p>
        </div>
        <label className="label">
          Amount (KES)
          <input
            className="field text-lg"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
            min={MIN_WITHDRAW_KES}
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

      {showTimingPopup ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="withdraw-timing-title"
          onClick={() => setShowTimingPopup(false)}
        >
          <div
            className="w-full max-w-[400px] rounded-[18px] border border-brand-sand bg-brand-cream p-5 text-brand-ink shadow-[0_20px_60px_rgba(0,0,0,.55)] sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand-success">
              Withdrawal received
            </p>
            <h3 id="withdraw-timing-title" className="mt-2 text-xl font-extrabold tracking-tight">
              Processing takes 3 to 4 days
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-brand-muted">
              {confirmedAmount ? (
                <>
                  Your withdrawal of <b className="text-brand-ink">{formatKes(confirmedAmount)}</b> has
                  been submitted. It will be processed within <b className="text-brand-ink">3 to 4 days</b>{" "}
                  and sent to your M-PESA.
                </>
              ) : (
                <>
                  Your withdrawal has been submitted. It will be processed within{" "}
                  <b className="text-brand-ink">3 to 4 days</b> and sent to your M-PESA.
                </>
              )}
            </p>
            <button
              type="button"
              className="btn-primary mt-5 w-full py-3"
              onClick={() => setShowTimingPopup(false)}
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
