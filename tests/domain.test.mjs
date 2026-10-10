import assert from "node:assert/strict";
import test from "node:test";

import { siteUrl } from "../app/content.ts";

test("metadata uses the public custom domain", () => {
  assert.equal(siteUrl, "https://builders.swegrowth.id");
});
