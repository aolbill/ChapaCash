import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ORIGIN: z.string().default("http://localhost:3000"),
  MONGODB_URI: z.string().min(1).optional(),
  COOKIE_SECURE: z.string().default("false"),
  COOKIE_NAME: z.string().default("chapacash_session"),
  DEMO_PLAYER_EMAIL: z.string().default("player@chapacash.test"),
  DEMO_PLAYER_PASSWORD: z.string().default("ChapaCashPlayer1"),
  DEMO_ADMIN_EMAIL: z.string().default("admin@chapacash.test"),
  DEMO_ADMIN_PASSWORD: z.string().default("ChapaCashAdmin1"),
  FAIRNESS_CLIENT_SEED: z.string().default("chapacash-public-v1"),
  FAIRNESS_ALGORITHM_VERSION: z.string().default("hmac-sha256-crash-v1"),
  PROMO_CREDIT_AMOUNT: z.string().default("10000"),
  ENGINE_TICK_MS: z.string().default("100"),
  BETTING_WINDOW_MS: z.string().default("15000"),
  INTERMISSION_MS: z.string().default("4000"),
  GROWTH_PER_SECOND: z.string().default("0.06"),
  RATE_LIMIT_LOGIN_PER_MIN: z.string().default("10"),
  RATE_LIMIT_BET_PER_MIN: z.string().default("30"),
  RATE_LIMIT_CASHOUT_PER_MIN: z.string().default("60"),
  RATE_LIMIT_FAIRNESS_PER_MIN: z.string().default("30"),
  PAYSTACK_SECRET_KEY: z.string().optional(),
  PAYSTACK_PUBLIC_KEY: z.string().optional(),
  PAYSTACK_BASE_URL: z.string().default("https://api.paystack.co"),
  PAYSTACK_MPESA_PROVIDER: z.string().default("mpesa"),
  PAYSTACK_CURRENCY: z.string().default("KES"),
  PAYSTACK_CALLBACK_URL: z.string().optional(),
  PAYSTACK_WEBHOOK_URL: z.string().optional(),
  PAYSTACK_PAYOUTS_ENABLED: z.string().default("true"),
  RATE_LIMIT_DEPOSIT_PER_MIN: z.string().default("8"),
  RATE_LIMIT_WITHDRAW_PER_MIN: z.string().default("5"),
  RATE_LIMIT_ADMIN_PER_MIN: z.string().default("30"),
});

export const env = schema.parse(process.env);

export function cookieSecure(): boolean {
  return env.COOKIE_SECURE === "true" || env.NODE_ENV === "production";
}

export function mongoUri(): string {
  if (!env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required");
  }
  return env.MONGODB_URI;
}

export function paystackConfigured(): boolean {
  return Boolean(env.PAYSTACK_SECRET_KEY && env.PAYSTACK_SECRET_KEY !== "CHANGE_ME");
}

export function paystackPayoutsEnabled(): boolean {
  return env.PAYSTACK_PAYOUTS_ENABLED !== "false";
}
