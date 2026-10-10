import assert from "node:assert/strict";
import test from "node:test";

import {
  faviconUrl,
  normalizeOrigin,
  pinnedOrigin,
  projectLogoUrl,
  safeNextPath,
  signInPath,
  startPath,
  strayCodeTarget,
} from "../app/lib/urls.ts";

const params = (query) => new URLSearchParams(query);

test("a redirect target stays inside this site", () => {
  assert.equal(safeNextPath("/projects/warung-antre"), "/projects/warung-antre");
  assert.equal(safeNextPath("/?stage=idea"), "/?stage=idea");
});

test("anything pointing off-site collapses to the board", () => {
  for (const hostile of [
    "https://contoh-jahat.example/curi",
    "//contoh-jahat.example/curi",
    "javascript:alert(1)",
    "",
    null,
    undefined,
  ]) {
    assert.equal(safeNextPath(hostile), "/", `${hostile} harus jadi /`);
  }
});

test("the sign-in link carries a safe destination, or none at all", () => {
  assert.equal(signInPath("/new"), "/signin?next=%2Fnew");
  assert.equal(signInPath("/"), "/signin");
  assert.equal(signInPath("https://contoh-jahat.example"), "/signin");
});

test("a plain sign-in lands on the next-steps page", () => {
  assert.equal(startPath("/"), "/get-started");
  assert.equal(startPath(""), "/get-started");
  assert.equal(startPath(null), "/get-started");
  // Anything off-site collapses to "/" first, so it cannot skip past /get-started.
  assert.equal(startPath("https://malicious-example.example"), "/get-started");
});

test("a destination somebody actually asked for always wins", () => {
  assert.equal(startPath("/projects/warung-antre"), "/projects/warung-antre");
  assert.equal(startPath("/account/password"), "/account/password");
  assert.equal(startPath("/explore?q=design"), "/explore?q=design");
});

test("a code stranded off the callback is sent where it can be spent", () => {
  assert.deepEqual(
    strayCodeTarget("/get-started", params("code=abc&next=%2F"), false),
    { pathname: "/auth/callback", search: "code=abc" },
  );
  // A destination worth keeping survives the detour.
  assert.deepEqual(
    strayCodeTarget("/", params("code=abc&next=%2Fexplore"), false),
    { pathname: "/auth/callback", search: "code=abc&next=%2Fexplore" },
  );
});

test("with no next of its own, the page the code landed on becomes the destination", () => {
  assert.deepEqual(
    strayCodeTarget("/explore", params("code=abc"), false),
    { pathname: "/auth/callback", search: "code=abc&next=%2Fexplore" },
  );
});

test("a hostile next cannot ride in on a stray code", () => {
  assert.deepEqual(
    strayCodeTarget("/", params("code=abc&next=https%3A%2F%2Fjahat.example"), false),
    { pathname: "/auth/callback", search: "code=abc" },
  );
});

test("the callback itself is never redirected to itself", () => {
  assert.equal(strayCodeTarget("/auth/callback", params("code=abc&next=%2F"), false), null);
  assert.equal(strayCodeTarget("/auth/callback", params("code=abc"), true), null);
});

test("a request with no code is left alone", () => {
  assert.equal(strayCodeTarget("/get-started", params(""), false), null);
  assert.equal(strayCodeTarget("/get-started", params("all=1"), true), null);
});

test("somebody already signed in keeps their session and loses the spent code", () => {
  // Spending it again would fail and throw them back to /signin.
  assert.deepEqual(
    strayCodeTarget("/get-started", params("code=abc&all=1"), true),
    { pathname: "/get-started", search: "all=1" },
  );
  assert.deepEqual(
    strayCodeTarget("/", params("code=abc"), true),
    { pathname: "/", search: "" },
  );
});

test("a project website becomes a sized favicon request", () => {
  assert.equal(
    faviconUrl("https://swegrowth.id/program?tab=baru"),
    "https://www.google.com/s2/favicons?domain_url=https%3A%2F%2Fswegrowth.id&sz=128",
  );
});

test("missing, malformed, and non-web links keep the initials fallback", () => {
  for (const value of ["", "swegrowth.id", "javascript:alert(1)", "data:image/png,x", null]) {
    assert.equal(faviconUrl(value), "");
  }
});

test("a project logo accepts only ordinary web image URLs", () => {
  assert.equal(projectLogoUrl("https://flipcard.id/favicon.ico"), "https://flipcard.id/favicon.ico");
  for (const value of ["", "flipcard.id/logo.png", "data:image/png,x", "javascript:alert(1)"]) {
    assert.equal(projectLogoUrl(value), "");
  }
});

test("an origin keeps only its scheme, host, and port", () => {
  assert.equal(normalizeOrigin("https://builders.swegrowth.id/"), "https://builders.swegrowth.id");
  assert.equal(normalizeOrigin("  https://builders.swegrowth.id/get-started?a=1  "), "https://builders.swegrowth.id");
  assert.equal(normalizeOrigin("http://localhost:3000"), "http://localhost:3000");
});

test("anything that is not an ordinary web origin is refused", () => {
  for (const nonsense of ["", null, undefined, "builders.swegrowth.id", "javascript:alert(1)", "/get-started"]) {
    assert.equal(normalizeOrigin(nonsense), null, `${nonsense} bukan origin`);
  }
});

test("a configured site URL is where a sign-in starts", () => {
  assert.equal(
    pinnedOrigin({ NEXT_PUBLIC_SITE_URL: "https://builders.swegrowth.id/" }),
    "https://builders.swegrowth.id",
  );
  // Netlify's own primary address, and it wins over nothing else being set.
  assert.equal(
    pinnedOrigin({ CONTEXT: "production", URL: "https://ahsanproject-dev.netlify.app" }),
    "https://ahsanproject-dev.netlify.app",
  );
  assert.equal(
    pinnedOrigin({
      NEXT_PUBLIC_SITE_URL: "https://builders.swegrowth.id",
      CONTEXT: "production",
      URL: "https://ahsanproject-dev.netlify.app",
    }),
    "https://builders.swegrowth.id",
  );
});

test("a preview deploy and a laptop keep their own address", () => {
  // On a deploy preview Netlify still reports production in URL; pinning it
  // would send a reviewer to sign in on the live site instead.
  assert.equal(
    pinnedOrigin({ CONTEXT: "deploy-preview", URL: "https://builders.swegrowth.id" }),
    null,
  );
  assert.equal(pinnedOrigin({}), null);
  assert.equal(pinnedOrigin({ NEXT_PUBLIC_SITE_URL: "  " }), null);
});

test("a code left alone on the routes that spend it", () => {
  for (const home of ["/auth/callback", "/auth/confirm"]) {
    assert.equal(strayCodeTarget(home, params("code=abc&next=%2Fmulai"), false), null, home);
  }
});
