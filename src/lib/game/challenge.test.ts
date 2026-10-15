import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  challengeInviteText,
  decodeChallenge,
  encodeChallenge,
  parseChallengeCodeFromUrl,
} from "./challenge.ts";
import { ANSWERS } from "./words.ts";
import { APP_STORE_URL } from "./brand.ts";

describe("challenge encode/decode", () => {
  it("round-trips known answers", () => {
    const sample = ANSWERS.slice(0, 20);
    for (const word of sample) {
      const code = encodeChallenge(word);
      assert.equal(decodeChallenge(code), word);
    }
  });

  it("rejects garbage codes", () => {
    assert.equal(decodeChallenge(""), null);
    assert.equal(decodeChallenge("!!!"), null);
  });
});

describe("challengeInviteText", () => {
  it("includes App Store URL and code", () => {
    const text = challengeInviteText("abc12");
    assert.ok(text.includes("abc12"));
    assert.ok(text.includes(APP_STORE_URL));
    assert.ok(!text.includes("capacitor://"));
  });
});

describe("parseChallengeCodeFromUrl", () => {
  it("reads khamsa deep link", () => {
    assert.equal(
      parseChallengeCodeFromUrl("khamsa://challenge?c=abc12"),
      "ABC12",
    );
  });
});
