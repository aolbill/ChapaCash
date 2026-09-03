import { connectMongo } from "@/lib/mongo";
import { env } from "@/lib/env";
import { ApiError } from "@/domain/errors";
import {
  ALGORITHM_V1,
  commitServerSeed,
  deriveCrashMultiplierBp,
  derivePromoCrashMultiplierBp,
  generateServerSeed,
} from "@/domain/fairness";
import {
  decideCashout,
  elapsedMsUntilCrash,
  isSlotIndex,
  MAX_STAKE,
  MIN_STAKE,
  multiplierBpAt,
  type RoundState,
} from "@/domain/round";
import { betDebitPostings, cashoutPostings, lossPostings } from "@/domain/ledger";
import { payoutCredits } from "@/domain/money";
import { postLedger, userBalances, type WalletKind } from "@/server/ledger/service";
import { publishEvent } from "@/server/realtime/pubsub";
import { writeAudit } from "@/server/admin/audit";
import { metrics } from "@/lib/metrics";
import { logger } from "@/lib/logger";
import { Bet, Cashout, FairnessProof, GameRound, RoundEvent, User } from "@/server/db/models";

function growth(): string {
  return env.GROWTH_PER_SECOND;
}

const liveSeq = new Map<string, number>();

function promoCrashBpFor(round: {
  serverSeed: string;
  clientSeed: string;
  nonce: string;
}) {
  return derivePromoCrashMultiplierBp({
    serverSeed: round.serverSeed,
    clientSeed: round.clientSeed,
    nonce: round.nonce,
  }).crashMultiplierBp;
}

function walletIds(
  ids: { userWalletId: string; userPromoId: string; houseId: string; promoPoolId: string },
  kind: WalletKind,
) {
  if (kind === "PROMO") {
    return { userAccountId: ids.userPromoId, houseOrPoolId: ids.promoPoolId };
  }
  return { userAccountId: ids.userWalletId, houseOrPoolId: ids.houseId };
}

function crashBpFor(round: {
  serverSeed: string;
  clientSeed: string;
  nonce: string;
  algorithmVersion: string;
}) {
  return deriveCrashMultiplierBp({
    algorithmVersion: round.algorithmVersion,
    serverSeed: round.serverSeed,
    clientSeed: round.clientSeed,
    nonce: round.nonce,
  }).crashMultiplierBp;
}

async function emit(
  roundId: string,
  type: string,
  payload: Record<string, unknown>,
  persist = true,
) {
  let seq = liveSeq.get(roundId) ?? 0;
  if (persist) {
    await connectMongo();
    const updated = await GameRound.findByIdAndUpdate(
      roundId,
      { $inc: { lastSequence: 1 } },
      { new: true },
    );
    if (!updated) return 0;
    seq = updated.lastSequence;
    liveSeq.set(roundId, seq);
    await RoundEvent.create({ roundId, sequence: seq, type, payload });
  }
  publishEvent({ roundId, seq, type, ts: new Date().toISOString(), payload });
  return seq;
}

export async function createScheduledRound(): Promise<void> {
  await connectMongo();
  const last = await GameRound.findOne().sort({ roundNumber: -1 });
  const roundNumber = (last?.roundNumber ?? 0) + 1;
  const serverSeed = generateServerSeed();
  const now = Date.now();
  const bettingOpensAt = new Date(now + 400);
  const bettingClosesAt = new Date(now + 400 + Number(env.BETTING_WINDOW_MS));
  try {
    const round = await GameRound.create({
      roundNumber,
      status: "SCHEDULED",
      nonce: String(roundNumber),
      clientSeed: env.FAIRNESS_CLIENT_SEED,
      serverSeedHash: commitServerSeed(serverSeed),
      serverSeed,
      algorithmVersion: env.FAIRNESS_ALGORITHM_VERSION || ALGORITHM_V1,
      bettingOpensAt,
      bettingClosesAt,
    });
    liveSeq.set(String(round._id), 0);
    await emit(String(round._id), "SCHEDULED", {
      roundNumber,
      serverSeedHash: round.serverSeedHash,
      bettingOpensAt: bettingOpensAt.toISOString(),
      bettingClosesAt: bettingClosesAt.toISOString(),
    });
  } catch (error: unknown) {
    if ((error as { code?: number }).code === 11000) return;
    throw error;
  }
}

