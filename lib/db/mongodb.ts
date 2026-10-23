import mongoose from "mongoose";

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

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("Falta MONGODB_URI en las variables de entorno.");
  }

  cache.promise ??= mongoose.connect(uri).catch((error: unknown) => {
    cache.promise = null;
    throw error;
  });

  cache.conn = await cache.promise;
  return cache.conn;
}

export async function disconnectDB() {
  await mongoose.disconnect();
  cache.conn = null;
  cache.promise = null;
}