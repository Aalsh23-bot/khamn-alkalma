/**
 * Apply SQL files from ./migrations to Neon when DATABASE_URL is set.
 * No-op (exit 0) when DATABASE_URL is unset — preview/PGLite applies the same
 * files via src/lib/db.ts at runtime.
 *
 * Parity with src/lib/db.ts: apply + record each file atomically in _migrations.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pendingMigrations } from "./migration-plan.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const migrationsDir = path.join(root, "migrations");

const rawUrl = process.env.DATABASE_URL?.trim();
if (!rawUrl) {
  console.log("[migrate] DATABASE_URL unset — skipping (PGLite path applies at runtime).");
  process.exit(0);
}

async function main() {
  let entries = [];
  try {
    entries = await readdir(migrationsDir);
  } catch (err) {
    if (err && err.code === "ENOENT") {
      console.log("[migrate] no migrations/ directory — nothing to apply.");
      return;
    }
    throw err;
  }

  const available = entries
    .filter((name) => name.endsWith(".sql"))
    .map((name) => path.join(migrationsDir, name));

  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: rawUrl });
  await client.connect();

  try {
    await client.query(
      "create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())",
    );
    const { rows } = await client.query("select name from _migrations");
    const done = rows.map((r) => r.name);
    const pending = pendingMigrations(available, done);

    if (pending.length === 0) {
      console.log("[migrate] up to date.");
      return;
    }

    for (const { name, path: filePath } of pending) {
      const sql = await readFile(filePath, "utf8");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into _migrations (name) values ($1)", [name]);
        await client.query("commit");
        console.log(`[migrate] applied ${name}`);
      } catch (err) {
        await client.query("rollback");
        throw err;
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("[migrate] failed:", err);
  process.exit(1);
});
