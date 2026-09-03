import { NextResponse } from "next/server";
import { handleApi, requestIdFrom } from "@/lib/http";
import { requireAdmin } from "@/server/auth/service";
import { connectMongo } from "@/lib/mongo";
import { Bet, Cashout, Deposit, GameRound, User, WalletAccount } from "@/server/db/models";
import { metrics } from "@/lib/metrics";
import { rateLimit } from "@/server/security/rateLimit";
import { env } from "@/lib/env";

export async function GET(req: Request) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    const admin = await requireAdmin(req);
    await rateLimit(`admin:${admin.id}`, Number(env.RATE_LIMIT_ADMIN_PER_MIN));
    await connectMongo();
    const [round, recent, stakeAgg, payoutAgg, users, depositStats, pendingDeposits, cashAgg] =
      await Promise.all([
        GameRound.findOne().sort({ roundNumber: -1 }).select("status roundNumber").lean(),
        GameRound.find().sort({ roundNumber: -1 }).limit(12).select("status roundNumber crashMultiplierBp").lean(),
        Bet.aggregate([{ $group: { _id: null, total: { $sum: { $toLong: "$stakeCredits" } } } }]),
        Cashout.aggregate([{ $group: { _id: null, total: { $sum: { $toLong: "$payoutCredits" } } } }]),
        User.countDocuments(),
        Deposit.aggregate([
          { $match: { status: "SUCCESS" } },
          { $group: { _id: null, n: { $sum: 1 }, kes: { $sum: { $toDouble: "$amountKes" } } } },
        ]),
        Deposit.countDocuments({ status: "PENDING" }),
        WalletAccount.aggregate([
          { $match: { kind: "USER_WALLET", userId: { $ne: null } } },
          { $group: { _id: null, total: { $sum: { $toDouble: "$cachedBalanceCredits" } } } },
        ]),
      ]);
    const active = round && round.status !== "ARCHIVED" ? round : null;
    return NextResponse.json({
      playMoney: true,
      admin: { id: admin.id, email: admin.email },
      mongo: true,
      depositedKes: String(depositStats[0]?.kes ?? 0),
      pendingDeposits,
      cashInWallets: String(cashAgg[0]?.total ?? 0),
      successfulDeposits: depositStats[0]?.n ?? 0,
      activeRound: active
        ? {
            id: String(active._id),
            status: active.status,
            roundNumber: active.roundNumber,
            crashHidden:
              active.status === "RUNNING" ||
              active.status === "BETTING_OPEN" ||
              active.status === "BETTING_CLOSED" ||
              active.status === "SCHEDULED",
          }
        : null,
      recentRounds: recent.map((r) => ({
        id: String(r._id),
        roundNumber: r.roundNumber,
        status: r.status,
        crashMultiplierBp:
          r.status === "ARCHIVED" || r.status === "SETTLED" || r.status === "CRASHED"
            ? r.crashMultiplierBp
            : null,
      })),
      totalVirtualBets: String(stakeAgg[0]?.total ?? 0),
      totalVirtualPayouts: String(payoutAgg[0]?.total ?? 0),
      userCount: users,
      metrics: metrics.snapshot(),
    });
  });
}
