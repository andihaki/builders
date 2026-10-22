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
  activityPeople,
  activityStats,
  entriesOf,
  filterGitHubActivity,
  groupByPeriod,
  isGitHubActivityFilter,
  ownerAvatar,
  repoName,
  type ActivityPeriod,
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
/** How many repositories a commit summary names before "+N". */
const SUMMARY_REPOS = 4;

type Query = { filter: GitHubActivityFilter; member: string; limit: number };

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function readQuery(query: Record<string, string | string[] | undefined>): Query {
  const show = one(query.show);
  const member = one(query.member).trim();
  const limit = Number(one(query.limit));
  return {
    filter: isGitHubActivityFilter(show) ? show : "all",
    member: /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(member) ? member : "",
    limit: Number.isInteger(limit) && limit > PAGE_SIZE ? Math.min(limit, 1000) : PAGE_SIZE,
  };
}

function pathFor({ filter, member, limit }: Partial<Query>): string {
  const params = new URLSearchParams();
  if (filter && filter !== "all") params.set("show", filter);
  if (member) params.set("member", member);
  if (limit && limit > PAGE_SIZE) params.set("limit", String(limit));
  const search = params.toString();
  return `/activity${search ? `?${search}` : ""}`;
}

/**
 * What members have been doing in open source, read from GitHub.
 *
 * Nobody writes these entries: the refresh-github-activity Edge Function asks
 * GitHub every few hours, for members who chose to be shown. That is the
 * point of the page — it is evidence, not a claim.
 */
export default async function ActivityPage({ searchParams }: { searchParams?: SearchParams }) {
  const query = searchParams ?? Promise.resolve({});
  const locale = await currentLocale();

  return (
    <>
      <SiteHeader returnTo={query.then((values) => pathFor(readQuery(values)))} active="activity" />

      <main id="main-content" className="page-narrow gh-activity-page">
        <header className="gh-activity-hero">
          <p className="eyebrow">
            <span /> {tx(locale, "Aktivitas", "Activity")}
          </p>
          <h1>{tx(locale, "Kontribusi open source teman-teman.", "Our members' open source work.")}</h1>
          <p className="gh-activity-lede">
            {tx(
              locale,
              "Langsung dari GitHub, diperbarui tiap beberapa jam. Beri reaksi untuk merayakan PR yang masuk.",
              "Straight from GitHub, refreshed every few hours. React to cheer on a pull request that landed.",
            )}
          </p>
        </header>

        <Suspense fallback={<FeedSkeleton />}>
          <Feed query={query} locale={locale} />
        </Suspense>
      </main>

      <SiteFooter />
    </>
  );
}

