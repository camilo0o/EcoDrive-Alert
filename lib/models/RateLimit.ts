import { model, models, Schema } from "mongoose";

interface RateLimitRecord {
  key: string;
  count: number;
  expiresAt: Date;
}

const rateLimitSchema = new Schema<RateLimitRecord>(
  {
    key: { type: String, required: true, unique: true },
    count: { type: Number, required: true },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { versionKey: false },
);

const RateLimitModel =
  models.RateLimit ??
  model<RateLimitRecord>("RateLimit", rateLimitSchema);

export default RateLimitModel;
