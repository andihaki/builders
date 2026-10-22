/**
 * Asking GitHub what members have been doing in open source, and reading the
 * answer.
 *
 * Pure — no Deno, no Supabase — so the Edge Function in index.ts and the Node
 * test suite (tests/github-activity.test.mjs) share exactly this code, the
 * same arrangement as refresh-repos/signals.ts.
 *
 * One GraphQL query carries, per member, an aliased `user` field (commits per
 * repository in the window, for the summary of their own repositories) and an
 * aliased `search` for their public pull requests updated in the window. Ten
 * members cost one request.
 */

/** How many members go into one request. */
export const BATCH_SIZE = 10;
/** Pull requests updated in this many days are asked about. */
export const PULL_REQUEST_DAYS = 90;
/** Commits to a member's own repositories are summed over this many days. */
export const COMMIT_DAYS = 30;

/** One row of public.github_pull_requests, as the function writes it. */
export type PullRequestRow = {
  url: string;
  user_id: string;
  repo: string;
  number: number;
  title: string;
  state: "open" | "merged";
  opened_at: string;
  merged_at: string | null;
  checked_at: string;
};

/** One row of public.github_commit_summaries. */
export type CommitSummaryRow = {
  user_id: string;
  commits: number;
  /** Most commits first. */
  repos: { repo: string; commits: number }[];
  last_commit_at: string | null;
  since: string;
  checked_at: string;
};

export type Member = { id: string; handle: string };

/** What GitHub said about one member; `found: false` when the account does not exist. */
export type MemberActivity =
  | { member: Member; found: false }
  | {
      member: Member;
      found: true;
      pullRequests: PullRequestRow[];
      summary: CommitSummaryRow | null;
      /** The pull request search failed: keep the rows already stored rather than clearing them. */
      searchFailed: boolean;
    };

const HANDLE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const REPO_KEY = /^[a-z0-9](?:[a-z0-9-]{0,38})\/[a-z0-9._-]{1,100}$/;

/**
 * The GitHub username in a profile's github field — the same rule as
 * `githubHandle` in app/lib/oss.ts, which this function cannot import: a URL
 * to exactly one GitHub account, a bare handle, or an `@handle`.
 */
export function githubHandle(value: string): string {
  const raw = value.trim().replace(/^@/, "");
  if (!raw) return "";
  if (HANDLE.test(raw)) return raw;

  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (url.hostname !== "github.com" && url.hostname !== "www.github.com") return "";
    const parts = url.pathname.split("/").filter(Boolean);
    return parts.length === 1 && HANDLE.test(parts[0]) ? parts[0] : "";
  } catch {
    return "";
  }
}

export function daysAgo(days: number, now: Date): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}

export function buildQuery(members: Member[], now: Date): string {
  const commitsSince = daysAgo(COMMIT_DAYS, now);
  const prsSince = daysAgo(PULL_REQUEST_DAYS, now).slice(0, 10);

  const fields = members.map(({ handle }, index) => {
    // `is:public`: the function's token may be able to see private
    // repositories, and nothing private belongs on a public page.
    const search = `is:pr is:public author:${handle} updated:>=${prsSince}`;
    return `
  u${index}: user(login: ${JSON.stringify(handle)}) {
    login
    contributionsCollection(from: ${JSON.stringify(commitsSince)}) {
      commitContributionsByRepository(maxRepositories: 25) {
        repository { nameWithOwner isPrivate owner { login } }
        contributions(first: 1, orderBy: { field: OCCURRED_AT, direction: DESC }) { totalCount nodes { occurredAt } }
      }
    }
  }
  p${index}: search(type: ISSUE, first: 50, query: ${JSON.stringify(search)}) {
    nodes {
      ... on PullRequest {
        url number title state createdAt mergedAt
        repository { nameWithOwner isPrivate owner { login } }
      }
    }
  }`;
  });
  return `query {${fields.join("")}\n}`;
}

type Repository = { nameWithOwner?: unknown; isPrivate?: unknown; owner?: { login?: unknown } | null } | null | undefined;

type UserNode = {
  login?: unknown;
  contributionsCollection?: {
    commitContributionsByRepository?: Array<{
      repository?: Repository;
      contributions?: { totalCount?: unknown; nodes?: Array<{ occurredAt?: unknown } | null> | null } | null;
    } | null> | null;
  } | null;
} | null;

type PullRequestNode = {
  url?: unknown;
  number?: unknown;
  title?: unknown;
  state?: unknown;
  createdAt?: unknown;
  mergedAt?: unknown;
  repository?: Repository;
} | null;

/** `owner/name`, lower-cased, for a public repository; null otherwise. */
function publicRepo(repository: Repository): { key: string; owner: string } | null {
  if (!repository || repository.isPrivate !== false) return null;
  const key = String(repository.nameWithOwner ?? "").toLowerCase();
  if (!REPO_KEY.test(key)) return null;
  return { key, owner: String(repository.owner?.login ?? "").toLowerCase() };
}

/**
 * Splits what GitHub said into the two kinds of row.
 *
 * Pull requests to somebody else's repository are kept one by one: open, or
 * merged in the window; one closed without merging is dropped. Work on the
 * member's own repositories is folded into a single commit summary instead,
 * so a busy week on a side project reads as one line rather than a page.
 * A search that failed comes back as no pull requests, and the caller keeps
 * what it had — the same caution as refresh-repos.
 */
