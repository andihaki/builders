import { isActivityScope, isGitHubActivityFilter, type ActivityQuery, type ActivityScope } from "./github-activity";

/**
 * /activity's address, both ways: what a URL asks for, and the URL for a
 * set of filters. Shared by the page on the server (the header's return
 * address) and the feed in the browser, which filters without a round trip —
 * the same arrangement as directory-url.ts.
 */

export type ActivityFilters = ActivityQuery & { scope: ActivityScope };

type Query = Record<string, string | string[] | undefined> | URLSearchParams;

const HANDLE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const REPO_KEY = /^[a-z0-9](?:[a-z0-9-]{0,38})\/[a-z0-9._-]{1,100}$/;

function read(query: Query, key: string): string {
  const value = query instanceof URLSearchParams ? query.get(key) : query[key];
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function readActivityFilters(query: Query): ActivityFilters {
  const kind = read(query, "show");
  const scope = read(query, "scope");
  const member = read(query, "member").trim();
  const repo = read(query, "repo").trim().toLowerCase();
  return {
    // Contributions unless asked otherwise: what the page is for.
    scope: isActivityScope(scope) ? scope : "external",
    kind: isGitHubActivityFilter(kind) ? kind : "all",
    member: HANDLE.test(member) ? member : "",
    repo: REPO_KEY.test(repo) ? repo : "",
    q: read(query, "q").slice(0, 100),
  };
}

/** The page asked for; the feed clamps it to the pages there are. */
export function readActivityPage(query: Query): number {
  const page = Number(read(query, "page"));
  return Number.isInteger(page) && page > 1 ? page : 1;
}

/** The address for a set of filters; changing any of them goes back to page one. */
export function activityPath(filters: Partial<ActivityFilters>, page = 1): string {
  const params = new URLSearchParams();
  if (filters.scope && filters.scope !== "external") params.set("scope", filters.scope);
  if (filters.kind && filters.kind !== "all") params.set("show", filters.kind);
  if (filters.member) params.set("member", filters.member);
  if (filters.repo) params.set("repo", filters.repo);
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return `/activity${search ? `?${search}` : ""}`;
}
