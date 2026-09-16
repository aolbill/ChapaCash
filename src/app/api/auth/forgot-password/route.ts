import { NextResponse } from "next/server";
import { handleApi, readJson, requestIdFrom } from "@/lib/http";
import { assertSameOrigin } from "@/server/auth/service";
import { forgotPasswordSchema } from "@/server/api/schemas";
import { requestPasswordReset } from "@/server/auth/passwordReset";
import { rateLimit, clientKey } from "@/server/security/rateLimit";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    assertSameOrigin(req);
    await rateLimit(`forgot:${clientKey(req)}`, Number(env.RATE_LIMIT_PASSWORD_RESET_PER_MIN));
    const body = forgotPasswordSchema.parse(await readJson(req));
    try {
      await requestPasswordReset(body.email);
    } catch (error) {
      logger.error("forgot_password_failed", { requestId, err: String(error) });
      throw error;
    }
    return NextResponse.json({
      ok: true,
      message: "If that email is registered, we sent a reset link. Check your inbox.",
    });
  });
}
