import type { GitHubCommitSummaryRow, GitHubPullRequestRow } from "./database.types";

/**
 * The /activity feed: what members have been doing in open source, read from
 * GitHub by the refresh-github-activity Edge Function.
 *
 * Two kinds of entry. Pull requests come one entry per person, repository,
 * state and day, so a busy afternoon on one project is one line with its PRs
 * under it rather than a screenful. Commits to a member's own repositories are
 * one summary line per person, so a busy week on a side project does not bury
 * everybody else.
 *
 * And two scopes, toggled like the directory's local and global: pull
 * requests to somebody else's repository — the contributions the page exists
 * to show, and what it opens on — and a member's own work, on their own or
 * their organisation's repositories.
 */

export type ActivityPerson = { id: string; username: string; name: string; handle: string };

export type PullRequestItem = {
  url: string;
  number: number;
  title: string;
  /** When it was merged, or opened while it is still open. */
  at: string;
};

export type PullRequestEntry = {
  kind: "pull_request";
  key: string;
  person: ActivityPerson;
  repo: string;
  /**
   * The day's first pull request: what reactions are left on. Later ones that
   * day join the entry without moving its reactions.
   */
  url: string;
  state: "open" | "merged";
  /** Newest first; at least one. */
  pullRequests: PullRequestItem[];
  /** The newest pull request's time: what the feed sorts by. */
  at: string;
  /** To the member's own or their organisation's repository: their own work. */
  own: boolean;
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

/**
 * Whose repositories: other people's (contributions), the member's own, or
 * both. In the toggle's order; the page opens on "external".
 */
export const ACTIVITY_SCOPES = ["all", "external", "own"] as const;
export type ActivityScope = (typeof ACTIVITY_SCOPES)[number];

export function isActivityScope(value: string): value is ActivityScope {
  return (ACTIVITY_SCOPES as readonly string[]).includes(value);
}

export function scopeOf(entry: GitHubActivityEntry): Exclude<ActivityScope, "all"> {
  return entry.kind === "commit_summary" || entry.own ? "own" : "external";
}

/** How many entries each scope shows. */
export function scopeCounts(entries: GitHubActivityEntry[]): Record<ActivityScope, number> {
  const counts: Record<ActivityScope, number> = { all: entries.length, external: 0, own: 0 };
  for (const entry of entries) counts[scopeOf(entry)] += 1;
  return counts;
}

/** The entries one scope shows. */
export function inScope(entries: GitHubActivityEntry[], scope: ActivityScope): GitHubActivityEntry[] {
  return scope === "all" ? entries : entries.filter((entry) => scopeOf(entry) === scope);
}

function kindOf(entry: GitHubActivityEntry): Exclude<GitHubActivityFilter, "all"> {
  return entry.kind === "commit_summary" ? "commits" : entry.state;
}

export function buildGitHubActivity(
  pullRequests: (GitHubPullRequestRow & { person: ActivityPerson | null })[],
  summaries: (GitHubCommitSummaryRow & { person: ActivityPerson | null })[],
  timeZone = "Asia/Jakarta",
): GitHubActivityEntry[] {
  const entries: GitHubActivityEntry[] = [];

  const groups = new Map<string, { person: ActivityPerson; repo: string; state: "open" | "merged"; own: boolean; items: PullRequestItem[] }>();
  for (const row of pullRequests) {
    if (!row.person || (row.state !== "open" && row.state !== "merged")) continue;
    const at = row.state === "merged" && row.merged_at ? row.merged_at : row.opened_at;
    const group = `${row.person.id} ${row.repo} ${row.state} ${dayKey(at, timeZone)}`;
    const found = groups.get(group) ?? { person: row.person, repo: row.repo, state: row.state, own: row.own === true, items: [] };
    found.items.push({ url: row.url, number: row.number, title: row.title, at });
    groups.set(group, found);
  }
  for (const { person, repo, state, own, items } of groups.values()) {
    items.sort((a, b) => b.at.localeCompare(a.at) || b.number - a.number);
    const first = items[items.length - 1];
    entries.push({ kind: "pull_request", key: first.url, person, repo, url: first.url, state, own, pullRequests: items, at: items[0].at });
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
    const titles = entry.kind === "pull_request" ? entry.pullRequests.map((pr) => pr.title) : [];
    const haystack = [...titles, ...reposOf(entry), entry.person.name, entry.person.handle]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

/** How many pull requests an entry stands for; none for a commit summary. */
function pullRequestCount(entry: GitHubActivityEntry): number {
  return entry.kind === "pull_request" ? entry.pullRequests.length : 0;
}

/** How many entries of each kind, for the sidebar: what each filter lists. */
export function kindCounts(entries: GitHubActivityEntry[]): Record<GitHubActivityFilter, number> {
  const counts: Record<GitHubActivityFilter, number> = { all: entries.length, merged: 0, open: 0, commits: 0 };
  for (const entry of entries) counts[kindOf(entry)] += 1;
  return counts;
}

/** Repositories pull requests went to, most first: the sidebar's repository group. */
export function activityRepos(entries: GitHubActivityEntry[]): { repo: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const entry of entries) if (entry.kind === "pull_request") counts.set(entry.repo, (counts.get(entry.repo) ?? 0) + pullRequestCount(entry));
  return [...counts].map(([repo, count]) => ({ repo, count })).sort((a, b) => b.count - a.count || a.repo.localeCompare(b.repo));
}

/** Everybody on the page, most active first: the member filter's chips. */
export function activityPeople(entries: GitHubActivityEntry[]): { person: ActivityPerson; count: number }[] {
  const byHandle = new Map<string, { person: ActivityPerson; count: number }>();
  for (const entry of entries) {
    const key = entry.person.handle.toLowerCase();
    const found = byHandle.get(key) ?? { person: entry.person, count: 0 };
    found.count += pullRequestCount(entry);
    byHandle.set(key, found);
  }
  return [...byHandle.values()].sort((a, b) => b.count - a.count || a.person.name.localeCompare(b.person.name));
}

export type ActivityStats = { people: number; merged: number; open: number; repos: number };

/**
 * The numbers at the top of the page: who, what landed, what is waiting, and
 * where. Contributions only, whichever scope is showing: a member's own
 * repositories are not open source they gave to.
 */
export function activityStats(entries: GitHubActivityEntry[]): ActivityStats {
  const pullRequests = entries.filter((entry): entry is PullRequestEntry => entry.kind === "pull_request" && !entry.own);
  return {
    people: new Set(entries.map((entry) => entry.person.id)).size,
    merged: pullRequests.filter((entry) => entry.state === "merged").reduce((sum, entry) => sum + pullRequestCount(entry), 0),
    open: pullRequests.filter((entry) => entry.state === "open").reduce((sum, entry) => sum + pullRequestCount(entry), 0),
    repos: new Set(pullRequests.map((entry) => entry.repo)).size,
  };
}

/** The repository owner's GitHub picture, the same address the directory uses. */
export function ownerAvatar(repo: string, size = 40): string {
  return `https://github.com/${encodeURIComponent(repo.slice(0, repo.indexOf("/")))}.png?size=${size}`;
}

/** A calendar day as `YYYY-MM-DD` in the given time zone. */
export function dayKey(at: string | Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(at));
}

/**
 * The timeline's days, newest first, keeping the order within each. Days are
 * counted where the members live — WIB by default — not in the server's UTC,
 * so an evening merge in Jakarta lands on that evening's day.
 */
export function groupByDay(
  entries: GitHubActivityEntry[],
  timeZone = "Asia/Jakarta",
): { day: string; entries: GitHubActivityEntry[] }[] {
  const days: { day: string; entries: GitHubActivityEntry[] }[] = [];
  for (const entry of entries) {
    const day = dayKey(entry.at, timeZone);
    const last = days[days.length - 1];
    if (last?.day === day) last.entries.push(entry);
    else days.push({ day, entries: [entry] });
  }
  return days;
}
