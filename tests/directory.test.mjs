import assert from "node:assert/strict";
import test from "node:test";

import { badgeCounts, directoryFacets, filterDirectory, productEntries, repoEntry } from "../app/lib/directory.ts";
// Fixtures, not the catalogue: the catalogue lives in the database now.
const repo = (over = {}) => ({
  id: 1,
  owner: "acme",
  repo: "tool",
  list: "recommended",
  reasons: ["beginner-friendly"],
  why: "Maintainer-nya responsif.",
  summary: "A tool.",
  indonesian: false,
  starterLabel: "good first issue",
  status: "approved",
  submittedBy: { username: "ana", name: "Ana" },
  createdAt: "2026-10-21T00:00:00Z",
  ...over,
});
const OPEN_SOURCE_REPOS = [
  repo({ id: 1, owner: "zikrulihsan", repo: "builders", list: "internal", indonesian: false }),
  repo({ id: 2, owner: "vercel", repo: "next.js", reasons: ["our-stack"], stats: { stars: 9, description: "", openIssues: 0, language: "JavaScript", pushedAt: "", archived: false } }),
  repo({ id: 3, owner: "gojek", repo: "heimdall", indonesian: true, summary: "Bahasa Go HTTP client.", stats: { stars: 1, description: "", openIssues: 0, language: "Go", pushedAt: "", archived: false } }),
];

const describe = (project) => project.tagline;
const roleName = (role) => role.toUpperCase();

function product(overrides = {}) {
  return {
    id: 1,
    slug: "tool",
    title: "Tool",
    tagline: "Does a thing",
    repoUrl: "",
    openForGitHubContributions: false,
    openSeatCount: 0,
    openRoles: [],
    tags: [],
    owner: { name: "Ana" },
    ...overrides,
  };
}

test("a repo is on the GitHub path and goes straight to its starter issues", () => {
  const repo = OPEN_SOURCE_REPOS.find((entry) => entry.list === "internal");
  const entry = repoEntry({ ...repo, stats: { stars: 12, description: "", openIssues: 1, language: "Rust", pushedAt: "", archived: false } }, "en");
  assert.equal(entry.track, "github");
  assert.equal(entry.source, "internal");
  assert.equal(entry.language, "Rust");
  assert.equal(entry.stars, 12);
  assert.ok(entry.external);
  assert.match(entry.actionHref, /\/issues\?q=/);
  assert.equal(entry.why, "Maintainer-nya responsif.");
  assert.deepEqual(entry.submittedBy, { username: "ana", name: "Ana" });

  assert.equal(repoEntry(repo, "en").stars, null);
});

test("a product asking for nothing is left out of the directory", () => {
  assert.deepEqual(productEntries(product(), describe, roleName, "en"), []);
  // Saying "open to PRs" without a GitHub repository to send them to is not an invitation either.
  assert.deepEqual(productEntries(product({ openForGitHubContributions: true, repoUrl: "https://example.com" }), describe, roleName, "en"), []);
});

test("a product open to PRs is on the GitHub path, linking to its issues", () => {
  const [entry, ...rest] = productEntries(
    product({ openForGitHubContributions: true, repoUrl: "https://github.com/ana/tool" }),
    describe,
    roleName,
    "en",
  );
  assert.equal(rest.length, 0);
  assert.equal(entry.track, "github");
  assert.equal(entry.actionHref, "https://github.com/ana/tool/issues");
  assert.ok(entry.external);
});

test("a product with a GitHub repo is on the code path even before it opens to PRs", () => {
  const [entry, ...rest] = productEntries(product({ repoUrl: "https://github.com/ana/tool" }), describe, roleName, "en");
  assert.equal(rest.length, 0);
  assert.equal(entry.track, "github");
  assert.equal(entry.actionKind, "repo");
  assert.equal(entry.actionHref, "https://github.com/ana/tool");
  assert.deepEqual(entry.labels, []);

  const [open] = productEntries(
    product({ repoUrl: "https://github.com/ana/tool", openForGitHubContributions: true }),
    describe,
    roleName,
    "en",
  );
  assert.equal(open.actionKind, "issues");
  assert.deepEqual(open.labels, ["Open to PRs"]);
});

test("a product naming roles is on the role path, linking to its roles here", () => {
  const [entry, ...rest] = productEntries(product({ openSeatCount: 2, openRoles: ["design", "qa", "pm"] }), describe, roleName, "en");
  assert.equal(rest.length, 0);
  assert.equal(entry.track, "role");
  assert.equal(entry.actionHref, "/projects/tool?tab=collaboration#help-heading");
  assert.equal(entry.external, false);
  assert.deepEqual(entry.labels, ["DESIGN", "QA", "PM"]);
});

test("a product doing both is listed once on each path", () => {
  const entries = productEntries(
    product({ openForGitHubContributions: true, repoUrl: "https://github.com/ana/tool", openSeatCount: 1, openRoles: ["design"] }),
    describe,
    roleName,
    "en",
  );
  assert.deepEqual(entries.map((entry) => entry.track), ["github", "role"]);
  assert.equal(new Set(entries.map((entry) => entry.key)).size, 2);
});

