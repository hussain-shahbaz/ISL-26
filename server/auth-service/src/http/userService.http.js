import axios from "axios";
import config from "../config/config.js";
const USER_SERVICE_URL = config.USER_SERVICE_URL;
const INTERNAL_SECRET = config.INTERNAL_SECRET;
// shared axios instance
const userServiceClient = axios.create({
  baseURL: USER_SERVICE_URL,
  headers: {
    "x-internal-secret": INTERNAL_SECRET,
    "Content-Type": "application/json",
  },
  timeout: 5000, // 5 seconds
});
class UserServiceHttp {
  async createProfile({ userId, name, email, role }) {
    try {
      console.log("Calling user-service with:", { userId, name, email, role });
      const response = await userServiceClient.post("/api/users/register", {
        userId,
        name,
        email,
        role: role.toUpperCase(),
      });
      console.log("User service response:", response.data);
      return response.data;
    } catch (error) {
      console.error("User service error status:", error.response?.status);
      console.error("User service error data:", error.response?.data);
      console.error("User service error message:", error.message);
      throw new Error(
        "USER_SERVICE_ERROR: " +
          (error.response?.data?.message || error.message)
      );
    }
  }

  // Live approval state for embedding into the access token. Returns null on any
  // failure so the caller can decide how to degrade (we fail open on transport
  // errors to avoid locking out legitimate users during a user-service blip).
  async getApprovalStatus(userId) {
    try {
      const response = await userServiceClient.get(
        `/api/users/internal/${userId}/approval`
      );
      return response.data?.data || null; // { role, approvalStatus }
    } catch (error) {
      console.error(
        "getApprovalStatus failed:",
        error.response?.status,
        error.message
      );
      return null;
    }
  }

  // called if auth record creation fails after profile created
  async rollbackProfile(userId) {
    try {
      await userServiceClient.delete(`/api/users/${userId}`);
    } catch (error) {
      // log but don't throw — best effort rollback
      console.error("Rollback failed:", error.message);
    }
  }
}

export default new UserServiceHttp();
