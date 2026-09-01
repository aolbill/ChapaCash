import type { Credits } from "./money";

export type LedgerSide = "DEBIT" | "CREDIT";

export type PostingDraft = {
  accountId: string;
  side: LedgerSide;
  amount: Credits;
};

export function assertBalanced(postings: PostingDraft[]): void {
  if (postings.length < 2) {
    throw new Error("ledger_requires_two_postings");
  }
  let debit = 0n;
  let credit = 0n;
  for (const p of postings) {
    if (p.amount <= 0n) {
      throw new Error("posting_amount_must_be_positive");
    }
    if (p.side === "DEBIT") debit += p.amount;
    else credit += p.amount;
  }
  if (debit !== credit) {
    throw new Error(`unbalanced_entry:debit=${debit}:credit=${credit}`);
  }
}

export function signedDelta(side: LedgerSide, amount: Credits): Credits {
  return side === "CREDIT" ? amount : -amount;
}

export function depositPostings(
  userAccountId: string,
  paystackClearingId: string,
  amount: Credits,
): PostingDraft[] {
  return [
    { accountId: paystackClearingId, side: "DEBIT", amount },
    { accountId: userAccountId, side: "CREDIT", amount },
  ];
}

export function withdrawalPostings(
  userAccountId: string,
  paystackClearingId: string,
  amount: Credits,
): PostingDraft[] {
  return [
    { accountId: userAccountId, side: "DEBIT", amount },
    { accountId: paystackClearingId, side: "CREDIT", amount },
  ];
}

export function promoPostings(userAccountId: string, promoPoolId: string, amount: Credits): PostingDraft[] {
  return [
    { accountId: promoPoolId, side: "DEBIT", amount },
    { accountId: userAccountId, side: "CREDIT", amount },
  ];
}

export function betDebitPostings(
  userAccountId: string,
  clearingId: string,
  amount: Credits,
): PostingDraft[] {
  return [
    { accountId: userAccountId, side: "DEBIT", amount },
    { accountId: clearingId, side: "CREDIT", amount },
  ];
}

export function cashoutPostings(args: {
  userAccountId: string;
  clearingId: string;
  houseId: string;
  stake: Credits;
  payout: Credits;
}): PostingDraft[] {
  const { userAccountId, clearingId, houseId, stake, payout } = args;
  if (payout < stake) {
    throw new Error("payout_below_stake");
  }
  const profit = payout - stake;
  const postings: PostingDraft[] = [
    { accountId: clearingId, side: "DEBIT", amount: stake },
    { accountId: userAccountId, side: "CREDIT", amount: payout },
  ];
  if (profit > 0n) {
    postings.push({ accountId: houseId, side: "DEBIT", amount: profit });
  } else {
    // 1.00x cash-out: stake returns to user with no house leg.
    // Balanced: DR clearing stake / CR user stake.
  }
  assertBalanced(postings);
  return postings;
}

export function lossPostings(clearingId: string, houseId: string, stake: Credits): PostingDraft[] {
  return [
    { accountId: clearingId, side: "DEBIT", amount: stake },
    { accountId: houseId, side: "CREDIT", amount: stake },
  ];
}

export function compensatingPostings(
  fromAccountId: string,
  toAccountId: string,
  amount: Credits,
): PostingDraft[] {
  return [
    { accountId: fromAccountId, side: "DEBIT", amount },
    { accountId: toAccountId, side: "CREDIT", amount },
  ];
}