export async function tickEngine(now = new Date()): Promise<void> {
  await connectMongo();
  const latest = await GameRound.findOne().sort({ roundNumber: -1 });
  if (!latest || latest.status === "ARCHIVED") {
    await createScheduledRound();
    return;
  }
  const id = String(latest._id);
  const status = latest.status as RoundState;

  if (status === "SCHEDULED" && now >= latest.bettingOpensAt) {
    const opened = await GameRound.findOneAndUpdate(
      { _id: id, status: "SCHEDULED" },
      { $set: { status: "BETTING_OPEN" } },
      { new: true },
    );
    if (opened) {
      await emit(id, "BETTING_OPEN", { bettingClosesAt: opened.bettingClosesAt.toISOString() });
    }
    return;
  }

  if (status === "BETTING_OPEN" && now >= latest.bettingClosesAt) {
    const closed = await GameRound.findOneAndUpdate(
      { _id: id, status: "BETTING_OPEN" },
      { $set: { status: "BETTING_CLOSED" } },
      { new: true },
    );
    if (closed) await emit(id, "BETTING_CLOSED", { commitment: closed.serverSeedHash });
    return;
  }

  if (status === "BETTING_CLOSED") {
    const running = await GameRound.findOneAndUpdate(
      { _id: id, status: "BETTING_CLOSED" },
      { $set: { status: "RUNNING", runningStartedAt: now } },
      { new: true },
    );
    if (running) await emit(id, "RUNNING", { runningStartedAt: now.toISOString() });
    return;
  }

  if (status === "RUNNING") {
    const startedAt = latest.runningStartedAt ?? now;
    if (!latest.runningStartedAt) {
      await GameRound.updateOne({ _id: id, status: "RUNNING" }, { $set: { runningStartedAt: now } });
    }
    const crashBp = crashBpFor(latest);
    const elapsed = now.getTime() - startedAt.getTime();
    const crashAt = elapsedMsUntilCrash(crashBp, growth());
    const currentBp = multiplierBpAt(elapsed, growth());
    if (elapsed >= crashAt || currentBp >= crashBp) {
      await crashAndSettle(id, crashBp, now);
      return;
    }
    await emit(id, "TICK", { multiplierBp: currentBp, elapsedMs: elapsed }, false);
    return;
  }

  if (status === "CRASHED") {
    await settleRound(id);
    return;
  }

  if (status === "SETTLED") {
    const wait = Number(env.INTERMISSION_MS);
    if (latest.settledAt && now.getTime() - latest.settledAt.getTime() >= wait) {
      await archiveRound(id);
      await createScheduledRound();
    }
  }
}

async function crashAndSettle(roundId: string, crashBp: number, now: Date) {
  const updated = await GameRound.findOneAndUpdate(
    { _id: roundId, status: "RUNNING" },
    { $set: { status: "CRASHED", crashMultiplierBp: crashBp, crashedAt: now } },
    { new: true },
  );
  if (!updated) return;
  await emit(roundId, "CRASHED", { crashMultiplierBp: crashBp });
  metrics.inc("rounds_crashed");
  await settleRound(roundId);
}

