"use client";

import { useEffect, useRef, useState } from "react";

const NAMES = [
  "Sky-1024",
  "NairobiAce",
  "MpesaKing",
  "LuckyWanjiru",
  "CrashCat",
  "OtienoX",
  "SafariBet",
  "Kamau77",
  "AminaPlay",
  "TurboNyeri",
  "CoastRider",
  "BetBrian",
  "WinnieK",
  "FlipKes",
  "Rounder",
];

const STAKE_PRESETS = [10, 20, 50, 100, 200, 500, 1000];

export type LivePresenceBet = {
  id: string;
  publicName: string;
  stakeCredits: string;
  cashedOutAtBp: number | null;
  payoutCredits: string | null;
};

let presenceSeq = 0;

function makeRow(slot: number): LivePresenceBet {
  presenceSeq += 1;
  const nameIndex = (slot + presenceSeq) % NAMES.length;
  const stake = STAKE_PRESETS[(slot + presenceSeq) % STAKE_PRESETS.length]!;
  // Mix in a little randomness for stakes/cashouts without touching the React key.
  const stakeJitter = STAKE_PRESETS[Math.floor(Math.random() * STAKE_PRESETS.length)]!;
  const useStake = Math.random() > 0.35 ? stakeJitter : stake;
  const cashed = Math.random() > 0.72;
  const bp = cashed ? 110 + Math.floor(Math.random() * 280) : null;
  return {
    // Slot + monotonic seq → unique across swaps (avoids duplicate key warnings).
    id: `presence-${slot}-${presenceSeq}`,
    publicName: NAMES[nameIndex]!,
    stakeCredits: String(useStake),
    cashedOutAtBp: bp,
    payoutCredits: bp != null ? String(Math.round((useStake * bp) / 100)) : null,
  };
}

/**
 * Soft social-presence count + sample rows for the play board (not ledger truth).
 * Rows stay empty until mount so SSR HTML matches the client first paint.
 */
export function useLivePlayerPresence(realBetCount = 0) {
  const [activePlayers, setActivePlayers] = useState(120);
  const [presenceBets, setPresenceBets] = useState<LivePresenceBet[]>([]);
  const realBetCountRef = useRef(realBetCount);
  realBetCountRef.current = realBetCount;

  useEffect(() => {
    setActivePlayers((current) => Math.max(100, current, realBetCount));
  }, [realBetCount]);

  useEffect(() => {
    setPresenceBets(Array.from({ length: 14 }, (_, slot) => makeRow(slot)));

    const tickCount = () => {
      setActivePlayers((current) => {
        const delta = Math.floor(Math.random() * 15) - 7; // -7 … +7
        const next = current + (delta === 0 ? (Math.random() > 0.5 ? 1 : -1) : delta);
        return Math.min(280, Math.max(100, next, realBetCountRef.current));
      });
    };

    const tickRows = () => {
      setPresenceBets((rows) => {
        const next = rows.length === 14 ? [...rows] : Array.from({ length: 14 }, (_, slot) => makeRow(slot));
        // Always swap distinct slots so we never temporarily duplicate identities.
        const slots = new Set<number>();
        const swaps = 1 + Math.floor(Math.random() * 3);
        while (slots.size < swaps) {
          slots.add(Math.floor(Math.random() * next.length));
        }
        for (const idx of slots) {
          next[idx] = makeRow(idx);
        }
        return next;
      });
    };

    const countId = window.setInterval(tickCount, 900);
    const rowsId = window.setInterval(tickRows, 1400);
    return () => {
      window.clearInterval(countId);
      window.clearInterval(rowsId);
    };
  }, []);

  return { activePlayers, presenceBets };
}
