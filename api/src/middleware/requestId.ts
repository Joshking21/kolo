import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

const VALID_ID = /^[A-Za-z0-9_-]{8,64}$/;

/**
 * Gives every request an id and returns it in the X-Request-Id header.
 *
 * When a user reports "it failed", the id in the error (and the frontend's
 * dev panel) lets you find that exact request in the logs. In Phase 9 every
 * log line will include it. A client may send its own id; we keep it if it
 * looks safe, so one id can follow a request across services.
 */
export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.get("X-Request-Id");
  req.id = incoming && VALID_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader("X-Request-Id", req.id);
  next();
};
