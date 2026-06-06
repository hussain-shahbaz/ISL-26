import mongoose from "mongoose";

const blacklistSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["access"],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

blacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.models.Blacklist ||
  mongoose.model("Blacklist", blacklistSchema);
