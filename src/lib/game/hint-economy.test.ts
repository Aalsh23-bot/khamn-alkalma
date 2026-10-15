import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  consumeFreeHint,
  isFreeHintAvailable,
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
  it("offers free hint first", () => {
    assert.equal(resolveHintOffer(2, "2026-10-15"), "free");
  });

  it("falls back to ad after free is used", () => {
    consumeFreeHint("2026-10-15");
    assert.equal(isFreeHintAvailable("2026-10-15"), false);
    assert.equal(resolveHintOffer(2, "2026-10-15"), "ad");
  });

  it("prefers balance over ad", () => {
    consumeFreeHint("2026-10-15");
    saveHintBalance(3);
    assert.equal(resolveHintOffer(1, "2026-10-15"), "balance");
  });

  it("resets free availability on a new day", () => {
    consumeFreeHint("2026-10-15");
    assert.equal(isFreeHintAvailable("2026-10-16"), true);
  });
});
