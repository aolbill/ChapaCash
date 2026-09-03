import { NextResponse } from "next/server";
import { handleApi, requestIdFrom } from "@/lib/http";
import { requireUser } from "@/server/auth/service";
import { connectMongo } from "@/lib/mongo";
import { GameRound } from "@/server/db/models";

export async function GET(req: Request) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    await requireUser(req);
    await connectMongo();
    const rounds = await GameRound.find({ status: "ARCHIVED" })
      .sort({ roundNumber: -1 })
      .limit(25)
      .select({
        roundNumber: 1,
        crashMultiplierBp: 1,
        serverSeedHash: 1,
        archivedAt: 1,
      })
      .lean();
    return NextResponse.json({
      rounds: rounds.map((r) => ({
        id: String(r._id),
        roundNumber: r.roundNumber,
        crashMultiplierBp: r.crashMultiplierBp,
        serverSeedHash: r.serverSeedHash,
      })),
    });
  });
}
