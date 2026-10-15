import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DAILY_SHUFFLE_START,
  dailyAnswer,
  dailyPool,
  legacyDailyPool,
  localDateKey,
  puzzleNumber,
} from "./daily.ts";

describe("dailyAnswer legacy stability", () => {
  it("keeps pre-shuffle dates on the legacy common pool order", () => {
    const pool = legacyDailyPool();
    assert.ok(pool.length > 0);
    const key = "2026-10-01";
    assert.ok(key < DAILY_SHUFFLE_START);
    const n = puzzleNumber(key);
    const expected = pool[((n - 1) % pool.length + pool.length) % pool.length]!;
    assert.equal(dailyAnswer(key), expected);
  });
});

describe("dailyAnswer shuffled pool", () => {
  it("has at least 365 words without early repeats", () => {
    const pool = dailyPool();
    assert.ok(pool.length >= 365, `pool size ${pool.length}`);
    const seen = new Set<string>();
    const start = new Date(`${DAILY_SHUFFLE_START}T12:00:00`);
    for (let i = 0; i < 365; i++) {
      const d = new Date(start.getTime() + i * 86_400_000);
      const key = localDateKey(d);
      const word = dailyAnswer(key);
      assert.ok(!seen.has(word), `repeat at day ${i}: ${word}`);
      seen.add(word);
    }
  });

  it("is deterministic across calls", () => {
    assert.equal(dailyAnswer(DAILY_SHUFFLE_START), dailyAnswer(DAILY_SHUFFLE_START));
  });
});
