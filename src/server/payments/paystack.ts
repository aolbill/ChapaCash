import { createHmac, timingSafeEqual } from "node:crypto";
import { env, paystackConfigured } from "@/lib/env";
import { ApiError } from "@/domain/errors";
import { logger } from "@/lib/logger";

export function requirePaystackSecret(): string {
  if (!paystackConfigured() || !env.PAYSTACK_SECRET_KEY) {
    throw new ApiError(
      "internal",
      503,
      "M-PESA deposits are not configured. Add PAYSTACK_SECRET_KEY to .env.local.",
    );
  }
  return env.PAYSTACK_SECRET_KEY;
}

type PaystackJson = {
  status: boolean;
  message: string;
  data?: {
    reference?: string;
    status?: string;
    display_text?: string;
    amount?: number;
    currency?: string;
    id?: number;
    recipient_code?: string;
    transfer_code?: string;
  };
};

async function paystack<T extends PaystackJson>(path: string, init?: RequestInit): Promise<T> {
  const secret = requirePaystackSecret();
  const res = await fetch(`${env.PAYSTACK_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json()) as T;
  if (!res.ok || json.status === false) {
    logger.warn("paystack_error", { path, message: json.message });
    throw new ApiError("invalid_input", 400, json.message || "Paystack request failed.");
  }
  return json;
}

export async function chargeMpesaStk(args: {
  email: string;
  amountKes: number;
  phoneE164: string;
  reference: string;
}): Promise<{ reference: string; status: string; displayText: string }> {
  const body = {
    email: args.email,
    amount: args.amountKes * 100,
    currency: env.PAYSTACK_CURRENCY,
    reference: args.reference,
    mobile_money: {
      phone: args.phoneE164,
      provider: env.PAYSTACK_MPESA_PROVIDER,
    },
    metadata: { product: "chapacash-deposit" },
  };
  const json = await paystack("/charge", { method: "POST", body: JSON.stringify(body) });
  return {
    reference: json.data?.reference ?? args.reference,
    status: json.data?.status ?? "pending",
    displayText:
      json.data?.display_text ?? "Check your phone and enter your M-PESA PIN to complete the deposit.",
  };
}

export async function verifyTransaction(reference: string): Promise<{
  success: boolean;
  amountKes: number | null;
  status: string;
}> {
  const json = await paystack(`/transaction/verify/${encodeURIComponent(reference)}`);
  const status = json.data?.status ?? "";
  const subunits = json.data?.amount;
  return {
    success: status === "success",
    amountKes: typeof subunits === "number" ? Math.floor(subunits / 100) : null,
    status,
  };
}

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) return false;
  const hash = createHmac("sha512", secret).update(rawBody).digest("hex");
  const a = Buffer.from(hash, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function createMpesaRecipient(args: {
  name: string;
  nationalPhone: string;
}): Promise<string> {
  const json = await paystack("/transferrecipient", {
    method: "POST",
    body: JSON.stringify({
      type: "mobile_money",
      name: args.name,
      account_number: args.nationalPhone,
      bank_code: "MPESA",
      currency: env.PAYSTACK_CURRENCY,
    }),
  });
  const code = json.data?.recipient_code;
  if (!code) throw new ApiError("internal", 502, "Paystack did not return a transfer recipient.");
  return code;
}

export async function initiateMpesaTransfer(args: {
  amountKes: number;
  recipientCode: string;
  reference: string;
  reason: string;
}): Promise<{ reference: string; status: string; transferCode: string | null }> {
  const json = await paystack("/transfer", {
    method: "POST",
    body: JSON.stringify({
      source: "balance",
      amount: args.amountKes * 100,
      currency: env.PAYSTACK_CURRENCY,
      recipient: args.recipientCode,
      reference: args.reference,
      reason: args.reason,
    }),
  });
  const status = json.data?.status ?? "";
  if (status === "otp") {
    throw new ApiError(
      "internal",
      503,
      "Paystack is asking for a transfer OTP. In the Paystack dashboard, disable Transfer OTP (Settings → API), then try again.",
    );
  }
  return {
    reference: json.data?.reference ?? args.reference,
    status,
    transferCode: json.data?.transfer_code ?? null,
  };
}

export async function verifyTransfer(reference: string): Promise<{
  success: boolean;
  failed: boolean;
  amountKes: number | null;
  status: string;
}> {
  const json = await paystack(`/transfer/verify/${encodeURIComponent(reference)}`);
  const status = (json.data?.status ?? "").toLowerCase();
  const subunits = json.data?.amount;
  return {
    success: status === "success",
    failed: status === "failed" || status === "reversed",
    amountKes: typeof subunits === "number" ? Math.floor(subunits / 100) : null,
    status,
  };
}
