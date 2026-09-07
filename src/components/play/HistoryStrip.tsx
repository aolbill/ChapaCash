"use client";

import { formatBp } from "@/components/ui/api";
import { historyClass } from "@/components/play/historyTone";
import type { HistoryRound } from "@/components/play/types";

export function HistoryStrip({ rounds }: { rounds: HistoryRound[] }) {
  return (
    <div className="flex items-center gap-3 overflow-x-auto border-b border-[#2a2c34] bg-[#16171b] px-3 py-2 scrollbar-none sm:px-3.5">
      {rounds.length === 0 ? <span className="text-xs font-bold text-[#8b8e99]">—</span> : null}
      {rounds.map((r) => (
        <span
          key={r.id}
          className={`shrink-0 text-[13px] font-bold tabular-nums ${historyClass(r.crashMultiplierBp)}`}
          title={`Round ${r.roundNumber}`}
        >
          {formatBp(r.crashMultiplierBp)}
        </span>
      ))}
    </div>
  );
}
