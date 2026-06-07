import axios from "axios";

// Fire-and-forget emitter that feeds login signals into the Neo4j-backed
// risk-service. Failures here must never block or fail a login.
const RISK_SERVICE_URL = process.env.RISK_SERVICE_URL || "http://localhost:3007";
const SERVICE_SECRET = process.env.SERVICE_SECRET || "dev-service-secret";

const client = axios.create({
  baseURL: RISK_SERVICE_URL,
  headers: {
    "x-service-secret": SERVICE_SECRET,
    "Content-Type": "application/json",
  },
  timeout: 2000,
});

class RiskHttp {
  emitLogin({ studentId, deviceFingerprint, ip }) {
    client
      .post("/risk/events", { type: "login", studentId, deviceFingerprint, ip })
      .catch(() => {
        /* best-effort: risk graph is non-critical to auth */
      });
  }
}

export default new RiskHttp();
