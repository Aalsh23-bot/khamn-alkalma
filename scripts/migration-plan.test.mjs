import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pendingMigrations } from "./migration-plan.mjs";

describe("pendingMigrations", () => {
  it("returns only unapplied sql files sorted by basename", () => {
    const pending = pendingMigrations(
      ["/migrations/002_b.sql", "/migrations/001_a.sql", "/migrations/readme.md"],
      ["001_a.sql"],
    );
    assert.deepEqual(pending, [
      { name: "002_b.sql", path: "/migrations/002_b.sql" },
    ]);
  });

  it("treats bare filenames as both name and path", () => {
    const pending = pendingMigrations(["z.sql", "a.sql"], []);
    assert.deepEqual(
      pending.map((p) => p.name),
      ["a.sql", "z.sql"],
    );
  });

  it("skips everything already in done", () => {
    assert.deepEqual(pendingMigrations(["a.sql"], ["a.sql"]), []);
  });
});
