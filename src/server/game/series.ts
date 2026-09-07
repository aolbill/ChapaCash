import { connectMongo } from "@/lib/mongo";
import { env } from "@/lib/env";
import { ApiError } from "@/domain/errors";
import {
  ALGORITHM_V1,
  commitServerSeed,
  deriveCrashMultiplierBp,
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
    { $set: { status: "REVEALED", revealedAt: new Date(), rotateRequested: false } },
    { new: true },
  );
  if (!revealed) return;
  await FairnessProof.updateMany(
    { serverSeedHash: series.serverSeedHash, seedRevealed: false },
    { $set: { serverSeed: series.serverSeed, seedRevealed: true } },
  );
}

export async function ensureActiveSeries() {
  await connectMongo();
  let series = await CrashSeries.findOne({ status: "ACTIVE" });
  if (series?.rotateRequested) {
    const live = await GameRound.exists({ status: { $ne: "ARCHIVED" } });
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
  const live = await GameRound.findOne({ status: { $ne: "ARCHIVED" } })
    .sort({ roundNumber: 1 })
    .select("roundNumber status nonce serverSeed clientSeed algorithmVersion seriesId")
    .lean();
  const liveUsesSeries = Boolean(live && live.seriesId === String(series._id));
  const fromNonce = liveUsesSeries && live ? live.roundNumber : await nextRoundNumber();
  const limit = Math.min(PREVIEW_CAP, Math.max(1, count));
  let upcoming = previewCrashSeries({
    algorithmVersion: series.algorithmVersion,
    serverSeed: series.serverSeed,
    clientSeed: series.clientSeed,
    fromNonce,
    count: limit,
  }).map((point) => ({
    ...point,
    roundNumber: Number(point.nonce),
    current: liveUsesSeries && live != null && Number(point.nonce) === live.roundNumber,
  }));

  if (series.rotateRequested && live && series.pendingServerSeed) {
    const rest = previewCrashSeries({
      algorithmVersion: series.algorithmVersion,
      serverSeed: series.pendingServerSeed,
      clientSeed: series.clientSeed,
      fromNonce: live.roundNumber + 1,
      count: Math.max(0, limit - 1),
    }).map((point) => ({
      ...point,
      roundNumber: Number(point.nonce),
      current: false,
    }));
    upcoming = [...upcoming.filter((p) => p.current), ...rest];
  }

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
          crashMultiplierBp: deriveCrashMultiplierBp({
            algorithmVersion: live.algorithmVersion,
            serverSeed: live.serverSeed,
            clientSeed: live.clientSeed,
            nonce: live.nonce,
          }).crashMultiplierBp,
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
  const live = await GameRound.exists({ status: { $ne: "ARCHIVED" } });
  const current = await CrashSeries.findOne({ status: "ACTIVE" });

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
