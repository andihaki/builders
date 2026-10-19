import type { Badge } from "./badges";
import { tx, type Locale } from "./locale";
import { parseRepoRef } from "./oss";

/**
 * The open source repositories the directory lists.
 *
 * They live in the `oss_repos` table (20261021000000_oss_catalogue.sql), not
 * in code: any member can put a repository forward from /recommend — one of
 * their own, or one they vouch for — and a site admin approves it on /admin
 * before the directory shows it. Every listing therefore says who put it
 * forward and why, in their own words; nothing here is made up to fill space.
 *
 * Two lists:
 *
 *   - `internal` — repositories we maintain. Somebody opening a PR here gets a
 *     reviewer who knows them, which is the easiest first PR there is.
 *   - `recommended` — somebody else's repositories that one of us vouches for.
 *
 * Pure: types, labels, and the rules a submission must meet, shared by the
 * form, the server action, and the tests.
 */

export const REPO_LISTS = ["internal", "recommended"] as const;
export type RepoList = (typeof REPO_LISTS)[number];

/**
 * Why a repository earned its place, from a short closed set so the directory
 * can show it as a tag. The submission's `why` says the rest in words. Kept in
 * step with the `oss_repos_reasons` check constraint.
 */
export const REPO_REASONS = ["our-stack", "beginner-friendly", "local-impact"] as const;
export type RepoReason = (typeof REPO_REASONS)[number];

export const REPO_STATUSES = ["pending", "approved", "rejected"] as const;
export type RepoStatus = (typeof REPO_STATUSES)[number];

/** The ceilings the table's check constraints also enforce. */
export const REPO_LIMITS = { whyMin: 10, why: 280, summary: 160, starterLabel: 50 } as const;

export type OpenSourceRepo = {
  id: number;
  owner: string;
  repo: string;
  list: RepoList;
  reasons: RepoReason[];
  /** Why it is listed, in the submitter's words. */
  why: string;
  /** What it is, in one line. Empty falls back to GitHub's description. */
  summary: string;
  /** Hand-set: its maintainers are Indonesian. */
  indonesian: boolean;
  /** The label its maintainers use for starter issues. */
  starterLabel: string;
  status: RepoStatus;
  /** Who put it forward; null for the seeded row or a deleted account. */
  submittedBy: { username: string; name: string } | null;
  createdAt: string;
};

/**
 * What the directory falls back to with no database configured, so local
 * development still has a row to look at: this site's own repository, which
 * is a fact rather than a recommendation.
 */
export const SEED_REPOS: OpenSourceRepo[] = [
  {
    id: 0,
    owner: "zikrulihsan",
    repo: "builders",
    list: "internal",
    reasons: ["beginner-friendly"],
    why: "Repo milik kita sendiri. Reviewer-nya teman sendiri, jadi PR pertamamu dibaca orang yang kenal kamu.",
    summary: "Direktori project yang bisa dikontribusikan. Next.js + Supabase, MIT.",
    indonesian: false,
    starterLabel: "good first issue",
    status: "approved",
    submittedBy: null,
    createdAt: "2026-10-21T00:00:00Z",
  },
];

const REASON_LABELS: Record<RepoReason, { id: string; en: string }> = {
  "our-stack": { id: "Stack yang kami pakai", en: "Part of our stack" },
  "beginner-friendly": { id: "Ramah pemula", en: "Beginner friendly" },
  "local-impact": { id: "Berdampak lokal", en: "Local impact" },
};

export function isRepoList(value: string): value is RepoList {
  return (REPO_LISTS as readonly string[]).includes(value);
}

export function isRepoReason(value: string): value is RepoReason {
  return (REPO_REASONS as readonly string[]).includes(value);
}

export function isRepoStatus(value: string): value is RepoStatus {
  return (REPO_STATUSES as readonly string[]).includes(value);
}

export function repoSlug(repo: Pick<OpenSourceRepo, "owner" | "repo">): string {
  return `${repo.owner}/${repo.repo}`;
}

export function repoUrl(repo: Pick<OpenSourceRepo, "owner" | "repo">): string {
  return `https://github.com/${repo.owner}/${repo.repo}`;
}

/**
 * Where somebody starts: the open issues carrying the repo's starter label.
 * A repo without labelled issues still lands on its issue list, which is a
 * better first page than the README for somebody who came here to contribute.
 */
export function starterIssuesUrl(repo: Pick<OpenSourceRepo, "owner" | "repo" | "starterLabel">): string {
  const query = repo.starterLabel
    ? `is:issue is:open label:"${repo.starterLabel}"`
    : "is:issue is:open";
  return `${repoUrl(repo)}/issues?q=${encodeURIComponent(query)}`;
}

