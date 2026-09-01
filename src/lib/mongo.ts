import mongoose from "mongoose";
import { mongoUri } from "./env";
import { logger } from "./logger";

const globalForMongo = globalThis as unknown as {
  mongooseConn?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
};

const cache = globalForMongo.mongooseConn ?? { conn: null, promise: null };
globalForMongo.mongooseConn = cache;

export async function connectMongo(): Promise<typeof mongoose> {
  if (cache.conn && mongoose.connection.readyState === 1) return cache.conn;
  if (!cache.promise) {
    mongoose.set("strictQuery", true);
    cache.promise = mongoose.connect(mongoUri(), {
      // Existing Atlas database name. Do not rename without a data migration.
      dbName: "strata",
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 15_000,
      retryWrites: true,
    });
  }
  try {
    cache.conn = await cache.promise;
  } catch (error) {
    cache.promise = null;
    cache.conn = null;
    logger.error("mongo_connect_failed", { err: String(error) });
    throw error;
  }
  return cache.conn;
}

export async function mongoPing(): Promise<boolean> {
  try {
    const conn = await connectMongo();
    const r = await conn.connection.db?.admin().command({ ping: 1 });
    return r?.ok === 1;
  } catch (error) {
    logger.warn("mongo_ping_failed", { err: String(error) });
    return false;
  }
}
