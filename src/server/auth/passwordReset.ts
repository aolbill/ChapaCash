import { randomBytes } from "node:crypto";
import { connectMongo } from "@/lib/mongo";
import { env } from "@/lib/env";
import { ApiError } from "@/domain/errors";
import { PasswordResetToken, Session, User } from "@/server/db/models";
import { hashPassword, hashToken, invalidateAuthCaches } from "@/server/auth/service";
import { isDeliverableEmail, sendPasswordResetEmail } from "@/server/email/resend";

const RESET_TTL_MS = 60 * 60 * 1000;

export async function requestPasswordReset(email: string): Promise<void> {
  await connectMongo();
  const normalized = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalized }).select(
    "email displayName disabledAt suspendedAt",
  );
  if (!user || user.disabledAt || user.suspendedAt || !isDeliverableEmail(user.email)) {
    return;
  }

  const userId = String(user._id);
  await PasswordResetToken.updateMany(
    { userId, usedAt: null },
    { $set: { usedAt: new Date() } },
  );

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);
  await PasswordResetToken.create({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  });

  const resetUrl = `${env.APP_ORIGIN.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
  await sendPasswordResetEmail({
    to: user.email!,
    displayName: user.displayName,
    resetUrl,
  });
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<{ userId: string }> {
  await connectMongo();
  const tokenHash = hashToken(token);
  const record = await PasswordResetToken.findOne({ tokenHash });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new ApiError("invalid_input", 400, "This reset link is invalid or has expired.");
  }

  const user = await User.findById(record.userId);
  if (!user || user.disabledAt) {
    throw new ApiError("invalid_input", 400, "This reset link is invalid or has expired.");
  }
  if (user.suspendedAt) {
    throw new ApiError("account_suspended", 403, "Account is suspended.");
  }

  const userId = String(user._id);
  user.passwordHash = await hashPassword(newPassword);
  await user.save();
  record.usedAt = new Date();
  await record.save();
  await PasswordResetToken.updateMany(
    { userId, usedAt: null },
    { $set: { usedAt: new Date() } },
  );
  await Session.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
  invalidateAuthCaches(undefined, userId);
  return { userId };
}
