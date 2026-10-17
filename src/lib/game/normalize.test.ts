import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isArabicLetter,
  normalizeChar,
  normalizeWord,
  WORD_LENGTH,
} from "./normalize.ts";

describe("normalizeWord", () => {
  it("strips tashkeel", () => {
    assert.equal(normalizeWord("مَدْرَسَة"), "مدرسة");
  });

  it("collapses alif variants", () => {
    assert.equal(normalizeChar("أ"), "ا");
    assert.equal(normalizeChar("إ"), "ا");
    assert.equal(normalizeChar("آ"), "ا");
    assert.equal(normalizeWord("أحمد"), "احمد");
  });

  it("keeps ة and ه distinct", () => {
    assert.notEqual(normalizeWord("مدرسه"), normalizeWord("مدرسة"));
  });

  it("keeps ئ and ؤ distinct from ي / و", () => {
    assert.equal(normalizeChar("ئ"), "ئ");
    assert.equal(normalizeChar("ؤ"), "ؤ");
  });

  it("reports arabic letters", () => {
    assert.equal(isArabicLetter("م"), true);
    assert.equal(isArabicLetter("a"), false);
  });

  it("uses five-letter words", () => {
    assert.equal(WORD_LENGTH, 5);
    assert.equal(normalizeWord("مدرسة").length, WORD_LENGTH);
  });
});
