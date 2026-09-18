"use client";

import { useEffect, useState } from "react";

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

export type LivePresenceBet = {
  id: string;
  publicName: string;
  stakeCredits: string;
  cashedOutAtBp: number | null;
  payoutCredits: string | null;
};

function randomStake(): string {
  const presets = [10, 20, 50, 100, 200, 500, 1000];
  return String(presets[Math.floor(Math.random() * presets.length)]);
}

function makeRow(i: number): LivePresenceBet {
  const stake = randomStake();
  const cashed = Math.random() > 0.72;
  const bp = cashed ? 110 + Math.floor(Math.random() * 280) : null;
  return {
    id: `presence-${i}-${Date.now().toString(36)}`,
    publicName: NAMES[i % NAMES.length]!,
    stakeCredits: stake,
    cashedOutAtBp: bp,
    payoutCredits: bp != null ? String(Math.round((Number(stake) * bp) / 100)) : null,
  };
}

/** Soft social-presence count + sample rows for the play board (not ledger truth). */
export function useLivePlayerPresence(realBetCount = 0) {
  const [activePlayers, setActivePlayers] = useState(120);
  const [presenceBets, setPresenceBets] = useState<LivePresenceBet[]>(() =>
    Array.from({ length: 14 }, (_, i) => makeRow(i)),
  );

  useEffect(() => {
    setActivePlayers((current) => Math.max(100, current, realBetCount));
  }, [realBetCount]);

  useEffect(() => {
    const tickCount = () => {
      setActivePlayers((current) => {
        const delta = Math.floor(Math.random() * 15) - 7; // -7 … +7
        const next = current + (delta === 0 ? (Math.random() > 0.5 ? 1 : -1) : delta);
        return Math.min(280, Math.max(100, next, realBetCount));
      });
    };

    const tickRows = () => {
      setPresenceBets((rows) => {
        const next = [...rows];
        const swaps = 1 + Math.floor(Math.random() * 3);
        for (let s = 0; s < swaps; s++) {
          const idx = Math.floor(Math.random() * next.length);
          next[idx] = makeRow(idx + Math.floor(Math.random() * NAMES.length));
        }
        return next;
      });
    };

    tickCount();
    const countId = window.setInterval(tickCount, 900);
    const rowsId = window.setInterval(tickRows, 1400);
    return () => {
      window.clearInterval(countId);
      window.clearInterval(rowsId);
    };
  }, [realBetCount]);

  return { activePlayers, presenceBets };
}
