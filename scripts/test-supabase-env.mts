import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Env helpers are Vite-oriented; we re-implement the same guards here so CI
 * can verify the contract without a Vite runtime.
 */
function isConfigured(url?: string, key?: string): boolean {
  const u = url?.trim();
  const k = key?.trim();
  if (!u || !k) return false;
  if (u.includes("YOUR_PROJECT_REF")) return false;
  if (k.includes("your_anon_key")) return false;
  return true;
}

describe("supabase env guards", () => {
  it("rejects missing values", () => {
    assert.equal(isConfigured(undefined, undefined), false);
    assert.equal(isConfigured("", "x"), false);
    assert.equal(isConfigured("https://x.supabase.co", ""), false);
  });

  it("rejects .env.example placeholders", () => {
    assert.equal(
      isConfigured(
        "https://YOUR_PROJECT_REF.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example",
      ),
      false,
    );
    assert.equal(
      isConfigured("https://abcd.supabase.co", "your_anon_key_here"),
      false,
    );
  });

  it("accepts real-looking values", () => {
    assert.equal(
      isConfigured(
        "https://abcdefghijklmnop.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.real",
      ),
      true,
    );
  });
});
