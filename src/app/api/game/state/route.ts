import { NextResponse } from "next/server";
import { handleApi, requestIdFrom } from "@/lib/http";
import { ApiError } from "@/domain/errors";
import { publicRoundState } from "@/server/game/service";
import { startEngine } from "@/worker/start";
import { assertActiveUser, authUserById, sessionUserIdFromRequest } from "@/server/auth/service";
import { userBalances } from "@/server/ledger/service";

export async function GET(req: Request) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    startEngine();
    const userId = await sessionUserIdFromRequest(req);
    if (!userId) throw new ApiError("unauthorized", 401, "Authentication required.");
    const [found, state, balances] = await Promise.all([
      authUserById(userId),
      publicRoundState(),
      userBalances(userId),
    ]);
    const user = assertActiveUser(found);
    const mine = state.bets.filter((b) => b.userId === user.id);
    return NextResponse.json({
      playMoney: false,
      ...balances,
      ...state,
      myBets: mine,
    });
  });
}
