import mongoose from "mongoose";
const verificationTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["EMAIL_VERIFICATION", "PASSWORD_RESET"],
      required: true,
      index: true,
    },

    otpHash: {
      type: String,
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      // index: true   ← Remove this line (we'll use schema.index below)
    },
    used: {
      type: Boolean,
      default: false,
      index: true,
    },

    attempts: {
      type: Number,
      default: 0,
    },

    resendCount: {
      type: Number,
      default: 0,
    },
    blockedUntil: {
      type: Date,
      default: null,
    },
    resetVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);
// TTL Index for auto expiration (Best Practice)
// verificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model("VerificationToken", verificationTokenSchema);
