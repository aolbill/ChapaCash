"use client";

import { formatBp, formatPlayKes } from "@/components/ui/api";
import { useEffect, useMemo, useState } from "react";
import type { BetRow } from "@/components/play/types";
import type { LivePresenceBet } from "@/components/play/useLivePlayerPresence";

type DisplayBet = {
  id: string;
  publicName: string;
  stakeCredits: string;
  cashedOutAtBp: number | null;
  payoutCredits: string | null;
  lost: boolean;
  mine: boolean;
};

function toDisplay(b: BetRow, crashed: boolean, meId: string | null): DisplayBet {
  return {
    id: b.id,
    publicName: b.publicName,
    stakeCredits: b.stakeCredits,
    cashedOutAtBp: b.cashedOutAtBp,
    payoutCredits: b.payoutCredits,
    lost: crashed && b.cashedOutAtBp == null && b.status !== "CASHED_OUT",
    mine: Boolean(meId && b.userId === meId),
  };
}

export function LiveBets({
  bets,
  myBets = [],
  meId,
  crashed,
  activePlayers,
  presenceBets,
}: {
  bets: BetRow[];
  myBets?: BetRow[];
  meId: string | null;
  crashed: boolean;
  activePlayers: number;
  presenceBets: LivePresenceBet[];
}) {
  const [tab, setTab] = useState<"all" | "mine">("all");
  // Defer volatile presence/list content until after hydration.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  /** Real ledger bets for this round, including the logged-in user's (pinned). */
  const trackedBets = useMemo(() => {
    const byId = new Map<string, BetRow>();
    for (const b of bets) byId.set(b.id, b);
    // Ensure myBets are tracked even if the public list is briefly stale.
    for (const b of myBets) {
      if (!byId.has(b.id)) byId.set(b.id, b);
    }
    return [...byId.values()];
  }, [bets, myBets]);

  const displayRows = useMemo(() => {
    if (!hydrated) return [];

    if (tab === "mine") {
      if (!meId) return [];
      return trackedBets.filter((b) => b.userId === meId).map((b) => toDisplay(b, crashed, meId));
    }

    const real = trackedBets.map((b) => toDisplay(b, crashed, meId));
    const mine = real.filter((b) => b.mine);
    const others = real.filter((b) => !b.mine);
    const presence = presenceBets.map((b) => ({
      ...b,
      lost: crashed && b.cashedOutAtBp == null,
      mine: false,
    }));
    // Own bets first so the logged-in player always sees their stakes tracked.
    return [...mine, ...others, ...presence].slice(0, 24);
  }, [hydrated, tab, meId, trackedBets, presenceBets, crashed]);

  const myBetCount = meId ? trackedBets.filter((b) => b.userId === meId).length : 0;

  const total = !hydrated
    ? Math.round(120 * 42)
    : tab === "mine"
      ? displayRows.reduce((sum, b) => sum + Number(b.stakeCredits || 0), 0)
      : Math.max(
          trackedBets.reduce((sum, b) => sum + Number(b.stakeCredits || 0), 0),
          Math.round(activePlayers * 42),
        );

  const playerLabel = !hydrated
    ? "120"
    : tab === "mine"
      ? String(myBetCount)
      : activePlayers.toLocaleString("en-KE");

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-[#2a2c34] bg-[#16171b] max-lg:border-t lg:w-[300px] lg:shrink-0 lg:border-r xl:w-[340px]">
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
            {id === "mine" && myBetCount > 0 ? (
              <span className="ml-1 text-[#2fbf4e]">({myBetCount})</span>
            ) : null}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between px-3.5 py-2 text-xs text-[#8b8e99]">
        <span>
          <b className="text-[#2fbf4e]">{playerLabel}</b> {tab === "mine" ? "your bets" : "players"}
        </span>
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
      <ul className="min-h-0 flex-1 overflow-auto max-lg:max-h-[220px] sm:max-lg:max-h-[280px]">
        {displayRows.map((b) => {
          const won = b.cashedOutAtBp != null;
          return (
            <li
              key={`${tab}-${b.id}`}
              className={`flex items-center border-b border-white/[0.03] px-3.5 py-1.5 text-xs ${
                b.mine
                  ? "bg-[rgba(225,29,42,.12)]"
                  : won
                    ? "bg-[rgba(47,191,78,.08)]"
                    : b.lost
                      ? "text-[#8b8e99]"
                      : ""
              }`}
            >
              <span className="flex flex-1 items-center gap-1.5 truncate text-[#8b8e99]">
                <i className="inline-grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-[#1d1e24] text-[9px] not-italic text-[#c9962f]">
                  {b.publicName.slice(0, 1)}
                </i>
                <span className={`truncate ${b.mine ? "font-bold text-[#f2f3f7]" : ""}`}>
                  {b.mine ? "You" : b.publicName}
                </span>
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
        {displayRows.length === 0 ? (
          <li className="px-3 py-10 text-center text-xs text-[#8b8e99]">
            {tab === "mine"
              ? meId
                ? "No bets from you this round."
                : "Log in to track your bets."
              : "No bets this round."}
          </li>
        ) : null}
      </ul>
    </aside>
  );
}
