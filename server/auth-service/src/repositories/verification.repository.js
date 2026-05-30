import redisClient from "../config/redis.js";
export class VerificationRepository {
  // STORE TEMP REGISTRATION DATA
  async storeTempRegistration(userId, data) {
    await redisClient.setEx(
      `temp:register:${userId}`,
      600, // 10 mins
      JSON.stringify(data)
    );
  }
  // GET TEMP REGISTRATION DATA
  async getTempRegistration(userId) {
    const data = await redisClient.get(`temp:register:${userId}`);
    return data ? JSON.parse(data) : null;
  }
  // DELETE TEMP REGISTRATION DATA
  async deleteTempRegistration(userId) {
    await redisClient.del(`temp:register:${userId}`);
  }
  // STORE OTP
  async storeOTP(type, email, data) {
    await redisClient.setEx(
      `otp:${type}:${email}`,
      600, // 10 mins
      JSON.stringify({
        ...data,
        used: false,
        attempts: 0,
        resendCount: 0,
        blockedUntil: null,
        resetVerified: false,
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      })
    );
  }
  // GET OTP
  async getOTP(type, email) {
    const data = await redisClient.get(`otp:${type}:${email}`);
    return data ? JSON.parse(data) : null;
  }
  // UPDATE OTP
  async updateOTP(type, email, updates) {
    const existing = await this.getOTP(type, email);
    if (!existing) return null;

    const ttl = await redisClient.ttl(`otp:${type}:${email}`);
    await redisClient.setEx(
      `otp:${type}:${email}`,
      ttl, // keep remaining TTL
      JSON.stringify({ ...existing, ...updates, updatedAt: new Date() })
    );
  }
  // DELETE OTP
  async deleteOTP(type, email) {
    await redisClient.del(`otp:${type}:${email}`);
  }
  // CHECK EMAIL IN PROGRESS
  async isRegistrationInProgress(email) {
    const keys = await redisClient.keys(`otp:EMAIL_VERIFICATION:${email}`);
    return keys.length > 0;
  }
}
