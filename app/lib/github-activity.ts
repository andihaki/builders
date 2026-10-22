import type { GitHubCommitSummaryRow, GitHubPullRequestRow } from "./database.types";

/**
 * The /activity feed: what members have been doing in open source, read from
 * GitHub by the refresh-github-activity Edge Function.
 *
 * Two kinds of entry. A pull request to somebody else's repository stands on
 * its own — that is the contribution the page exists to show. Work on a
 * member's own repositories is one summary line per person, so a busy week on
 * a side project does not bury everybody else.
 */

export type ActivityPerson = { id: string; username: string; name: string; handle: string };

export type PullRequestEntry = {
  kind: "pull_request";
  key: string;
  person: ActivityPerson;
  repo: string;
  url: string;
  number: number;
  title: string;
  state: "open" | "merged";
  /** When it was merged, or opened while it is still open: what the feed sorts by. */
  at: string;
};

export type CommitSummaryEntry = {
  kind: "commit_summary";
  key: string;
  person: ActivityPerson;
  commits: number;
  repos: { repo: string; commits: number }[];
  since: string;
  at: string;
};

export type GitHubActivityEntry = PullRequestEntry | CommitSummaryEntry;

export type GitHubActivityFilter = "all" | "merged" | "open";

export function isGitHubActivityFilter(value: string): value is GitHubActivityFilter {
  return value === "all" || value === "merged" || value === "open";
}

/** How many of a summary's repositories are named before "and N more". */
export const NAMED_REPOS = 2;

export function buildGitHubActivity(
  pullRequests: (GitHubPullRequestRow & { person: ActivityPerson | null })[],
  summaries: (GitHubCommitSummaryRow & { person: ActivityPerson | null })[],
): GitHubActivityEntry[] {
  const entries: GitHubActivityEntry[] = [];

  for (const row of pullRequests) {
    if (!row.person || (row.state !== "open" && row.state !== "merged")) continue;
    entries.push({
      kind: "pull_request",
      key: row.url,
      person: row.person,
      repo: row.repo,
      url: row.url,
      number: row.number,
      title: row.title,
      state: row.state,
      at: row.state === "merged" && row.merged_at ? row.merged_at : row.opened_at,
    });
  }

  for (const row of summaries) {
    if (!row.person || row.commits <= 0 || !Array.isArray(row.repos) || row.repos.length === 0) continue;
    entries.push({
      kind: "commit_summary",
      key: `commits:${row.user_id}`,
      person: row.person,
      commits: row.commits,
      repos: row.repos,
      since: row.since,
      at: row.last_commit_at ?? row.checked_at,
    });
  }

  return entries.sort((a, b) => b.at.localeCompare(a.at) || a.key.localeCompare(b.key));
}

/** The entries one filter keeps: commit summaries only belong to "all". */
export function filterGitHubActivity(entries: GitHubActivityEntry[], filter: GitHubActivityFilter): GitHubActivityEntry[] {
  if (filter === "all") return entries;
  return entries.filter((entry) => entry.kind === "pull_request" && entry.state === filter);
}

/** The short name a summary shows: `builders` for zikrulihsan/builders. */
export function repoName(repo: string): string {
  return repo.slice(repo.indexOf("/") + 1);
}

/** The entries of one member, by GitHub handle, case-blind; all of them for "". */
export function entriesOf(entries: GitHubActivityEntry[], handle: string): GitHubActivityEntry[] {
  const wanted = handle.toLowerCase();
  return wanted ? entries.filter((entry) => entry.person.handle.toLowerCase() === wanted) : entries;
}

/** Everybody on the page, most active first: the member filter's chips. */
export function activityPeople(entries: GitHubActivityEntry[]): { person: ActivityPerson; count: number }[] {
  const byHandle = new Map<string, { person: ActivityPerson; count: number }>();
  for (const entry of entries) {
    const key = entry.person.handle.toLowerCase();
    const found = byHandle.get(key) ?? { person: entry.person, count: 0 };
    found.count += entry.kind === "pull_request" ? 1 : 0;
    byHandle.set(key, found);
  }
  return [...byHandle.values()].sort((a, b) => b.count - a.count || a.person.name.localeCompare(b.person.name));
}

export type ActivityStats = { people: number; merged: number; open: number; repos: number };

/** The numbers at the top of the page: who, what landed, what is waiting, and where. */
export function activityStats(entries: GitHubActivityEntry[]): ActivityStats {
  const pullRequests = entries.filter((entry): entry is PullRequestEntry => entry.kind === "pull_request");
  return {
    people: new Set(entries.map((entry) => entry.person.id)).size,
    merged: pullRequests.filter((entry) => entry.state === "merged").length,
    open: pullRequests.filter((entry) => entry.state === "open").length,
    repos: new Set(pullRequests.map((entry) => entry.repo)).size,
  };
}

export type ActivityPeriod = "week" | "month" | "earlier";

/**
 * The feed in three runs — this week, this month, earlier — keeping the
 * order within each, and leaving out the runs with nothing in them. `now`
 * is passed in so the page and the tests agree on what "this week" is.
 */
export function groupByPeriod(entries: GitHubActivityEntry[], now: Date): { period: ActivityPeriod; entries: GitHubActivityEntry[] }[] {
  const week = now.getTime() - 7 * 86_400_000;
  const month = now.getTime() - 30 * 86_400_000;
  const groups: Record<ActivityPeriod, GitHubActivityEntry[]> = { week: [], month: [], earlier: [] };
  for (const entry of entries) {
    const at = Date.parse(entry.at);
    groups[at >= week ? "week" : at >= month ? "month" : "earlier"].push(entry);
  }
  return (["week", "month", "earlier"] as const).filter((period) => groups[period].length > 0).map((period) => ({ period, entries: groups[period] }));
}

/** The repository owner's GitHub picture, the same address the directory uses. */
export function ownerAvatar(repo: string, size = 40): string {
  return `https://github.com/${encodeURIComponent(repo.slice(0, repo.indexOf("/")))}.png?size=${size}`;
}
