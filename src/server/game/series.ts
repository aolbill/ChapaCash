import { connectMongo } from "@/lib/mongo";
import { env } from "@/lib/env";
import { ApiError } from "@/domain/errors";
import {
  ALGORITHM_V1,
  commitServerSeed,
  deriveCrashMultiplierBp,
  derivePromoCrashMultiplierBp,
  generateServerSeed,
  previewCrashSeries,
} from "@/domain/fairness";
import { CrashSeries, FairnessProof, GameRound } from "@/server/db/models";
import { writeAudit } from "@/server/admin/audit";

const PREVIEW_CAP = 80;

function algorithmVersion() {
  return env.FAIRNESS_ALGORITHM_VERSION || ALGORITHM_V1;
}

async function nextRoundNumber(): Promise<number> {
  const last = await GameRound.findOne().sort({ roundNumber: -1 }).select("roundNumber").lean();
  return (last?.roundNumber ?? 0) + 1;
}

async function createSeriesDoc(serverSeed: string) {
  const startRoundNumber = await nextRoundNumber();
  try {
    return await CrashSeries.create({
      status: "ACTIVE",
      serverSeed,
      serverSeedHash: commitServerSeed(serverSeed),
      clientSeed: env.FAIRNESS_CLIENT_SEED,
      algorithmVersion: algorithmVersion(),
      startRoundNumber,
      rotateRequested: false,
      revealedAt: null,
    });
  } catch (error: unknown) {
    if ((error as { code?: number }).code === 11000) {
      const existing = await CrashSeries.findOne({ status: "ACTIVE" });
      if (existing) return existing;
    }
    throw error;
  }
}

async function revealSeries(series: { _id: unknown; serverSeed: string; serverSeedHash: string }) {
  const revealed = await CrashSeries.findOneAndUpdate(
    { _id: series._id, status: "ACTIVE" },
    { $set: { status: "REVEALED", revealedAt: new Date(), rotateRequested: false, pendingServerSeed: null } },
    { new: true },
  );
  if (!revealed) return;
  await FairnessProof.updateMany(
    { serverSeedHash: series.serverSeedHash, seedRevealed: false },
    { $set: { serverSeed: series.serverSeed, seedRevealed: true } },
  );
}

/** Keep a single ACTIVE series — races used to leave two and desync admin preview from play. */
export async function healDuplicateActiveSeries() {
  await connectMongo();
  const active = await CrashSeries.find({ status: "ACTIVE" }).sort({ createdAt: -1 }).lean();
  if (active.length <= 1) return active[0] ?? null;
  const live = await GameRound.findOne({ liveKey: "current" }).select("seriesId serverSeed").lean();
  const keep =
    active.find((s) => live?.seriesId && String(s._id) === live.seriesId) ??
    active.find((s) => live?.serverSeed && s.serverSeed === live.serverSeed) ??
    active[0];
  await CrashSeries.updateMany(
    { status: "ACTIVE", _id: { $ne: keep._id } },
    { $set: { status: "REVEALED", revealedAt: new Date(), rotateRequested: false, pendingServerSeed: null } },
  );
  return keep;
}

export async function ensureActiveSeries() {
  await connectMongo();
  await healDuplicateActiveSeries();
  let series = await CrashSeries.findOne({ status: "ACTIVE" }).sort({ createdAt: -1 });
  if (series?.rotateRequested) {
    const live = await GameRound.exists({ liveKey: "current" });
    if (!live) {
      const nextSeed = series.pendingServerSeed || generateServerSeed();
      await revealSeries(series);
      series = await createSeriesDoc(nextSeed);
    }
  }
  if (!series) {
    series = await createSeriesDoc(generateServerSeed());
  }
  return series;
}

export async function seriesIsRevealed(serverSeedHash: string): Promise<boolean> {
  await connectMongo();
  const series = await CrashSeries.findOne({ serverSeedHash }).select("status").lean();
  if (!series) return true;
  return series.status === "REVEALED";
}