async function Feed({ query, locale }: { query: SearchParams; locale: Locale }) {
  const current = readQuery(await query);
  const [result, reactionRows, viewer] = await Promise.all([
    readPublicly<GitHubActivityEntry[]>("github activity", listGitHubActivity, []),
    readPublicly("activity reactions", listActivityReactions, []),
    currentViewer(),
  ]);
  const reactions = summarizeReactions(reactionRows.value, viewer?.id ?? null);
  const viewerName = viewer ? viewer.name || viewer.username : null;

  const all = result.value;
  const stats = activityStats(all);
  const people = activityPeople(all);
  const mine = entriesOf(all, current.member);
  const shown = filterGitHubActivity(mine, current.filter);
  const page = shown.slice(0, current.limit);
  const runs = groupByPeriod(page, new Date());

  const tabs: { filter: GitHubActivityFilter; label: string }[] = [
    { filter: "all", label: tx(locale, "Semua", "All") },
    { filter: "merged", label: "Merged" },
    { filter: "open", label: tx(locale, "Direview", "In review") },
  ];

  return (
    <>
      {result.unavailable ? (
        <p className="public-data-notice" role="status">
          {tx(locale, "Aktivitas belum dapat dimuat.", "The activity could not be loaded.")} <a href={pathFor(current)}>{tx(locale, "Muat ulang", "Reload")}</a>.
        </p>
      ) : null}

      <dl className="gh-activity-stats">
        <Stat value={stats.people} label={tx(locale, "Member aktif", stats.people === 1 ? "Active member" : "Active members")} />
        <Stat value={stats.merged} label={tx(locale, "PR merged", stats.merged === 1 ? "PR merged" : "PRs merged")} />
        <Stat value={stats.open} label={tx(locale, "Sedang direview", "In review")} />
        <Stat value={stats.repos} label={tx(locale, "Repo dikontribusi", stats.repos === 1 ? "Repo contributed to" : "Repos contributed to")} />
      </dl>

      <div className="gh-activity-filters">
        <nav className="pf-trail-modes" aria-label={tx(locale, "Saring jenis", "Filter by kind")}>
          {tabs.map((tab) => (
            <Link
              key={tab.filter}
              className={tab.filter === current.filter ? "is-active" : ""}
              href={pathFor({ ...current, filter: tab.filter, limit: undefined })}
              aria-current={tab.filter === current.filter ? "page" : undefined}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        {people.length > 1 ? (
          <nav className="gh-member-chips" aria-label={tx(locale, "Saring member", "Filter by member")}>
            {current.member ? (
              <Link className="gh-member-chip is-plain" href={pathFor({ ...current, member: "", limit: undefined })}>
                {tx(locale, "Semua member", "Everyone")}
              </Link>
            ) : null}
            {people.map(({ person, count }) => {
              const active = person.handle.toLowerCase() === current.member.toLowerCase();
              return (
                <Link
                  key={person.id}
                  className={`gh-member-chip ${active ? "is-active" : ""}`}
                  href={pathFor({ ...current, member: active ? "" : person.handle, limit: undefined })}
                  aria-current={active ? "page" : undefined}
                >
                  <Avatar handle={person.handle} size={20} />
                  {person.name || `@${person.handle}`}
                  {count > 0 ? <span className="gh-member-count">{count}</span> : null}
                </Link>
              );
            })}
          </nav>
        ) : null}
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
        runs.map((run) => (
          <section key={run.period} className="gh-activity-run" aria-labelledby={`run-${run.period}`}>
            <h2 id={`run-${run.period}`} className="gh-activity-run-title">
              {periodLabel(run.period, locale)}
            </h2>
            <ol className="gh-activity-list">
              {run.entries.map((entry) => (
                <li key={entry.key}>
                  {entry.kind === "pull_request" ? (
                    <PullRequestItem entry={entry} locale={locale} reactions={reactions[entry.url] ?? []} viewerName={viewerName} />
                  ) : (
                    <CommitSummaryItem entry={entry} locale={locale} reactions={reactions[entry.key] ?? []} viewerName={viewerName} />
                  )}
                </li>
              ))}
            </ol>
          </section>
        ))
      )}

      {shown.length > page.length ? (
        <p className="trail-more">
          <Link href={pathFor({ ...current, limit: current.limit + PAGE_SIZE })}>{tx(locale, "Muat aktivitas sebelumnya", "Load earlier activity")}</Link>
        </p>
      ) : null}

      <p className="gh-activity-note">
        {tx(
          locale,
          "Hanya repo publik, dan hanya member yang memilih tampil. Mau ikut tampil, atau berubah pikiran? Atur di ",
          "Public repositories only, and only members who chose to be shown. Want to join, or changed your mind? Set it on ",
        )}
        <Link href="/account/profile#github-account">{tx(locale, "halaman edit profil", "the edit profile page")}</Link>.
      </p>
    </>
  );
}

function periodLabel(period: ActivityPeriod, locale: Locale): string {
  if (period === "week") return tx(locale, "Minggu ini", "This week");
  if (period === "month") return tx(locale, "Bulan ini", "This month");
  return tx(locale, "Sebelumnya", "Earlier");
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="gh-stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Avatar({ handle, size = 36 }: { handle: string; size?: number }) {
  // GitHub serves a small avatar at this address for any username, the same
  // way the directory's badges show faces.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="gh-activity-avatar" src={`https://github.com/${encodeURIComponent(handle)}.png?size=${size * 2}`} alt="" width={size} height={size} loading="lazy" />;
}

function Who({ entry }: { entry: GitHubActivityEntry }) {
  return (
    <Link className="gh-activity-who" href={`/u/${entry.person.username}`}>
      {entry.person.name || `@${entry.person.handle}`}
    </Link>
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
    <article className={`gh-activity-item ${merged ? "is-merged" : "is-open"}`}>
      <Avatar handle={entry.person.handle} />
      <div className="gh-activity-body">
        <p className="gh-activity-line">
          <Who entry={entry} /> {merged ? tx(locale, "PR-nya di-merge", "got a pull request merged") : tx(locale, "membuka pull request", "opened a pull request")}
          <span className="gh-activity-time">
            {" · "}
            <RelativeTime value={entry.at} locale={locale} />
          </span>
        </p>

        <a className="gh-activity-pr" href={entry.url} target="_blank" rel="noopener noreferrer">
          <span className={`gh-pr-icon ${merged ? "is-merged" : "is-open"}`} aria-hidden="true">
            <svg viewBox="0 0 16 16">
              {merged ? (
                <path d="M4.25 2.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5ZM4.25 11a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5ZM11.75 11a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5ZM4.25 5v6M4.25 5c0 3 3 4 7.5 4v2" />
              ) : (
                <path d="M4.25 2.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5ZM4.25 11a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5ZM11.75 11a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5ZM4.25 5v6M11.75 11V6.5a2 2 0 0 0-2-2H7.5M9 3 7.5 4.5 9 6" />
              )}
            </svg>
          </span>
          <span className="gh-pr-main">
            <span className="gh-activity-title">{entry.title || `#${entry.number}`}</span>
            <span className="gh-pr-repo">
              {/* eslint-disable-next-line @next/next/no-img-element -- the repository owner's GitHub picture */}
              <img src={ownerAvatar(entry.repo)} alt="" width={16} height={16} loading="lazy" />
              {entry.repo} <span className="gh-activity-number">#{entry.number}</span>
            </span>
          </span>
          <span className={`gh-activity-state ${merged ? "is-merged" : "is-open"}`}>{merged ? "Merged" : tx(locale, "Direview", "In review")}</span>
        </a>

        <ReactionBar url={entry.url} initial={reactions} viewerName={viewerName} />
      </div>
    </article>
  );
}

function CommitSummaryItem({
  entry,
  locale,
  reactions,
  viewerName,
}: {
  entry: CommitSummaryEntry;
  locale: Locale;
  reactions: ReactionCount[];
  viewerName: string | null;
}) {
  const named = entry.repos.slice(0, SUMMARY_REPOS);
  const more = entry.repos.length - named.length;
  return (
    <article className="gh-activity-item is-summary">
      <Avatar handle={entry.person.handle} />
      <div className="gh-activity-body">
        <p className="gh-activity-line">
          <Who entry={entry} />{" "}
          {tx(
            locale,
            `membuat ${entry.commits} commit di ${entry.repos.length} repo miliknya`,
            `made ${entry.commits} ${entry.commits === 1 ? "commit" : "commits"} across ${entry.repos.length} of their own ${entry.repos.length === 1 ? "repo" : "repos"}`,
          )}
          <span className="gh-activity-time">
            {" · "}
            {tx(locale, "30 hari terakhir", "last 30 days")}
          </span>
        </p>
        <ul className="gh-repo-chips">
          {named.map((repo) => (
            <li key={repo.repo}>
              <a href={`https://github.com/${repo.repo}`} target="_blank" rel="noopener noreferrer">
                {repoName(repo.repo)}
              </a>
              <span className="gh-repo-commits">{repo.commits}</span>
            </li>
          ))}
          {more > 0 ? <li className="gh-repo-more">+{more}</li> : null}
        </ul>
        {/* Keyed `commits:<user_id>`, the entry's own key. */}
        <ReactionBar url={entry.key} initial={reactions} viewerName={viewerName} />
      </div>
    </article>
  );
}

function FeedSkeleton() {
  return (
    <div className="gh-activity-list" aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} height={96} />
      ))}
    </div>
  );
}
