"use client";

import { formatBp, formatKes } from "@/components/ui/api";
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

  return (
    <aside className="flex min-h-[220px] flex-col border-t border-white/5 bg-[#14161f] lg:min-h-[420px] lg:border-l lg:border-t-0">
      <div className="flex items-center gap-1 border-b border-white/5 px-2 py-2">
        {(
          [
            ["all", `All bets ${bets.length}`],
            ["mine", "My bets"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
              tab === id ? "bg-white/10 text-white" : "text-white/45 hover:text-white/80"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/35">
        <span>User</span>
        <span className="text-right">Bet</span>
        <span className="text-right">X</span>
        <span className="text-right">Win</span>
      </div>
      <ul className="max-h-64 flex-1 space-y-0.5 overflow-auto px-2 pb-2 lg:max-h-none">
        {rows.map((b) => {
          const won = b.cashedOutAtBp != null;
          const lost = crashed && !won && b.status !== "CASHED_OUT";
          return (
            <li
              key={b.id}
              className={`grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-2 rounded-md px-1.5 py-1.5 text-xs ${
                won ? "bg-emerald-500/10 text-emerald-300" : lost ? "text-white/35" : "text-white/80"
              }`}
            >
              <span className="truncate font-medium">
                {b.publicName}
                {b.walletKind === "PROMO" ? <span className="ml-1 text-[9px] uppercase text-amber-400">free</span> : null}
              </span>
              <span className="tabular-nums">{formatKes(b.stakeCredits)}</span>
              <span className="w-12 text-right tabular-nums">{won ? formatBp(b.cashedOutAtBp) : "—"}</span>
              <span className="w-16 text-right tabular-nums">{won ? formatKes(b.payoutCredits) : "—"}</span>
            </li>
          );
        })}
        {rows.length === 0 ? (
          <li className="px-2 py-10 text-center text-xs text-white/35">No bets this round.</li>
        ) : null}
      </ul>
    </aside>
  );
}
