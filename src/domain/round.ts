import Decimal from "decimal.js";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_DOWN });

export const ROUND_STATES = [
  "SCHEDULED",
  "BETTING_OPEN",
  "BETTING_CLOSED",
  "RUNNING",
  "CRASHED",
  "SETTLED",
  "ARCHIVED",
] as const;

export type RoundState = (typeof ROUND_STATES)[number];

const TRANSITIONS: Record<RoundState, RoundState[]> = {
  SCHEDULED: ["BETTING_OPEN"],
  BETTING_OPEN: ["BETTING_CLOSED"],
  BETTING_CLOSED: ["RUNNING"],
  RUNNING: ["CRASHED"],
  CRASHED: ["SETTLED"],
  SETTLED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function canTransition(from: RoundState, to: RoundState): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: RoundState, to: RoundState): void {
  if (!canTransition(from, to)) {
    throw new Error(`illegal_transition:${from}->${to}`);
  }
}

export function multiplierBpAt(elapsedMs: number, growthPerSecond: string): number {
  if (elapsedMs <= 0) return 100;
  const t = new Decimal(elapsedMs).div(1000);
  const m = Decimal.exp(new Decimal(growthPerSecond).mul(t)).mul(100);
  return Decimal.max(100, m.floor()).toNumber();
}

export function elapsedMsUntilCrash(
  crashMultiplierBp: number,
  growthPerSecond: string,
): number {
  if (crashMultiplierBp <= 100) return 0;
  const ratio = new Decimal(crashMultiplierBp).div(100);
  const tSec = Decimal.ln(ratio).div(new Decimal(growthPerSecond));
  return tSec.mul(1000).ceil().toNumber();
}

export type CashoutDecision =
  | { accept: true; multiplierBp: number }
  | { accept: false; reason: "not_running" | "at_or_after_crash" };

/**
 * Server-side ordering: cash-out is accepted only while the round is RUNNING
 * and the multiplier implied by server elapsed time is strictly below crashBp.
 * Equality with crash is a loss (crash wins ties).
 */
export function decideCashout(args: {
  status: RoundState;
  elapsedMs: number;
  crashMultiplierBp: number;
  growthPerSecond: string;
}): CashoutDecision {
  if (args.status !== "RUNNING") {
    return { accept: false, reason: "not_running" };
  }
  const multiplierBp = multiplierBpAt(args.elapsedMs, args.growthPerSecond);
  if (multiplierBp >= args.crashMultiplierBp) {
    return { accept: false, reason: "at_or_after_crash" };
  }
  return { accept: true, multiplierBp };
}

export const MIN_STAKE = 1n;
export const MAX_STAKE = 100_000n;
export const SLOT_INDEXES = [0, 1] as const;
export type SlotIndex = (typeof SLOT_INDEXES)[number];

export function isSlotIndex(n: number): n is SlotIndex {
  return n === 0 || n === 1;
}
