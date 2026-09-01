import { randomBytes } from "node:crypto";
import { connectMongo } from "@/lib/mongo";
import { ApiError } from "@/domain/errors";
import { withdrawalPostings } from "@/domain/ledger";
import { kenyaNationalFromStored, normalizeKenyaPhone } from "@/domain/phone";
import { postLedger, userBalances } from "@/server/ledger/service";
import { User, Withdrawal } from "@/server/db/models";
import {
  createMpesaRecipient,
  initiateMpesaTransfer,
  verifyTransfer,
} from "@/server/payments/paystack";
import { writeAudit } from "@/server/admin/audit";
import { logger } from "@/lib/logger";

const MIN_KES = 50;
const MAX_KES = 150_000;

export async function startMpesaWithdrawal(args: {
  userId: string;
  amountKes: number;
  phoneRaw?: string;
  requestId: string;
}) {
  if (!Number.isInteger(args.amountKes) || args.amountKes < MIN_KES || args.amountKes > MAX_KES) {
    throw new ApiError(
      "invalid_input",
      400,
      `Withdrawal must be a whole amount between ${MIN_KES} and ${MAX_KES} KES.`,
    );
  }
  await connectMongo();
  const pending = await Withdrawal.findOne({ userId: args.userId, status: "PENDING" });
  if (pending) {
    throw new ApiError("conflict", 409, "A withdrawal is already in progress. Wait for it to finish.");
  }
  const balances = await userBalances(args.userId);
  if (BigInt(balances.cashCredits) < BigInt(args.amountKes)) {
    throw new ApiError(
      "insufficient_credits",
      400,
      "Not enough cash to withdraw. Free credits cannot be withdrawn.",
    );
  }
  const user = await User.findById(args.userId);
  if (!user) throw new ApiError("not_found", 404, "User not found.");
  const phone = normalizeKenyaPhone(args.phoneRaw || user.phone || "");
  const reference = `wd_${randomBytes(12).toString("hex")}`;

  const withdrawal = await Withdrawal.create({
    userId: args.userId,
    phone,
    amountKes: String(args.amountKes),
    status: "PENDING",
    paystackReference: reference,
  });

  try {
    const recipientCode = await createMpesaRecipient({
      name: user.displayName.slice(0, 40),
      nationalPhone: kenyaNationalFromStored(phone),
    });
    withdrawal.paystackRecipientCode = recipientCode;

    const entry = await postLedger({
      type: "MPESA_WITHDRAWAL",
      requestId: `mpesa-wd:${reference}`,
      actorUserId: args.userId,
      reason: "M-PESA withdrawal via Paystack",
      userId: args.userId,
      metadata: { reference, phone },
      draftsFn: async (ids) =>
        withdrawalPostings(ids.userWalletId, ids.paystackClearingId, BigInt(args.amountKes)),
    });
    withdrawal.ledgerEntryId = String(entry._id);

    const transfer = await initiateMpesaTransfer({
      amountKes: args.amountKes,
      recipientCode,
      reference,
      reason: "ChapaCash cash withdrawal",
    });
    withdrawal.paystackTransferCode = transfer.transferCode;
    withdrawal.paystackStatus = transfer.status;
    if (transfer.status.toLowerCase() === "success") {
      withdrawal.status = "SUCCESS";
    }
    await withdrawal.save();
  } catch (error) {
    await failWithdrawal(reference, error instanceof Error ? error.message : "transfer_failed");
    throw error;
  }

  await writeAudit({
    actorUserId: args.userId,
    action: "withdrawal.started",
    reason: "M-PESA withdrawal initiated via Paystack",
    requestId: args.requestId,
    entityType: "Withdrawal",
    entityId: String(withdrawal._id),
  });

  return withdrawal;
}

export async function failWithdrawal(reference: string, reason: string) {
  await connectMongo();
  const withdrawal = await Withdrawal.findOne({ paystackReference: reference });
  if (!withdrawal || withdrawal.status === "SUCCESS") return withdrawal;
  if (withdrawal.status === "FAILED" && withdrawal.reversalLedgerEntryId) return withdrawal;

  if (withdrawal.ledgerEntryId && !withdrawal.reversalLedgerEntryId) {
    try {
      const reversal = await postLedger({
        type: "MPESA_WITHDRAWAL_REVERSAL",
        requestId: `mpesa-wd-rev:${reference}`,
        actorUserId: withdrawal.userId,
        reason: "M-PESA withdrawal failed; cash returned to wallet",
        userId: withdrawal.userId,
        metadata: { reference, reason },
        draftsFn: async (ids) =>
          withdrawalPostings(ids.paystackClearingId, ids.userWalletId, BigInt(withdrawal.amountKes)),
      });
      withdrawal.reversalLedgerEntryId = String(reversal._id);
    } catch (error) {
      logger.error("withdrawal_reversal_failed", { reference, err: String(error) });
    }
  }
  withdrawal.status = "FAILED";
  withdrawal.paystackStatus = "failed";
  withdrawal.failureReason = reason.slice(0, 500);
  await withdrawal.save();
  return withdrawal;
}

export async function settleSuccessfulWithdrawal(reference: string) {
  await connectMongo();
  const withdrawal = await Withdrawal.findOne({ paystackReference: reference });
  if (!withdrawal) {
    logger.warn("withdrawal_unknown_reference", { reference });
    return null;
  }
  if (withdrawal.status === "SUCCESS") return withdrawal;
  if (withdrawal.status === "FAILED") {
    logger.error("withdrawal_success_after_fail", { reference });
    return withdrawal;
  }
  withdrawal.status = "SUCCESS";
  withdrawal.paystackStatus = "success";
  await withdrawal.save();
  return withdrawal;
}

export async function refreshWithdrawal(reference: string) {
  const verified = await verifyTransfer(reference);
  if (verified.success) return settleSuccessfulWithdrawal(reference);
  if (verified.failed) return failWithdrawal(reference, `paystack:${verified.status}`);
  await connectMongo();
  return Withdrawal.findOne({ paystackReference: reference });
}

export function serializeWithdrawal(d: {
  _id: unknown;
  amountKes: string;
  status: string;
  paystackReference: string;
  phone: string;
  failureReason?: string | null;
}) {
  return {
    id: String(d._id),
    amountKes: d.amountKes,
    status: d.status,
    reference: d.paystackReference,
    phone: d.phone,
    failureReason: d.failureReason ?? null,
  };
}
