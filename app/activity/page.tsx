import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "@/app/components/responsive-link";
import { SiteFooter, SiteHeader } from "../components/shell";
import { RelativeTime } from "../components/relative-time";
import { ReactionBar } from "../components/reaction-bar";
import { Skeleton } from "../components/skeleton";
import { shareCard } from "../content";
import { listActivityReactions, listGitHubActivity } from "../lib/data";
import { summarizeReactions, type ReactionCount } from "../lib/reactions";
import { currentViewer } from "../lib/session";
import {
  NAMED_REPOS,
  filterGitHubActivity,
  isGitHubActivityFilter,
  repoName,
  type CommitSummaryEntry,
  type GitHubActivityEntry,
  type GitHubActivityFilter,
  type PullRequestEntry,
} from "../lib/github-activity";
import { readPublicly } from "../lib/public-read";
import { currentLocale } from "../lib/locale-server";
import { tx, type Locale } from "../lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  const title = tx(locale, "Aktivitas — Builders", "Activity — Builders");
  const description = tx(
    locale,
    "Kontribusi open source member Builders, langsung dari GitHub: pull request yang di-merge, yang sedang direview, dan kesibukan di repo sendiri.",
    "Builders members' open source work, straight from GitHub: merged pull requests, ones in review, and what they are building on their own repositories.",
  );
  return { title, description, alternates: { canonical: "/activity" }, openGraph: shareCard({ title, description, url: "/activity" }) };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PAGE_SIZE = 40;

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function readQuery(query: Record<string, string | string[] | undefined>) {
  const show = one(query.show);
  const limit = Number(one(query.limit));
  return {
    filter: isGitHubActivityFilter(show) ? show : ("all" as GitHubActivityFilter),
    limit: Number.isInteger(limit) && limit > PAGE_SIZE ? Math.min(limit, 1000) : PAGE_SIZE,
  };
}

function pathFor(filter: GitHubActivityFilter, limit = PAGE_SIZE): string {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("show", filter);
  if (limit > PAGE_SIZE) params.set("limit", String(limit));
  const search = params.toString();
  return `/activity${search ? `?${search}` : ""}`;
}

/**
 * What members have been doing in open source, read from GitHub.
 *
 * Nobody writes these entries: the refresh-github-activity Edge Function asks
 * GitHub every few hours for each member with a GitHub account on their
 * profile. That is the point of the page — it is evidence, not a claim.
 */
export default async function ActivityPage({ searchParams }: { searchParams?: SearchParams }) {
  const query = searchParams ?? Promise.resolve({});
  const locale = await currentLocale();

  return (
    <>
      <SiteHeader returnTo={query.then((values) => pathFor(readQuery(values).filter))} active="activity" />

      <main id="main-content" className="page-narrow gh-activity-page">
        <p className="eyebrow">
          <span /> {tx(locale, "Aktivitas", "Activity")}
        </p>
        <h1>{tx(locale, "Apa yang lagi dikerjakan teman-teman di open source.", "What our members are building in open source.")}</h1>
        <p className="lede">
          {tx(
            locale,
            "Diambil langsung dari GitHub tiap beberapa jam—bukan diketik sendiri—untuk member yang memilih tampil. Pull request ke repo orang lain tampil satu per satu; kerja di repo sendiri diringkas jadi satu baris.",
            "Read straight from GitHub every few hours, never typed in, for members who chose to be shown. Pull requests to other people's repositories are listed one by one; work on one's own repositories is summed up in a single line.",
          )}
        </p>

        <Suspense fallback={<FeedSkeleton />}>
          <Feed query={query} locale={locale} />
        </Suspense>
      </main>

      <SiteFooter />
    </>
  );
}

