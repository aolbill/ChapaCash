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
    const interval = window.setInterval(() => {
      setActivePlayers((current) => Math.max(100, current + Math.floor(Math.random() * 11) - 5));
      setPresenceBets((rows) => {
        const next = [...rows];
        const idx = Math.floor(Math.random() * next.length);
        next[idx] = makeRow(idx);
        return next;
      });
    }, 3000);
    return () => window.clearInterval(interval);
  }, []);

  return { activePlayers, presenceBets };
}
