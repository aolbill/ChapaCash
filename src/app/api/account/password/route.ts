import { NextResponse } from "next/server";
import { handleApi, readJson, requestIdFrom } from "@/lib/http";
import { assertSameOrigin, requireUser, hashPassword, verifyPassword } from "@/server/auth/service";
import { passwordSchema } from "@/server/api/schemas";
import { connectMongo } from "@/lib/mongo";
import { Session, User } from "@/server/db/models";
import { ApiError } from "@/domain/errors";
import { writeAudit } from "@/server/admin/audit";

export async function POST(req: Request) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    assertSameOrigin(req);
    const auth = await requireUser(req);
    const body = passwordSchema.parse(await readJson(req));
    await connectMongo();
    const user = await User.findById(auth.id);
    if (!user || !(await verifyPassword(user.passwordHash, body.currentPassword))) {
      throw new ApiError("unauthorized", 401, "Invalid email or password.");
    }
    user.passwordHash = await hashPassword(body.newPassword);
    await user.save();
    await Session.updateMany({ userId: auth.id, revokedAt: null }, { $set: { revokedAt: new Date() } });
    await writeAudit({
      actorUserId: user.id.toString(),
      action: "account.password_change",
      reason: "Player changed password",
      requestId,
      entityType: "User",
      entityId: String(user._id),
    });
    return NextResponse.json({ ok: true, sessionsRevoked: true });
  });
}
