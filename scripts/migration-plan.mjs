/**
 * Returns migration names that still need to run given already-applied names.
 * @param {string[]} available
 * @param {string[]} done
 * @returns {{ name: string, path: string }[]}
 */
export function pendingMigrations(available, done) {
  const doneSet = new Set(done);
  return available
    .filter((name) => !doneSet.has(name))
    .map((name) => ({ name, path: name }));
}