export async function settleRound(roundId: string): Promise<void> {
  const round = await GameRound.findById(roundId);
  if (!round || round.status === "SETTLED" || round.status === "ARCHIVED") return;
  if (round.status !== "CRASHED") return;

  const publicCrash = crashBpFor(round);
  const promoCrash = promoCrashBpFor(round);
  const openBets = await Bet.find({ roundId, status: "PLACED" });
  for (const bet of openBets) {
    try {
      const kind = (bet.walletKind as WalletKind | undefined) ?? "REAL";
      const survives = kind === "PROMO" && promoCrash > publicCrash;
      if (survives) {
        const payout = payoutCredits(BigInt(bet.stakeCredits), publicCrash);
        const cashout = await Cashout.create({
          betId: String(bet._id),
          userId: bet.userId,
          multiplierBp: publicCrash,
          payoutCredits: payout.toString(),
          idempotencyKey: `promo-survive:${String(bet._id)}`,
          acceptedSeq: round.lastSequence,
        });
        const entry = await postLedger({
          type: "CASH_OUT_PAYOUT",
          requestId: `promo-survive:${String(bet._id)}`,
          actorUserId: null,
          reason: "Free-credit bet survived public crash",
          userId: bet.userId,
          metadata: { betId: String(bet._id), roundId, promoCrash, publicCrash },
          draftsFn: async (ids) => {
            const w = walletIds(ids, "PROMO");
            return cashoutPostings({
              userAccountId: w.userAccountId,
              clearingId: ids.clearingId,
              houseId: w.houseOrPoolId,
              stake: BigInt(bet.stakeCredits),
              payout,
            });
          },
        });
        cashout.ledgerEntryId = String(entry._id);
        await cashout.save();
        await Bet.updateOne(
          { _id: bet._id, status: "PLACED" },
          { $set: { status: "CASHED_OUT", ledgerEntryId: String(entry._id) } },
        );
        continue;
      }

      const entry = await postLedger({
        type: "LOST_BET_SETTLEMENT",
        requestId: `loss:${String(bet._id)}`,
        actorUserId: null,
        reason: kind === "PROMO" ? "Free-credit stake settled after crash" : "Cash stake settled to house after crash",
        userId: bet.userId,
        metadata: { betId: String(bet._id), roundId, walletKind: kind },
        draftsFn: async (ids) => {
          const w = walletIds(ids, kind);
          return lossPostings(ids.clearingId, w.houseOrPoolId, BigInt(bet.stakeCredits));
        },
      });
      await Bet.updateOne(
        { _id: bet._id, status: "PLACED" },
        { $set: { status: "LOST", ledgerEntryId: String(entry._id) } },
      );
    } catch (error) {
      metrics.inc("settlement_failures");
      logger.error("settlement_bet_failed", { betId: String(bet._id), err: String(error) });
      throw error;
    }
  }

  const settled = await GameRound.findOneAndUpdate(
    { _id: roundId, status: "CRASHED" },
    { $set: { status: "SETTLED", settledAt: new Date() } },
    { new: true },
  );
  if (settled) {
    await emit(roundId, "SETTLED", {});
  }
}

async function archiveRound(roundId: string) {
  const round = await GameRound.findById(roundId);
  if (!round || round.status !== "SETTLED") return;
  const derived = deriveCrashMultiplierBp({
    algorithmVersion: round.algorithmVersion,
    serverSeed: round.serverSeed,
    clientSeed: round.clientSeed,
    nonce: round.nonce,
  });
  await FairnessProof.updateOne(
    { roundId },
    {
      $setOnInsert: {
        roundId,
        algorithmVersion: derived.algorithmVersion,
        serverSeedHash: derived.serverSeedHash,
        serverSeed: derived.serverSeed,
        clientSeed: derived.clientSeed,
        nonce: derived.nonce,
        crashMultiplierBp: derived.crashMultiplierBp,
        hmacPreview: derived.hmacHex.slice(0, 16),
      },
    },
    { upsert: true },
  );
  await GameRound.updateOne(
    { _id: roundId, status: "SETTLED" },
    { $set: { status: "ARCHIVED", archivedAt: new Date() } },
  );
  liveSeq.delete(roundId);
  await emit(roundId, "ARCHIVED", {
    serverSeed: derived.serverSeed,
    serverSeedHash: derived.serverSeedHash,
    clientSeed: derived.clientSeed,
    nonce: derived.nonce,
    crashMultiplierBp: derived.crashMultiplierBp,
    algorithmVersion: derived.algorithmVersion,
  });
}

