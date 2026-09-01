import { connectMongo } from "@/lib/mongo";
import { assertBalanced, compensatingPostings, signedDelta, type PostingDraft } from "@/domain/ledger";
import { ApiError } from "@/domain/errors";
import { logger } from "@/lib/logger";
import { metrics } from "@/lib/metrics";
import { Deposit, LedgerEntry, WalletAccount } from "@/server/db/models";

function toCredits(s: string): bigint {
  return BigInt(s);
}

function fromCredits(n: bigint): string {
  return n.toString();
}

export type WalletKind = "REAL" | "PROMO";

export type UserBalances = {
  cashCredits: string;
  promoCredits: string;
  hasDeposited: boolean;
  lifetimeDepositedKes: string;
};

let systemAccountsReady = false;

export async function ensureSystemAccounts() {
  if (systemAccountsReady) return;
  await connectMongo();
  for (const kind of ["HOUSE", "PROMO_POOL", "WAGER_CLEARING", "PAYSTACK_CLEARING"] as const) {
    await WalletAccount.updateOne(
      { kind, userId: null },
      { $setOnInsert: { kind, userId: null, cachedBalanceCredits: "0", version: 0 } },
      { upsert: true },
    );
  }
  systemAccountsReady = true;
}

async function systemId(
  kind: "HOUSE" | "PROMO_POOL" | "WAGER_CLEARING" | "PAYSTACK_CLEARING",
): Promise<string> {
  const row = await WalletAccount.findOne({ kind, userId: null });
  if (!row) throw new Error(`missing_system_account:${kind}`);
  return String(row._id);
}

async function ensureKind(userId: string, kind: "USER_WALLET" | "USER_PROMO") {
  let row = await WalletAccount.findOne({ userId, kind });
  if (!row) {
    row = await WalletAccount.create({
      userId,
      kind,
      cachedBalanceCredits: "0",
    });
  }
  return row;
}

export async function ensureUserWallets(userId: string) {
  await connectMongo();
  await ensureSystemAccounts();
  const real = await ensureKind(userId, "USER_WALLET");
  const promo = await ensureKind(userId, "USER_PROMO");
  const realBal = toCredits(real.cachedBalanceCredits);
  const promoBal = toCredits(promo.cachedBalanceCredits);
  if (promoBal === 0n && realBal > 0n) {
    const deposited = await Deposit.exists({ userId, status: "SUCCESS" });
    if (!deposited) {
      await postLedger({
        type: "COMPENSATING_CORRECTION",
        requestId: `split-promo:${userId}`,
        actorUserId: null,
        reason: "Move legacy play credits into the free-credit wallet",
        userId,
        draftsFn: async (ids) =>
          compensatingPostings(ids.userWalletId, ids.userPromoId, realBal),
      });
    }
  }
  return { real, promo };
}

export async function resolveAccountIds(userId: string | null) {
  await ensureSystemAccounts();
  const houseId = await systemId("HOUSE");
  const promoPoolId = await systemId("PROMO_POOL");
  const clearingId = await systemId("WAGER_CLEARING");
  const paystackClearingId = await systemId("PAYSTACK_CLEARING");
  let userWalletId = "";
  let userPromoId = "";
  if (userId) {
    const real = await ensureKind(userId, "USER_WALLET");
    const promo = await ensureKind(userId, "USER_PROMO");
    userWalletId = String(real._id);
    userPromoId = String(promo._id);
  }
  return { userWalletId, userPromoId, houseId, promoPoolId, clearingId, paystackClearingId };
}