test("one path at a time, narrowed by its chip and by search, keeping the given order", () => {
  const entries = [
    ...OPEN_SOURCE_REPOS.map((repo) => repoEntry(repo, "en")),
    ...productEntries(product({ openSeatCount: 1, openRoles: ["design"] }), describe, roleName, "en"),
  ];
  const none = { source: "", badge: "", facet: "", q: "" };
  assert.deepEqual(filterDirectory(entries, { ...none, track: "role" }).map((entry) => entry.name), ["Tool"]);
  assert.deepEqual(
    filterDirectory(entries, { ...none, track: "github" }).map((entry) => entry.name),
    OPEN_SOURCE_REPOS.map((repo) => repo.repo),
  );
  assert.deepEqual(filterDirectory(entries, { ...none, track: "github", facet: "go" }).map((entry) => entry.name), ["heimdall"]);
  assert.deepEqual(filterDirectory(entries, { ...none, track: "role", facet: "DESIGN" }).map((entry) => entry.name), ["Tool"]);
  assert.equal(filterDirectory(entries, { ...none, track: "role", facet: "QA" }).length, 0);
  assert.ok(filterDirectory(entries, { ...none, track: "github", q: "bahasa" }).length > 0);
  assert.equal(filterDirectory(entries, { ...none, track: "github", q: "nothing like this" }).length, 0);
  assert.deepEqual(
    filterDirectory(entries, { ...none, track: "github", source: "internal" }).map((entry) => entry.source),
    OPEN_SOURCE_REPOS.filter((repo) => repo.list === "internal").map(() => "internal"),
  );
});

test("chips are the languages on the code path and the roles on the role path", () => {
  const entries = [
    ...OPEN_SOURCE_REPOS.map((repo) => repoEntry(repo, "en")),
    ...productEntries(product({ openSeatCount: 1, openRoles: ["design", "qa"] }), describe, roleName, "en"),
    ...productEntries(product({ id: 2, slug: "two", openSeatCount: 1, openRoles: ["design"] }), describe, roleName, "en"),
  ];
  assert.deepEqual(directoryFacets(entries, "role"), [
    { value: "DESIGN", count: 2 },
    { value: "QA", count: 1 },
  ]);
  const languages = directoryFacets(entries, "github").map((facet) => facet.value);
  assert.ok(languages.includes("Go") && !languages.includes("DESIGN"));
});

test("badges come from the catalogue row and members' records, are filtered on, and counted per path", () => {
  const repos = [
    repo({ id: 11, repo: "a", indonesian: true }),
    repo({ id: 12, repo: "b", indonesian: true }),
    repo({ id: 13, repo: "c" }),
  ];
  const members = [{ username: "ana", name: "Ana", handle: "ana", contributions: [{ repo: "acme/b", relation: "contributor" }] }];
  const entries = repos.map((entry) => repoEntry(entry, "en", members));
  assert.deepEqual(entries[0].badges, [{ kind: "indonesian" }]);

  const none = { source: "", badge: "", facet: "", q: "" };
  assert.deepEqual(filterDirectory(entries, { ...none, track: "github", badge: "indonesian" }).map((e) => e.name), ["a", "b"]);
  assert.deepEqual(filterDirectory(entries, { ...none, track: "github", badge: "friend-contributed" }).map((e) => e.name), ["b"]);
  assert.deepEqual(badgeCounts(entries, "github"), [
    { kind: "friend-contributed", count: 1 },
    { kind: "indonesian", count: 2 },
  ]);
  assert.deepEqual(badgeCounts(entries, "role"), []);
});

test("a product's badges come from the hand-kept list by slug, and default to none", () => {
  const [entry] = productEntries(product({ slug: "not-in-the-list", openSeatCount: 1, openRoles: ["design"] }), describe, roleName, "en");
  assert.deepEqual(entry.badges, []);
});

test("a product's filled seats become its 'friends have been here' badge", () => {
  const [entry] = productEntries(
    product({ openSeatCount: 1, openRoles: ["design"], activeMemberCount: 3 }),
    describe,
    roleName,
    "en",
  );
  assert.deepEqual(entry.badges, [{ kind: "friend-contributed", count: 3 }]);
});

test("members' records reach a repo's row through the directory", () => {
  const next = OPEN_SOURCE_REPOS.find((entry) => entry.repo === "next.js");
  const members = [{ username: "ana", name: "Ana", handle: "ana", contributions: [{ repo: "vercel/next.js", relation: "contributor" }] }];
  const badge = repoEntry(next, "en", members).badges.find((entry) => entry.kind === "friend-contributed");
  assert.deepEqual(badge, { kind: "friend-contributed", people: ["ana"], count: 1, profiles: ["ana"] });
});
