import { connectMongo } from "@/lib/mongo";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { tickEngine } from "@/server/game/service";
import { ensureSystemAccounts } from "@/server/ledger/service";
import { reconcilePendingDeposits } from "@/server/payments/deposit";
import { Bet, Cashout, Deposit, EngineLock, GameRound, LedgerEntry, Withdrawal } from "@/server/db/models";

const g = globalThis as unknown as {
  chapacashEngine?: boolean;
  engineLockUntil?: number;
  engineTickBusy?: boolean;
};

async function tryLock(): Promise<boolean> {
  const owner = String(process.pid);
  const nowMs = Date.now();
  if ((g.engineLockUntil ?? 0) > nowMs + 400) return true;

  const now = new Date(nowMs);
  const expiresAt = new Date(nowMs + 5_000);
  const claimed = await EngineLock.findOneAndUpdate(
    { key: "engine", $or: [{ expiresAt: { $lte: now } }, { owner }] },
    { $set: { owner, expiresAt, key: "engine" } },
    { new: true },
  );
  if (claimed?.owner === owner) {
    g.engineLockUntil = nowMs + 4_000;
    return true;
  }
  try {
    await EngineLock.create({ key: "engine", owner, expiresAt });
    g.engineLockUntil = nowMs + 4_000;
    return true;
  } catch {
    const current = await EngineLock.findOne({ key: "engine" }).lean();
    if (current?.owner === owner) {
      g.engineLockUntil = nowMs + 4_000;
      return true;
    }
    g.engineLockUntil = 0;
    return false;
  }
}

export function startEngine(): void {
  if (g.chapacashEngine) return;
  g.chapacashEngine = true;
  const tickMs = Math.max(100, Number(env.ENGINE_TICK_MS) || 100);
  logger.info("engine_starting", { pid: process.pid, tickMs });
  void (async () => {
    await connectMongo();
    await ensureSystemAccounts();
    await Promise.all([
      GameRound.createIndexes(),
      Bet.createIndexes(),
      Cashout.createIndexes(),
      LedgerEntry.createIndexes(),
      Deposit.createIndexes(),
      Withdrawal.createIndexes(),
    ]).catch((error) => logger.warn("index_ensure_failed", { err: String(error) }));
  })();

  setInterval(() => {
    if (g.engineTickBusy) return;
    g.engineTickBusy = true;
    void (async () => {
      try {
        await connectMongo();
        const owned = await tryLock();
        if (!owned) return;
        await tickEngine();
      } catch (error) {
        logger.error("engine_tick_failed", { err: String(error) });
      } finally {
        g.engineTickBusy = false;
      }
    })();
  }, tickMs);

  setInterval(() => {
    void reconcilePendingDeposits().catch((error) => {
      logger.error("deposit_reconcile_tick_failed", { err: String(error) });
    });
  }, 10_000);
}
