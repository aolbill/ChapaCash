"use client";

import { formatPlayKes } from "@/components/ui/api";
import { payoutCredits } from "@/domain/money";
import { useEffect, useRef, useState } from "react";
import type { BetRow, WalletKind } from "@/components/play/types";

const PRESETS = ["100", "200", "500", "10000"];

export function BetSlip({
  slotIndex,
  stake,
  setStake,
  mine,
  status,
  displayBp,
  busy,
  walletKind,
  onBet,
  onCash,
}: {
  slotIndex: number;
  stake: string;
  setStake: (v: string) => void;
  mine: BetRow | undefined;
  status: string | undefined;
  roundId?: string;
  displayBp: number;
  busy: boolean;
  walletKind: WalletKind;
  available?: number;
  onBet: (slot: number) => void;
  onCash: (betId: string) => void;
}) {
  const [autoCash, setAutoCash] = useState(false);
  const [autoCashX, setAutoCashX] = useState("2.00");
  const cashingRef = useRef<string | null>(null);

  const canBet = status === "BETTING_OPEN" && !mine;
  const canCash = status === "RUNNING" && mine?.status === "PLACED";
  const locked = Boolean(mine);

  function step(delta: number) {
    setStake(String(Math.max(1, Number(stake || "0") + delta)));
  }

  useEffect(() => {
    if (!autoCash || !canCash || !mine) return;
    const target = Math.round(Number(autoCashX) * 100);
    if (!Number.isFinite(target) || target < 101) return;
    if (displayBp < target) return;
    if (cashingRef.current === mine.id) return;
    cashingRef.current = mine.id;
    onCash(mine.id);
  }, [autoCash, autoCashX, canCash, mine, displayBp, onCash]);

  useEffect(() => {
    if (!mine || mine.status !== "PLACED") cashingRef.current = null;
  }, [mine]);

  const potential =
    canCash && mine ? Number(payoutCredits(BigInt(mine.stakeCredits), Math.max(100, displayBp))) : 0;
  const stakeLabel = formatPlayKes(stake || "0");

  let mode: "bet" | "cash" | "queued" | "done" | "lost" = "bet";
  let label = "Bet";
  let amount = stakeLabel;
  if (canCash && mine) {
    mode = "cash";
    label = "Cash out";
    amount = formatPlayKes(potential);
  } else if (mine && (status === "BETTING_OPEN" || status === "BETTING_CLOSED")) {
    mode = "queued";
    label = "Waiting";
    amount = stakeLabel;
  } else if (mine?.cashedOutAtBp != null) {
    mode = "done";
    label = "Cashed out";
    amount = formatPlayKes(mine.payoutCredits ?? "0");
  } else if (mine && (status === "CRASHED" || status === "SETTLED")) {
    mode = "lost";
    label = "Flew away";
    amount = stakeLabel;
  }

  const btnClass =
    mode === "cash"
      ? "bg-gradient-to-b from-[#e6a52e] to-[#c9862a] shadow-[0_4px_0_#9a6a1e]"
      : mode === "queued"
        ? "bg-gradient-to-b from-[#3b82f6] to-[#2563eb] shadow-[0_4px_0_#1d4ed8]"
        : mode === "lost"
          ? "bg-[#3a1820] text-[#ff6b73] shadow-none"
          : mode === "done"
            ? "bg-[#1c7a30] shadow-none"
            : "bg-gradient-to-b from-[#2fbf4e] to-[#249b3e] shadow-[0_4px_0_#1c7a30]";

  return (
    <section className="flex flex-1 items-center gap-3 rounded-[14px] border border-[#2a2c34] bg-[#16171b] p-3">
      <div className="shrink-0 text-center">
        <div className="mb-2 flex items-center gap-2.5">
          <button
            type="button"
            className="h-[30px] w-[30px] rounded-full border border-[#2a2c34] bg-[#1d1e24] text-lg text-[#f2f3f7] disabled:opacity-40"
            disabled={locked}
            onClick={() => step(-10)}
          >
            −
          </button>
          <b className="min-w-[74px] text-center text-xl font-extrabold tabular-nums">
            {Number(stake || "0").toFixed(2)}
          </b>
          <button
            type="button"
            className="h-[30px] w-[30px] rounded-full border border-[#2a2c34] bg-[#1d1e24] text-lg text-[#f2f3f7] disabled:opacity-40"
            disabled={locked}
            onClick={() => step(10)}
          >
            +
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              disabled={locked}
              onClick={() => setStake(p)}
              className={`rounded-lg border border-[#2a2c34] bg-[#1d1e24] px-2 py-1 text-[11px] font-bold disabled:opacity-40 ${
                stake === p ? "text-[#f2f3f7]" : "text-[#8b8e99]"
              }`}
            >
              {Number(p).toLocaleString("en-KE")}
            </button>
          ))}
        </div>
        <label className="mt-2 flex items-center justify-center gap-1.5 text-[10px] font-bold text-[#8b8e99]">
          Auto
          <input
            className="w-10 rounded border border-[#2a2c34] bg-[#0d0d0f] px-1 py-0.5 text-right font-mono text-[10px] text-[#f2f3f7]"
            value={autoCashX}
            onChange={(e) => setAutoCashX(e.target.value.replace(/[^0-9.]/g, ""))}
            aria-label={`Bet ${slotIndex + 1} auto cash out`}
          />
          <button
            type="button"
            role="switch"
            aria-checked={autoCash}
            onClick={() => setAutoCash((v) => !v)}
            className={`h-4 w-7 rounded-full p-0.5 ${autoCash ? "bg-[#2fbf4e]" : "bg-[#1d1e24]"}`}
          >
            <span className={`block h-3 w-3 rounded-full bg-white ${autoCash ? "translate-x-3" : ""}`} />
          </button>
        </label>
      </div>
      <button
        type="button"
        disabled={busy || mode === "queued" || mode === "done" || mode === "lost" || (mode === "bet" && !canBet)}
        onClick={() => (mode === "cash" && mine ? onCash(mine.id) : onBet(slotIndex))}
        className={`min-h-[88px] flex-1 rounded-xl font-extrabold text-white disabled:opacity-50 max-[420px]:min-h-[62px] ${btnClass}`}
      >
        <span className="text-[17px] max-[420px]:text-[15px]">{label}</span>
        <small className="mt-0.5 block text-xl font-black max-[420px]:text-[17px]">{amount}</small>
        <span className="sr-only">{walletKind}</span>
      </button>
    </section>
  );
}