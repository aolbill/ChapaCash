import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/server/payments/paystack";
import { settleSuccessfulDeposit } from "@/server/payments/deposit";
import { failWithdrawal, settleSuccessfulWithdrawal } from "@/server/payments/withdraw";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature");
  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  let event: { event?: string; data?: { reference?: string; amount?: number; status?: string } };
  try {
    event = JSON.parse(raw) as typeof event;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (event.event === "charge.success" && event.data?.reference) {
    const kes = typeof event.data.amount === "number" ? Math.floor(event.data.amount / 100) : 0;
    try {
      await settleSuccessfulDeposit(event.data.reference, kes);
    } catch (error) {
      logger.error("webhook_settle_failed", { err: String(error) });
      return NextResponse.json({ error: "settle_failed" }, { status: 500 });
    }
  }
  if (event.event === "transfer.success" && event.data?.reference) {
    try {
      await settleSuccessfulWithdrawal(event.data.reference);
    } catch (error) {
      logger.error("webhook_withdrawal_settle_failed", { err: String(error) });
      return NextResponse.json({ error: "settle_failed" }, { status: 500 });
    }
  }
  if (
    (event.event === "transfer.failed" || event.event === "transfer.reversed") &&
    event.data?.reference
  ) {
    try {
      await failWithdrawal(event.data.reference, event.event);
    } catch (error) {
      logger.error("webhook_withdrawal_fail_failed", { err: String(error) });
      return NextResponse.json({ error: "settle_failed" }, { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
