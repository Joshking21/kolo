import pg from "pg";
import { config } from "../config.js";

/**
 * Postgres returns BIGINT (type id 20) as a *string* by default, because a JS
 * number can't hold every 64-bit integer exactly. Our money columns are bigint
 * kobo, and we want plain numbers in JSON (see API.md), so we parse them here,
 * and refuse anything outside the safe range rather than silently losing
 * precision. Number.MAX_SAFE_INTEGER kobo is about ₦90 trillion, so real values
 * never get close.
 *
 * COUNT(*) also returns bigint, so this makes counts plain numbers too.
 */
pg.types.setTypeParser(pg.types.builtins.INT8, (value: string) => {
  const n = Number(value);
  if (!Number.isSafeInteger(n)) {
    throw new Error(`bigint value ${value} is outside the safe integer range`);
  }
  return n;
});

/**
 * One shared pool of connections for the whole process.
 *
 * Opening a Postgres connection is slow (TCP + TLS + auth), so a pool keeps a
 * few open and lends them out per query. `max` matters for scaling: in Phase 11
 * you'll work out (replicas × max) against Postgres's max_connections.
 */
export const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  // Fires when an *idle* client loses its connection (e.g. Postgres restarted).
  // The pool removes that client and makes a new one later; we just log it.
  console.error("Postgres pool error:", err.message);
});

/**
 * Run a single query on any free connection.
 *
 * ALWAYS pass values as params ($1, $2, …), never by building the SQL string
 * yourself. Parameters are sent separately from the SQL, so user input can
 * never change the query (this is what prevents SQL injection).
 *
 *   await query<{ id: string }>("SELECT id FROM users WHERE email = $1", [email]);
 *
 * For several queries that must succeed or fail together you'll need ONE
 * client for all of them (BEGIN … COMMIT). You'll write that helper,
 * `withTransaction`, in Phase 2/4.
 */
export function query<Row extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: unknown[] = [],
) {
  return pool.query<Row>(text, params);
}
