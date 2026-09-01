import { NextResponse } from "next/server";
import { handleApi, requestIdFrom } from "@/lib/http";
import { requireAdmin } from "@/server/auth/service";
import { connectMongo } from "@/lib/mongo";
import { FairnessProof, GameRound, RoundEvent } from "@/server/db/models";
import { ApiError } from "@/domain/errors";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    await requireAdmin(req);
    const { id } = await ctx.params;
    await connectMongo();
    const round = await GameRound.findById(id);
    if (!round) throw new ApiError("not_found", 404, "Round not found.");
    const events = await RoundEvent.find({ roundId: id }).sort({ sequence: 1 });
    const archived = round.status === "ARCHIVED";
    const proof = archived ? await FairnessProof.findOne({ roundId: id }) : null;
    return NextResponse.json({
      round: {
        id: String(round._id),
        roundNumber: round.roundNumber,
        status: round.status,
        serverSeedHash: round.serverSeedHash,
        clientSeed: round.clientSeed,
        nonce: round.nonce,
        algorithmVersion: round.algorithmVersion,
        crashMultiplierBp:
          round.status === "CRASHED" || round.status === "SETTLED" || round.status === "ARCHIVED"
            ? round.crashMultiplierBp
            : null,
        serverSeed: archived ? round.serverSeed : null,
      },
      events: events.map((e) => ({ seq: e.sequence, type: e.type, payload: e.payload, ts: e.createdAt })),
      proof,
      note: "Admins cannot change outcomes or balances.",
    });
  });
}