export function reasonLabel(reason: RepoReason, locale: Locale): string {
  const label = REASON_LABELS[reason];
  return tx(locale, label.id, label.en);
}

export function listLabel(list: RepoList, locale: Locale): string {
  return list === "internal"
    ? tx(locale, "Open source kami", "Our open source")
    : tx(locale, "Rekomendasi", "Recommended");
}

export function statusLabel(status: RepoStatus, locale: Locale): string {
  if (status === "approved") return tx(locale, "Disetujui", "Approved");
  if (status === "rejected") return tx(locale, "Ditolak", "Rejected");
  return tx(locale, "Menunggu review", "Awaiting review");
}

/** The hand-set badges a catalogue row carries. */
export function repoBadges(repo: Pick<OpenSourceRepo, "indonesian">): Badge[] {
  return repo.indonesian ? [{ kind: "indonesian" }] : [];
}

/** A database row, as the rest of the app reads it. */
export function toOpenSourceRepo(row: {
  id: number;
  repo: string;
  list: string;
  reasons: string[] | null;
  why: string;
  summary: string;
  indonesian: boolean;
  starter_label: string;
  status: string;
  created_at: string;
  submitter?: { username: string; name: string } | null;
}): OpenSourceRepo | null {
  const [owner, name] = row.repo.split("/");
  if (!owner || !name || !isRepoList(row.list) || !isRepoStatus(row.status)) return null;
  return {
    id: row.id,
    owner,
    repo: name,
    list: row.list,
    reasons: (row.reasons ?? []).filter(isRepoReason),
    why: row.why,
    summary: row.summary,
    indonesian: row.indonesian,
    starterLabel: row.starter_label,
    status: row.status,
    submittedBy: row.submitter ?? null,
    createdAt: row.created_at,
  };
}

export type RepoSubmission = {
  repo: string;
  list: RepoList;
  reasons: RepoReason[];
  why: string;
  summary: string;
  indonesian: boolean;
  starterLabel: string;
};

export type RepoSubmissionInput = {
  repo: string;
  list: string;
  reasons: string[];
  why: string;
  summary: string;
  indonesian: boolean;
  starterLabel: string;
};

export type RepoSubmissionResult =
  | { ok: true; value: RepoSubmission }
  | { ok: false; errors: Partial<Record<"repo" | "list" | "why" | "summary" | "starterLabel", string>> };

/**
 * A submission as it may be written, or a sentence per field saying why not.
 *
 * The same ceilings as the table's check constraints, so a mistake comes back
 * as words rather than a constraint error.
 */
export function validateRepoSubmission(input: RepoSubmissionInput, locale: Locale = "en"): RepoSubmissionResult {
  const errors: Partial<Record<"repo" | "list" | "why" | "summary" | "starterLabel", string>> = {};
  const repo = parseRepoRef(input.repo);
  const why = input.why.trim().replace(/\s+/g, " ");
  const summary = input.summary.trim().replace(/\s+/g, " ");
  const starterLabel = input.starterLabel.trim() || "good first issue";

  if (!repo) {
    errors.repo = tx(locale, "Tulis sebagai owner/repo atau tempel URL GitHub-nya.", "Write it as owner/repo or paste its GitHub URL.");
  }
  if (!isRepoList(input.list)) {
    errors.list = tx(locale, "Pilih: repo milik kita atau rekomendasi.", "Choose: one of ours, or a recommendation.");
  }
  if (why.length < REPO_LIMITS.whyMin) {
    errors.why = tx(locale, "Ceritakan alasannya, minimal satu kalimat pendek.", "Say why, in at least a short sentence.");
  } else if (why.length > REPO_LIMITS.why) {
    errors.why = tx(locale, `Maksimal ${REPO_LIMITS.why} karakter.`, `At most ${REPO_LIMITS.why} characters.`);
  }
  if (summary.length > REPO_LIMITS.summary) {
    errors.summary = tx(locale, `Maksimal ${REPO_LIMITS.summary} karakter.`, `At most ${REPO_LIMITS.summary} characters.`);
  }
  if (starterLabel.length > REPO_LIMITS.starterLabel) {
    errors.starterLabel = tx(locale, `Maksimal ${REPO_LIMITS.starterLabel} karakter.`, `At most ${REPO_LIMITS.starterLabel} characters.`);
  }

  if (!repo || Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      repo,
      list: input.list as RepoList,
      reasons: [...new Set(input.reasons.filter(isRepoReason))],
      why,
      summary,
      indonesian: input.indonesian,
      starterLabel,
    },
  };
}
