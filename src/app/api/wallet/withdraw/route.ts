import { NextResponse } from "next/server";
import { handleApi, readJson, requestIdFrom } from "@/lib/http";
import { assertSameOrigin, requireUser } from "@/server/auth/service";
import { withdrawSchema } from "@/server/api/schemas";
import { serializeWithdrawal, startMpesaWithdrawal } from "@/server/payments/withdraw";
import { rateLimit } from "@/server/security/rateLimit";
import { env } from "@/lib/env";
import { ApiError } from "@/domain/errors";
import { PhoneError } from "@/domain/phone";
import { userBalances } from "@/server/ledger/service";
import { WITHDRAWAL_CONFIRMATION } from "@/domain/copy";

export async function POST(req: Request) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    assertSameOrigin(req);
    const user = await requireUser(req);
    await rateLimit(`withdraw:${user.id}`, Number(env.RATE_LIMIT_WITHDRAW_PER_MIN));
    const body = withdrawSchema.parse(await readJson(req));
    try {
      const withdrawal = await startMpesaWithdrawal({
        userId: user.id,
        amountKes: body.amountKes,
        phoneRaw: body.phone,
        requestId,
      });
      const balances = await userBalances(user.id);
      return NextResponse.json({
        withdrawal: serializeWithdrawal(withdrawal),
        ...balances,
        message: WITHDRAWAL_CONFIRMATION,
      });
    } catch (error) {
      if (error instanceof PhoneError) {
        throw new ApiError("invalid_input", 400, error.message);
      }
      throw error;
    }
  });
}
