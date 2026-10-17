import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  formatCountdown,
  loadHintBalance,
  resolveHintOffer,
  saveHintBalance,
} from "./hint-economy.ts";

const mem = new Map<string, string>();

beforeEach(() => {
  mem.clear();
  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mem.set(k, v);
      },
      removeItem: (k: string) => {
        mem.delete(k);
      },
    },
  };
});

describe("hint economy", () => {
  it("uses ad when balance is empty", () => {
    assert.equal(resolveHintOffer(2), "ad");
  });

  it("prefers balance over ad", () => {
    saveHintBalance(3);
    assert.equal(resolveHintOffer(1), "balance");
    assert.equal(loadHintBalance(), 3);
  });

  it("is exhausted when no round hints left", () => {
    saveHintBalance(5);
    assert.equal(resolveHintOffer(0), "exhausted");
  });

  it("formats countdown", () => {
    assert.equal(formatCountdown(3661000), "01:01:01");
    assert.equal(formatCountdown(0), "00:00:00");
  });
});
