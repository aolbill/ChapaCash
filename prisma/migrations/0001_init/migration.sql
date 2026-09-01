-- Strata initial schema. Integer credits; no floating money columns.

CREATE TYPE "RoleName" AS ENUM ('PLAYER', 'ADMIN');
CREATE TYPE "RoundStatus" AS ENUM ('SCHEDULED', 'BETTING_OPEN', 'BETTING_CLOSED', 'RUNNING', 'CRASHED', 'SETTLED', 'ARCHIVED');
CREATE TYPE "BetStatus" AS ENUM ('PLACED', 'CASHED_OUT', 'LOST', 'VOID');
CREATE TYPE "LedgerTxType" AS ENUM ('PROMO_CREDIT', 'BET_DEBIT', 'CASH_OUT_PAYOUT', 'LOST_BET_SETTLEMENT', 'COMPENSATING_CORRECTION');
CREATE TYPE "LedgerSide" AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE "RoundEventType" AS ENUM ('SCHEDULED', 'BETTING_OPEN', 'BETTING_CLOSED', 'RUNNING', 'TICK', 'CRASHED', 'SETTLED', 'ARCHIVED');
CREATE TYPE "AccountKind" AS ENUM ('USER_WALLET', 'HOUSE', 'PROMO_POOL', 'WAGER_CLEARING');

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "publicName" TEXT NOT NULL UNIQUE,
  "role" "RoleName" NOT NULL DEFAULT 'PLAYER',
  "suspendedAt" TIMESTAMP(3),
  "disabledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Session" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "ipHash" TEXT,
  "userAgent" TEXT
);
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

CREATE TABLE "GameRound" (
  "id" TEXT PRIMARY KEY,
  "roundNumber" INTEGER NOT NULL UNIQUE,
  "status" "RoundStatus" NOT NULL,
  "nonce" TEXT NOT NULL,
  "clientSeed" TEXT NOT NULL,
  "serverSeedHash" TEXT NOT NULL,
  "serverSeed" TEXT NOT NULL,
  "algorithmVersion" TEXT NOT NULL,
  "crashMultiplierBp" INTEGER,
  "bettingOpensAt" TIMESTAMP(3) NOT NULL,
  "bettingClosesAt" TIMESTAMP(3) NOT NULL,
  "runningStartedAt" TIMESTAMP(3),
  "crashedAt" TIMESTAMP(3),
  "settledAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "lastSequence" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "GameRound_status_idx" ON "GameRound"("status");
CREATE INDEX "GameRound_createdAt_idx" ON "GameRound"("createdAt");

CREATE TABLE "RoundEvent" (
  "id" TEXT PRIMARY KEY,
  "roundId" TEXT NOT NULL REFERENCES "GameRound"("id") ON DELETE CASCADE,
  "sequence" INTEGER NOT NULL,
  "type" "RoundEventType" NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RoundEvent_roundId_sequence_key" UNIQUE ("roundId", "sequence")
);
CREATE INDEX "RoundEvent_roundId_createdAt_idx" ON "RoundEvent"("roundId", "createdAt");

CREATE TABLE "Bet" (
  "id" TEXT PRIMARY KEY,
  "roundId" TEXT NOT NULL REFERENCES "GameRound"("id"),
  "userId" TEXT NOT NULL REFERENCES "User"("id"),
  "slotIndex" INTEGER NOT NULL,
  "stakeCredits" BIGINT NOT NULL,
  "status" "BetStatus" NOT NULL DEFAULT 'PLACED',
  "idempotencyKey" TEXT NOT NULL,
  "ledgerEntryId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Bet_roundId_userId_slotIndex_key" UNIQUE ("roundId", "userId", "slotIndex"),
  CONSTRAINT "Bet_userId_idempotencyKey_key" UNIQUE ("userId", "idempotencyKey")
);
CREATE INDEX "Bet_roundId_status_idx" ON "Bet"("roundId", "status");

CREATE TABLE "Cashout" (
  "id" TEXT PRIMARY KEY,
  "betId" TEXT NOT NULL UNIQUE REFERENCES "Bet"("id"),
  "userId" TEXT NOT NULL REFERENCES "User"("id"),
  "multiplierBp" INTEGER NOT NULL,
  "payoutCredits" BIGINT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "acceptedSeq" INTEGER NOT NULL,
  "ledgerEntryId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Cashout_userId_idempotencyKey_key" UNIQUE ("userId", "idempotencyKey")
);

CREATE TABLE "WalletAccount" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT UNIQUE REFERENCES "User"("id"),
  "kind" "AccountKind" NOT NULL,
  "cachedBalanceCredits" BIGINT NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WalletAccount_kind_userId_key" UNIQUE ("kind", "userId")
);
CREATE INDEX "WalletAccount_kind_idx" ON "WalletAccount"("kind");
CREATE UNIQUE INDEX "WalletAccount_system_kind_key" ON "WalletAccount"("kind") WHERE "userId" IS NULL;

CREATE TABLE "LedgerEntry" (
  "id" TEXT PRIMARY KEY,
  "type" "LedgerTxType" NOT NULL,
  "requestId" TEXT NOT NULL UNIQUE,
  "actorUserId" TEXT,
  "reason" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "LedgerEntry_createdAt_idx" ON "LedgerEntry"("createdAt");
CREATE INDEX "LedgerEntry_type_idx" ON "LedgerEntry"("type");

CREATE TABLE "LedgerPosting" (
  "id" TEXT PRIMARY KEY,
  "entryId" TEXT NOT NULL REFERENCES "LedgerEntry"("id") ON DELETE RESTRICT,
  "accountId" TEXT NOT NULL REFERENCES "WalletAccount"("id"),
  "side" "LedgerSide" NOT NULL,
  "amount" BIGINT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "LedgerPosting_accountId_createdAt_idx" ON "LedgerPosting"("accountId", "createdAt");
CREATE INDEX "LedgerPosting_entryId_idx" ON "LedgerPosting"("entryId");

CREATE TABLE "FairnessProof" (
  "id" TEXT PRIMARY KEY,
  "roundId" TEXT NOT NULL UNIQUE REFERENCES "GameRound"("id") ON DELETE CASCADE,
  "algorithmVersion" TEXT NOT NULL,
  "serverSeedHash" TEXT NOT NULL,
  "serverSeed" TEXT NOT NULL,
  "clientSeed" TEXT NOT NULL,
  "nonce" TEXT NOT NULL,
  "crashMultiplierBp" INTEGER NOT NULL,
  "hmacPreview" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "actorUserId" TEXT REFERENCES "User"("id"),
  "subjectUserId" TEXT REFERENCES "User"("id"),
  "action" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

CREATE TABLE "ResponsiblePlaySetting" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
  "enforcementEnabled" BOOLEAN NOT NULL DEFAULT false,
  "sessionLimitMs" INTEGER,
  "lossLimitCredits" BIGINT,
  "coolingOffUntil" TIMESTAMP(3),
  "selfExcludedUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "FeatureFlag" (
  "id" TEXT PRIMARY KEY,
  "key" TEXT NOT NULL UNIQUE,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "note" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
