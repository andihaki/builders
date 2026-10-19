import { cacheLife } from "next/cache";
import { listCatalogue } from "./data";
import { getGitHubRepositoryStats, type GitHubRepositoryStats } from "./github";
import { repoSlug, type OpenSourceRepo } from "./open-source";

export type LiveRepo = OpenSourceRepo & { stats: GitHubRepositoryStats | null };

/**
 * One repository's numbers from GitHub, cached for hours and shared by every
 * visitor.
 *
 * Cached per repository rather than with the catalogue, so approving a repo
 * on /admin shows it at once while its stars keep their longer life.
 * Unauthenticated, the GitHub API allows sixty requests an hour per address,
 * and a serverless function shares its address with strangers; `GITHUB_TOKEN`
 * (any read-only token) lifts that. A refused request costs that card its
 * numbers and nothing else.
 */
async function repoStats(owner: string, repo: string): Promise<GitHubRepositoryStats | null> {
  "use cache";
  cacheLife("hours");

  const stats = await getGitHubRepositoryStats(owner, repo, fetch, process.env.GITHUB_TOKEN ?? "");
  if (!stats) console.warn(`[ahsan] GitHub numbers for ${owner}/${repo} were skipped.`);
  return stats;
}

/** The approved catalogue with GitHub's current numbers attached. */
export async function listOpenSourceRepos(): Promise<LiveRepo[]> {
  const catalogue = await listCatalogue();
  const stats = await Promise.all(catalogue.map((repo) => repoStats(repo.owner, repo.repo)));

  return catalogue.map((repo, index) => ({
    ...repo,
    // The submitter's line wins; GitHub's description fills in when they
    // left it empty.
    summary: repo.summary || stats[index]?.description || "",
    stats: stats[index],
  }));
}

export { repoSlug };
