import mongoose from "mongoose";
const authIdentitySchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ["student", "instructor", "admin"],
      required: true
    },
  isEmailVerified: {
      type: Boolean,
      default: false,
      index: true
    },
    isBlocked: {
      type: Boolean,
      default: false
    },
    // FUTURE MFA SUPPORT
    // mfaEnabled: {
    //   type: Boolean,
    //   default: false
    // },

    // mfaSecret: {
    //   type: String,
    //   default: null
    // },

    lastLoginAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);
export default mongoose.model("AuthIdentity", authIdentitySchema);