export async function getAdminSeriesPreview(count = 40) {
  await connectMongo();
  const series = await ensureActiveSeries();
  const live = await GameRound.findOne({ liveKey: "current" })
    .select("roundNumber status nonce serverSeed clientSeed algorithmVersion seriesId")
    .lean();
  const limit = Math.min(PREVIEW_CAP, Math.max(1, count));

  /** Current chip always from the live round's seeds — same crash the engine uses for every player. */
  const liveCrash = live
    ? deriveCrashMultiplierBp({
        algorithmVersion: live.algorithmVersion,
        serverSeed: live.serverSeed,
        clientSeed: live.clientSeed,
        nonce: live.nonce,
      })
    : null;
  const livePromo = live
    ? derivePromoCrashMultiplierBp({
        serverSeed: live.serverSeed,
        clientSeed: live.clientSeed,
        nonce: live.nonce,
      })
    : null;

  const afterLiveUsesPending = Boolean(series.rotateRequested && series.pendingServerSeed && live);
  const nextSeed = afterLiveUsesPending
    ? (series.pendingServerSeed as string)
    : live && live.serverSeed
      ? live.serverSeed
      : series.serverSeed;
  const nextClient = live?.clientSeed ?? series.clientSeed;
  const nextAlgo = live?.algorithmVersion ?? series.algorithmVersion;
  const fromNonce = live ? live.roundNumber + 1 : await nextRoundNumber();

  const rest = previewCrashSeries({
    algorithmVersion: nextAlgo,
    serverSeed: nextSeed,
    clientSeed: nextClient,
    fromNonce,
    count: live ? Math.max(0, limit - 1) : limit,
  }).map((point) => ({
    ...point,
    roundNumber: Number(point.nonce),
    current: false,
  }));

  const upcoming = liveCrash
    ? [
        {
          nonce: live!.nonce,
          roundNumber: live!.roundNumber,
          crashMultiplierBp: liveCrash.crashMultiplierBp,
          promoCrashMultiplierBp: livePromo!.crashMultiplierBp,
          current: true,
        },
        ...rest,
      ]
    : rest;

  return {
    series: {
      id: String(series._id),
      status: series.status,
      serverSeed: series.serverSeed,
      serverSeedHash: series.serverSeedHash,
      clientSeed: series.clientSeed,
      algorithmVersion: series.algorithmVersion,
      startRoundNumber: series.startRoundNumber,
      rotateRequested: Boolean(series.rotateRequested),
      createdAt: (series.createdAt ?? new Date()).toISOString(),
    },
    liveRound: live
      ? {
          roundNumber: live.roundNumber,
          status: live.status,
          nonce: live.nonce,
          crashMultiplierBp: liveCrash!.crashMultiplierBp,
        }
      : null,
    upcoming,
  };
}

export async function requestSeriesRotate(args: {
  actorUserId: string;
  requestId: string;
  serverSeed?: string;
}) {
  await connectMongo();
  const custom = args.serverSeed?.trim();
  if (custom && custom.length < 16) {
    throw new ApiError("invalid_input", 400, "Custom seed must be at least 16 characters.");
  }
  if (custom && custom.length > 128) {
    throw new ApiError("invalid_input", 400, "Custom seed is too long.");
  }

  const nextSeed = custom || generateServerSeed();
  const live = await GameRound.exists({ liveKey: "current" });
  const current = await CrashSeries.findOne({ status: "ACTIVE" }).sort({ createdAt: -1 });

  if (live && current) {
    await CrashSeries.updateOne(
      { _id: current._id, status: "ACTIVE" },
      { $set: { rotateRequested: true, pendingServerSeed: nextSeed } },
    );
    await writeAudit({
      actorUserId: args.actorUserId,
      action: "series.rotate_queued",
      reason: "Admin queued a new multiplier series after the current round",
      requestId: args.requestId,
      entityType: "CrashSeries",
      entityId: String(current._id),
    });
    return { queued: true, rotated: false };
  }

  if (current) await revealSeries(current);
  const next = await createSeriesDoc(nextSeed);
  await writeAudit({
    actorUserId: args.actorUserId,
    action: "series.rotate",
    reason: "Admin started a new multiplier series",
    requestId: args.requestId,
    entityType: "CrashSeries",
    entityId: String(next._id),
    metadata: { serverSeedHash: next.serverSeedHash, customSeed: Boolean(custom) },
  });
  return { queued: false, rotated: true, seriesId: String(next._id) };
}
