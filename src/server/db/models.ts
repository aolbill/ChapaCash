import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const credits = { type: String, required: true, default: "0" };

const UserSchema = new Schema(
  {
    email: { type: String, unique: true, sparse: true, lowercase: true, default: null },
    phone: { type: String, unique: true, sparse: true, default: null, index: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true },
    publicName: { type: String, required: true, unique: true },
    role: { type: String, enum: ["PLAYER", "ADMIN"], default: "PLAYER" },
    ageConfirmedAt: { type: Date, default: null },
    suspendedAt: { type: Date, default: null },
    disabledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const SessionSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null },
    ipHash: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const GameRoundSchema = new Schema(
  {
    roundNumber: { type: Number, required: true, unique: true },
    status: {
      type: String,
      required: true,
      index: true,
      enum: [
        "SCHEDULED",
        "BETTING_OPEN",
        "BETTING_CLOSED",
        "RUNNING",
        "CRASHED",
        "SETTLED",
        "ARCHIVED",
      ],
    },
    nonce: { type: String, required: true },
    clientSeed: { type: String, required: true },
    serverSeedHash: { type: String, required: true },
    serverSeed: { type: String, required: true },
    algorithmVersion: { type: String, required: true },
    crashMultiplierBp: { type: Number, default: null },
    bettingOpensAt: { type: Date, required: true },
    bettingClosesAt: { type: Date, required: true },
    runningStartedAt: { type: Date, default: null },
    crashedAt: { type: Date, default: null },
    settledAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
    lastSequence: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const RoundEventSchema = new Schema(
  {
    roundId: { type: String, required: true, index: true },
    sequence: { type: Number, required: true },
    type: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
RoundEventSchema.index({ roundId: 1, sequence: 1 }, { unique: true });

const BetSchema = new Schema(
  {
    roundId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    slotIndex: { type: Number, required: true },
    stakeCredits: credits,
    walletKind: { type: String, enum: ["REAL", "PROMO"], default: "REAL" },
    status: { type: String, enum: ["PLACED", "CASHED_OUT", "LOST", "VOID"], default: "PLACED" },
    idempotencyKey: { type: String, required: true },
    ledgerEntryId: { type: String, default: null },
  },
  { timestamps: true },
);
BetSchema.index({ roundId: 1, userId: 1, slotIndex: 1 }, { unique: true });
BetSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });

const CashoutSchema = new Schema(
  {
    betId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    multiplierBp: { type: Number, required: true },
    payoutCredits: credits,
    idempotencyKey: { type: String, required: true },
    acceptedSeq: { type: Number, required: true },
    ledgerEntryId: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
CashoutSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });

const WalletAccountSchema = new Schema(
  {
    userId: { type: String, default: null, index: true },
    kind: {
      type: String,
      enum: ["USER_WALLET", "USER_PROMO", "HOUSE", "PROMO_POOL", "WAGER_CLEARING", "PAYSTACK_CLEARING"],
      required: true,
    },
    cachedBalanceCredits: credits,
    version: { type: Number, default: 0 },
  },
  { timestamps: true },
);
WalletAccountSchema.index({ kind: 1, userId: 1 }, { unique: true });

const LedgerEntrySchema = new Schema(
  {
    type: { type: String, required: true },
    requestId: { type: String, required: true, unique: true },
    actorUserId: { type: String, default: null },
    reason: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: null },
    postings: [
      {
        accountId: { type: String, required: true },
        side: { type: String, enum: ["DEBIT", "CREDIT"], required: true },
        amount: credits,
      },
    ],
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const FairnessProofSchema = new Schema(
  {
    roundId: { type: String, required: true, unique: true },
    algorithmVersion: { type: String, required: true },
    serverSeedHash: { type: String, required: true },
    serverSeed: { type: String, required: true },
    clientSeed: { type: String, required: true },
    nonce: { type: String, required: true },
    crashMultiplierBp: { type: Number, required: true },
    hmacPreview: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const AuditLogSchema = new Schema(
  {
    actorUserId: { type: String, default: null, index: true },
    subjectUserId: { type: String, default: null },
    action: { type: String, required: true, index: true },
    reason: { type: String, required: true },
    requestId: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
AuditLogSchema.index({ createdAt: -1 });

const ResponsiblePlaySettingSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true },
    enforcementEnabled: { type: Boolean, default: false },
    sessionLimitMs: { type: Number, default: null },
    lossLimitCredits: { type: String, default: null },
    coolingOffUntil: { type: Date, default: null },
    selfExcludedUntil: { type: Date, default: null },
  },
  { timestamps: true },
);

const FeatureFlagSchema = new Schema({
  key: { type: String, required: true, unique: true },
  enabled: { type: Boolean, default: false },
  note: { type: String, required: true },
});

const DepositSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    phone: { type: String, required: true },
    amountKes: { type: String, required: true },
    status: { type: String, enum: ["PENDING", "SUCCESS", "FAILED"], default: "PENDING", index: true },
    paystackReference: { type: String, required: true, unique: true },
    paystackStatus: { type: String, default: null },
    displayText: { type: String, default: null },
    ledgerEntryId: { type: String, default: null },
    failureReason: { type: String, default: null },
  },
  { timestamps: true },
);

const WithdrawalSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    phone: { type: String, required: true },
    amountKes: { type: String, required: true },
    status: { type: String, enum: ["PENDING", "SUCCESS", "FAILED"], default: "PENDING", index: true },
    paystackReference: { type: String, required: true, unique: true },
    paystackTransferCode: { type: String, default: null },
    paystackRecipientCode: { type: String, default: null },
    paystackStatus: { type: String, default: null },
    ledgerEntryId: { type: String, default: null },
    reversalLedgerEntryId: { type: String, default: null },
    failureReason: { type: String, default: null },
  },
  { timestamps: true },
);

const EngineLockSchema = new Schema({
  key: { type: String, required: true, unique: true },
  owner: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

function model<T>(name: string, schema: Schema): Model<T> {
  const existing = mongoose.models[name] as Model<T> | undefined;
  if (existing) return existing;
  return mongoose.model<T>(name, schema);
}

/** Hot reload can keep a stale Mongoose model whose enum is missing new values. */
function modelWithEnum<T>(name: string, schema: Schema, path: string, values: string[]): Model<T> {
  const existing = mongoose.models[name] as Model<T> | undefined;
  if (existing) {
    const compiled = (existing.schema.path(path) as { enumValues?: string[] } | undefined)?.enumValues ?? [];
    const stale = values.some((v) => !compiled.includes(v));
    if (!stale) return existing;
    mongoose.deleteModel(name);
  }
  return mongoose.model<T>(name, schema);
}

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: mongoose.Types.ObjectId };
export type SessionDoc = InferSchemaType<typeof SessionSchema> & { _id: mongoose.Types.ObjectId };
export type GameRoundDoc = InferSchemaType<typeof GameRoundSchema> & { _id: mongoose.Types.ObjectId };
export type BetDoc = InferSchemaType<typeof BetSchema> & { _id: mongoose.Types.ObjectId };
export type CashoutDoc = InferSchemaType<typeof CashoutSchema> & { _id: mongoose.Types.ObjectId };
export type WalletAccountDoc = InferSchemaType<typeof WalletAccountSchema> & { _id: mongoose.Types.ObjectId };
export type LedgerEntryDoc = InferSchemaType<typeof LedgerEntrySchema> & { _id: mongoose.Types.ObjectId };

export const User = model<UserDoc>("User", UserSchema);
export const Session = model<SessionDoc>("Session", SessionSchema);
export const GameRound = model<GameRoundDoc>("GameRound", GameRoundSchema);
export const RoundEvent = model<{
  roundId: string;
  sequence: number;
  type: string;
  payload: unknown;
  createdAt: Date;
}>("RoundEvent", RoundEventSchema);
export const Bet = modelWithEnum<BetDoc>("Bet", BetSchema, "walletKind", ["REAL", "PROMO"]);
export const Cashout = model<CashoutDoc>("Cashout", CashoutSchema);
export const WalletAccount = modelWithEnum<WalletAccountDoc>(
  "WalletAccount",
  WalletAccountSchema,
  "kind",
  ["USER_WALLET", "USER_PROMO", "HOUSE", "PROMO_POOL", "WAGER_CLEARING", "PAYSTACK_CLEARING"],
);
export const LedgerEntry = model<LedgerEntryDoc>("LedgerEntry", LedgerEntrySchema);
export const FairnessProof = model<{
  roundId: string;
  algorithmVersion: string;
  serverSeedHash: string;
  serverSeed: string;
  clientSeed: string;
  nonce: string;
  crashMultiplierBp: number;
  hmacPreview: string;
}>("FairnessProof", FairnessProofSchema);
export const AuditLog = model<{
  actorUserId: string | null;
  subjectUserId: string | null;
  action: string;
  reason: string;
  requestId: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  createdAt: Date;
}>("AuditLog", AuditLogSchema);
export const ResponsiblePlaySetting = model<{
  userId: string;
  enforcementEnabled: boolean;
}>("ResponsiblePlaySetting", ResponsiblePlaySettingSchema);
export const FeatureFlag = model<{ key: string; enabled: boolean; note: string }>(
  "FeatureFlag",
  FeatureFlagSchema,
);
export const EngineLock = model<{ key: string; owner: string; expiresAt: Date }>(
  "EngineLock",
  EngineLockSchema,
);
export type DepositDoc = InferSchemaType<typeof DepositSchema> & { _id: mongoose.Types.ObjectId };
export const Deposit = model<DepositDoc>("Deposit", DepositSchema);
export type WithdrawalDoc = InferSchemaType<typeof WithdrawalSchema> & { _id: mongoose.Types.ObjectId };
export const Withdrawal = model<WithdrawalDoc>("Withdrawal", WithdrawalSchema);