export function parseResponse(
  members: Member[],
  body: { data?: Record<string, unknown> | null; errors?: Array<{ path?: unknown[]; message?: string }> },
  now: Date,
): MemberActivity[] {
  const data = body.data ?? {};
  const checkedAt = now.toISOString();
  const prsSince = Date.parse(daysAgo(PULL_REQUEST_DAYS, now));
  const failed = (alias: string) =>
    body.errors?.some((error) => Array.isArray(error.path) && error.path[0] === alias) ?? false;

  return members.map((member, index) => {
    const user = data[`u${index}`] as UserNode | undefined;
    if (!user) return { member, found: false };
    const login = String(user.login ?? member.handle).toLowerCase();

    const pullRequests: PullRequestRow[] = [];
    const search = data[`p${index}`] as { nodes?: PullRequestNode[] | null } | null | undefined;
    for (const node of failed(`p${index}`) ? [] : search?.nodes ?? []) {
      if (!node) continue;
      const repo = publicRepo(node.repository);
      if (!repo || repo.owner === login) continue;
      const url = String(node.url ?? "");
      const number = Number(node.number);
      const openedAt = String(node.createdAt ?? "");
      if (!url.startsWith("https://github.com/") || !Number.isInteger(number) || !openedAt) continue;

      const mergedAt = typeof node.mergedAt === "string" ? node.mergedAt : null;
      if (node.state === "MERGED" && mergedAt && Date.parse(mergedAt) >= prsSince) {
        pullRequests.push(row(member, repo.key, url, number, node.title, "merged", openedAt, mergedAt, checkedAt));
      } else if (node.state === "OPEN") {
        pullRequests.push(row(member, repo.key, url, number, node.title, "open", openedAt, null, checkedAt));
      }
    }

    const own: { repo: string; commits: number }[] = [];
    let lastCommitAt: string | null = null;
    for (const entry of user.contributionsCollection?.commitContributionsByRepository ?? []) {
      const repo = publicRepo(entry?.repository);
      const commits = Number(entry?.contributions?.totalCount ?? 0);
      if (!repo || repo.owner !== login || !Number.isInteger(commits) || commits <= 0) continue;
      own.push({ repo: repo.key, commits });
      const latest = entry?.contributions?.nodes?.[0]?.occurredAt;
      if (typeof latest === "string" && (!lastCommitAt || latest > lastCommitAt)) lastCommitAt = latest;
    }
    own.sort((a, b) => b.commits - a.commits || a.repo.localeCompare(b.repo));

    const summary: CommitSummaryRow | null =
      own.length === 0
        ? null
        : {
            user_id: member.id,
            commits: own.reduce((sum, entry) => sum + entry.commits, 0),
            repos: own,
            last_commit_at: lastCommitAt,
            since: daysAgo(COMMIT_DAYS, now).slice(0, 10),
            checked_at: checkedAt,
          };

    return { member, found: true, pullRequests, summary, searchFailed: failed(`p${index}`) };
  });
}

function row(
  member: Member,
  repo: string,
  url: string,
  number: number,
  title: unknown,
  state: "open" | "merged",
  openedAt: string,
  mergedAt: string | null,
  checkedAt: string,
): PullRequestRow {
  return {
    url,
    user_id: member.id,
    repo,
    number,
    title: String(title ?? "").slice(0, 300),
    state,
    opened_at: openedAt,
    merged_at: mergedAt,
    checked_at: checkedAt,
  };
}

export function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let start = 0; start < items.length; start += size) batches.push(items.slice(start, start + size));
  return batches;
}

/** One row of public.github_contributions. */
export type ContributionRow = { user_id: string; repo: string; first_merged_at: string; last_merged_at: string };

/**
 * The member's merged pull requests folded into one row per repository, kept
 * against what is already stored: the first merge stays the earliest ever
 * seen even after it has left the 90-day window, the last moves forward.
 */
export function contributionsFrom(pullRequests: PullRequestRow[], stored: ContributionRow[]): ContributionRow[] {
  const byRepo = new Map(stored.map((row) => [row.repo, { ...row }]));
  for (const pr of pullRequests) {
    if (pr.state !== "merged" || !pr.merged_at) continue;
    const row = byRepo.get(pr.repo);
    if (!row) {
      byRepo.set(pr.repo, { user_id: pr.user_id, repo: pr.repo, first_merged_at: pr.merged_at, last_merged_at: pr.merged_at });
      continue;
    }
    if (pr.merged_at < row.first_merged_at) row.first_merged_at = pr.merged_at;
    if (pr.merged_at > row.last_merged_at) row.last_merged_at = pr.merged_at;
  }
  return [...byRepo.values()];
}

/**
 * A repository put forward to the catalogue because a member's pull request
 * was merged into it — pending, for an admin to approve, with the evidence
 * as its reason. One per repository: the earliest merge stands for it.
 */
export function suggestionsFrom(pullRequests: PullRequestRow[], handle: string): { repo: string; why: string; submitted_by: string }[] {
  const first = new Map<string, PullRequestRow>();
  for (const pr of pullRequests) {
    if (pr.state !== "merged" || !pr.merged_at) continue;
    const seen = first.get(pr.repo);
    if (!seen || pr.merged_at < (seen.merged_at ?? "")) first.set(pr.repo, pr);
  }
  return [...first.values()].map((pr) => ({
    repo: pr.repo,
    // oss_repos_why_length: 10 to 280 characters.
    why: `PR dari @${handle} sudah di-merge: ${pr.url}`.slice(0, 280),
    submitted_by: pr.user_id,
  }));
}
