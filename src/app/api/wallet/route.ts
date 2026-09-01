import { NextResponse } from "next/server";
import { handleApi, requestIdFrom } from "@/lib/http";
import { requireUser } from "@/server/auth/service";
import { connectMongo } from "@/lib/mongo";
import { Bet, Cashout, Deposit, LedgerEntry, WalletAccount, Withdrawal } from "@/server/db/models";
import { userBalances } from "@/server/ledger/service";

export async function GET(req: Request) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    const user = await requireUser(req);
    await connectMongo();
    const balances = await userBalances(user.id, "full");
    const wallet = await WalletAccount.findOne({ userId: user.id, kind: "USER_WALLET" });
    const promo = await WalletAccount.findOne({ userId: user.id, kind: "USER_PROMO" });
    const accountIds = [wallet, promo].filter(Boolean).map((w) => String(w!._id));
    const entries = await LedgerEntry.find({
      $or: [{ actorUserId: user.id }, { "postings.accountId": { $in: accountIds } }],
    })
      .sort({ createdAt: -1 })
      .limit(50);
    const bets = await Bet.find({ userId: user.id }).sort({ createdAt: -1 }).limit(50);
    const cashouts = await Cashout.find({ userId: user.id }).sort({ createdAt: -1 }).limit(50);
    const deposits = await Deposit.find({ userId: user.id }).sort({ createdAt: -1 }).limit(20);
    const withdrawals = await Withdrawal.find({ userId: user.id }).sort({ createdAt: -1 }).limit(20);
    return NextResponse.json({
      playMoney: false,
      ...balances,
      deposits: deposits.map((d) => ({
        id: String(d._id),
        amountKes: d.amountKes,
        status: d.status,
        phone: d.phone,
        createdAt: d.createdAt,
      })),
      withdrawals: withdrawals.map((w) => ({
        id: String(w._id),
        amountKes: w.amountKes,
        status: w.status,
        phone: w.phone,
        createdAt: w.createdAt,
      })),
      entries: entries.map((e) => ({
        id: String(e._id),
        type: e.type,
        reason: e.reason,
        requestId: e.requestId,
        createdAt: e.createdAt,
        postings: e.postings,
      })),
      bets: bets.map((b) => ({
        id: String(b._id),
        roundId: b.roundId,
        slotIndex: b.slotIndex,
        stakeCredits: b.stakeCredits,
        walletKind: b.walletKind ?? "REAL",
        status: b.status,
      })),
      cashouts: cashouts.map((c) => ({
        id: String(c._id),
        betId: c.betId,
        multiplierBp: c.multiplierBp,
        payoutCredits: c.payoutCredits,
      })),
    });
  });
}
