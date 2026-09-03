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
    mongoose.set("autoIndex", false);
    mongoose.set("autoCreate", false);
    cache.promise = mongoose.connect(mongoUri(), {
      dbName: "strata",
      maxPoolSize: 8,
      minPoolSize: 0,
      maxIdleTimeMS: 45_000,
      serverSelectionTimeoutMS: 5_000,
      connectTimeoutMS: 5_000,
      socketTimeoutMS: 20_000,
      heartbeatFrequencyMS: 10_000,
      retryWrites: true,
      family: 4,
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
    return conn.connection.readyState === 1;
  } catch (error) {
    logger.warn("mongo_ping_failed", { err: String(error) });
    return false;
  }
}
