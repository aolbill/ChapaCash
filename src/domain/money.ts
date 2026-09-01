export type Credits = bigint;

export const ZERO: Credits = 0n;

export function creditsFromString(raw: string): Credits {
  if (!/^[0-9]+$/.test(raw)) {
    throw new Error("credits_must_be_non_negative_integer");
  }
  return BigInt(raw);
}

export function creditsFromNumber(n: number): Credits {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error("credits_must_be_non_negative_integer");
  }
  return BigInt(n);
}

export function addCredits(a: Credits, b: Credits): Credits {
  return a + b;
}

export function subCredits(a: Credits, b: Credits): Credits {
  if (a < b) {
    throw new Error("insufficient_credits");
  }
  return a - b;
}

/** Payout = floor(stake * multiplierBp / 100). 100 bp = 1.00x. */
export function payoutCredits(stake: Credits, multiplierBp: number): Credits {
  if (!Number.isInteger(multiplierBp) || multiplierBp < 100) {
    throw new Error("invalid_multiplier");
  }
  return (stake * BigInt(multiplierBp)) / 100n;
}

export function formatCredits(value: Credits): string {
  return value.toString();
}

/** 1 credit = 1 KES. */
export function formatKes(value: Credits | string | number): string {
  const n = typeof value === "bigint" ? Number(value) : Number(value);
  if (!Number.isFinite(n)) return "KES 0";
  return `KES ${Math.trunc(n).toLocaleString("en-KE")}`;
}
