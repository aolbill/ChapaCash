import { NextResponse } from "next/server";
import { handleApi, readJson, requestIdFrom } from "@/lib/http";
import { assertSameOrigin, invalidateAuthCaches, requireAdmin } from "@/server/auth/service";
import { suspendSchema } from "@/server/api/schemas";
import { connectMongo } from "@/lib/mongo";
import { User, Bet } from "@/server/db/models";
import { ApiError } from "@/domain/errors";
import { writeAudit } from "@/server/admin/audit";
import { userBalances } from "@/server/ledger/service";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    await requireAdmin(req);
    const { id } = await ctx.params;
    await connectMongo();
    const [user, balances, bets] = await Promise.all([
      User.findById(id).select("email displayName publicName role suspendedAt").lean(),
      userBalances(id),
      Bet.find({ userId: id }).sort({ createdAt: -1 }).limit(20).select("status stakeCredits roundId").lean(),
    ]);
    if (!user) throw new ApiError("not_found", 404, "User not found.");
    return NextResponse.json({
      user: {
        id: String(user._id),
        email: user.email,
        displayName: user.displayName,
        publicName: user.publicName,
        role: user.role,
        suspendedAt: user.suspendedAt,
      },
      ...balances,
      balanceCredits: balances.cashCredits,
      bets: bets.map((b) => ({
        id: String(b._id),
        status: b.status,
        stakeCredits: b.stakeCredits,
        roundId: b.roundId,
      })),
      cannotEditBalance: true,
      cannotManipulateOutcomes: true,
    });
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    assertSameOrigin(req);
    const admin = await requireAdmin(req);
    const { id } = await ctx.params;
    const body = suspendSchema.parse(await readJson(req));
    await connectMongo();
    const user = await User.findById(id);
    if (!user) throw new ApiError("not_found", 404, "User not found.");
    if (user.role === "ADMIN") {
      throw new ApiError("forbidden", 403, "Cannot suspend an administrator.");
    }
    user.suspendedAt = body.suspended ? new Date() : null;
    await user.save();
    invalidateAuthCaches(null, id);
    await writeAudit({
      actorUserId: admin.id,
      subjectUserId: id,
      action: body.suspended ? "user.suspend" : "user.reactivate",
      reason: body.reason,
      requestId,
      entityType: "User",
      entityId: id,
    });
    return NextResponse.json({ ok: true, suspendedAt: user.suspendedAt });
  });
}
