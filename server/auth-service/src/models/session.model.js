import mongoose from "mongoose";
const sessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: String,
      required: true,
      index: true
    },
    refreshTokenHash: {
      type: String,
      required: true
    },
    ipAddress: {
      type: String,
      required: true
    },
    userAgent: {
      type: String,
      required: true
    },
    deviceFingerprint: {
      type: String,
      required: true
    },
    revoked: {
      type: Boolean,
      default: false
    },
    expiresAt: {
      type: Date,
      required: true
    },
    lastActivityAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);
export default mongoose.model("Session", sessionSchema);