import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluate, hardModeError, mergeKeyStatus } from "./evaluate.ts";

describe("evaluate", () => {
  it("marks exact matches as correct", () => {
    assert.deepEqual(evaluate("مدرسة", "مدرسة"), [
      "correct",
      "correct",
      "correct",
      "correct",
      "correct",
    ]);
  });

  it("handles duplicate letters without double-counting", () => {
    // answer has one م; first م present, second absent after correct positions resolved
    assert.deepEqual(evaluate("ممممم", "مدرسة"), [
      "correct",
      "absent",
      "absent",
      "absent",
      "absent",
    ]);
  });

  it("marks present then absent for extras", () => {
    assert.deepEqual(evaluate("كتبكم", "مكتبة"), [
      "present",
      "present",
      "present",
      "absent",
      "present",
    ]);
  });
});

describe("mergeKeyStatus", () => {
  it("keeps the stronger status", () => {
    assert.equal(mergeKeyStatus("absent", "present"), "present");
    assert.equal(mergeKeyStatus("present", "correct"), "correct");
    assert.equal(mergeKeyStatus("correct", "absent"), "correct");
  });
});

describe("hardModeError", () => {
  it("requires green letters to stay", () => {
    const err = hardModeError("سدرةم", ["مدرسة"], [
      ["correct", "correct", "correct", "correct", "correct"],
    ]);
    assert.ok(err);
  });

  it("requires yellow letters to be reused", () => {
    const err = hardModeError("باباب", ["مدرسة"], [
      ["present", "absent", "absent", "absent", "absent"],
    ]);
    assert.ok(err?.includes("م"));
  });
});
