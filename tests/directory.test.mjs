import assert from "node:assert/strict";
import test from "node:test";

import {
  badgeCounts,
  directoryFacets,
  filterDirectory,
  openingCounts,
  prTier,
  prTierCounts,
  productEntries,
  repoEntry,
} from "../app/lib/directory.ts";
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
  // Our own repositories count as the community's, alongside members' products.
  assert.equal(entry.source, "community");
  assert.equal(entry.kind, "repo");
  assert.equal(entry.welcomesPRs, true);
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
  assert.equal(entry.welcomesPRs, false);

  const [open] = productEntries(
    product({ repoUrl: "https://github.com/ana/tool", openForGitHubContributions: true }),
    describe,
    roleName,
    "en",
  );
  assert.equal(open.actionKind, "issues");
  assert.equal(open.welcomesPRs, true);
});

test("a product's code-path row carries GitHub's details and its name opens the repo", () => {
  const stats = { stars: 42, description: "From GitHub", openIssues: 3, language: "TypeScript", pushedAt: "", archived: false };
  const [entry] = productEntries(
    product({ repoUrl: "https://github.com/ana/tool", openSeatCount: 1, openRoles: ["design"], repoStats: stats }),
    describe,
    roleName,
    "en",
  );
  assert.equal(entry.href, "https://github.com/ana/tool");
  assert.deepEqual(entry.links.map((link) => link.label), ["ana/tool"]);
  assert.deepEqual(entry.alsoWanted, { roles: ["DESIGN"], href: "/projects/tool?tab=collaboration#help-heading" });
  assert.equal(entry.language, "TypeScript");
  assert.equal(entry.stars, 42);
  assert.equal(entry.description, "Does a thing");

  // The role-path row of the same product still opens its page here.
  const [, role] = productEntries(product({ repoUrl: "https://github.com/ana/tool", openSeatCount: 1, openRoles: ["design"] }), describe, roleName, "en");
  assert.equal(role.href, "/projects/tool");
  assert.equal(role.alsoWanted, undefined);
  // It still shows where the code lives, as a link with GitHub's mark.
  assert.deepEqual(role.links, [{ kind: "github", href: "https://github.com/ana/tool", label: "ana/tool" }]);

  // GitHub's description fills in when the product has none; no stats leaves the numbers empty.
  const [bare] = productEntries(product({ tagline: "", repoUrl: "https://github.com/ana/tool", repoStats: stats }), describe, roleName, "en");
  assert.equal(bare.description, "From GitHub");
  const [unknown] = productEntries(product({ repoUrl: "https://github.com/ana/tool" }), describe, roleName, "en");
  assert.equal(unknown.stars, null);
  assert.equal(unknown.language, "");
});

test("a product's website is a link and its logo rides along; a repo shows its owner's avatar", () => {
  const [entry] = productEntries(
    product({ openSeatCount: 1, openRoles: ["design"], liveUrl: "https://www.tool.example/app", logoUrl: "https://cdn.example/logo.png" }),
    describe,
    roleName,
    "en",
  );
  assert.deepEqual(entry.links, [{ kind: "website", href: "https://www.tool.example/app", label: "tool.example" }]);
  assert.equal(entry.logoUrl, "https://cdn.example/logo.png");
  assert.equal(entry.website, "https://www.tool.example/app");

  // Anything that is not an ordinary web address is not offered as one.
  const [unsafe] = productEntries(product({ openSeatCount: 1, openRoles: ["design"], liveUrl: "javascript:alert(1)" }), describe, roleName, "en");
  assert.deepEqual(unsafe.links, []);

  // GitHub's generic Octocat is no logo: the owner's avatar stands in when there is no website either.
  const [octocat] = productEntries(
    product({ repoUrl: "https://github.com/ana/tool", logoUrl: "https://github.githubassets.com/assets/pinned-octocat.svg" }),
    describe,
    roleName,
    "en",
  );
  assert.equal(octocat.logoUrl, "https://github.com/ana.png?size=80");

  const repo = OPEN_SOURCE_REPOS[0];
  assert.equal(repoEntry(repo, "en").logoUrl, `https://github.com/${repo.owner}.png?size=80`);
});

