export const SITE_NAME = "ChapaCash";

export const SITE_BANNER =
  "18+ only. Deposits use M-PESA via Paystack. Gambling involves risk of loss. Not legal advice.";

export const PAYSTACK_STARTER_PAYOUT_MESSAGE =
  "Paystack Starter businesses cannot send M-PESA to players. In Paystack, upgrade from Starter to a Registered business, enable Transfers, and turn off Transfer OTP. Your cash stays in the ChapaCash wallet until payouts are allowed.";

export const WITHDRAWAL_CONFIRMATION =
  "Your withdrawal is confirmed. It will be processed within 3 to 4 days and sent to your M-PESA.";

export const PLAY_MONEY_BANNER = SITE_BANNER;

export const DISABLED_COMPLIANCE_FLAGS = [
  "real_money_payments",
  "kyc_required",
  "aml_screening",
  "age_verification",
  "geolocation_enforcement",
  "self_exclusion_enforcement",
  "responsible_gambling_limits",
] as const;
