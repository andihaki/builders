import assert from "node:assert/strict";
import test from "node:test";

import { SEED_REPOS, repoBadges, starterIssuesUrl, toOpenSourceRepo, validateRepoSubmission } from "../app/lib/open-source.ts";

const input = (over = {}) => ({
  repo: "https://github.com/Acme/Tool/pull/12",
  list: "recommended",
  reasons: ["beginner-friendly", "beginner-friendly", "made-up"],
  why: "  Maintainer-nya   responsif dan isu pemula dilabeli rapi.  ",
  summary: "",
  indonesian: true,
  starterLabel: "",
  ...over,
});

test("a submission is normalised: repo slug, known reasons once, tidy text, a default starter label", () => {
  const result = validateRepoSubmission(input());
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    repo: "acme/tool",
    list: "recommended",
    reasons: ["beginner-friendly"],
    why: "Maintainer-nya responsif dan isu pemula dilabeli rapi.",
    summary: "",
    indonesian: true,
    starterLabel: "good first issue",
  });
});

test("a submission without a repo, a list, or a reason comes back with a sentence per field", () => {
  const result = validateRepoSubmission(input({ repo: "not a repo", list: "ours", reasons: [], why: "bagus" }), "id");
  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result.errors).sort(), ["list", "reasons", "repo", "why"]);

  const long = validateRepoSubmission(input({ why: "x".repeat(281), summary: "y".repeat(161) }));
  assert.deepEqual(Object.keys(long.errors).sort(), ["summary", "why"]);
});

test("a database row becomes a repo, and a malformed one is dropped", () => {
  const row = {
    id: 3,
    repo: "acme/tool",
    list: "internal",
    reasons: ["local-impact", "nonsense"],
    why: "Milik kita.",
    summary: "",
    indonesian: false,
    starter_label: "help wanted",
    status: "approved",
    created_at: "2026-10-21T00:00:00Z",
    submitter: { username: "ana", name: "Ana" },
  };
  const repo = toOpenSourceRepo(row);
  assert.equal(repo.owner, "acme");
  assert.equal(repo.repo, "tool");
  assert.deepEqual(repo.reasons, ["local-impact"]);
  assert.equal(repo.starterLabel, "help wanted");
  assert.deepEqual(repo.submittedBy, { username: "ana", name: "Ana" });

  assert.equal(toOpenSourceRepo({ ...row, list: "elsewhere" }), null);
  assert.equal(toOpenSourceRepo({ ...row, status: "maybe" }), null);
  assert.equal(toOpenSourceRepo({ ...row, repo: "noslash" }), null);
});

test("the only built-in repo is this site's own, and only Indonesian maintainers make a hand-set badge", () => {
  assert.deepEqual(SEED_REPOS.map((repo) => `${repo.owner}/${repo.repo}`), ["zikrulihsan/builders"]);
  assert.deepEqual(repoBadges({ indonesian: true }), [{ kind: "indonesian" }]);
  assert.deepEqual(repoBadges({ indonesian: false }), []);
});

test("the starter link lands on the repo's labelled open issues", () => {
  const url = new URL(starterIssuesUrl({ owner: "acme", repo: "tool", starterLabel: "good first issue" }));
  assert.equal(url.origin + url.pathname, "https://github.com/acme/tool/issues");
  assert.equal(url.searchParams.get("q"), 'is:issue is:open label:"good first issue"');
  assert.equal(
    new URL(starterIssuesUrl({ owner: "acme", repo: "tool", starterLabel: "" })).searchParams.get("q"),
    "is:issue is:open",
  );
});

test("reasons are what a submission needs now; the free text may be left out", () => {
  const result = validateRepoSubmission(input({ why: "", reasons: ["responsive-maintainers", "easy-setup"] }));
  assert.equal(result.ok, true);
  assert.deepEqual(result.value.reasons, ["responsive-maintainers", "easy-setup"]);
  assert.equal(result.value.why, "");
  // Only unknown reasons is the same as none.
  assert.equal(validateRepoSubmission(input({ why: "", reasons: ["made-up"] })).ok, false);
});
