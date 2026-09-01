import { NextResponse } from "next/server";
import { handleApi, readJson, requestIdFrom } from "@/lib/http";
import { assertSameOrigin, requireUser } from "@/server/auth/service";
import { betSchema } from "@/server/api/schemas";
import { creditsFromString } from "@/domain/money";
import { placeBet } from "@/server/game/service";
import { rateLimit, clientKey } from "@/server/security/rateLimit";
import { env } from "@/lib/env";
import { userBalances } from "@/server/ledger/service";

export async function POST(req: Request) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    assertSameOrigin(req);
    const user = await requireUser(req);
    await rateLimit(`bet:${user.id}`, Number(env.RATE_LIMIT_BET_PER_MIN));
    const body = betSchema.parse(await readJson(req));
    const result = await placeBet({
      userId: user.id,
      roundId: body.roundId,
      slotIndex: body.slotIndex,
      stakeCredits: creditsFromString(body.stakeCredits),
      walletKind: body.walletKind,
      idempotencyKey: body.idempotencyKey,
      requestId,
    });
    const balances = await userBalances(user.id);
    return NextResponse.json({
      replay: result.replay,
      bet: {
        id: String(result.bet._id),
        roundId: result.bet.roundId,
        slotIndex: result.bet.slotIndex,
        stakeCredits: result.bet.stakeCredits,
        walletKind: result.bet.walletKind ?? "REAL",
        status: result.bet.status,
      },
      ...balances,
    });
  });
}
