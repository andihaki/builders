import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { darkPartner, pairColours } from "../scripts/dark-colors.mjs";

test("every colour in globals.css has a dark-mode partner", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const { changed } = pairColours(css);
  assert.equal(changed, 0, "Run `npm run theme:colors` to give new colours a dark half.");
});

test("paper turns dark, ink turns light, and white cards sit above the page", () => {
  const lightness = (hex) => parseInt(hex.slice(1, 3), 16);
  assert.ok(lightness(darkPartner("#f8f6f0", "background")) < 0x30);
  assert.ok(lightness(darkPartner("#183d34", "color")) > 0xa0);
  assert.ok(lightness(darkPartner("#fff", "background")) > lightness(darkPartner("#f8f6f0", "background")));
});

test("saturated accents stay, dark shadows stay dark, and dark accent text is lifted", () => {
  assert.equal(darkPartner("#ed714b", "background"), null);
  assert.match(darkPartner("rgba(20, 54, 45, .12)", "box-shadow"), /^rgba\(0, 0, 0,/);
  assert.notEqual(darkPartner("#b91c1c", "color"), null);
});

test("already-paired colours and comments are left alone", () => {
  const css = "/* #fff */ .a { color: light-dark(#000, #eee); }";
  assert.deepEqual(pairColours(css), { css, changed: 0 });
});
