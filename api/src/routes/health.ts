import { Router } from "express";
import { query } from "../db/pool.js";

export const healthRouter = Router();

/**
 * GET /api/v1/health: "is this instance able to serve traffic?"
 *
 * Load balancers and Kubernetes (Phase 12) call this every few seconds and stop
 * sending traffic to an instance that returns 503. In Phase 9 you'll split it
 * into /health/live (process up) and /health/ready (dependencies reachable).
 */
healthRouter.get("/health", async (_req, res) => {
  const uptimeSeconds = Math.round(process.uptime());
  try {
    await query("SELECT 1");
    res.json({ status: "ok", db: "up", uptimeSeconds });
  } catch {
    res.status(503).json({ status: "degraded", db: "down", uptimeSeconds });
  }
});