export async function postLedger(args: {
  type:
    | "PROMO_CREDIT"
    | "BET_DEBIT"
    | "CASH_OUT_PAYOUT"
    | "LOST_BET_SETTLEMENT"
    | "COMPENSATING_CORRECTION"
    | "MPESA_DEPOSIT"
    | "MPESA_WITHDRAWAL"
    | "MPESA_WITHDRAWAL_REVERSAL";
  requestId: string;
  actorUserId: string | null;
  reason: string;
  userId: string | null;
  metadata?: Record<string, unknown>;
  draftsFn: (ids: {
    userWalletId: string;
    userPromoId: string;
    houseId: string;
    promoPoolId: string;
    clearingId: string;
    paystackClearingId: string;
  }) => Promise<PostingDraft[]> | PostingDraft[];
}) {
  await connectMongo();
  const existing = await LedgerEntry.findOne({ requestId: args.requestId });
  if (existing) return existing;

  const ids = await resolveAccountIds(args.userId);
  const drafts = await args.draftsFn(ids);
  assertBalanced(drafts);

  try {
    const entry = await LedgerEntry.create({
      type: args.type,
      requestId: args.requestId,
      actorUserId: args.actorUserId,
      reason: args.reason,
      metadata: args.metadata ?? null,
      postings: drafts.map((d) => ({
        accountId: d.accountId,
        side: d.side,
        amount: fromCredits(d.amount),
      })),
    });

    for (const d of drafts) {
      const wallet = await WalletAccount.findById(d.accountId);
      if (!wallet) throw new Error("wallet_missing");
      const next = toCredits(wallet.cachedBalanceCredits) + signedDelta(d.side, d.amount);
      if ((wallet.kind === "USER_WALLET" || wallet.kind === "USER_PROMO") && next < 0n) {
        await LedgerEntry.deleteOne({ _id: entry._id });
        throw new ApiError("insufficient_credits", 400, "Insufficient balance for this stake.");
      }
      wallet.cachedBalanceCredits = fromCredits(next);
      wallet.version += 1;
      await wallet.save();
    }
    return entry;
  } catch (error: unknown) {
    const code = (error as { code?: number }).code;
    if (code === 11000) {
      const again = await LedgerEntry.findOne({ requestId: args.requestId });
      if (again) return again;
    }
    throw error;
  }
}

export async function ledgerBalance(accountId: string): Promise<bigint> {
  const entries = await LedgerEntry.find({ "postings.accountId": accountId });
  let balance = 0n;
  for (const e of entries) {
    for (const p of e.postings) {
      if (p.accountId === accountId) {
        balance += signedDelta(p.side as "DEBIT" | "CREDIT", toCredits(p.amount));
      }
    }
  }
  return balance;
}

export async function reconcileUserWallet(userId: string) {
  const { real } = await ensureUserWallets(userId);
  const fromPostings = await ledgerBalance(String(real._id));
  const cached = toCredits(real.cachedBalanceCredits);
  const ok = fromPostings === cached;
  if (!ok) {
    metrics.inc("ledger_reconciliation_failures");
    logger.error("ledger_mismatch", {
      userId,
      cached: cached.toString(),
      postings: fromPostings.toString(),
    });
  }
  return {
    accountId: String(real._id),
    cachedBalanceCredits: real.cachedBalanceCredits,
    postingBalanceCredits: fromPostings.toString(),
    consistent: ok,
  };
}

export async function userBalances(userId: string, detail: "fast" | "full" = "fast"): Promise<UserBalances> {
  await connectMongo();
  let real = await WalletAccount.findOne({ userId, kind: "USER_WALLET" });
  let promo = await WalletAccount.findOne({ userId, kind: "USER_PROMO" });
  if (!real || !promo) {
    await ensureUserWallets(userId);
    real = await WalletAccount.findOne({ userId, kind: "USER_WALLET" });
    promo = await WalletAccount.findOne({ userId, kind: "USER_PROMO" });
  }
  const cashCredits = real?.cachedBalanceCredits ?? "0";
  const promoCredits = promo?.cachedBalanceCredits ?? "0";
  if (detail === "fast") {
    return {
      cashCredits,
      promoCredits,
      hasDeposited: BigInt(cashCredits) > 0n,
      lifetimeDepositedKes: "0",
    };
  }
  const deposits = await Deposit.find({ userId, status: "SUCCESS" });
  let lifetime = 0n;
  for (const d of deposits) lifetime += toCredits(d.amountKes);
  return {
    cashCredits,
    promoCredits,
    hasDeposited: deposits.length > 0,
    lifetimeDepositedKes: lifetime.toString(),
  };
}

export async function userBalance(userId: string): Promise<string> {
  const b = await userBalances(userId);
  return b.cashCredits;
}