export async function placeBet(args: {
  userId: string;
  roundId: string;
  slotIndex: number;
  stakeCredits: bigint;
  walletKind?: WalletKind;
  idempotencyKey: string;
  requestId: string;
}) {
  await connectMongo();
  metrics.inc("bet_requests");
  if (!isSlotIndex(args.slotIndex)) {
    throw new ApiError("invalid_input", 400, "slotIndex must be 0 or 1.");
  }
  if (args.stakeCredits < MIN_STAKE || args.stakeCredits > MAX_STAKE) {
    throw new ApiError("invalid_input", 400, "Stake is outside allowed range.");
  }

  const [existing, balances, round] = await Promise.all([
    Bet.findOne({ userId: args.userId, idempotencyKey: args.idempotencyKey }),
    userBalances(args.userId),
    GameRound.findById(args.roundId),
  ]);
  if (existing) return { bet: existing, replay: true };
  const walletKind: WalletKind =
    args.walletKind ?? (BigInt(balances.cashCredits) > 0n ? "REAL" : "PROMO");
  if (walletKind === "REAL" && BigInt(balances.cashCredits) < args.stakeCredits) {
    throw new ApiError(
      "insufficient_credits",
      400,
      BigInt(balances.cashCredits) === 0n
        ? "Deposit via M-PESA to play with cash, or switch to free credits."
        : "Not enough cash balance. Deposit via M-PESA or lower the stake.",
    );
  }
  if (walletKind === "PROMO" && BigInt(balances.promoCredits) < args.stakeCredits) {
    throw new ApiError("insufficient_credits", 400, "Not enough free credits for this stake.");
  }

  if (!round) throw new ApiError("not_found", 404, "Round not found.");
  if (round.status !== "BETTING_OPEN") {
    throw new ApiError("betting_closed", 409, "Betting is not open for this round.");
  }
  const dup = await Bet.findOne({
    roundId: args.roundId,
    userId: args.userId,
    slotIndex: args.slotIndex,
  });
  if (dup) throw new ApiError("conflict", 409, "This bet slot is already used.");

  let bet;
  try {
    bet = await Bet.create({
      roundId: args.roundId,
      userId: args.userId,
      slotIndex: args.slotIndex,
      stakeCredits: args.stakeCredits.toString(),
      walletKind,
      idempotencyKey: args.idempotencyKey,
    });
  } catch (error: unknown) {
    if ((error as { code?: number }).code === 11000) {
      const again = await Bet.findOne({
        userId: args.userId,
        idempotencyKey: args.idempotencyKey,
      });
      if (again) return { bet: again, replay: true };
    }
    throw error;
  }

  try {
    const entry = await postLedger({
      type: "BET_DEBIT",
      requestId: `bet:${args.idempotencyKey}`,
      actorUserId: args.userId,
      reason: walletKind === "PROMO" ? "Free-credit stake" : "Cash stake",
      userId: args.userId,
      metadata: { betId: String(bet._id), roundId: args.roundId, slotIndex: args.slotIndex, walletKind },
      draftsFn: async (ids) => {
        const w = walletIds(ids, walletKind);
        return betDebitPostings(w.userAccountId, ids.clearingId, args.stakeCredits);
      },
    });
    bet.ledgerEntryId = String(entry._id);
    await bet.save();
  } catch (error) {
    await Bet.deleteOne({ _id: bet._id });
    throw error;
  }

  void writeAudit({
    actorUserId: args.userId,
    action: "bet.place",
    reason: walletKind === "PROMO" ? "Player placed a free-credit bet" : "Player placed a cash bet",
    requestId: args.requestId,
    entityType: "Bet",
    entityId: String(bet._id),
  }).catch((error) => logger.warn("audit_failed", { err: String(error) }));
  await emit(args.roundId, "TICK", { publicBet: true, slotIndex: args.slotIndex }, false);
  return { bet, replay: false };
}

