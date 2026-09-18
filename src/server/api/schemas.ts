import { z } from "zod";

export const registerSchema = z
  .object({
    phone: z.string().min(9, "Enter your M-PESA phone number."),
    email: z
      .string({ required_error: "Enter your email address." })
      .trim()
      .toLowerCase()
      .email("Enter a valid email address.")
      .refine((v) => !v.endsWith(".local") && !v.endsWith("@phone.chapacash.local"), {
        message: "Enter a real email address.",
      }),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(200)
      .regex(/[a-z]/, "Password needs a lowercase letter.")
      .regex(/[A-Z]/, "Password needs an uppercase letter.")
      .regex(/[0-9]/, "Password needs a number."),
    confirmPassword: z.string().min(1, "Confirm your password."),
    displayName: z
      .string()
      .trim()
      .min(2, "Display name must be at least 2 characters.")
      .max(40, "Display name is too long."),
    ageConfirmed: z.literal(true, {
      errorMap: () => ({ message: "You must confirm you are 18 or older." }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  identifier: z.string().min(3, "Enter your phone number or email."),
  password: z.string().min(1).max(200),
});

export const depositSchema = z.object({
  amountKes: z.number().int().min(10).max(100_000),
  phone: z.string().optional(),
});

export const withdrawSchema = z.object({
  amountKes: z
    .number()
    .int()
    .min(500, "Minimum withdrawal is 500 KES.")
    .max(150_000),
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

const newPasswordRules = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(200)
  .regex(/[a-z]/, "Password needs a lowercase letter.")
  .regex(/[A-Z]/, "Password needs an uppercase letter.")
  .regex(/[0-9]/, "Password needs a number.");

export const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: newPasswordRules,
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20, "Reset link is invalid or incomplete."),
  newPassword: newPasswordRules,
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

export const seriesRotateSchema = z.object({
  action: z.literal("rotate"),
  serverSeed: z.string().min(16).max(128).optional(),
});
