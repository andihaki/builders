import assert from "node:assert/strict";
import test from "node:test";

import { pathFor, readFilters, readPage } from "../app/lib/directory-url.ts";

test("an empty address is the GitHub track with nothing applied", () => {
  assert.deepEqual(readFilters({}), { track: "github", source: "", open: "", pr: "", badge: "", facet: "", q: "" });
  assert.equal(pathFor(readFilters({})), "/");
});

test("the server's query object and the browser's URLSearchParams read the same", () => {
  const search = "?track=role&badge=indonesian&facet=Design&q=kopi&page=2";
  const fromObject = readFilters(Object.fromEntries(new URLSearchParams(search)));
  const fromParams = readFilters(new URLSearchParams(search));
  assert.deepEqual(fromObject, fromParams);
  assert.equal(readPage(new URLSearchParams(search)), "2");
});

test("a filtered address survives a round trip, and the page only rides along when asked", () => {
  const filters = readFilters(new URLSearchParams("track=role&source=community&facet=Design&q=kopi"));
  assert.equal(pathFor(filters), "/?track=role&source=community&facet=Design&q=kopi");
  assert.deepEqual(readFilters(new URL(pathFor(filters), "https://x.test").searchParams), filters);
  assert.equal(pathFor(filters, 1), pathFor(filters));
  assert.equal(pathFor(filters, 3), "/?track=role&source=community&facet=Design&q=kopi&page=3");
});

test("unknown values are dropped rather than trusted", () => {
  const filters = readFilters(new URLSearchParams("track=nope&badge=nope&pr=nope&open=nope&source=nope"));
  assert.equal(pathFor(filters), "/");
});