async function Feed({ query, locale }: { query: SearchParams; locale: Locale }) {
  const { filter, limit } = readQuery(await query);
  const [result, reactionRows, viewer] = await Promise.all([
    readPublicly<GitHubActivityEntry[]>("github activity", listGitHubActivity, []),
    readPublicly("activity reactions", listActivityReactions, []),
    currentViewer(),
  ]);
  const reactions = summarizeReactions(reactionRows.value, viewer?.id ?? null);
  const viewerName = viewer ? viewer.name || viewer.username : null;
  const all = result.value;
  const shown = filterGitHubActivity(all, filter);
  const page = shown.slice(0, limit);

  const merged = all.filter((entry) => entry.kind === "pull_request" && entry.state === "merged").length;
  const open = all.filter((entry) => entry.kind === "pull_request" && entry.state === "open").length;
  const people = new Set(all.map((entry) => entry.person.id)).size;

  const tabs: { filter: GitHubActivityFilter; label: string }[] = [
    { filter: "all", label: tx(locale, "Semua", "All") },
    { filter: "merged", label: tx(locale, `Merged (${merged})`, `Merged (${merged})`) },
    { filter: "open", label: tx(locale, `Sedang direview (${open})`, `In review (${open})`) },
  ];

  return (
    <>
      {result.unavailable ? (
        <p className="public-data-notice" role="status">
          {tx(locale, "Aktivitas belum dapat dimuat.", "The activity could not be loaded.")} <a href={pathFor(filter)}>{tx(locale, "Muat ulang", "Reload")}</a>.
        </p>
      ) : null}

      <div className="gh-activity-head">
        <p className="gh-activity-stats">
          {tx(
            locale,
            `${people} member aktif · ${merged} PR merged dalam 90 hari`,
            `${people} active ${people === 1 ? "member" : "members"} · ${merged} ${merged === 1 ? "PR" : "PRs"} merged in 90 days`,
          )}
        </p>
        <nav className="pf-trail-modes" aria-label={tx(locale, "Saring aktivitas", "Filter activity")}>
          {tabs.map((tab) => (
            <Link key={tab.filter} className={tab.filter === filter ? "is-active" : ""} href={pathFor(tab.filter)} aria-current={tab.filter === filter ? "page" : undefined}>
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      {page.length === 0 ? (
        <div className="gh-activity-empty">
          <p>{all.length === 0 ? tx(locale, "Belum ada aktivitas yang tercatat.", "No activity recorded yet.") : tx(locale, "Tidak ada aktivitas untuk saringan ini.", "Nothing matches this filter.")}</p>
          <p>
            {tx(locale, "Mau muncul di sini? Isi GitHub-mu dan centang “Tampilkan aktivitas GitHub-ku” di ", "Want to show up here? Add your GitHub and tick “Show my GitHub activity” on ")}
            <Link href="/account/profile#github-account">{tx(locale, "halaman edit profil", "the edit profile page")}</Link>.
          </p>
        </div>
      ) : (
        <ol className="gh-activity-list">
          {page.map((entry) => (
            <li key={entry.key}>
              {entry.kind === "pull_request" ? (
                <PullRequestItem entry={entry} locale={locale} reactions={reactions[entry.url] ?? []} viewerName={viewerName} />
              ) : (
                <CommitSummaryItem entry={entry} locale={locale} />
              )}
            </li>
          ))}
        </ol>
      )}

      {shown.length > page.length ? (
        <p className="trail-more">
          <Link href={pathFor(filter, limit + PAGE_SIZE)}>{tx(locale, "Muat aktivitas sebelumnya", "Load earlier activity")}</Link>
        </p>
      ) : null}

      <p className="gh-activity-note">
        {tx(
          locale,
          "Hanya repo publik, dan hanya member yang memilih tampil. Berubah pikiran? Hilangkan centang “Tampilkan aktivitas GitHub-ku” di halaman edit profil.",
          "Public repositories only, and only members who chose to be shown. Changed your mind? Untick “Show my GitHub activity” on the edit profile page.",
        )}
      </p>
    </>
  );
}

function Avatar({ handle }: { handle: string }) {
  // GitHub serves a small avatar at this address for any username, the same
  // way the directory's badges show faces.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="gh-activity-avatar" src={`https://github.com/${encodeURIComponent(handle)}.png?size=64`} alt="" width={32} height={32} loading="lazy" />;
}

function Who({ entry }: { entry: GitHubActivityEntry }) {
  return (
    <Link className="gh-activity-who" href={`/u/${entry.person.username}`}>
      {entry.person.name || `@${entry.person.handle}`}
    </Link>
  );
}

function RepoLink({ repo, short = false }: { repo: string; short?: boolean }) {
  return (
    <a className="gh-activity-repo" href={`https://github.com/${repo}`} target="_blank" rel="noopener noreferrer">
      {short ? repoName(repo) : repo}
    </a>
  );
}

function PullRequestItem({
  entry,
  locale,
  reactions,
  viewerName,
}: {
  entry: PullRequestEntry;
  locale: Locale;
  reactions: ReactionCount[];
  viewerName: string | null;
}) {
  const merged = entry.state === "merged";
  return (
    <article className="gh-activity-item">
      <Avatar handle={entry.person.handle} />
      <div className="gh-activity-body">
        <p className="gh-activity-line">
          <Who entry={entry} />{" "}
          {merged ? tx(locale, "PR-nya di-merge di ", "got a PR merged into ") : tx(locale, "membuka PR di ", "opened a PR on ")}
          <RepoLink repo={entry.repo} />
          <span className="gh-activity-time">
            {" · "}
            <RelativeTime value={entry.at} locale={locale} />
          </span>
        </p>
        <a className="gh-activity-pr" href={entry.url} target="_blank" rel="noopener noreferrer">
          <span className={`gh-activity-state ${merged ? "is-merged" : "is-open"}`}>
            {merged ? "Merged" : tx(locale, "Direview", "In review")}
          </span>
          <span className="gh-activity-title">{entry.title || `#${entry.number}`}</span>
          <span className="gh-activity-number">#{entry.number}</span>
        </a>
        <ReactionBar url={entry.url} initial={reactions} viewerName={viewerName} />
      </div>
    </article>
  );
}

function CommitSummaryItem({ entry, locale }: { entry: CommitSummaryEntry; locale: Locale }) {
  const named = entry.repos.slice(0, NAMED_REPOS);
  const more = entry.repos.length - named.length;
  return (
    <article className="gh-activity-item is-summary">
      <Avatar handle={entry.person.handle} />
      <div className="gh-activity-body">
        <p className="gh-activity-line">
          <Who entry={entry} />{" "}
          {tx(locale, `membuat ${entry.commits} commit di repo sendiri: `, `made ${entry.commits} ${entry.commits === 1 ? "commit" : "commits"} to their own repos: `)}
          {named.map((repo, index) => (
            <span key={repo.repo}>
              {index > 0 ? (index === named.length - 1 && more === 0 ? tx(locale, " dan ", " and ") : ", ") : null}
              <RepoLink repo={repo.repo} short />
            </span>
          ))}
          {more > 0 ? tx(locale, `, dan ${more} lainnya`, ` and ${more} more`) : null}
          <span className="gh-activity-time">
            {" · "}
            <RelativeTime value={entry.at} locale={locale} />
          </span>
        </p>
        <p className="gh-activity-sub">{tx(locale, "Dalam 30 hari terakhir", "In the last 30 days")}</p>
      </div>
    </article>
  );
}

function FeedSkeleton() {
  return (
    <div className="gh-activity-list" aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} height={64} />
      ))}
    </div>
  );
}
