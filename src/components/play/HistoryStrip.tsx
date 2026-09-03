"use client";

import { formatBp } from "@/components/ui/api";
import { historyClass } from "@/components/play/historyTone";
import type { HistoryRound } from "@/components/play/types";

export function HistoryStrip({ rounds }: { rounds: HistoryRound[] }) {
  if (rounds.length === 0) {
    return <div className="h-10 bg-[#161822]" />;
  }
  return (
    <div className="flex h-10 items-center gap-2 overflow-x-auto bg-[#161822] px-3 scrollbar-none">
      {rounds.map((r) => (
        <span
          key={r.id}
          className={`shrink-0 font-mono text-xs font-bold tabular-nums ${historyClass(r.crashMultiplierBp)}`}
          title={`Round ${r.roundNumber}`}
        >
          {formatBp(r.crashMultiplierBp)}
        </span>
      ))}
    </div>
  );
}
