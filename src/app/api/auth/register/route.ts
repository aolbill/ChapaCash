import { NextResponse } from "next/server";
import { handleApi, readJson, requestIdFrom } from "@/lib/http";
import { assertSameOrigin, createSession, createUser, sessionCookie } from "@/server/auth/service";
import { registerSchema } from "@/server/api/schemas";
import { ApiError } from "@/domain/errors";
import { PhoneError } from "@/domain/phone";
import { rateLimit, clientKey } from "@/server/security/rateLimit";
import { env } from "@/lib/env";
import { metrics } from "@/lib/metrics";

export async function POST(req: Request) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    assertSameOrigin(req);
    await rateLimit(`register:${clientKey(req)}`, Number(env.RATE_LIMIT_LOGIN_PER_MIN));
    const body = registerSchema.parse(await readJson(req));
    try {
      const user = await createUser({
        phone: body.phone,
        email: body.email || null,
        password: body.password,
        displayName: body.displayName,
        ageConfirmed: body.ageConfirmed,
      });
      const { token, expiresAt } = await createSession(
        String(user._id),
        clientKey(req),
        req.headers.get("user-agent"),
      );
      metrics.inc("registrations");
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
    } catch (error) {
      if (error instanceof PhoneError) {
        throw new ApiError("invalid_input", 400, error.message);
      }
      throw error;
    }
  });
}
