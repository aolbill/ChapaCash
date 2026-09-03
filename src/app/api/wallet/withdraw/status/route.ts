import { NextResponse } from "next/server";
import { handleApi, requestIdFrom } from "@/lib/http";
import { requireUser } from "@/server/auth/service";
import { connectMongo } from "@/lib/mongo";
import { Withdrawal } from "@/server/db/models";
import { refreshWithdrawal, serializeWithdrawal } from "@/server/payments/withdraw";
import { userBalances } from "@/server/ledger/service";

export async function GET(req: Request) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    const user = await requireUser(req);
    const url = new URL(req.url);
    const reference = url.searchParams.get("reference");
    await connectMongo();
    if (reference) {
      const withdrawal = await refreshWithdrawal(reference);
      if (!withdrawal || withdrawal.userId !== user.id) {
        return NextResponse.json({ error: { message: "Withdrawal not found." } }, { status: 404 });
      }
      const balances = await userBalances(user.id);
      return NextResponse.json({ withdrawal: serializeWithdrawal(withdrawal), ...balances });
    }
    const withdrawals = await Withdrawal.find({ userId: user.id }).sort({ createdAt: -1 }).limit(20).lean();
    return NextResponse.json({ withdrawals: withdrawals.map(serializeWithdrawal) });
  });
}
