import { randomBytes } from "node:crypto";
import { connectMongo } from "@/lib/mongo";
import { ApiError } from "@/domain/errors";
import { depositPostings } from "@/domain/ledger";
import { normalizeKenyaPhone, phoneForPaystack } from "@/domain/phone";
import { postLedger } from "@/server/ledger/service";
import { Deposit, User } from "@/server/db/models";
import { chargeMpesaStk, verifyTransaction } from "@/server/payments/paystack";
import { writeAudit } from "@/server/admin/audit";
import { logger } from "@/lib/logger";

const MIN_KES = 10;
const MAX_KES = 100_000;

export async function startMpesaDeposit(args: {
  userId: string;
  amountKes: number;
  phoneRaw?: string;
  requestId: string;
}) {
  if (!Number.isInteger(args.amountKes) || args.amountKes < MIN_KES || args.amountKes > MAX_KES) {
    throw new ApiError("invalid_input", 400, `Deposit must be a whole amount between ${MIN_KES} and ${MAX_KES} KES.`);
  }
  await connectMongo();
  const user = await User.findById(args.userId);
  if (!user) throw new ApiError("not_found", 404, "User not found.");
  const phone = normalizeKenyaPhone(args.phoneRaw || user.phone || "");
  const email = user.email || `${phone}@phone.chapacash.local`;
  const reference = `dep_${randomBytes(12).toString("hex")}`;

  const deposit = await Deposit.create({
    userId: args.userId,
    phone,
    amountKes: String(args.amountKes),
    status: "PENDING",
    paystackReference: reference,
  });

  try {
    const charge = await chargeMpesaStk({
      email,
      amountKes: args.amountKes,
      phoneE164: phoneForPaystack(phone),
      reference,
    });
    deposit.paystackReference = charge.reference;
    deposit.paystackStatus = charge.status;
    deposit.displayText = charge.displayText;
    await deposit.save();
  } catch (error) {
    deposit.status = "FAILED";
    deposit.failureReason = error instanceof Error ? error.message : "charge_failed";
    await deposit.save();
    throw error;
  }

  await writeAudit({
    actorUserId: args.userId,
    action: "deposit.stk_started",
    reason: "M-PESA STK push initiated via Paystack",
    requestId: args.requestId,
    entityType: "Deposit",
    entityId: String(deposit._id),
  });

  return deposit;
}

export async function settleSuccessfulDeposit(reference: string, paidKes: number) {
  await connectMongo();
  const deposit = await Deposit.findOne({ paystackReference: reference });
  if (!deposit) {
    logger.warn("deposit_unknown_reference", { reference });
    return null;
  }
  if (deposit.status === "SUCCESS") return deposit;
  const expected = Number(deposit.amountKes);
  if (paidKes !== expected) {
    deposit.status = "FAILED";
    deposit.failureReason = "amount_mismatch";
    await deposit.save();
    logger.error("deposit_amount_mismatch", { reference });
    return deposit;
  }

  const entry = await postLedger({
    type: "MPESA_DEPOSIT",
    requestId: `mpesa:${reference}`,
    actorUserId: deposit.userId,
    reason: "M-PESA deposit via Paystack",
    userId: deposit.userId,
    metadata: { reference, phone: deposit.phone },
    draftsFn: async (ids) =>
      depositPostings(ids.userWalletId, ids.paystackClearingId, BigInt(deposit.amountKes)),
  });

  deposit.status = "SUCCESS";
  deposit.paystackStatus = "success";
  deposit.ledgerEntryId = String(entry._id);
  await deposit.save();
  return deposit;
}

export async function refreshDeposit(reference: string) {
  const verified = await verifyTransaction(reference);
  if (verified.success && verified.amountKes != null) {
    return settleSuccessfulDeposit(reference, verified.amountKes);
  }
  await connectMongo();
  const deposit = await Deposit.findOne({ paystackReference: reference });
  if (deposit && deposit.status === "PENDING" && ["failed", "abandoned"].includes(verified.status)) {
    deposit.status = "FAILED";
    deposit.paystackStatus = verified.status;
    await deposit.save();
  }
  return deposit;
}

export function serializeDeposit(d: {
  _id: unknown;
  amountKes: string;
  status: string;
  paystackReference: string;
  displayText?: string | null;
  phone: string;
}) {
  return {
    id: String(d._id),
    amountKes: d.amountKes,
    status: d.status,
    reference: d.paystackReference,
    displayText: d.displayText ?? "Enter your M-PESA PIN on your phone.",
    phone: d.phone,
  };
}
