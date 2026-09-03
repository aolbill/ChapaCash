import { NextResponse } from "next/server";
import { handleApi, requestIdFrom } from "@/lib/http";
import { requireUser } from "@/server/auth/service";
import { connectMongo } from "@/lib/mongo";
import { FairnessProof, GameRound } from "@/server/db/models";
import { ApiError } from "@/domain/errors";
import { rateLimit, clientKey } from "@/server/security/rateLimit";
import { env } from "@/lib/env";

export async function GET(req: Request, ctx: { params: Promise<{ roundId: string }> }) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    await requireUser(req);
    await rateLimit(`fairness:${clientKey(req)}`, Number(env.RATE_LIMIT_FAIRNESS_PER_MIN));
    const { roundId } = await ctx.params;
    await connectMongo();
    const round = await GameRound.findById(roundId).select("status serverSeedHash clientSeed nonce algorithmVersion").lean();
    if (!round) throw new ApiError("not_found", 404, "Round not found.");
    if (round.status !== "ARCHIVED") {
      return NextResponse.json({
        revealed: false,
        serverSeedHash: round.serverSeedHash,
        clientSeed: round.clientSeed,
        nonce: round.nonce,
        algorithmVersion: round.algorithmVersion,
      });
    }
    const proof = await FairnessProof.findOne({ roundId }).lean();
    if (!proof) throw new ApiError("not_found", 404, "Proof not found.");
    return NextResponse.json({
      revealed: true,
      algorithmVersion: proof.algorithmVersion,
      serverSeedHash: proof.serverSeedHash,
      serverSeed: proof.serverSeed,
      clientSeed: proof.clientSeed,
      nonce: proof.nonce,
      crashMultiplierBp: proof.crashMultiplierBp,
    });
  });
}
