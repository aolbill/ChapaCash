export class PhoneError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhoneError";
  }
}

/**
 * Store Kenya M-PESA numbers as E.164 without plus (12 digits).
 * Safaricom: 07… → 2547XXXXXXXX, 010… → 25410XXXXXXX, 011… → 25411XXXXXXX.
 */
export function normalizeKenyaPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  let n = digits;
  if (n.startsWith("2540") && n.length === 13) {
    n = `254${n.slice(4)}`;
  } else if (n.startsWith("254") && n.length === 12) {
    /* already E.164 without plus */
  } else if (n.startsWith("0") && n.length === 10) {
    n = `254${n.slice(1)}`;
  } else if (n.length === 9 && /^(7|10|11)/.test(n)) {
    n = `254${n}`;
  } else {
    throw new PhoneError("Enter a valid Kenyan phone number (e.g. 0712 345 678 or 0112 345 678).");
  }
  if (!isSafaricomMpesa(n)) {
    throw new PhoneError("M-PESA numbers must be a Safaricom 07…, 010…, or 011… line.");
  }
  return n;
}

function isSafaricomMpesa(e164NoPlus: string): boolean {
  return /^2547\d{8}$/.test(e164NoPlus) || /^2541[01]\d{7}$/.test(e164NoPlus);
}

export function phoneForPaystack(e164NoPlus: string): string {
  return `+${e164NoPlus}`;
}

/** Paystack M-PESA recipient account_number uses national 07… / 011… form. */
export function kenyaNationalFromStored(raw: string): string {
  const stored = /^254\d{9}$/.test(raw.replace(/\D/g, ""))
    ? raw.replace(/\D/g, "")
    : normalizeKenyaPhone(raw);
  return `0${stored.slice(3)}`;
}

export function looksLikePhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 9 && /[0-9]/.test(raw) && !raw.includes("@");
}

export function placeholderEmail(phone: string): string {
  return `${phone}@phone.chapacash.local`;
}
