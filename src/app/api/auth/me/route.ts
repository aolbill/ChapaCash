import { NextResponse } from "next/server";
import { handleApi, requestIdFrom } from "@/lib/http";
import { requireUser } from "@/server/auth/service";
import { userBalances } from "@/server/ledger/service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    const user = await requireUser(req);
    const balances = await userBalances(user.id);
    const res = NextResponse.json({
      user: { ...user, ...balances, playMoney: false },
    });
    res.headers.set("Cache-Control", "private, no-store, max-age=0");
    return res;
  });
}
