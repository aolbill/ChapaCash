export type WalletKind = "REAL" | "PROMO";

export type BetRow = {
  id: string;
  publicName: string;
  userId: string;
  slotIndex: number;
  stakeCredits: string;
  walletKind?: WalletKind;
  status: string;
  cashedOutAtBp: number | null;
  payoutCredits: string | null;
};

export type RoundStatePayload = {
  cashCredits: string;
  promoCredits: string;
  hasDeposited: boolean;
  lifetimeDepositedKes?: string;
  multiplierBp: number | null;
  myBets: BetRow[];
  bets: BetRow[];
  round: {
    id: string;
    roundNumber: number;
    status: string;
    bettingOpensAt: string;
    bettingClosesAt: string;
    runningStartedAt?: string | null;
    crashMultiplierBp: number | null;
    lastSequence: number;
    serverSeedHash: string;
  } | null;
};

export type HistoryRound = {
  id: string;
  roundNumber: number;
  crashMultiplierBp: number;
};
