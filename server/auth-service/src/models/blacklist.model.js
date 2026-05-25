import mongoose from "mongoose";
const blacklistSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    enum: ["access", "refresh"],
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  }
}, {
  timestamps: true
});
// Auto cleanup
blacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model("Blacklist", blacklistSchema);