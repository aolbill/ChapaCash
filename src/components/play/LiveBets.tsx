"use client";

import { formatBp, formatPlayKes } from "@/components/ui/api";
import { useState } from "react";
import type { BetRow } from "@/components/play/types";

export function LiveBets({
  bets,
  meId,
  crashed,
}: {
  bets: BetRow[];
  meId: string | null;
  crashed: boolean;
}) {
  const [tab, setTab] = useState<"all" | "mine">("all");
  const rows = tab === "mine" && meId ? bets.filter((b) => b.userId === meId) : bets;
  const total = bets.reduce((sum, b) => sum + Number(b.stakeCredits || 0), 0);

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-[#2a2c34] bg-[#16171b] max-[820px]:max-h-none max-[820px]:border-t lg:w-[300px] lg:shrink-0 lg:border-r">
      <div className="flex gap-1 p-2">
        {(
          [
            ["all", "All Bets"],
            ["mine", "My Bets"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 rounded-full py-2 text-xs font-bold ${
              tab === id ? "bg-black text-[#f2f3f7]" : "bg-[#1d1e24] text-[#8b8e99]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between px-3.5 py-2 text-xs text-[#8b8e99]">
        <span>{bets.length} players</span>
        <b className="text-sm text-[#f2f3f7]">{formatPlayKes(total)}</b>
      </div>
      <div className="mx-3.5 mb-2 h-1 overflow-hidden rounded bg-[#1d1e24]">
        <i className="block h-full w-[62%] rounded bg-[#2fbf4e]" />
      </div>
      <div className="flex border-b border-[#2a2c34] px-3.5 py-1.5 text-[10px] text-[#8b8e99]">
        <span className="flex-1">User</span>
        <span className="w-16 text-right">Bet</span>
        <span className="w-11 text-right">X</span>
        <span className="w-16 text-right">Win</span>
      </div>
      <ul className="min-h-0 flex-1 overflow-auto max-[820px]:max-h-[280px]">
        {rows.map((b) => {
          const won = b.cashedOutAtBp != null;
          const lost = crashed && !won && b.status !== "CASHED_OUT";
          return (
            <li
              key={b.id}
              className={`flex items-center border-b border-white/[0.03] px-3.5 py-1.5 text-xs ${
                won ? "bg-[rgba(47,191,78,.08)]" : lost ? "text-[#8b8e99]" : ""
              }`}
            >
              <span className="flex flex-1 items-center gap-1.5 truncate text-[#8b8e99]">
                <i className="inline-grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-[#1d1e24] text-[9px] not-italic text-[#c9962f]">
                  {b.publicName.slice(0, 1)}
                </i>
                <span className="truncate">{b.publicName}</span>
              </span>
              <span className="w-16 text-right font-semibold tabular-nums">{formatPlayKes(b.stakeCredits)}</span>
              <span className={`w-11 text-right font-bold tabular-nums ${won ? "text-[#2fbf4e]" : "text-[#8b8e99]"}`}>
                {won ? formatBp(b.cashedOutAtBp) : "—"}
              </span>
              <span className={`w-16 text-right font-bold tabular-nums ${won ? "text-[#2fbf4e]" : ""}`}>
                {won ? formatPlayKes(b.payoutCredits) : "—"}
              </span>
            </li>
          );
        })}
        {rows.length === 0 ? (
          <li className="px-3 py-10 text-center text-xs text-[#8b8e99]">No bets this round.</li>
        ) : null}
      </ul>
    </aside>
  );
}
