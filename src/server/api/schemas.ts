import { z } from "zod";

export const registerSchema = z.object({
  phone: z.string().min(9, "Enter your M-PESA phone number."),
  email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().toLowerCase().email("Enter a valid email address.").optional(),
  ),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(200)
    .regex(/[a-z]/, "Password needs a lowercase letter.")
    .regex(/[A-Z]/, "Password needs an uppercase letter.")
    .regex(/[0-9]/, "Password needs a number."),
  displayName: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters.")
    .max(40, "Display name is too long."),
  ageConfirmed: z.literal(true, {
    errorMap: () => ({ message: "You must confirm you are 18 or older." }),
  }),
});

export const loginSchema = z.object({
  identifier: z.string().min(3, "Enter your phone number or email."),
  password: z.string().min(1).max(200),
});

export const withdrawSchema = z.object({
  amountKes: z.number().int().min(50).max(150_000),
  phone: z.string().optional(),
});

export const betSchema = z.object({
  roundId: z.string().min(1),
  slotIndex: z.number().int(),
  stakeCredits: z.string().regex(/^[0-9]+$/),
  walletKind: z.enum(["REAL", "PROMO"]).optional(),
  idempotencyKey: z.string().uuid(),
});

export const cashoutSchema = z.object({
  betId: z.string().min(1),
  idempotencyKey: z.string().uuid(),
});

export const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(200)
    .regex(/[a-z]/, "Password needs a lowercase letter.")
    .regex(/[A-Z]/, "Password needs an uppercase letter.")
    .regex(/[0-9]/, "Password needs a number."),
});

export const fairnessVerifySchema = z.object({
  algorithmVersion: z.string(),
  serverSeed: z.string().min(16),
  clientSeed: z.string().min(1),
  nonce: z.string().min(1),
});

export const suspendSchema = z.object({
  reason: z.string().min(3).max(500),
  suspended: z.boolean(),
});
