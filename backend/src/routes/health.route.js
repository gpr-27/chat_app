import express from "express";
import mongoose from "mongoose";

// Liveness/readiness probe for load balancers and platform health checks (e.g.
// Render's `healthCheckPath`). Intentionally unauthenticated and cheap: it never
// touches the database, it only reports the cached mongoose connection state.
// Mounted before auth and rate limiting so frequent probes are never throttled.
const router = express.Router();

// mongoose.connection.readyState: 0 disconnected, 1 connected, 2 connecting, 3 disconnecting.
const DB_STATES = ["disconnected", "connected", "connecting", "disconnecting"];

router.get("/", (req, res) => {
  const dbState = DB_STATES[mongoose.connection.readyState] || "unknown";
  const healthy = mongoose.connection.readyState === 1;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    uptime: Math.round(process.uptime()),
    db: dbState,
    timestamp: new Date().toISOString(),
  });
});

export default router;
