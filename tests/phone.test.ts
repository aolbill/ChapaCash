import { describe, expect, it } from "vitest";
import { normalizeKenyaPhone, looksLikePhone, kenyaNationalFromStored, emailForPaystackCharge } from "@/domain/phone";

describe("kenya phone", () => {
  it("normalizes 07, 7, and 254 forms", () => {
    expect(normalizeKenyaPhone("0712345678")).toBe("254712345678");
    expect(normalizeKenyaPhone("712345678")).toBe("254712345678");
    expect(normalizeKenyaPhone("+254712345678")).toBe("254712345678");
  });

  it("normalizes Safaricom 011 and 010 prefixes", () => {
    expect(normalizeKenyaPhone("0114096574")).toBe("254114096574");
    expect(normalizeKenyaPhone("112345678")).toBe("254112345678");
    expect(normalizeKenyaPhone("+254112345678")).toBe("254112345678");
    expect(normalizeKenyaPhone("0101234567")).toBe("254101234567");
    expect(kenyaNationalFromStored("254114096574")).toBe("0114096574");
    expect(kenyaNationalFromStored("0114096574")).toBe("0114096574");
  });

  it("rejects non-Kenyan and landline-length junk", () => {
    expect(() => normalizeKenyaPhone("0201234567")).toThrow();
    expect(() => normalizeKenyaPhone("12345")).toThrow();
  });

  it("detects phone vs email", () => {
    expect(looksLikePhone("0712345678")).toBe(true);
    expect(looksLikePhone("0112345678")).toBe(true);
    expect(looksLikePhone("a@b.co")).toBe(false);
  });

  it("builds a Paystack-safe charge email", () => {
    expect(emailForPaystackCharge("you@gmail.com", "254712345678")).toBe("you@gmail.com");
    expect(emailForPaystackCharge("254712345678@phone.chapacash.local", "254712345678")).toBe(
      "254712345678@deposits.chapacash.co.ke",
    );
    expect(emailForPaystackCharge("player@chapacash.test", "254712345678")).toBe(
      "254712345678@deposits.chapacash.co.ke",
    );
  });
});
