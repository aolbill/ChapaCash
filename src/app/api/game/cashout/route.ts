import { NextResponse } from "next/server";
import { handleApi, readJson, requestIdFrom } from "@/lib/http";
import { assertSameOrigin, requireUser } from "@/server/auth/service";
import { cashoutSchema } from "@/server/api/schemas";
import { cashOut } from "@/server/game/service";
import { rateLimit } from "@/server/security/rateLimit";
import { env } from "@/lib/env";
import { userBalances } from "@/server/ledger/service";

export async function POST(req: Request) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    assertSameOrigin(req);
    const user = await requireUser(req);
    await rateLimit(`cashout:${user.id}`, Number(env.RATE_LIMIT_CASHOUT_PER_MIN));
    const body = cashoutSchema.parse(await readJson(req));
    const result = await cashOut({
      userId: user.id,
      betId: body.betId,
      idempotencyKey: body.idempotencyKey,
      requestId,
    });
    const balances = await userBalances(user.id);
    return NextResponse.json({
      replay: result.replay,
      cashout: {
        id: String(result.cashout._id),
        betId: result.cashout.betId,
        multiplierBp: result.cashout.multiplierBp,
        payoutCredits: result.cashout.payoutCredits,
      },
      ...balances,
    });
  });
}
