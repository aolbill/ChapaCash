import { NextResponse } from "next/server";
import { metrics } from "@/lib/metrics";
import { connectMongo } from "@/lib/mongo";
import { GameRound } from "@/server/db/models";
import { startEngine } from "@/worker/start";

export async function GET() {
  startEngine();
  try {
    await connectMongo();
    const round = await GameRound.findOne()
      .sort({ roundNumber: -1 })
      .select({ status: 1, roundNumber: 1 })
      .lean();
    return NextResponse.json({
      status: "ok",
      playMoney: true,
      mongo: true,
      round: round
        ? { id: String(round._id), status: round.status, roundNumber: round.roundNumber }
        : null,
      metrics: metrics.snapshot(),
    });
  } catch {
    return NextResponse.json({
      status: "degraded",
      playMoney: true,
      mongo: false,
      round: null,
      metrics: metrics.snapshot(),
    });
  }
}
