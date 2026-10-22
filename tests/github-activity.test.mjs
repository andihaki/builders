import test from "node:test";
import assert from "node:assert/strict";
import {
  BATCH_SIZE,
  buildQuery,
  chunk,
  githubHandle,
  parseResponse,
} from "../supabase/functions/refresh-github-activity/activity.ts";
import { buildGitHubActivity, queryActivity } from "../app/lib/github-activity.ts";
import { githubHandle as appGithubHandle } from "../app/lib/oss.ts";

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

test("the feed puts newest first, and the sidebar and search narrow it", () => {
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
  const any = { kind: "all", member: "", repo: "", q: "" };
  assert.deepEqual(queryActivity(entries, { ...any, kind: "merged" }).map((entry) => entry.key), ["https://github.com/org/tool/pull/7"]);
  assert.deepEqual(queryActivity(entries, { ...any, kind: "open" }).map((entry) => entry.key), ["https://github.com/org/tool/pull/8"]);
  assert.deepEqual(queryActivity(entries, { ...any, kind: "commits" }).map((entry) => entry.key), [`commits:${ana.id}`]);
  assert.deepEqual(queryActivity(entries, { ...any, repo: "ana/side" }).map((entry) => entry.key), [`commits:${ana.id}`]);
  assert.deepEqual(queryActivity(entries, { ...any, q: "DOCS" }).map((entry) => entry.key), ["https://github.com/org/tool/pull/8"]);
});

test("the page's numbers and the sidebar's groups come from the same entries", async () => {
  const { activityPeople, activityRepos, activityStats, kindCounts } = await import("../app/lib/github-activity.ts");
  const ana = { id: "a", username: "ana", name: "Ana", handle: "Ana" };
  const budi = { id: "b", username: "budi", name: "Budi", handle: "budi" };
  const pr = (key, person, repo, state, at) => ({ kind: "pull_request", key, person, repo, url: key, number: 1, title: "", state, at });
  const entries = [
    pr("1", ana, "org/a", "merged", "2026-10-21T00:00:00Z"),
    pr("2", ana, "org/b", "open", "2026-10-10T00:00:00Z"),
    pr("3", budi, "org/a", "merged", "2026-08-01T00:00:00Z"),
    { kind: "commit_summary", key: "c", person: budi, commits: 4, repos: [], since: "", at: "2026-10-20T00:00:00Z" },
  ];
  assert.deepEqual(activityStats(entries), { people: 2, merged: 2, open: 1, repos: 2 });
  assert.deepEqual(kindCounts(entries), { all: 4, merged: 2, open: 1, commits: 1 });
  assert.deepEqual(activityRepos(entries), [{ repo: "org/a", count: 2 }, { repo: "org/b", count: 1 }]);
  assert.deepEqual(activityPeople(entries).map(({ person, count }) => [person.handle, count]), [["Ana", 2], ["budi", 1]]);
});

test("merged pull requests become lasting contributions and pending suggestions", async () => {
  const { contributionsFrom, suggestionsFrom } = await import("../supabase/functions/refresh-github-activity/activity.ts");
  const pr = (repo, number, state, merged_at) => ({
    url: `https://github.com/${repo}/pull/${number}`, user_id: "u", repo, number, title: "", state, opened_at: "2026-10-01T00:00:00Z", merged_at, checked_at: "",
  });
  const prs = [
    pr("org/a", 2, "merged", "2026-10-10T00:00:00Z"),
    pr("org/a", 1, "merged", "2026-10-05T00:00:00Z"),
    pr("org/b", 3, "open", null),
    pr("org/c", 4, "merged", "2026-10-20T00:00:00Z"),
  ];
  // org/c was first merged long ago, before the 90-day window: that stays.
  const stored = [{ user_id: "u", repo: "org/c", first_merged_at: "2026-01-01T00:00:00Z", last_merged_at: "2026-02-01T00:00:00Z" }];
  assert.deepEqual(contributionsFrom(prs, stored), [
    { user_id: "u", repo: "org/c", first_merged_at: "2026-01-01T00:00:00Z", last_merged_at: "2026-10-20T00:00:00Z" },
    { user_id: "u", repo: "org/a", first_merged_at: "2026-10-05T00:00:00Z", last_merged_at: "2026-10-10T00:00:00Z" },
  ]);
  assert.deepEqual(suggestionsFrom(prs, "ana"), [
    { repo: "org/a", why: "PR dari @ana sudah di-merge: https://github.com/org/a/pull/1", submitted_by: "u" },
    { repo: "org/c", why: "PR dari @ana sudah di-merge: https://github.com/org/c/pull/4", submitted_by: "u" },
  ]);
});

test("the timeline groups by day in WIB, not in the server's UTC", async () => {
  const { dayKey, groupByDay } = await import("../app/lib/github-activity.ts");
  // 18:00 UTC is already the next day in Jakarta.
  assert.equal(dayKey("2026-10-21T18:00:00Z", "Asia/Jakarta"), "2026-10-22");
  assert.equal(dayKey("2026-10-21T16:00:00Z", "Asia/Jakarta"), "2026-10-21");
  const at = (key, when) => ({ kind: "pull_request", key, at: when });
  const days = groupByDay([at("a", "2026-10-22T03:00:00Z"), at("b", "2026-10-21T18:00:00Z"), at("c", "2026-10-21T10:00:00Z")]);
  assert.deepEqual(days.map(({ day, entries }) => [day, entries.map((entry) => entry.key)]), [["2026-10-22", ["a", "b"]], ["2026-10-21", ["c"]]]);
});
