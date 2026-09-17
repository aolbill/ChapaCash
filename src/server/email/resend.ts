import { Resend } from "resend";
import { env, resendConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { ApiError } from "@/domain/errors";
import { SITE_NAME } from "@/domain/copy";

export function isDeliverableEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return false;
  if (normalized.endsWith("@phone.chapacash.local")) return false;
  if (normalized.endsWith(".local")) return false;
  return true;
}

export async function sendPasswordResetEmail(input: {
  to: string;
  displayName: string;
  resetUrl: string;
}): Promise<void> {
  if (!resendConfigured()) {
    if (env.NODE_ENV === "production") {
      throw new ApiError("misconfigured", 503, "Password reset email is not configured.");
    }
    logger.info("password_reset_email_dev", {
      to: input.to,
      resetUrl: input.resetUrl,
    });
    return;
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: `Reset your ${SITE_NAME} password`,
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#111">
        <p>Hi ${escapeHtml(input.displayName)},</p>
        <p>We received a request to reset your ${SITE_NAME} password.</p>
        <p><a href="${escapeAttr(input.resetUrl)}" style="display:inline-block;padding:12px 18px;background:#2fbf4e;color:#fff;text-decoration:none;border-radius:10px;font-weight:700">Reset password</a></p>
        <p style="color:#555;font-size:14px">This link expires in 1 hour. If you did not ask for a reset, you can ignore this email.</p>
        <p style="color:#555;font-size:13px;word-break:break-all">${escapeHtml(input.resetUrl)}</p>
      </div>
    `,
    text: `Hi ${input.displayName},\n\nReset your ${SITE_NAME} password:\n${input.resetUrl}\n\nThis link expires in 1 hour. If you did not ask for a reset, ignore this email.`,
  });

  if (error) {
    logger.error("resend_send_failed", { message: error.message });
    throw new ApiError("upstream", 502, "Could not send reset email. Try again shortly.");
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
