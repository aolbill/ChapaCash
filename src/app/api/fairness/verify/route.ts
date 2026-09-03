import { NextResponse } from "next/server";
import { handleApi, readJson, requestIdFrom } from "@/lib/http";
import { requireUser } from "@/server/auth/service";
import { fairnessVerifySchema } from "@/server/api/schemas";
import { deriveCrashMultiplierBp } from "@/domain/fairness";
import { rateLimit, clientKey } from "@/server/security/rateLimit";
import { env } from "@/lib/env";
import { connectMongo } from "@/lib/mongo";
import { FairnessProof } from "@/server/db/models";

export async function POST(req: Request) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    await requireUser(req);
    await rateLimit(`fairness:${clientKey(req)}`, Number(env.RATE_LIMIT_FAIRNESS_PER_MIN));
    const body = fairnessVerifySchema.parse(await readJson(req));
    const result = deriveCrashMultiplierBp(body);
    return NextResponse.json({
      crashMultiplierBp: result.crashMultiplierBp,
      serverSeedHash: result.serverSeedHash,
      hmacPreview: result.hmacHex.slice(0, 16),
      algorithmVersion: result.algorithmVersion,
    });
  });
}

export async function GET(req: Request) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    await requireUser(req);
    await connectMongo();
    const proofs = await FairnessProof.find().sort({ createdAt: -1 }).limit(20).lean();
    return NextResponse.json({
      proofs: proofs.map((p) => ({
        roundId: p.roundId,
        algorithmVersion: p.algorithmVersion,
        serverSeedHash: p.serverSeedHash,
        serverSeed: p.serverSeed,
        clientSeed: p.clientSeed,
        nonce: p.nonce,
        crashMultiplierBp: p.crashMultiplierBp,
      })),
    });
  });
}
