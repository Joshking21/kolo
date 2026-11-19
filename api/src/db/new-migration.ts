/**
 * `npm run migrate:new create_users` → creates migrations/0002_create_users.sql
 * (numbered one higher than the newest existing file).
 */
import { readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const MIGRATIONS_DIR = fileURLToPath(new URL("../../migrations/", import.meta.url));

const name = process.argv[2];
if (!name || !/^[a-z0-9_]+$/.test(name)) {
  console.error("Usage: npm run migrate:new <name>   (lowercase letters, digits and _ only)");
  process.exit(1);
}

const numbers = (await readdir(MIGRATIONS_DIR))
  .map((f) => /^(\d{4})_/.exec(f)?.[1])
  .filter((n): n is string => n !== undefined)
  .map(Number);

const next = String(Math.max(0, ...numbers) + 1).padStart(4, "0");
const file = `${next}_${name}.sql`;

await writeFile(
  path.join(MIGRATIONS_DIR, file),
  `-- ${file}\n-- Write the schema change here. It runs inside a transaction (see src/db/migrate.ts).\n\n`,
  { flag: "wx" },
);
console.log(`created migrations/${file}`);