export async function cashOut(args: {
  userId: string;
  betId: string;
  idempotencyKey: string;
  requestId: string;
}) {
  await connectMongo();
  metrics.inc("cashout_requests");
  const [existing, bet] = await Promise.all([
    Cashout.findOne({
      userId: args.userId,
      idempotencyKey: args.idempotencyKey,
    }),
    Bet.findById(args.betId),
  ]);
  if (existing) return { cashout: existing, replay: true };

  if (!bet || bet.userId !== args.userId) {
    throw new ApiError("not_found", 404, "Bet not found.");
  }
  if (bet.status !== "PLACED") {
    const prior = await Cashout.findOne({ betId: String(bet._id) });
    if (prior) return { cashout: prior, replay: true };
    throw new ApiError("conflict", 409, "Bet is not open for cash-out.");
  }

  const round = await GameRound.findById(bet.roundId);
  if (!round) throw new ApiError("not_found", 404, "Round not found.");
  const crashBp = crashBpFor(round);
  const started = round.runningStartedAt;
  const elapsed = started ? Date.now() - started.getTime() : 0;
  const decision = decideCashout({
    status: round.status as RoundState,
    elapsedMs: elapsed,
    crashMultiplierBp: crashBp,
    growthPerSecond: growth(),
  });
  if (!decision.accept) {
    throw new ApiError(
      decision.reason === "at_or_after_crash" ? "crash_already_occurred" : "betting_closed",
      409,
      decision.reason === "at_or_after_crash"
        ? "Cash-out rejected: crash already occurred."
        : "Cash-out is only allowed while the round is running.",
    );
  }

  const payout = payoutCredits(BigInt(bet.stakeCredits), decision.multiplierBp);
  const stillRunning = await GameRound.findOne({ _id: bet.roundId, status: "RUNNING" });
  if (!stillRunning) {
    throw new ApiError("crash_already_occurred", 409, "Cash-out rejected: crash already occurred.");
  }

  let cashout;
  try {
    cashout = await Cashout.create({
      betId: String(bet._id),
      userId: args.userId,
      multiplierBp: decision.multiplierBp,
      payoutCredits: payout.toString(),
      idempotencyKey: args.idempotencyKey,
      acceptedSeq: round.lastSequence,
    });
    await Bet.updateOne({ _id: bet._id, status: "PLACED" }, { $set: { status: "CASHED_OUT" } });
  } catch (error: unknown) {
    if ((error as { code?: number }).code === 11000) {
      const again = await Cashout.findOne({
        userId: args.userId,
        idempotencyKey: args.idempotencyKey,
      });
      if (again) return { cashout: again, replay: true };
    }
    throw error;
  }

  const kind = (bet.walletKind as WalletKind | undefined) ?? "REAL";
  const entry = await postLedger({
    type: "CASH_OUT_PAYOUT",
    requestId: `cashout:${args.idempotencyKey}`,
    actorUserId: args.userId,
    reason: kind === "PROMO" ? "Free-credit cash-out" : "Cash cash-out payout",
    userId: args.userId,
    metadata: { betId: args.betId, multiplierBp: decision.multiplierBp, walletKind: kind },
    draftsFn: async (ids) => {
      const w = walletIds(ids, kind);
      return cashoutPostings({
        userAccountId: w.userAccountId,
        clearingId: ids.clearingId,
        houseId: w.houseOrPoolId,
        stake: BigInt(bet.stakeCredits),
        payout,
      });
    },
  });
  cashout.ledgerEntryId = String(entry._id);
  await cashout.save();
  void writeAudit({
    actorUserId: args.userId,
    action: "bet.cashout",
    reason: "Player cashed out a virtual-credit bet",
    requestId: args.requestId,
    entityType: "Cashout",
    entityId: String(cashout._id),
  }).catch((error) => logger.warn("audit_failed", { err: String(error) }));
  await emit(String(bet.roundId), "TICK", { publicCashout: true, multiplierBp: decision.multiplierBp }, false);
  return { cashout, replay: false };
}

