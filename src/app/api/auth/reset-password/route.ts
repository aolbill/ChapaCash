import { NextResponse } from "next/server";
import { handleApi, readJson, requestIdFrom } from "@/lib/http";
import { assertSameOrigin } from "@/server/auth/service";
import { resetPasswordSchema } from "@/server/api/schemas";
import { resetPasswordWithToken } from "@/server/auth/passwordReset";
import { rateLimit, clientKey } from "@/server/security/rateLimit";
import { env } from "@/lib/env";
import { writeAudit } from "@/server/admin/audit";

export async function POST(req: Request) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    assertSameOrigin(req);
    await rateLimit(`reset:${clientKey(req)}`, Number(env.RATE_LIMIT_PASSWORD_RESET_PER_MIN));
    const body = resetPasswordSchema.parse(await readJson(req));
    const { userId } = await resetPasswordWithToken(body.token, body.newPassword);
    await writeAudit({
      actorUserId: userId,
      action: "account.password_reset",
      reason: "Player reset password via email link",
      requestId,
      entityType: "User",
      entityId: userId,
    });
    return NextResponse.json({
      ok: true,
      message: "Password updated. You can log in with your new password.",
    });
  });
}