test("a product taking both PRs and people says so on both paths, and can be filtered by either", () => {
  const both = productEntries(
    product({ repoUrl: "https://github.com/ana/tool", openForGitHubContributions: true, openSeatCount: 1, openRoles: ["design"] }),
    describe,
    roleName,
    "en",
  );
  const codeOnly = productEntries(product({ id: 2, slug: "two", repoUrl: "https://github.com/ana/two" }), describe, roleName, "en");
  const rolesOnly = productEntries(product({ id: 3, slug: "three", openSeatCount: 1, openRoles: ["qa"] }), describe, roleName, "en");
  const entries = [...both, ...codeOnly, ...rolesOnly];

  assert.ok(both.every((entry) => entry.welcomesPRs && entry.hasOpenRoles && entry.kind === "product"));
  const none = { source: "", badge: "", facet: "", q: "" };
  assert.deepEqual(filterDirectory(entries, { ...none, track: "github", open: "prs" }).map((e) => e.name), ["Tool"]);
  assert.deepEqual(filterDirectory(entries, { ...none, track: "github", open: "roles" }).map((e) => e.name), ["Tool"]);
  assert.deepEqual(filterDirectory(entries, { ...none, track: "role", open: "prs" }).map((e) => e.name), ["Tool"]);

  // A filter is offered only where it narrows: every role-path entry has open roles,
  // and on the code path pull requests are filtered by tier instead.
  assert.deepEqual(openingCounts(entries, "github"), [{ open: "roles", count: 1 }]);
  assert.deepEqual(openingCounts(entries, "role"), [{ open: "prs", count: 1 }]);
});

const DAY = 86_400_000;
const NOW = Date.parse("2026-10-19T00:00:00Z");
const pushed = (daysAgo) => ({ pushedAt: new Date(NOW - daysAgo * DAY).toISOString(), archived: false });
const asked = (outsidePRs) => ({ outsidePRs, checkedAt: NOW });

test("a repo's PR tier is measured on GitHub, not taken from the checkbox", () => {
  assert.equal(prTier(true, pushed(1), asked(210)), "active");
  assert.equal(prTier(true, pushed(41), asked(0)), "first");
  assert.equal(prTier(true, pushed(41), asked(null)), "open", "unknown is not the same as none");
  assert.equal(prTier(true, undefined, undefined), "open");
  assert.equal(prTier(false, pushed(1), asked(210)), "unopened");
  // Ticked five years ago and untouched since is not an invitation.
  assert.equal(prTier(true, pushed(1719), asked(0)), "inactive");
  assert.equal(prTier(true, pushed(121), asked(3)), "inactive");
  assert.equal(prTier(true, pushed(119), asked(3)), "active");
  assert.equal(prTier(true, { pushedAt: pushed(1).pushedAt, archived: true }, asked(9)), "inactive");
});

test("the code path ranks by PR tier and offers the tiers as a filter", () => {
  const make = (id, slug, extra) =>
    productEntries(product({ id, slug, title: slug, repoUrl: `https://github.com/ana/${slug}`, ...extra }), describe, roleName, "en")[0];
  const entries = [
    make(1, "closed", {}),
    make(2, "dead", { openForGitHubContributions: true, repoStats: pushed(500), repoActivity: asked(0) }),
    make(3, "waiting", { openForGitHubContributions: true, repoStats: pushed(3), repoActivity: asked(0) }),
    make(4, "busy", { openForGitHubContributions: true, repoStats: pushed(3), repoActivity: asked(4) }),
  ];
  const none = { source: "", badge: "", facet: "", q: "" };

  assert.deepEqual(filterDirectory(entries, { ...none, track: "github" }).map((e) => e.name), ["busy", "waiting", "closed", "dead"]);
  assert.deepEqual(filterDirectory(entries, { ...none, track: "github", pr: "first" }).map((e) => e.name), ["waiting"]);
  assert.deepEqual(prTierCounts(entries).map(({ tier }) => tier), ["active", "first", "unopened", "inactive"]);
  assert.deepEqual(prTierCounts([entries[0]]), [], "one tier for everything is no filter");

  // Not taking PRs: still listed for its code, but the button opens the repo, not the issues.
  assert.equal(entries[0].actionKind, "repo");
  assert.equal(entries[1].actionKind, "repo");
  assert.equal(entries[3].actionKind, "issues");
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
    filterDirectory(entries, { ...none, track: "github", source: "recommended" }).map((entry) => entry.source),
    OPEN_SOURCE_REPOS.filter((repo) => repo.list === "recommended").map(() => "recommended"),
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
