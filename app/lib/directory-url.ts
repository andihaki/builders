import { isBadgeKind } from "./badges";
import {
  isDirectoryOpening,
  isDirectorySource,
  isDirectoryTrack,
  isPRTier,
  type DirectoryFilters,
} from "./directory";

/**
 * The directory's address, both ways: what a URL asks for, and the URL for a
 * set of filters. Shared by the page on the server (the header's return
 * address) and the list in the browser, which filters without a round trip.
 */

type Query = Record<string, string | string[] | undefined> | URLSearchParams;

export function one(value: string | string[] | null | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function read(query: Query, key: string): string {
  return query instanceof URLSearchParams ? one(query.get(key)) : one(query[key]);
}

/**
 * What the URL asks for. Software engineers are who the site is for first,
 * so with no choice made the GitHub path is the one showing.
 */
export function readFilters(query: Query): DirectoryFilters {
  const track = read(query, "track");
  const source = read(query, "source");
  const badge = read(query, "badge");
  const open = read(query, "open");
  const pr = read(query, "pr");
  return {
    track: isDirectoryTrack(track) ? track : "github",
    source: isDirectorySource(source) ? source : "",
    open: isDirectoryOpening(open) ? open : "",
    pr: isPRTier(pr) ? pr : "",
    badge: isBadgeKind(badge) ? badge : "",
    facet: read(query, "facet").slice(0, 60),
    q: read(query, "q").slice(0, 100),
  };
}

/** The page lives beside the filters; every filter link leaves it out, so a change starts from page one. */
export function readPage(query: Query): string {
  return read(query, "page");
}

export function pathFor(filters: DirectoryFilters, page = 1): string {
  const params = new URLSearchParams();
  if (filters.track !== "github") params.set("track", filters.track);
  if (filters.source) params.set("source", filters.source);
  if (filters.open) params.set("open", filters.open);
  if (filters.pr) params.set("pr", filters.pr);
  if (filters.badge) params.set("badge", filters.badge);
  if (filters.facet) params.set("facet", filters.facet);
  if (filters.q) params.set("q", filters.q);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return `/${search ? `?${search}` : ""}`;
}
