import assert from "node:assert/strict";
import test from "node:test";

import {
  FEEDBACK_KINDS,
  FEEDBACK_LIMITS,
  feedbackKindLabel,
  feedbackRateLimitMessage,
  isFeedbackKind,
  validateFeedback,
} from "../app/lib/feedback.ts";

const usable = { kind: "bug", message: "Menyimpan profil berputar terus dan tidak ada pesan apa pun.", contact: "" };

test("the hourly feedback limit has copy in both languages", () => {
  assert.match(feedbackRateLimitMessage("id"), /5 masukan dalam sejam/);
  assert.match(feedbackRateLimitMessage("en"), /5 feedback submissions per hour/);
});

test("a kind and a message are all that is asked for", () => {
  assert.deepEqual(validateFeedback(usable), {});
  assert.ok(validateFeedback({ ...usable, kind: "" }).kind);
  assert.ok(validateFeedback({ ...usable, message: "" }).message);
});

test("a kind the column would refuse never reaches it", () => {
  assert.ok(validateFeedback({ ...usable, kind: "keluhan" }).kind);
  for (const kind of FEEDBACK_KINDS) {
    assert.deepEqual(validateFeedback({ ...usable, kind }), {}, `${kind} harus diterima`);
  }
});

test("one word is not a report anybody can act on", () => {
  assert.ok(validateFeedback({ ...usable, message: "error" }).message);
  assert.deepEqual(validateFeedback({ ...usable, message: "a".repeat(FEEDBACK_LIMITS.message.min) }), {});
});

test("an address is optional, but an address that is not one is refused", () => {
  assert.deepEqual(validateFeedback({ ...usable, contact: "" }), {});
  assert.deepEqual(validateFeedback({ ...usable, contact: "halo@contoh.id" }), {});
  assert.ok(validateFeedback({ ...usable, contact: "halo-at-contoh" }).contact);
});

test("the ceilings match the columns the row is stored in", () => {
  assert.ok(validateFeedback({ ...usable, message: "a".repeat(FEEDBACK_LIMITS.message.max + 1) }).message);
  assert.deepEqual(validateFeedback({ ...usable, message: "a".repeat(FEEDBACK_LIMITS.message.max) }), {});
});

test("surrounding whitespace is not what makes a message long enough", () => {
  assert.ok(validateFeedback({ ...usable, message: `   ${"a".repeat(FEEDBACK_LIMITS.message.min - 1)}   ` }).message);
});

test("every kind reads as a sentence in both languages", () => {
  for (const kind of FEEDBACK_KINDS) {
    assert.ok(isFeedbackKind(kind));
    assert.ok(feedbackKindLabel(kind, "id"));
    assert.ok(feedbackKindLabel(kind, "en"));
  }
  assert.equal(feedbackKindLabel("keluhan", "id"), "");
});
