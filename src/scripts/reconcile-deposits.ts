import { connectMongo } from "@/lib/mongo";
import { Deposit } from "@/server/db/models";
import { refreshDeposit } from "@/server/payments/deposit";
import { verifyTransaction } from "@/server/payments/paystack";
import { logger } from "@/lib/logger";

async function main() {
  const reference = process.argv[2];
  await connectMongo();
  if (reference) {
    const before = await Deposit.findOne({ paystackReference: reference });
    logger.info("deposit_before", {
      reference,
      found: Boolean(before),
      status: before?.status,
      amountKes: before?.amountKes,
      failureReason: before?.failureReason,
    });
    const verified = await verifyTransaction(reference);
    logger.info("paystack_verify", verified);
    const after = await refreshDeposit(reference);
    logger.info("deposit_after", {
      reference,
      status: after?.status,
      amountKes: after?.amountKes,
      failureReason: after?.failureReason,
    });
    process.exit(0);
  }
  const pending = await Deposit.find({
    $or: [{ status: "PENDING" }, { status: "FAILED", failureReason: "amount_mismatch" }],
  }).sort({ createdAt: -1 });
  for (const deposit of pending) {
    const updated = await refreshDeposit(deposit.paystackReference);
    logger.info("deposit_reconciled", {
      reference: deposit.paystackReference,
      status: updated?.status,
      amountKes: updated?.amountKes,
    });
  }
  process.exit(0);
}

main().catch((error) => {
  logger.error("reconcile_failed", { err: String(error) });
  process.exit(1);
});
