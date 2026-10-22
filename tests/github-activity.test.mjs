import test from "node:test";
import assert from "node:assert/strict";
import {
  BATCH_SIZE,
  buildQuery,
  chunk,
  githubHandle,
  parseResponse,
} from "../supabase/functions/refresh-github-activity/activity.ts";
import { buildGitHubActivity, filterGitHubActivity } from "../app/lib/github-activity.ts";
import { githubHandle as appGithubHandle } from "../app/lib/oss.ts";
import { GITHUB_ACTIVITY, hiddenFrom } from "../app/lib/activity.ts";

const now = new Date("2026-10-22T00:00:00.000Z");
const ana = { id: "00000000-0000-4000-8000-000000000001", handle: "ana" };
const budi = { id: "00000000-0000-4000-8000-000000000002", handle: "budi" };

test("the function reads a profile's GitHub field by the same rule as the app", () => {
  for (const value of ["https://github.com/Ana-Dev", "@ana", "ana", "github.com/ana", "https://gitlab.com/ana", "https://github.com/ana/repo", ""]) {
    assert.equal(githubHandle(value), appGithubHandle(value), value);
  }
});

test("one query asks about every member, public pull requests only, names quoted safely", () => {
  const query = buildQuery([ana, budi], now);
  assert.match(query, /u0: user\(login: "ana"\)/);
  assert.match(query, /u1: user\(login: "budi"\)/);
  assert.match(query, /contributionsCollection\(from: "2026-09-22T00:00:00.000Z"\)/);
  assert.match(query, /p1: search\(type: ISSUE, first: 50, query: "is:pr is:public author:budi updated:>=2026-07-24"\)/);
});

test("pull requests to other people's repos are kept; own repos become one commit summary", () => {
  const [activity] = parseResponse(
    [ana],
    {
      data: {
        u0: {
          login: "Ana",
          contributionsCollection: {
            commitContributionsByRepository: [
              { repository: { nameWithOwner: "ana/side", isPrivate: false, owner: { login: "ana" } }, contributions: { totalCount: 3, nodes: [{ occurredAt: "2026-10-20T00:00:00Z" }] } },
              { repository: { nameWithOwner: "Ana/Blog", isPrivate: false, owner: { login: "Ana" } }, contributions: { totalCount: 9, nodes: [{ occurredAt: "2026-10-18T00:00:00Z" }] } },
              { repository: { nameWithOwner: "ana/secret", isPrivate: true, owner: { login: "ana" } }, contributions: { totalCount: 50, nodes: [] } },
              { repository: { nameWithOwner: "org/tool", isPrivate: false, owner: { login: "org" } }, contributions: { totalCount: 4, nodes: [] } },
            ],
          },
        },
        p0: {
          nodes: [
            { url: "https://github.com/org/tool/pull/7", number: 7, title: "Fix crash", state: "MERGED", createdAt: "2026-10-01T00:00:00Z", mergedAt: "2026-10-02T00:00:00Z", repository: { nameWithOwner: "Org/Tool", isPrivate: false, owner: { login: "Org" } } },
            { url: "https://github.com/org/tool/pull/8", number: 8, title: "Add docs", state: "OPEN", createdAt: "2026-10-10T00:00:00Z", mergedAt: null, repository: { nameWithOwner: "org/tool", isPrivate: false, owner: { login: "org" } } },
            { url: "https://github.com/org/tool/pull/9", number: 9, title: "Abandoned", state: "CLOSED", createdAt: "2026-10-10T00:00:00Z", mergedAt: null, repository: { nameWithOwner: "org/tool", isPrivate: false, owner: { login: "org" } } },
            { url: "https://github.com/ana/side/pull/1", number: 1, title: "Own repo", state: "MERGED", createdAt: "2026-10-10T00:00:00Z", mergedAt: "2026-10-11T00:00:00Z", repository: { nameWithOwner: "ana/side", isPrivate: false, owner: { login: "ana" } } },
            { url: "https://github.com/org/old/pull/2", number: 2, title: "Merged long ago", state: "MERGED", createdAt: "2026-01-01T00:00:00Z", mergedAt: "2026-01-02T00:00:00Z", repository: { nameWithOwner: "org/old", isPrivate: false, owner: { login: "org" } } },
          ],
        },
      },
    },
    now,
  );

  assert.equal(activity.found, true);
  assert.deepEqual(
    activity.pullRequests.map((row) => [row.repo, row.number, row.state, row.merged_at]),
    [
      ["org/tool", 7, "merged", "2026-10-02T00:00:00Z"],
      ["org/tool", 8, "open", null],
    ],
  );
  assert.equal(activity.pullRequests[0].user_id, ana.id);
  assert.deepEqual(activity.summary, {
    user_id: ana.id,
    commits: 12,
    repos: [
      { repo: "ana/blog", commits: 9 },
      { repo: "ana/side", commits: 3 },
    ],
    last_commit_at: "2026-10-20T00:00:00Z",
    since: "2026-09-22",
    checked_at: now.toISOString(),
  });
});

