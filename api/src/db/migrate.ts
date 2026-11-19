/**
 * The migration runner: `npm run migrate`.
 *
 * A migration is a .sql file in api/migrations/ that changes the schema
 * (create a table, add a column, add an index…). Files run in name order, and
 * each one runs only once: the runner records what it has applied in the
 * `schema_migrations` table.
 *
 * Rules for writing migrations:
 *  - Never edit a migration that has already run (on your machine, a
 *    teammate's, or production). Write a new one that changes things instead.
 *  - Make the next file with `npm run migrate:new <name>`.
 *
 * Read the comments below: this file is part of what you're learning.
 */
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { pool } from "./pool.js";

const MIGRATIONS_DIR = fileURLToPath(new URL("../../migrations/", import.meta.url));
const FILE_PATTERN = /^\d{4}_[a-z0-9_]+\.sql$/;

/**
 * An arbitrary number that identifies "the migration lock".
 * Advisory locks are app-defined locks that Postgres holds for you.
 * If you run 3 API containers that each migrate on startup (Phase 10/12),
 * only one gets the lock; the others wait, then find nothing left to do.
 * Without it, two processes could both try to create the same table.
 */
const MIGRATION_LOCK_ID = 727_001;

/**
 * "Connection refused" arrives as an AggregateError with an EMPTY message
 * (Node tried both ::1 and 127.0.0.1 and both failed), so print something useful.
 */
function describeError(err: unknown): string {
  const code = typeof err === "object" && err !== null && "code" in err ? String(err.code) : "";
  if (code === "ECONNREFUSED") {
    return "Can't connect to Postgres (connection refused). Is it running? Try: docker compose up -d";
  }
  if (err instanceof Error) return err.message || err.name;
  return String(err);
}

async function migrate() {
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => FILE_PATTERN.test(f)).sort();

  // One dedicated client for the whole run: advisory locks belong to a session.
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await client.query<{ version: string }>("SELECT version FROM schema_migrations");
    const applied = new Set(rows.map((r) => r.version));
    const pending = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      console.log("Database is up to date.");
      return;
    }

    for (const file of pending) {
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");

      // Each migration runs in its own transaction. Postgres can roll back
      // schema changes (CREATE TABLE, ALTER TABLE…), which many databases
      // can't. So a migration with an error in line 40 leaves NO half-made
      // tables behind: lines 1–39 are undone too.
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`applied ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Migration ${file} failed and was rolled back: ${message}`);
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]).catch(() => {});
    client.release();
  }
}

migrate()
  .catch((err: unknown) => {
    console.error(describeError(err));
    process.exitCode = 1;
  })
  .finally(() => pool.end());