let publicStateCache: { at: number; value: Awaited<ReturnType<typeof loadPublicRoundState>> } | null = null;

export async function publicRoundState() {
  const now = Date.now();
  if (publicStateCache && now - publicStateCache.at < 400) return publicStateCache.value;
  const value = await loadPublicRoundState();
  publicStateCache = { at: now, value };
  return value;
}

async function loadPublicRoundState() {
  await connectMongo();
  const round = await GameRound.findOne().sort({ roundNumber: -1 }).lean();
  if (!round || round.status === "ARCHIVED") {
    return { round: null, bets: [], multiplierBp: null as number | null };
  }
  const bets = await Bet.find({ roundId: String(round._id) }).sort({ createdAt: 1 }).lean();
  const betIds = bets.map((b) => String(b._id));
  const userIds = [...new Set(bets.map((b) => b.userId))];
  const [users, cashouts] = await Promise.all([
    userIds.length
      ? User.find({ _id: { $in: userIds } }).select("publicName").lean()
      : Promise.resolve([]),
    betIds.length
      ? Cashout.find({ betId: { $in: betIds } }).select("betId multiplierBp payoutCredits").lean()
      : Promise.resolve([]),
  ]);
  const names = new Map(users.map((u) => [String(u._id), u.publicName]));
  const cashByBet = new Map(cashouts.map((c) => [c.betId, c]));

  let multiplierBp: number | null = null;
  if (round.status === "RUNNING" && round.runningStartedAt) {
    multiplierBp = multiplierBpAt(Date.now() - round.runningStartedAt.getTime(), growth());
    const crash = crashBpFor(round);
    if (multiplierBp >= crash) multiplierBp = crash;
  }
  if (round.status === "CRASHED" || round.status === "SETTLED" || round.status === "ARCHIVED") {
    multiplierBp = round.crashMultiplierBp;
  }

  const revealed =
    round.status === "CRASHED" || round.status === "SETTLED" || round.status === "ARCHIVED";

  return {
    round: {
      id: String(round._id),
      roundNumber: round.roundNumber,
      status: round.status,
      serverSeedHash: round.serverSeedHash,
      algorithmVersion: round.algorithmVersion,
      clientSeed: round.clientSeed,
      nonce: round.nonce,
      bettingOpensAt: round.bettingOpensAt.toISOString(),
      bettingClosesAt: round.bettingClosesAt.toISOString(),
      runningStartedAt: round.runningStartedAt?.toISOString() ?? null,
      crashMultiplierBp: revealed ? round.crashMultiplierBp : null,
      lastSequence: round.lastSequence,
      playMoney: true,
    },
    multiplierBp,
    bets: bets.map((b) => {
      const c = cashByBet.get(String(b._id));
      return {
        id: String(b._id),
        publicName: names.get(b.userId) ?? "Sky-????",
        userId: b.userId,
        slotIndex: b.slotIndex,
        stakeCredits: b.stakeCredits,
        walletKind: b.walletKind ?? "REAL",
        status: b.status,
        cashedOutAtBp: c?.multiplierBp ?? null,
        payoutCredits: c?.payoutCredits ?? null,
      };
    }),
  };
}

export async function reconnectSnapshot(afterSeq: number) {
  const state = await publicRoundState();
  if (!state.round || afterSeq <= 0) return { ...state, events: [] };
  const events = await RoundEvent.find({
    roundId: state.round.id,
    sequence: { $gt: afterSeq },
  })
    .sort({ sequence: 1 })
    .limit(200)
    .lean();
  return {
    ...state,
    events: events.map((e) => ({
      seq: e.sequence,
      type: e.type,
      ts: e.createdAt.toISOString(),
      payload: e.payload,
    })),
  };
}
