import { NextResponse } from "next/server";
import { handleApi, requestIdFrom } from "@/lib/http";
import { publicRoundState } from "@/server/game/service";
import { startEngine } from "@/worker/start";
import { requireUser } from "@/server/auth/service";
import { userBalances } from "@/server/ledger/service";

export async function GET(req: Request) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    startEngine();
    const user = await requireUser(req);
    const state = await publicRoundState();
    const balances = await userBalances(user.id);
    const mine = state.bets.filter((b) => b.userId === user.id);
    return NextResponse.json({
      playMoney: false,
      ...balances,
      ...state,
      myBets: mine,
    });
  });
}