test("an unknown account and a failed search are told apart from an empty answer", () => {
  const [missing, failed, quiet] = parseResponse(
    [ana, budi, { id: "00000000-0000-4000-8000-000000000003", handle: "cici" }],
    {
      data: {
        u0: null,
        u1: { login: "budi", contributionsCollection: { commitContributionsByRepository: [] } },
        p1: null,
        u2: { login: "cici", contributionsCollection: { commitContributionsByRepository: [] } },
        p2: { nodes: [] },
      },
      errors: [{ path: ["u0"], message: "Could not resolve to a User" }, { path: ["p1"], message: "timeout" }],
    },
    now,
  );
  assert.equal(missing.found, false);
  assert.equal(failed.found && failed.searchFailed, true);
  assert.equal(quiet.found && quiet.searchFailed, false);
  assert.equal(quiet.found && quiet.summary, null);
});

test("members go to GitHub in batches", () => {
  const members = Array.from({ length: BATCH_SIZE * 2 + 1 }, (_, index) => ({ id: String(index), handle: `m${index}` }));
  assert.deepEqual(chunk(members, BATCH_SIZE).map((batch) => batch.length), [BATCH_SIZE, BATCH_SIZE, 1]);
});

test("the feed puts newest first and filters keep summaries out of merged and open", () => {
  const person = { id: ana.id, username: "ana", name: "Ana", handle: "ana" };
  const entries = buildGitHubActivity(
    [
      { url: "https://github.com/org/tool/pull/7", user_id: ana.id, repo: "org/tool", number: 7, title: "Fix", state: "merged", opened_at: "2026-10-01T00:00:00Z", merged_at: "2026-10-05T00:00:00Z", checked_at: "", person },
      { url: "https://github.com/org/tool/pull/8", user_id: ana.id, repo: "org/tool", number: 8, title: "Docs", state: "open", opened_at: "2026-10-03T00:00:00Z", merged_at: null, checked_at: "", person },
      { url: "https://github.com/org/tool/pull/9", user_id: "gone", repo: "org/tool", number: 9, title: "No person", state: "open", opened_at: "2026-10-09T00:00:00Z", merged_at: null, checked_at: "", person: null },
    ],
    [{ user_id: ana.id, commits: 4, repos: [{ repo: "ana/side", commits: 4 }], last_commit_at: "2026-10-04T00:00:00Z", since: "2026-09-22", checked_at: "", person }],
  );

  assert.deepEqual(entries.map((entry) => entry.key), [
    "https://github.com/org/tool/pull/7",
    `commits:${ana.id}`,
    "https://github.com/org/tool/pull/8",
  ]);
  assert.deepEqual(filterGitHubActivity(entries, "merged").map((entry) => entry.key), ["https://github.com/org/tool/pull/7"]);
  assert.deepEqual(filterGitHubActivity(entries, "open").map((entry) => entry.key), ["https://github.com/org/tool/pull/8"]);
});

test("the visibility form can hide GitHub activity alongside the trail kinds", () => {
  assert.ok(hiddenFrom(["project_created"]).includes(GITHUB_ACTIVITY));
  assert.ok(!hiddenFrom(["project_created", GITHUB_ACTIVITY]).includes(GITHUB_ACTIVITY));
  // A kind this build does not know about is still left alone.
  assert.ok(hiddenFrom([GITHUB_ACTIVITY], ["from_the_future"]).includes("from_the_future"));
});
