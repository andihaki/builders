/**
 * Asking GitHub about many repositories in one request, and reading the answer.
 *
 * Pure — no Deno, no Supabase — so the Edge Function in index.ts and the
 * Node test suite (tests/repo-signals.test.mjs) share exactly this code.
 *
 * One GraphQL query carries, per repository, an aliased `repository` field
 * (stars, language, last push, archived) and an aliased `search` for pull
 * requests merged since a date. Forty repositories cost one request instead
 * of eighty REST calls.
 */

/** `owner/name`, lower-cased: how oss_repos already stores a repository. */
export type RepoKey = string;

/** One row of public.repo_signals, as the function writes it. */
export type RepoSignal = {
  repo: RepoKey;
  stars: number | null;
  language: string;
  description: string;
  pushed_at: string | null;
  archived: boolean;
  /** Merged PRs from outside the project in the window; null when GitHub did not say. */
  outside_prs: number | null;
  checked_at: string;
  last_error: string | null;
};

/** How many repositories go into one request. */
export const BATCH_SIZE = 40;

const REPO_KEY = /^[a-z0-9](?:[a-z0-9-]{0,38})\/[a-z0-9._-]{1,100}$/;

export function isRepoKey(value: string): value is RepoKey {
  return REPO_KEY.test(value);
}

/**
 * The repository a URL points at, as a key — the same narrow rule as
 * `parseGitHubRepositoryUrl` in the app: https, github.com, exactly
 * `owner/name`. Anything else is not a repository this job asks about.
 */
export function repoKeyFromUrl(value: string): RepoKey | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || (url.hostname !== "github.com" && url.hostname !== "www.github.com")) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length !== 2) return null;
    const key = `${parts[0]}/${parts[1].replace(/\.git$/i, "")}`.toLowerCase();
    return isRepoKey(key) ? key : null;
  } catch {
    return null;
  }
}

export function buildQuery(repos: RepoKey[], since: string): string {
  const fields = repos.map((repo, index) => {
    const [owner, name] = repo.split("/");
    const search = `repo:${repo} is:pr is:merged merged:>=${since}`;
    return `
  r${index}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) {
    stargazerCount
    description
    pushedAt
    isArchived
    primaryLanguage { name }
  }
  s${index}: search(type: ISSUE, first: 100, query: ${JSON.stringify(search)}) {
    nodes { ... on PullRequest { authorAssociation author { __typename } } }
  }`;
  });
  return `query {${fields.join("")}\n}`;
}

const INSIDE = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);

type RepositoryNode = {
  stargazerCount?: unknown;
  description?: unknown;
  pushedAt?: unknown;
  isArchived?: unknown;
  primaryLanguage?: { name?: unknown } | null;
} | null;

type SearchNode = { nodes?: Array<{ authorAssociation?: unknown; author?: { __typename?: unknown } | null } | null> } | null;

/**
 * One row per repository asked about. A repository GitHub could not find
 * comes back with `last_error` set and no numbers, so the caller can keep
 * whatever it knew before; a failed search leaves `outside_prs` null —
 * unknown, which the directory treats differently from none.
 */
export function parseResponse(
  repos: RepoKey[],
  body: { data?: Record<string, unknown> | null; errors?: Array<{ path?: unknown[]; message?: string }> },
  checkedAt: string,
): RepoSignal[] {
  const data = body.data ?? {};
  const errorFor = (alias: string) =>
    body.errors?.find((error) => Array.isArray(error.path) && error.path[0] === alias)?.message ?? null;

  return repos.map((repo, index) => {
    const node = data[`r${index}`] as RepositoryNode | undefined;
    const search = data[`s${index}`] as SearchNode | undefined;

    if (!node) {
      return {
        repo,
        stars: null,
        language: "",
        description: "",
        pushed_at: null,
        archived: false,
        outside_prs: null,
        checked_at: checkedAt,
        last_error: errorFor(`r${index}`) ?? "not found",
      };
    }

    const outside = search?.nodes
      ? search.nodes.filter(
          (pr) =>
            pr &&
            typeof pr.authorAssociation === "string" &&
            !INSIDE.has(pr.authorAssociation) &&
            pr.author?.__typename !== "Bot",
        ).length
      : null;

    return {
      repo,
      stars: typeof node.stargazerCount === "number" ? node.stargazerCount : null,
      language: typeof node.primaryLanguage?.name === "string" ? node.primaryLanguage.name : "",
      description: typeof node.description === "string" ? node.description.slice(0, 200) : "",
      pushed_at: typeof node.pushedAt === "string" ? node.pushedAt : null,
      archived: node.isArchived === true,
      outside_prs: outside,
      checked_at: checkedAt,
      last_error: outside === null ? errorFor(`s${index}`) ?? "search failed" : null,
    };
  });
}

export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let start = 0; start < items.length; start += size) chunks.push(items.slice(start, start + size));
  return chunks;
}
