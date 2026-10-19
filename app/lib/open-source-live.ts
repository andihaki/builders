import { listCatalogue, listRepoSignals, type RepoSignals } from "./data";
import type { GitHubRepositoryStats } from "./github";
import type { RepoActivity } from "./directory";
import { repoSlug, type OpenSourceRepo } from "./open-source";

export type LiveRepo = OpenSourceRepo & { stats: GitHubRepositoryStats | null; activity: RepoActivity | null };

/**
 * One repository's GitHub facts from the signals already read, or nothing
 * yet — a repository listed since the last refresh simply shows no numbers
 * and plain "Accepting PRs" until the Edge Function has been round.
 */
export function signalsFor(signals: Record<string, RepoSignals>, owner: string, repo: string): RepoSignals | null {
  return signals[`${owner}/${repo}`.toLowerCase()] ?? null;
}

/**
 * The approved catalogue with GitHub's numbers attached — from the database,
 * not from GitHub: see listRepoSignals and supabase/functions/refresh-repos.
 */
export async function listOpenSourceRepos(signals?: Record<string, RepoSignals>): Promise<LiveRepo[]> {
  const [catalogue, known] = await Promise.all([listCatalogue(), signals ?? listRepoSignals()]);

  return catalogue.map((repo) => {
    const found = signalsFor(known, repo.owner, repo.repo);
    return {
      ...repo,
      // The submitter's line wins; GitHub's description fills in when they
      // left it empty.
      summary: repo.summary || found?.stats?.description || "",
      stats: found?.stats ?? null,
      activity: found?.activity ?? null,
    };
  });
}

export { repoSlug };
