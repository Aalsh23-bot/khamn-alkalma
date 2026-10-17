/**
 * True for top-level SQL migration filenames (not nested auth schema files).
 * @param {string} name
 */
export function isMigrationFile(name) {
  const base = String(name).split("/").pop() || "";
  return base.endsWith(".sql") && !base.startsWith(".");
}

/**
 * Returns migration files that still need to run given already-applied names.
 * `available` may be full paths (e.g. `/migrations/001_foo.sql`) or basenames.
 * `done` is a list of basenames already recorded in `_migrations`.
 *
 * @param {string[]} available
 * @param {string[]} done
 * @returns {{ name: string, path: string }[]}
 */
export function pendingMigrations(available, done) {
  const doneSet = new Set(done);
  return available
    .map((path) => {
      const name = String(path).split("/").pop() || String(path);
      return { name, path };
    })
    .filter(({ name }) => isMigrationFile(name) && !doneSet.has(name))
    .sort((a, b) => a.name.localeCompare(b.name));
}
