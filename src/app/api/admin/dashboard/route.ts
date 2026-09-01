import { NextResponse } from "next/server";
import { handleApi, requestIdFrom } from "@/lib/http";
import { requireAdmin } from "@/server/auth/service";
import { connectMongo } from "@/lib/mongo";
import { mongoPing } from "@/lib/mongo";
import { Bet, Cashout, GameRound, User } from "@/server/db/models";
import { metrics } from "@/lib/metrics";
import { rateLimit } from "@/server/security/rateLimit";
import { env } from "@/lib/env";

export async function GET(req: Request) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    const admin = await requireAdmin(req);
    await rateLimit(`admin:${admin.id}`, Number(env.RATE_LIMIT_ADMIN_PER_MIN));
    await connectMongo();
    const round = await GameRound.findOne({ status: { $ne: "ARCHIVED" } }).sort({ roundNumber: -1 });
    const recent = await GameRound.find().sort({ roundNumber: -1 }).limit(12);
    const stakeAgg = await Bet.aggregate([{ $group: { _id: null, total: { $sum: { $toLong: "$stakeCredits" } } } }]);
    const payoutAgg = await Cashout.aggregate([
      { $group: { _id: null, total: { $sum: { $toLong: "$payoutCredits" } } } },
    ]);
    const users = await User.countDocuments();
    return NextResponse.json({
      playMoney: true,
      admin: { id: admin.id, email: admin.email },
      mongo: await mongoPing(),
      activeRound: round
        ? {
            id: String(round._id),
            status: round.status,
            roundNumber: round.roundNumber,
            crashHidden: round.status === "RUNNING" || round.status === "BETTING_OPEN" || round.status === "BETTING_CLOSED" || round.status === "SCHEDULED",
          }
        : null,
      recentRounds: recent.map((r) => ({
        id: String(r._id),
        roundNumber: r.roundNumber,
        status: r.status,
        crashMultiplierBp: r.status === "ARCHIVED" || r.status === "SETTLED" || r.status === "CRASHED" ? r.crashMultiplierBp : null,
      })),
      totalVirtualBets: String(stakeAgg[0]?.total ?? 0),
      totalVirtualPayouts: String(payoutAgg[0]?.total ?? 0),
      userCount: users,
      metrics: metrics.snapshot(),
    });
  });
}
