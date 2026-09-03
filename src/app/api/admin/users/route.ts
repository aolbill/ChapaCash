import { NextResponse } from "next/server";
import { handleApi, requestIdFrom } from "@/lib/http";
import { requireAdmin } from "@/server/auth/service";
import { connectMongo } from "@/lib/mongo";
import { User, WalletAccount } from "@/server/db/models";

export async function GET(req: Request) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    await requireAdmin(req);
    await connectMongo();
    const users = await User.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .select("email publicName role suspendedAt")
      .lean();
    const ids = users.map((u) => String(u._id));
    const wallets = await WalletAccount.find({
      userId: { $in: ids },
      kind: { $in: ["USER_WALLET", "USER_PROMO"] },
    })
      .select("userId kind cachedBalanceCredits")
      .lean();
    const cash = new Map<string, string>();
    const promo = new Map<string, string>();
    for (const w of wallets) {
      if (!w.userId) continue;
      if (w.kind === "USER_PROMO") promo.set(w.userId, w.cachedBalanceCredits);
      else cash.set(w.userId, w.cachedBalanceCredits);
    }
    return NextResponse.json({
      users: users.map((u) => ({
        id: String(u._id),
        email: u.email,
        publicName: u.publicName,
        role: u.role,
        suspendedAt: u.suspendedAt,
        cashCredits: cash.get(String(u._id)) ?? "0",
        promoCredits: promo.get(String(u._id)) ?? "0",
        balanceCredits: cash.get(String(u._id)) ?? "0",
      })),
    });
  });
}
