import type { Badge } from "./badges";

/**
 * Members' own open source record, and the directory badges built from it.
 *
 * A member lists the repositories they have contributed to or maintain (the
 * `oss_contributions` table). The directory then reads, per repository, who
 * among us has been there — so "2 friends have contributed" and "maintainer
 * in our group" come from people's profiles rather than from somebody keeping
 * a list by hand. Hand-set badges in `badges.ts` still work alongside.
 *
 * Pure, so the unit tests read it directly.
 */

export const OSS_RELATIONS = ["contributor", "maintainer"] as const;
export type OssRelation = (typeof OSS_RELATIONS)[number];

export function isOssRelation(value: string): value is OssRelation {
  return (OSS_RELATIONS as readonly string[]).includes(value);
}

/** One row of somebody's record. */
export type OssContribution = {
  repo: string;
  relation: OssRelation;
  /** Typed in by the person, so theirs to remove. False for one GitHub alone vouches for. */
  manual?: boolean;
  /** A pull request of theirs was merged into it, as GitHub reports it. */
  verified?: boolean;
};

export type OssRow = { userId: string; repo: string; relation: OssRelation; manual: boolean; verified: boolean };

/**
 * The record a member typed in, joined with what GitHub vouches for — see
 * 20261027000100_github_contributions.sql. A repository in both is one row,
 * keeping the relation they chose and marked verified; one only GitHub knows
 * about comes after, as a contribution nobody typed and nobody can remove by
 * hand. Each person's typed order is kept.
 */
export function mergeOssRows(
  typed: { userId: string; repo: string; relation: OssRelation }[],
  merged: { userId: string; repo: string }[],
): OssRow[] {
  const verified = new Set(merged.map((row) => `${row.userId} ${row.repo}`));
  const rows: OssRow[] = typed.map((row) => ({ ...row, manual: true, verified: verified.has(`${row.userId} ${row.repo}`) }));
  const known = new Set(rows.map((row) => `${row.userId} ${row.repo}`));
  for (const row of merged) {
    const key = `${row.userId} ${row.repo}`;
    if (known.has(key)) continue;
    known.add(key);
    rows.push({ userId: row.userId, repo: row.repo, relation: "contributor", manual: false, verified: true });
  }
  return rows;
}

/** A member as the badges need them: who they are here, and on GitHub. */
export type OssMember = {
  username: string;
  name: string;
  /** Their GitHub username, or empty when their profile has none. */
  handle: string;
  contributions: OssContribution[];
};

const HANDLE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const REPO_NAME = /^[a-z0-9._-]{1,100}$/i;

export function isGitHubHandle(value: string): boolean {
  return HANDLE.test(value);
}

/**
 * The GitHub username in whatever a person typed into their profile.
 *
 * The profile form stores a URL, but older rows hold a bare handle or an
 * `@handle`. Anything that is not plainly a GitHub account reads as none.
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

/**
 * `owner/name`, lower-cased, from either that or a GitHub URL — including a
 * URL to a pull request or a file inside the repository, since that is often
 * what somebody has open when they think of it. Null for anything else.
 */
export function parseRepoRef(value: string): string | null {
  const raw = value.trim().replace(/\.git$/i, "").replace(/\/+$/, "");
  if (!raw) return null;

  let parts: string[];
  if (/^(https?:\/\/)?(www\.)?github\.com\//i.test(raw)) {
    try {
      const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      parts = url.pathname.split("/").filter(Boolean).slice(0, 2);
    } catch {
      return null;
    }
  } else {
    parts = raw.split("/");
  }

  if (parts.length !== 2) return null;
  const [owner, name] = parts;
  if (!HANDLE.test(owner) || !REPO_NAME.test(name) || name === "." || name === "..") return null;
  return `${owner}/${name}`.toLowerCase();
}

/** Where anybody can check a claim: that person's pull requests on that repo. */
export function contributionEvidenceUrl(repo: string, handle: string): string {
  const query = `is:pr author:${handle}`;
  return `https://github.com/${repo}/pulls?q=${encodeURIComponent(query)}`;
}

/**
 * The badges a repository earns from members' records.
 *
 *   - `friend-contributed` — members who list it as contributors;
 *   - `in-our-group` — members who list it as maintainers, or whose GitHub
 *     username owns the repository outright.
 *
 * A member without a GitHub username on their profile still counts, but has
 * no face to show; the badge links to their profile here either way.
 */
export function memberBadges(repo: string, members: OssMember[]): Badge[] {
  const key = repo.toLowerCase();
  const owner = key.split("/")[0];
  const contributors: OssMember[] = [];
  const maintainers: OssMember[] = [];

  for (const member of members) {
    const row = member.contributions.find((contribution) => contribution.repo === key);
    const owns = member.handle !== "" && member.handle.toLowerCase() === owner;
    if (row?.relation === "maintainer" || owns) maintainers.push(member);
    else if (row) contributors.push(member);
  }

  const badge = (kind: Badge["kind"], people: OssMember[]): Badge => ({
    kind,
    people: people.map((member) => member.handle).filter(Boolean),
    count: people.length,
    profiles: people.map((member) => member.username),
  });

  return [
    ...(contributors.length > 0 ? [badge("friend-contributed", contributors)] : []),
    ...(maintainers.length > 0 ? [badge("in-our-group", maintainers)] : []),
  ];
}

/**
 * Hand-set badges and member-derived ones, one per kind.
 *
 * Where both say the same kind, the people are merged and the count is the
 * larger of the two, so a hand-written list and a member's own record do not
 * double-count the same person.
 */
export function mergeBadges(manual: Badge[], derived: Badge[]): Badge[] {
  const byKind = new Map<Badge["kind"], Badge>();
  for (const badge of [...manual, ...derived]) {
    const current = byKind.get(badge.kind);
    if (!current) {
      byKind.set(badge.kind, { ...badge });
      continue;
    }
    const people = [...new Set([...(current.people ?? []), ...(badge.people ?? [])])];
    const profiles = [...new Set([...(current.profiles ?? []), ...(badge.profiles ?? [])])];
    byKind.set(badge.kind, {
      kind: badge.kind,
      people,
      profiles,
      count: Math.max(people.length, current.count ?? 0, badge.count ?? 0),
    });
  }
  return [...byKind.values()];
}
