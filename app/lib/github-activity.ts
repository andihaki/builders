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

/** What kind of entry: a merged PR, one in review, or work on one's own repositories. */
export type GitHubActivityFilter = "all" | "merged" | "open" | "commits";

export function isGitHubActivityFilter(value: string): value is GitHubActivityFilter {
  return value === "all" || value === "merged" || value === "open" || value === "commits";
}

function kindOf(entry: GitHubActivityEntry): Exclude<GitHubActivityFilter, "all"> {
  return entry.kind === "commit_summary" ? "commits" : entry.state;
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

/** The short name a summary shows: `builders` for zikrulihsan/builders. */
export function repoName(repo: string): string {
  return repo.slice(repo.indexOf("/") + 1);
}

export type ActivityQuery = { kind: GitHubActivityFilter; member: string; repo: string; q: string };

/** The repositories an entry touches: its PR's, or every one in a summary. */
function reposOf(entry: GitHubActivityEntry): string[] {
  return entry.kind === "pull_request" ? [entry.repo] : entry.repos.map((each) => each.repo);
}

/**
 * The feed as the sidebar and the search box ask for it. Each part narrows on
 * its own; empty means "any". The search reads the PR's title, the
 * repositories and the person's name and handle.
 */
export function queryActivity(entries: GitHubActivityEntry[], query: ActivityQuery): GitHubActivityEntry[] {
  const member = query.member.toLowerCase();
  const needle = query.q.trim().toLowerCase();
  return entries.filter((entry) => {
    if (query.kind !== "all" && kindOf(entry) !== query.kind) return false;
    if (member && entry.person.handle.toLowerCase() !== member) return false;
    if (query.repo && !reposOf(entry).includes(query.repo)) return false;
    if (!needle) return true;
    const haystack = [entry.kind === "pull_request" ? entry.title : "", ...reposOf(entry), entry.person.name, entry.person.handle]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

/** How many entries of each kind, for the sidebar. */
export function kindCounts(entries: GitHubActivityEntry[]): Record<GitHubActivityFilter, number> {
  const counts: Record<GitHubActivityFilter, number> = { all: entries.length, merged: 0, open: 0, commits: 0 };
  for (const entry of entries) counts[kindOf(entry)] += 1;
  return counts;
}

/** Repositories pull requests went to, most first: the sidebar's repository group. */
export function activityRepos(entries: GitHubActivityEntry[]): { repo: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const entry of entries) if (entry.kind === "pull_request") counts.set(entry.repo, (counts.get(entry.repo) ?? 0) + 1);
  return [...counts].map(([repo, count]) => ({ repo, count })).sort((a, b) => b.count - a.count || a.repo.localeCompare(b.repo));
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

/** The repository owner's GitHub picture, the same address the directory uses. */
export function ownerAvatar(repo: string, size = 40): string {
  return `https://github.com/${encodeURIComponent(repo.slice(0, repo.indexOf("/")))}.png?size=${size}`;
}
