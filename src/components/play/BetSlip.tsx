"use client";

import { formatKes } from "@/components/ui/api";
import { payoutCredits } from "@/domain/money";
import { useEffect, useRef, useState } from "react";
import type { BetRow, WalletKind } from "@/components/play/types";

const PRESETS = ["50", "100", "200", "500"];

export function BetSlip({
  slotIndex,
  stake,
  setStake,
  mine,
  status,
  roundId,
  displayBp,
  busy,
  walletKind,
  available,
  onBet,
  onCash,
}: {
  slotIndex: number;
  stake: string;
  setStake: (v: string) => void;
  mine: BetRow | undefined;
  status: string | undefined;
  roundId: string | undefined;
  displayBp: number;
  busy: boolean;
  walletKind: WalletKind;
  available: number;
  onBet: (slot: number) => void;
  onCash: (betId: string) => void;
}) {
  const [tab, setTab] = useState<"bet" | "auto">("bet");
  const [autoCash, setAutoCash] = useState(false);
  const [autoCashX, setAutoCashX] = useState("2.00");
  const [autoBet, setAutoBet] = useState(false);
  const autoRoundRef = useRef<string | null>(null);
  const cashingRef = useRef<string | null>(null);

  const canBet = status === "BETTING_OPEN" && !mine;
  const canCash = status === "RUNNING" && mine?.status === "PLACED";
  const locked = Boolean(mine);

  function bump(mult: number) {
    const n = Math.max(1, Math.floor(Number(stake || "0") * mult));
    setStake(String(n));
  }

  function step(delta: number) {
    const n = Math.max(1, Number(stake || "0") + delta);
    setStake(String(n));
  }

  useEffect(() => {
    if (!autoBet || !canBet || !roundId) return;
    if (autoRoundRef.current === roundId) return;
    autoRoundRef.current = roundId;
    onBet(slotIndex);
  }, [autoBet, canBet, roundId, onBet, slotIndex]);

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

  let action: { label: string; className: string; disabled: boolean; onClick: () => void };
  if (canCash && mine) {
    action = {
      label: `Cash out ${formatKes(potential)}`,
      className: "bg-[#e4b31a] text-[#1b1404] hover:bg-[#f0c43a]",
      disabled: busy,
      onClick: () => onCash(mine.id),
    };
  } else if (mine && (status === "BETTING_OPEN" || status === "BETTING_CLOSED")) {
    action = {
      label: "Waiting",
      className: "bg-[#2c3040] text-white/70",
      disabled: true,
      onClick: () => undefined,
    };
  } else if (mine?.cashedOutAtBp != null) {
    action = {
      label: `Cashed out ${formatKes(mine.payoutCredits ?? "0")}`,
      className: "bg-emerald-600/80 text-white",
      disabled: true,
      onClick: () => undefined,
    };
  } else if (mine && (status === "CRASHED" || status === "SETTLED")) {
    action = {
      label: "Flew away",
      className: "bg-[#3a1820] text-[#ff6b73]",
      disabled: true,
      onClick: () => undefined,
    };
  } else {
    action = {
      label: tab === "auto" && autoBet ? "Auto working" : "Bet",
      className: "bg-[#e11d2e] text-white hover:bg-[#ff2a3c]",
      disabled: !canBet || busy || (tab === "auto" && autoBet),
      onClick: () => onBet(slotIndex),
    };
  }

  return (
    <section className="rounded-xl bg-[#1a1d28] p-3 text-white ring-1 ring-white/5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex rounded-lg bg-black/30 p-0.5 text-[11px] font-semibold uppercase tracking-wide">
          {(["bet", "auto"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-md px-3 py-1 ${tab === id ? "bg-[#2c3040] text-white" : "text-white/45"}`}
            >
              {id}
            </button>
          ))}
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
          {slotIndex + 1} · {walletKind === "REAL" ? "Cash" : "Free"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-lg bg-[#2c3040] text-lg font-bold text-white/80 disabled:opacity-40"
          disabled={locked}
          onClick={() => step(-10)}
        >
          −
        </button>
        <input
          className="h-10 flex-1 rounded-lg border border-white/10 bg-[#11131c] px-2 text-center font-mono text-lg font-semibold tabular-nums text-white outline-none focus:border-[#e11d2e]"
          value={stake}
          onChange={(e) => setStake(e.target.value.replace(/[^0-9]/g, ""))}
          inputMode="numeric"
          disabled={locked}
          aria-label={`Bet ${slotIndex + 1} stake`}
        />
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-lg bg-[#2c3040] text-lg font-bold text-white/80 disabled:opacity-40"
          disabled={locked}
          onClick={() => step(10)}
        >
          +
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" disabled={locked} onClick={() => bump(0.5)} className="rounded-lg bg-[#2c3040] py-1.5 text-xs font-semibold text-white/70 disabled:opacity-40">
          ½
        </button>
        <button type="button" disabled={locked} onClick={() => bump(2)} className="rounded-lg bg-[#2c3040] py-1.5 text-xs font-semibold text-white/70 disabled:opacity-40">
          2×
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            disabled={locked}
            onClick={() => setStake(p)}
            className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
              stake === p ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70"
            }`}
          >
            {formatKes(p)}
          </button>
        ))}
      </div>

      <p className="mt-2 text-[11px] text-white/35">Available {formatKes(available)}</p>

      <button
        type="button"
        disabled={action.disabled}
        onClick={action.onClick}
        className={`mt-3 w-full rounded-lg py-3.5 text-sm font-extrabold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50 ${action.className}`}
      >
        {action.label}
      </button>

      <label className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-black/25 px-3 py-2 text-xs">
        <span className="font-medium text-white/70">Auto cash out</span>
        <span className="flex items-center gap-2">
          <input
            className="w-16 rounded-md border border-white/10 bg-[#11131c] px-1.5 py-1 text-right font-mono text-xs text-white"
            value={autoCashX}
            onChange={(e) => setAutoCashX(e.target.value.replace(/[^0-9.]/g, ""))}
            aria-label="Auto cash out multiplier"
          />
          <button
            type="button"
            role="switch"
            aria-checked={autoCash}
            onClick={() => setAutoCash((v) => !v)}
            className={`h-5 w-9 rounded-full p-0.5 transition ${autoCash ? "bg-[#e11d2e]" : "bg-[#2c3040]"}`}
          >
            <span className={`block h-4 w-4 rounded-full bg-white transition ${autoCash ? "translate-x-4" : ""}`} />
          </button>
        </span>
      </label>

      {tab === "auto" ? (
        <label className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-black/25 px-3 py-2 text-xs">
          <span className="font-medium text-white/70">Auto bet next rounds</span>
          <button
            type="button"
            role="switch"
            aria-checked={autoBet}
            onClick={() => setAutoBet((v) => !v)}
            className={`h-5 w-9 rounded-full p-0.5 transition ${autoBet ? "bg-[#e11d2e]" : "bg-[#2c3040]"}`}
          >
            <span className={`block h-4 w-4 rounded-full bg-white transition ${autoBet ? "translate-x-4" : ""}`} />
          </button>
        </label>
      ) : null}
    </section>
  );
}
