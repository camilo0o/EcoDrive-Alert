import mongoose from "mongoose";
const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Falta MONGODB_URI en .env.local");
}
type MongooseCache = {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
};

const globalCache = globalThis as typeof globalThis & {
  mongoose?: MongooseCache;
};

const cache = (globalCache.mongoose ??= { conn: null, promise: null });

export async function connectDB() {
  if (cache.conn) return cache.conn;

  cache.promise ??= mongoose.connect(uri!);
  cache.conn = await cache.promise;

  return cache.conn;
}