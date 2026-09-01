import { NextResponse } from "next/server";
import { handleApi, readJson, requestIdFrom } from "@/lib/http";
import { assertSameOrigin, createSession, sessionCookie, verifyPassword, findUserByIdentifier, provisionPlayerAccounts } from "@/server/auth/service";
import { loginSchema } from "@/server/api/schemas";
import { ApiError } from "@/domain/errors";
import { rateLimit, clientKey } from "@/server/security/rateLimit";
import { env } from "@/lib/env";
import { metrics } from "@/lib/metrics";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    assertSameOrigin(req);
    await rateLimit(`login:${clientKey(req)}`, Number(env.RATE_LIMIT_LOGIN_PER_MIN));
    const raw = await readJson(req);
    const parsed = loginSchema.safeParse(raw);
    const identifier =
      parsed.success
        ? parsed.data.identifier
        : typeof raw === "object" && raw && "email" in raw
          ? String((raw as { email: string }).email)
          : "";
    const password =
      parsed.success
        ? parsed.data.password
        : typeof raw === "object" && raw && "password" in raw
          ? String((raw as { password: string }).password)
          : "";
    if (!identifier || !password) {
      throw new ApiError("invalid_input", 400, "Enter your phone number or email, and password.");
    }
    const user = await findUserByIdentifier(identifier);
    const ok = user ? await verifyPassword(user.passwordHash, password) : false;
    if (!user || !ok || user.disabledAt) {
      metrics.inc("auth_failures");
      logger.info("auth_failure", { requestId });
      throw new ApiError("unauthorized", 401, "Invalid phone number or password.");
    }
    if (user.suspendedAt) {
      throw new ApiError("account_suspended", 403, "Account is suspended.");
    }
    await provisionPlayerAccounts(String(user._id));
    const { token, expiresAt } = await createSession(
      String(user._id),
      clientKey(req),
      req.headers.get("user-agent"),
    );
    const res = NextResponse.json({
      user: {
        id: String(user._id),
        phone: user.phone,
        email: user.email,
        displayName: user.displayName,
        publicName: user.publicName,
        role: user.role,
      },
    });
    res.headers.set("Set-Cookie", sessionCookie(token, expiresAt));
    return res;
  });
}
