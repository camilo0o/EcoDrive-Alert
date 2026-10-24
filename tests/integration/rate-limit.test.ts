// @vitest-environment node

import { MongoMemoryServer } from "mongodb-memory-server";
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import { connectDB, disconnectDB } from "@/lib/db/mongodb";
import RateLimitModel from "@/lib/models/RateLimit";
import { consumeRateLimit } from "@/lib/auth/rate-limit";

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  process.env.JWT_SECRET = "test-secret-with-at-least-32-bytes-long";
  await connectDB();
  await RateLimitModel.init();
});

beforeEach(async () => {
  await RateLimitModel.deleteMany({});
});

afterAll(async () => {
  await disconnectDB();
  await mongo.stop();
});

describe("límite de solicitudes", () => {
  it("bloquea solicitudes por encima del límite durante la ventana", async () => {
    await expect(consumeRateLimit("test", "user-1", 2, 60)).resolves.toMatchObject({
      allowed: true,
    });
    await expect(consumeRateLimit("test", "user-1", 2, 60)).resolves.toMatchObject({
      allowed: true,
    });

    const blocked = await consumeRateLimit("test", "user-1", 2, 60);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("mantiene límites separados por identificador", async () => {
    await consumeRateLimit("test", "user-1", 1, 60);

    await expect(consumeRateLimit("test", "user-2", 1, 60)).resolves.toMatchObject({
      allowed: true,
    });
  });

  it("aplica el límite de forma atómica ante solicitudes simultáneas", async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        consumeRateLimit("concurrent", "user-1", 3, 60),
      ),
    );

    expect(results.filter((result) => result.allowed)).toHaveLength(3);
    expect(results.filter((result) => !result.allowed)).toHaveLength(5);
  });
});
