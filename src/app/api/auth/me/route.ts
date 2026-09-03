import { NextResponse } from "next/server";
import { handleApi, requestIdFrom } from "@/lib/http";
import { ApiError } from "@/domain/errors";
import { assertActiveUser, authUserById, sessionUserIdFromRequest } from "@/server/auth/service";
import { userBalances } from "@/server/ledger/service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    const userId = await sessionUserIdFromRequest(req);
    if (!userId) throw new ApiError("unauthorized", 401, "Authentication required.");
    const [found, balances] = await Promise.all([authUserById(userId), userBalances(userId)]);
    const user = assertActiveUser(found);
    const res = NextResponse.json({
      user: { ...user, ...balances, playMoney: false },
    });
    res.headers.set("Cache-Control", "private, no-store, max-age=0");
    return res;
  });
}
