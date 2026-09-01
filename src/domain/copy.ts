export const SITE_NAME = "ChapaCash";

export const SITE_BANNER =
  "18+ only. Deposits use M-PESA via Paystack. Gambling involves risk of loss. Not legal advice.";

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
