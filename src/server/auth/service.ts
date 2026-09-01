import { createHash, randomBytes } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import { connectMongo } from "@/lib/mongo";
import { cookieSecure, env } from "@/lib/env";
import { ApiError } from "@/domain/errors";
import { creditsFromString } from "@/domain/money";
import { promoPostings } from "@/domain/ledger";
import { postLedger } from "@/server/ledger/service";
import { ResponsiblePlaySetting, Session, User, WalletAccount } from "@/server/db/models";
import { looksLikePhone, normalizeKenyaPhone, placeholderEmail } from "@/domain/phone";

const ARGON = { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 };
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type RoleName = "PLAYER" | "ADMIN";

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  return verify(passwordHash, password);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

export function publicNameFrom(id: string): string {
  return `Sky-${id.slice(-4)}`;
}

export function sessionCookie(token: string, expiresAt: Date) {
  const parts = [
    `${env.COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${expiresAt.toUTCString()}`,
  ];
  if (cookieSecure()) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie() {
  const parts = [`${env.COOKIE_NAME}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (cookieSecure()) parts.push("Secure");
  return parts.join("; ");
}

export function readSessionToken(req: Request): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${env.COOKIE_NAME}=([^;]+)`));
  return match?.[1] ?? null;
}

export async function provisionPlayerAccounts(userId: string) {
  await WalletAccount.updateOne(
    { userId, kind: "USER_WALLET" },
    { $setOnInsert: { userId, kind: "USER_WALLET", cachedBalanceCredits: "0", version: 0 } },
    { upsert: true },
  );
  await WalletAccount.updateOne(
    { userId, kind: "USER_PROMO" },
    { $setOnInsert: { userId, kind: "USER_PROMO", cachedBalanceCredits: "0", version: 0 } },
    { upsert: true },
  );
  await ResponsiblePlaySetting.updateOne(
    { userId },
    { $setOnInsert: { userId, enforcementEnabled: false } },
    { upsert: true },
  );
  const amount = creditsFromString(env.PROMO_CREDIT_AMOUNT);
  await postLedger({
    type: "PROMO_CREDIT",
    requestId: `promo:${userId}`,
    actorUserId: null,
    reason: "Welcome free credits (practice play)",
    userId,
    draftsFn: async (ids) => promoPostings(ids.userPromoId, ids.promoPoolId, amount),
  });
}

export async function createUser(input: {
  email?: string | null;
  phone: string;
  password: string;
  displayName: string;
  role?: RoleName;
  ageConfirmed?: boolean;
}) {
  await connectMongo();
  const phone = normalizeKenyaPhone(input.phone);
  const email = (input.email?.trim().toLowerCase() || placeholderEmail(phone)).toLowerCase();
  const existingPhone = await User.findOne({ phone });
  if (existingPhone) {
    const userId = String(existingPhone._id);
    const promo = await WalletAccount.findOne({ userId, kind: "USER_PROMO" });
    if (!promo && (await verifyPassword(existingPhone.passwordHash, input.password))) {
      await provisionPlayerAccounts(userId);
      return existingPhone;
    }
    throw new ApiError(
      "conflict",
      409,
      "This phone number is already registered. Log in instead.",
    );
  }
  if (await User.findOne({ email })) {
    throw new ApiError("conflict", 409, "This email is already registered. Log in instead.");
  }
  const passwordHash = await hashPassword(input.password);
  const user = await User.create({
    email,
    phone,
    passwordHash,
    displayName: input.displayName.trim(),
    publicName: publicNameFrom(crypto.randomUUID()),
    role: input.role ?? "PLAYER",
    ageConfirmedAt: input.ageConfirmed ? new Date() : new Date(),
  });
  const userId = String(user._id);
  user.publicName = publicNameFrom(userId);
  await user.save();
  try {
    await provisionPlayerAccounts(userId);
  } catch (error) {
    await WalletAccount.deleteMany({ userId });
    await ResponsiblePlaySetting.deleteOne({ userId });
    await User.deleteOne({ _id: user._id });
    throw error;
  }
  return user;
}

export async function createSession(userId: string, ip: string | null, userAgent: string | null) {
  await connectMongo();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await Session.create({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
    ipHash: hashIp(ip),
    userAgent: userAgent?.slice(0, 200) ?? null,
  });
  return { token, expiresAt };
}

export type AuthUser = {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string;
  publicName: string;
  role: RoleName;
  suspendedAt: Date | null;
};

export async function userFromRequest(req: Request): Promise<AuthUser | null> {
  await connectMongo();
  const token = readSessionToken(req);
  if (!token) return null;
  const session = await Session.findOne({ tokenHash: hashToken(token) });
  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
  const u = await User.findById(session.userId);
  if (!u || u.disabledAt) return null;
  return {
    id: String(u._id),
    email: u.email ?? null,
    phone: u.phone ?? null,
    displayName: u.displayName,
    publicName: u.publicName,
    role: u.role as RoleName,
    suspendedAt: u.suspendedAt ?? null,
  };
}

export async function findUserByIdentifier(identifier: string) {
  await connectMongo();
  const raw = identifier.trim();
  if (looksLikePhone(raw)) {
    try {
      return await User.findOne({ phone: normalizeKenyaPhone(raw) });
    } catch {
      return null;
    }
  }
  return User.findOne({ email: raw.toLowerCase() });
}

export async function requireUser(req: Request): Promise<AuthUser> {
  const user = await userFromRequest(req);
  if (!user) throw new ApiError("unauthorized", 401, "Authentication required.");
  if (user.suspendedAt) throw new ApiError("account_suspended", 403, "Account is suspended.");
  return user;
}

export async function requireAdmin(req: Request): Promise<AuthUser> {
  const user = await requireUser(req);
  if (user.role !== "ADMIN") throw new ApiError("forbidden", 403, "Administrator role required.");
  return user;
}

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function originAllowed(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  if (origin === env.APP_ORIGIN) return true;

  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    return false;
  }

  const hostHeader = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (hostHeader && originUrl.host === hostHeader) return true;

  if (env.NODE_ENV !== "production" && isLocalHostname(originUrl.hostname)) {
    return originUrl.protocol === "http:" || originUrl.protocol === "https:";
  }
  return false;
}

export function assertSameOrigin(req: Request): void {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return;
  if (!originAllowed(req)) {
    throw new ApiError("forbidden", 403, "Origin is not allowed.");
  }
}
