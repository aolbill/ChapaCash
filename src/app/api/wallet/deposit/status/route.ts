import { NextResponse } from "next/server";
import { handleApi, requestIdFrom } from "@/lib/http";
import { requireUser } from "@/server/auth/service";
import { connectMongo } from "@/lib/mongo";
import { Deposit } from "@/server/db/models";
import { refreshDeposit, serializeDeposit } from "@/server/payments/deposit";
import { userBalances } from "@/server/ledger/service";

export async function GET(req: Request) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    const user = await requireUser(req);
    const url = new URL(req.url);
    const reference = url.searchParams.get("reference");
    await connectMongo();
    if (reference) {
      const deposit = await refreshDeposit(reference);
      if (!deposit || deposit.userId !== user.id) {
        return NextResponse.json({ error: { message: "Deposit not found." } }, { status: 404 });
      }
      const balances = await userBalances(user.id);
      return NextResponse.json({ deposit: serializeDeposit(deposit), ...balances });
    }
    const deposits = await Deposit.find({ userId: user.id }).sort({ createdAt: -1 }).limit(20).lean();
    return NextResponse.json({ deposits: deposits.map(serializeDeposit) });
  });
}
