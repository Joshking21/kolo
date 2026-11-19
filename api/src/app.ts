import express from "express";
import { requestId } from "./middleware/requestId.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/health.js";

/**
 * Builds the Express app WITHOUT starting a server.
 *
 * Keeping this separate from server.ts means tests (Phase 2+) can do
 * `request(createApp()).get("/api/v1/health")` with Supertest, without
 * opening a real port.
 *
 * Middleware runs top to bottom, in the order it's registered, so order matters.
 */
export function createApp() {
  const app = express();

  app.disable("x-powered-by"); // don't advertise "Express" to attackers
  app.use(requestId); // first, so every later log line and error has an id
  app.use(express.json({ limit: "100kb" })); // parses JSON bodies into req.body

  const api = express.Router();
  api.use(healthRouter);
  // Phase 2: api.use(authRouter);
  // Phase 3: api.use(groupsRouter);
  // Phase 4: api.use(walletRouter); …

  app.use("/api/v1", api);

  app.use(notFoundHandler); // nothing matched
  app.use(errorHandler); // must be last
  return app;
}
