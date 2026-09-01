import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex, randomBytes } from "@noble/hashes/utils";

export const ALGORITHM_V1 = "hmac-sha256-crash-v1";
/** Promo mapping only — not the published real-money fairness claim. */
export const ALGORITHM_PROMO_V1 = "hmac-sha256-crash-promo-v1";

/** Instant 1.00x when n % 33 === 0 (~3.03%). Documented house edge, not a fairness claim. */
const INSTANT_CRASH_MOD = 33n;
const PROMO_INSTANT_CRASH_MOD = 200n;
const FIFTY_TWO = 2n ** 52n;

export type FairnessInputs = {
  algorithmVersion: string;
  serverSeed: string;
  clientSeed: string;
  nonce: string;
};

export type FairnessResult = FairnessInputs & {
  serverSeedHash: string;
  hmacHex: string;
  crashMultiplierBp: number;
};

export function generateServerSeed(): string {
  return bytesToHex(randomBytes(32));
}

export function commitServerSeed(serverSeed: string): string {
  return bytesToHex(sha256(serverSeed));
}

export function hmacSha256Hex(serverSeed: string, message: string): string {
  return bytesToHex(hmac(sha256, serverSeed, message));
}

function mapHmacToCrashBp(
  hmacHex: string,
  instantMod: bigint,
  rtpNumerator: bigint,
  rtpDenom: bigint,
): number {
  const n = BigInt(`0x${hmacHex.slice(0, 13)}`);
  if (n % instantMod === 0n) return 100;
  const raw = (rtpNumerator * FIFTY_TWO) / (rtpDenom * (FIFTY_TWO - n));
  return Number(raw < 100n ? 100n : raw);
}

/**
 * Maps HMAC-SHA256(serverSeed, `${clientSeed}:${nonce}`) to a crash multiplier
 * in basis points (100 = 1.00x).
 *
 * Construction (algorithmVersion = hmac-sha256-crash-v1):
 * 1. hmac = HMAC-SHA256(serverSeed, clientSeed + ":" + nonce) as hex
 * 2. n = integer from the first 13 hex chars (52 bits)
 * 3. if n % 33 == 0 -> 100 (instant 1.00x)
 * 4. else crashBp = floor(99 * 2^52 / (2^52 - n)), minimum 100
 *
 * Independent verifiers must use the same steps. Changing any input changes hmac.
 */
export function deriveCrashMultiplierBp(inputs: FairnessInputs): FairnessResult {
  if (inputs.algorithmVersion !== ALGORITHM_V1) {
    throw new Error("unsupported_algorithm_version");
  }
  const message = `${inputs.clientSeed}:${inputs.nonce}`;
  const hmacHex = hmacSha256Hex(inputs.serverSeed, message);
  return {
    ...inputs,
    serverSeedHash: commitServerSeed(inputs.serverSeed),
    hmacHex,
    crashMultiplierBp: mapHmacToCrashBp(hmacHex, INSTANT_CRASH_MOD, 99n, 1n),
  };
}

/**
 * Free-credit rounds use the same HMAC inputs but a gentler curve:
 * ~0.5% instant crash (mod 200) and ~99.8% RTP so practice play lasts longer.
 */
export function derivePromoCrashMultiplierBp(inputs: Omit<FairnessInputs, "algorithmVersion">): FairnessResult {
  const message = `${inputs.clientSeed}:${inputs.nonce}`;
  const hmacHex = hmacSha256Hex(inputs.serverSeed, message);
  return {
    algorithmVersion: ALGORITHM_PROMO_V1,
    serverSeed: inputs.serverSeed,
    clientSeed: inputs.clientSeed,
    nonce: inputs.nonce,
    serverSeedHash: commitServerSeed(inputs.serverSeed),
    hmacHex,
    crashMultiplierBp: mapHmacToCrashBp(hmacHex, PROMO_INSTANT_CRASH_MOD, 998n, 10n),
  };
}

export function formatMultiplier(bp: number): string {
  const whole = Math.floor(bp / 100);
  const frac = (bp % 100).toString().padStart(2, "0");
  return `${whole}.${frac}x`;
}
