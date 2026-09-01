import { NextResponse } from "next/server";
import { mongoPing } from "@/lib/mongo";
import { metrics } from "@/lib/metrics";
import { connectMongo } from "@/lib/mongo";
import { GameRound } from "@/server/db/models";
import { startEngine } from "@/worker/start";

export async function GET() {
  startEngine();
  const mongo = await mongoPing();
  await connectMongo();
  const round = await GameRound.findOne({ status: { $ne: "ARCHIVED" } })
    .sort({ roundNumber: -1 })
    .select({ status: 1, roundNumber: 1 });
  return NextResponse.json({
    status: mongo ? "ok" : "degraded",
    playMoney: true,
    mongo,
    round: round
      ? { id: String(round._id), status: round.status, roundNumber: round.roundNumber }
      : null,
    metrics: metrics.snapshot(),
  });
}
