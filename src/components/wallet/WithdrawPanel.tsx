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

type PopupMode = "confirm" | "done" | null;

export function WithdrawPanel({ onUpdated }: { onUpdated?: () => void }) {
  const [amount, setAmount] = useState(String(MIN_WITHDRAW_KES));
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [popup, setPopup] = useState<PopupMode>(null);
  const [confirmedAmount, setConfirmedAmount] = useState<string | null>(null);

  useEffect(() => {
    if (!popup) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) setPopup(null);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [popup, busy]);

  function onWithdraw(e: FormEvent) {
    e.preventDefault();
    const amountKes = Number(amount);
    if (!Number.isInteger(amountKes) || amountKes < MIN_WITHDRAW_KES) {
      setError(`Minimum withdrawal is ${MIN_WITHDRAW_KES.toLocaleString("en-KE")} KES.`);
      setMsg(null);
      return;
    }
    setError(null);
    setMsg(null);
    setPopup("confirm");
  }

  async function confirmWithdraw() {
    const amountKes = Number(amount);
    setBusy(true);
    setError(null);
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
      setPopup("done");
      onUpdated?.();
    } catch (err) {
      setPopup(null);
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
            Cash wallet only. Free credits cannot be withdrawn.
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
          Withdraw to M-PESA
        </button>
        {msg ? <p className="alert-ok">{msg}</p> : null}
        {error ? <p className="alert-error">{error}</p> : null}
      </form>

      {popup === "confirm" ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="withdraw-confirm-title"
          onClick={() => !busy && setPopup(null)}
        >
          <div
            className="w-full max-w-[400px] rounded-[18px] border border-brand-sand bg-brand-cream p-5 text-brand-ink shadow-[0_20px_60px_rgba(0,0,0,.55)] sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand-wine">
              Before you withdraw
            </p>
            <h3 id="withdraw-confirm-title" className="mt-2 text-xl font-extrabold tracking-tight">
              Confirm M-PESA cash-out
            </h3>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-brand-muted">
              <li>
                Minimum withdrawal is{" "}
                <b className="text-brand-ink">{MIN_WITHDRAW_KES.toLocaleString("en-KE")} KES</b>.
              </li>
              <li>
                Processing takes <b className="text-brand-ink">3 to 4 days</b> before the money reaches
                your M-PESA.
              </li>
              <li>
                You are withdrawing{" "}
                <b className="text-brand-ink">{formatKes(amount)}</b>.
              </li>
            </ul>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="button"
                className="btn-primary flex-1 py-3"
                disabled={busy}
                onClick={() => void confirmWithdraw()}
              >
                {busy ? "Confirming…" : "Confirm withdrawal"}
              </button>
              <button
                type="button"
                className="btn-ghost flex-1 py-3"
                disabled={busy}
                onClick={() => setPopup(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {popup === "done" ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="withdraw-timing-title"
          onClick={() => setPopup(null)}
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
            <button type="button" className="btn-primary mt-5 w-full py-3" onClick={() => setPopup(null)}>
              Got it
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
