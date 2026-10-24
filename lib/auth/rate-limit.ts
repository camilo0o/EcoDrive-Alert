import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import RateLimitModel from "@/lib/models/RateLimit";
import { connectDB } from "@/lib/db/mongodb";

interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

function hashRateLimitKey(scope: string, identifier: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || new TextEncoder().encode(secret).length < 32) {
    throw new Error("JWT_SECRET debe tener al menos 32 bytes.");
  }

  return createHmac("sha256", secret)
    .update(`${scope}:${identifier}`)
    .digest("hex");
}

export function getTrustedClientIp(request: Request): string {
  const headerName = process.env.TRUSTED_CLIENT_IP_HEADER;
  if (!headerName) {
    if (process.env.NODE_ENV !== "production") {
      return "::1";
    }
    throw new Error("Falta configurar TRUSTED_CLIENT_IP_HEADER.");
  }

  const ip = request.headers.get(headerName)?.trim();
  if (!ip || isIP(ip) === 0) {
    throw new Error(
      `El encabezado de IP confiable "${headerName}" está ausente o no contiene una IP válida.`,
    );
  }

  return ip;
}

export async function consumeRateLimit(
  scope: string,
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  await connectDB();
  await RateLimitModel.init();

  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowSeconds * 1000);
  const update = async () =>
    RateLimitModel.findOneAndUpdate(
      { key: hashRateLimitKey(scope, identifier) },
      [
        {
          $set: {
            count: {
              $cond: [
                { $gt: ["$expiresAt", now] },
                { $add: [{ $ifNull: ["$count", 0] }, 1] },
                1,
              ],
            },
            expiresAt: {
              $cond: [{ $gt: ["$expiresAt", now] }, "$expiresAt", expiresAt],
            },
          },
        },
      ],
      { upsert: true, returnDocument: "after", updatePipeline: true },
    )
      .select("count expiresAt")
      .lean()
      .exec();

  let record;
  try {
    record = await update();
  } catch (error) {
    if (
      typeof error !== "object" ||
      error === null ||
      !("code" in error) ||
      error.code !== 11000
    ) {
      throw error;
    }
    record = await update();
  }

  if (!record) {
    throw new Error("No se pudo actualizar el límite de solicitudes.");
  }

  return {
    allowed: record.count <= limit,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((record.expiresAt.getTime() - now.getTime()) / 1000),
    ),
  };
}
