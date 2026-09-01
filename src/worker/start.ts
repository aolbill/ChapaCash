import { connectMongo } from "@/lib/mongo";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { tickEngine } from "@/server/game/service";
import { ensureSystemAccounts } from "@/server/ledger/service";
import { EngineLock } from "@/server/db/models";

const g = globalThis as unknown as { chapacashEngine?: boolean };

async function tryLock(): Promise<boolean> {
  const owner = String(process.pid);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5_000);
  const claimed = await EngineLock.findOneAndUpdate(
    { key: "engine", $or: [{ expiresAt: { $lte: now } }, { owner }] },
    { $set: { owner, expiresAt, key: "engine" } },
    { new: true },
  );
  if (claimed?.owner === owner) return true;
  try {
    await EngineLock.create({ key: "engine", owner, expiresAt });
    return true;
  } catch {
    const current = await EngineLock.findOne({ key: "engine" });
    return current?.owner === owner;
  }
}

export function startEngine(): void {
  if (g.chapacashEngine) return;
  g.chapacashEngine = true;
  const tickMs = Number(env.ENGINE_TICK_MS);
  logger.info("engine_starting", { pid: process.pid });
  void (async () => {
    await connectMongo();
    await ensureSystemAccounts();
  })();

  setInterval(() => {
    void (async () => {
      try {
        await connectMongo();
        const owned = await tryLock();
        if (!owned) return;
        await tickEngine();
      } catch (error) {
        logger.error("engine_tick_failed", { err: String(error) });
      }
    })();
  }, tickMs);
}
