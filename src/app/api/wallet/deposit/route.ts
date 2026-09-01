import { NextResponse } from "next/server";
import { handleApi, readJson, requestIdFrom } from "@/lib/http";
import { assertSameOrigin, requireUser } from "@/server/auth/service";
import { depositSchema } from "@/server/api/schemas";
import { serializeDeposit, startMpesaDeposit } from "@/server/payments/deposit";
import { rateLimit } from "@/server/security/rateLimit";
import { env, paystackConfigured } from "@/lib/env";
import { ApiError } from "@/domain/errors";
import { PhoneError } from "@/domain/phone";

export async function POST(req: Request) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    assertSameOrigin(req);
    const user = await requireUser(req);
    if (!paystackConfigured()) {
      throw new ApiError(
        "internal",
        503,
        "Add your Paystack secret key in .env.local as PAYSTACK_SECRET_KEY, then restart the server.",
      );
    }
    await rateLimit(`deposit:${user.id}`, Number(env.RATE_LIMIT_DEPOSIT_PER_MIN));
    const body = depositSchema.parse(await readJson(req));
    try {
      const deposit = await startMpesaDeposit({
        userId: user.id,
        amountKes: body.amountKes,
        phoneRaw: body.phone,
        requestId,
      });
      return NextResponse.json({
        deposit: serializeDeposit(deposit),
        message: deposit.displayText,
      });
    } catch (error) {
      if (error instanceof PhoneError) {
        throw new ApiError("invalid_input", 400, error.message);
      }
      throw error;
    }
  });
}
