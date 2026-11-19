import { createApp } from "./app.js";
import { config } from "./config.js";
import { pool } from "./db/pool.js";

const app = createApp();

const server = app.listen(config.PORT, () => {
  console.log(`Kolo API listening on http://localhost:${config.PORT} (${config.NODE_ENV})`);
});

/**
 * Graceful shutdown.
 *
 * When Docker or Kubernetes stops a container, it sends SIGTERM and waits a few
 * seconds before killing it. In that window we:
 *   1. stop accepting new connections,
 *   2. let in-flight requests finish (so nobody's payment is cut off halfway),
 *   3. close the database pool.
 * If that takes too long, we exit anyway.
 */
let shuttingDown = false;

function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received: shutting down…`);

  const forceExit = setTimeout(() => {
    console.error("Shutdown took too long; forcing exit.");
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close(async (err) => {
    if (err) console.error("Error closing HTTP server:", err);
    await pool.end().catch((e: unknown) => console.error("Error closing Postgres pool:", e));
    console.log("Shutdown complete.");
    process.exit(err ? 1 : 0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
