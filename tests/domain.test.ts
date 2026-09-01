import { describe, expect, it } from "vitest";
import { deriveCrashMultiplierBp, derivePromoCrashMultiplierBp, commitServerSeed, ALGORITHM_V1 } from "@/domain/fairness";
import { decideCashout, multiplierBpAt } from "@/domain/round";
import { payoutCredits } from "@/domain/money";
import { assertBalanced, promoPostings, cashoutPostings, lossPostings, withdrawalPostings } from "@/domain/ledger";

describe("fairness", () => {
  const base = {
    algorithmVersion: ALGORITHM_V1,
    serverSeed: "a".repeat(64),
    clientSeed: "chapacash-public-v1",
    nonce: "1",
  };

  it("is deterministic", () => {
    const a = deriveCrashMultiplierBp(base);
    const b = deriveCrashMultiplierBp(base);
    expect(a.crashMultiplierBp).toBe(b.crashMultiplierBp);
    expect(a.serverSeedHash).toBe(commitServerSeed(base.serverSeed));
  });

  it("changes when any input changes", () => {
    const a = deriveCrashMultiplierBp(base).crashMultiplierBp;
    expect(deriveCrashMultiplierBp({ ...base, nonce: "2" }).crashMultiplierBp).not.toBe(a);
    expect(deriveCrashMultiplierBp({ ...base, clientSeed: "other" }).crashMultiplierBp).not.toBe(a);
    expect(deriveCrashMultiplierBp({ ...base, serverSeed: "b".repeat(64) }).crashMultiplierBp).not.toBe(a);
  });

  it("gives free-credit mapping a later typical crash than cash play", () => {
    const promo = derivePromoCrashMultiplierBp({
      serverSeed: base.serverSeed,
      clientSeed: base.clientSeed,
      nonce: "9",
    }).crashMultiplierBp;
    const cash = deriveCrashMultiplierBp({ ...base, nonce: "9" }).crashMultiplierBp;
    expect(promo).toBeGreaterThanOrEqual(cash);
  });
});

describe("cashout ordering", () => {
  it("accepts before crash", () => {
    const d = decideCashout({
      status: "RUNNING",
      elapsedMs: 0,
      crashMultiplierBp: 250,
      growthPerSecond: "0.06",
    });
    expect(d.accept).toBe(true);
  });

  it("rejects at or after crash", () => {
    const crash = 150;
    const elapsed = 10_000;
    const m = multiplierBpAt(elapsed, "0.06");
    expect(m).toBeGreaterThan(crash);
    const d = decideCashout({
      status: "RUNNING",
      elapsedMs: elapsed,
      crashMultiplierBp: crash,
      growthPerSecond: "0.06",
    });
    expect(d.accept).toBe(false);
  });
});

describe("ledger integers", () => {
  it("pays out with integer math", () => {
    expect(payoutCredits(100n, 250)).toBe(250n);
  });

  it("balances promo and loss", () => {
    assertBalanced(promoPostings("u", "p", 10n));
    assertBalanced(lossPostings("c", "h", 10n));
    assertBalanced(withdrawalPostings("u", "ps", 50n));
    assertBalanced(
      cashoutPostings({
        userAccountId: "u",
        clearingId: "c",
        houseId: "h",
        stake: 100n,
        payout: 250n,
      }),
    );
  });
});
