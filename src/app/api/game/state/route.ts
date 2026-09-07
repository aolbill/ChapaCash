import { NextResponse } from "next/server";
import { handleApi, requestIdFrom } from "@/lib/http";
import { publicRoundState } from "@/server/game/service";
import { startEngine } from "@/worker/start";
import { assertActiveUser, authUserById, sessionUserIdFromRequest } from "@/server/auth/service";
import { userBalances } from "@/server/ledger/service";

export async function GET(req: Request) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    startEngine();
    const userId = await sessionUserIdFromRequest(req);
    const state = await publicRoundState();
    if (!userId) {
      return NextResponse.json({
        playMoney: false,
        cashCredits: "0",
        promoCredits: "0",
        hasDeposited: false,
        ...state,
        myBets: [],
      });
    }
    const [found, balances] = await Promise.all([authUserById(userId), userBalances(userId)]);
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
