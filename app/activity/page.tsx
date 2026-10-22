import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "@/app/components/responsive-link";
import { SiteFooter, SiteHeader } from "../components/shell";
import { FacetGroup, FacetLink } from "../components/directory-view";
import { FilterPanel, type ActiveFilter } from "../components/filter-panel";
import { RelativeTime } from "../components/relative-time";
import { ReactionBar } from "../components/reaction-bar";
import { Skeleton } from "../components/skeleton";
import { shareCard } from "../content";
import { listActivityReactions, listGitHubActivity } from "../lib/data";
import { summarizeReactions, type ReactionCount } from "../lib/reactions";
import { currentViewer } from "../lib/session";
import {
  activityPeople,
  activityRepos,
  activityStats,
  dayKey,
  groupByDay,
  isGitHubActivityFilter,
  kindCounts,
  ownerAvatar,
  queryActivity,
  repoName,
  type ActivityQuery,
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

const PAGE_SIZE = 20;
/** How many repositories a commit summary names before "+N". */
const SUMMARY_REPOS = 4;
/** Repositories shown in the sidebar before the rest fold behind "More…". */
const REPOS_SHOWN = 8;

type Query = ActivityQuery & { page: number };

const HANDLE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const REPO_KEY = /^[a-z0-9](?:[a-z0-9-]{0,38})\/[a-z0-9._-]{1,100}$/;

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function readQuery(query: Record<string, string | string[] | undefined>): Query {
  const kind = one(query.show);
  const member = one(query.member).trim();
  const repo = one(query.repo).trim().toLowerCase();
  const page = Number(one(query.page));
  return {
    kind: isGitHubActivityFilter(kind) ? kind : "all",
    member: HANDLE.test(member) ? member : "",
    repo: REPO_KEY.test(repo) ? repo : "",
    q: one(query.q).slice(0, 100),
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

/** The address for a query; changing any filter goes back to page one. */
function pathFor(query: Partial<Query>, page = 1): string {
  const params = new URLSearchParams();
  if (query.kind && query.kind !== "all") params.set("show", query.kind);
  if (query.member) params.set("member", query.member);
  if (query.repo) params.set("repo", query.repo);
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return `/activity${search ? `?${search}` : ""}`;
}

/**
 * What members have been doing in open source, read from GitHub, as a
 * timeline: people doing things, day by day, the way GitHub's own feed reads.
 * It sits in the directory's frame — the short heading with its numbers, the
 * filters down the left, folded into a sheet on phones — so the page is
 * familiar, while the list itself reads as a feed rather than a catalogue.
 *
 * Nobody writes these entries: the refresh-github-activity Edge Function asks
 * GitHub every few hours, for members who chose to be shown.
 */
export default async function ActivityPage({ searchParams }: { searchParams?: SearchParams }) {
  const query = searchParams ?? Promise.resolve({});
  const locale = await currentLocale();

  return (
    <>
      <SiteHeader returnTo={query.then((values) => pathFor(readQuery(values)))} active="activity" />

      <main id="main-content" className="dx-page">
        <Suspense fallback={<ActivitySkeleton locale={locale} />}>
          <ActivityBody query={query} locale={locale} />
        </Suspense>
      </main>

      <SiteFooter />
    </>
  );
}

function Heading({ locale, children }: { locale: Locale; children?: React.ReactNode }) {
  return (
    <header className="dx-head ax-head">
      <div>
        <h1>{tx(locale, "Aktivitas open source", "Open source activity")}</h1>
        <p>
          {tx(
            locale,
            "Pull request dan commit member, langsung dari GitHub tiap beberapa jam. ",
            "Members' pull requests and commits, straight from GitHub every few hours. ",
          )}
          <Link className="ax-head-link" href="/account/profile#github-account">
            {tx(locale, "Tampilkan punyamu", "Show yours")}
          </Link>
        </p>
      </div>
      {children}
    </header>
  );
}

async function ActivityBody({ query, locale }: { query: SearchParams; locale: Locale }) {
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
  const kinds = kindCounts(all);
  const people = activityPeople(all);
  const repos = activityRepos(all);
  const matched = queryActivity(all, current);
  const pages = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
  const page = Math.min(current.page, pages);
  const shown = matched.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filtered = current.kind !== "all" || Boolean(current.member || current.repo || current.q.trim());

  const kindLabels: Record<GitHubActivityFilter, string> = {
    all: tx(locale, "Semua", "All"),
    merged: tx(locale, "PR merged", "Merged PRs"),
    open: tx(locale, "PR direview", "PRs in review"),
    commits: tx(locale, "Repo sendiri", "Own repos"),
  };
  const memberName = people.find(({ person }) => person.handle.toLowerCase() === current.member.toLowerCase())?.person.name;
  const active: ActiveFilter[] = [
    ...(current.kind !== "all" ? [{ label: kindLabels[current.kind], href: pathFor({ ...current, kind: "all" }) }] : []),
    ...(current.member ? [{ label: memberName || `@${current.member}`, href: pathFor({ ...current, member: "" }) }] : []),
    ...(current.repo ? [{ label: current.repo, href: pathFor({ ...current, repo: "" }) }] : []),
  ];

  return (
    <>
      <Heading locale={locale}>
        <dl className="dx-head-stats">
          <div>
            <dt>{tx(locale, "Member aktif", "Active members")}</dt>
            <dd>{stats.people}</dd>
          </div>
          <div>
            <dt>{tx(locale, "PR merged", "PRs merged")}</dt>
            <dd>{stats.merged}</dd>
          </div>
          <div>
            <dt>{tx(locale, "Repo dikontribusi", "Repos contributed to")}</dt>
            <dd>{stats.repos}</dd>
          </div>
        </dl>
      </Heading>

      <div className="dx-layout">
        <FilterPanel active={active}>
          <FacetGroup title={tx(locale, "Jenis", "Kind")}>
            {(["all", "merged", "open", "commits"] as const).map((kind) => (
              <FacetLink
                key={kind}
                active={current.kind === kind}
                href={pathFor({ ...current, kind: current.kind === kind && kind !== "all" ? "all" : kind })}
                count={kinds[kind]}
                icon={kind === "all" ? undefined : <KindIcon kind={kind} />}
              >
                {kindLabels[kind]}
              </FacetLink>
            ))}
          </FacetGroup>

          {people.length > 0 ? (
            <FacetGroup title={tx(locale, "Paling aktif", "Most active")} more={tx(locale, "Member lainnya…", "More members…")}>
              {people.map(({ person, count }) => {
                const on = person.handle.toLowerCase() === current.member.toLowerCase();
                return (
                  <FacetLink
                    key={person.id}
                    active={on}
                    href={pathFor({ ...current, member: on ? "" : person.handle })}
                    count={count}
                    icon={<Avatar handle={person.handle} size={18} />}
                  >
                    {person.name || `@${person.handle}`}
                  </FacetLink>
                );
              })}
            </FacetGroup>
          ) : null}

          {repos.length > 0 ? (
            <FacetGroup
              title={tx(locale, "Repo tujuan PR", "PRs went to")}
              more={repos.length > REPOS_SHOWN ? tx(locale, "Repo lainnya…", "More repos…") : undefined}
              openMore={repos.findIndex(({ repo }) => repo === current.repo) >= REPOS_SHOWN}
            >
              {repos.map(({ repo, count }) => (
                <FacetLink
                  key={repo}
                  active={current.repo === repo}
                  href={pathFor({ ...current, repo: current.repo === repo ? "" : repo })}
                  count={count}
                  // eslint-disable-next-line @next/next/no-img-element -- the repository owner's GitHub picture
                  icon={<img className="ax-facet-avatar" src={ownerAvatar(repo, 36)} alt="" width={18} height={18} loading="lazy" />}
                >
                  {repo}
                </FacetLink>
              ))}
            </FacetGroup>
          ) : null}
        </FilterPanel>

        <section className="dx-results" aria-label={tx(locale, "Aktivitas", "Activity")}>
          <div className="dx-toolbar">
            <form className="dx-search" action="/activity" role="search">
              {current.kind !== "all" ? <input type="hidden" name="show" value={current.kind} /> : null}
              {current.member ? <input type="hidden" name="member" value={current.member} /> : null}
              {current.repo ? <input type="hidden" name="repo" value={current.repo} /> : null}
              <label>
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                <span className="sr-only">{tx(locale, "Cari aktivitas", "Search activity")}</span>
                <input type="search" name="q" defaultValue={current.q} placeholder={tx(locale, "Cari judul PR, repo, atau nama…", "Search PR titles, repos, or names…")} />
              </label>
            </form>
            <p className="dx-count" role="status">
              <strong>{matched.length}</strong> {tx(locale, "aktivitas", "entries")}
              {filtered ? <> · <Link href="/activity">reset</Link></> : null}
            </p>
          </div>

          {result.unavailable ? (
            <p className="public-data-notice" role="status">
              {tx(locale, "Aktivitas belum dapat dimuat.", "The activity could not be loaded.")} <a href={pathFor(current, page)}>{tx(locale, "Muat ulang", "Reload")}</a>.
            </p>
          ) : null}

          {shown.length === 0 ? (
            <div className="dx-empty ax-empty">
              <p>
                {all.length === 0
                  ? tx(locale, "Belum ada aktivitas yang tercatat. ", "No activity recorded yet. ")
                  : tx(locale, "Tidak ada aktivitas yang cocok. ", "No activity matches. ")}
                {filtered ? <Link href="/activity">{tx(locale, "Reset filter", "Reset filters")}</Link> : null}
              </p>
              <p>
                {tx(locale, "Mau muncul di sini? Isi GitHub-mu dan centang “Tampilkan aktivitas GitHub-ku” di ", "Want to show up here? Add your GitHub and tick “Show my GitHub activity” on ")}
                <Link href="/account/profile#github-account">{tx(locale, "halaman edit profil", "the edit profile page")}</Link>.
              </p>
            </div>
          ) : (
            <div className="ax-timeline">
              {groupByDay(shown).map(({ day, entries }) => (
                <section key={day} className="ax-day" aria-labelledby={`day-${day}`}>
                  <h2 id={`day-${day}`} className="ax-day-title">
                    {dayLabel(day, locale)}
                  </h2>
                  <ol className="ax-events">
                    {entries.map((entry) => (
                      <li key={entry.key} className="ax-event">
                        <Avatar handle={entry.person.handle} size={32} />
                        {entry.kind === "pull_request" ? (
                          <PullRequestEvent entry={entry} locale={locale} reactions={reactions[entry.url] ?? []} viewerName={viewerName} />
                        ) : (
                          <CommitSummaryEvent entry={entry} locale={locale} reactions={reactions[entry.key] ?? []} viewerName={viewerName} />
                        )}
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          )}

          {pages > 1 ? (
            <nav className="dx-pager" aria-label={tx(locale, "Halaman", "Pages")}>
              {page > 1 ? (
                <Link href={pathFor(current, page - 1)} rel="prev">
                  <span aria-hidden="true">←</span> {tx(locale, "Sebelumnya", "Previous")}
                </Link>
              ) : (
                <span aria-hidden="true" />
              )}
              <p>{tx(locale, `Halaman ${page} dari ${pages}`, `Page ${page} of ${pages}`)}</p>
              {page < pages ? (
                <Link href={pathFor(current, page + 1)} rel="next">
                  {tx(locale, "Berikutnya", "Next")} <span aria-hidden="true">→</span>
                </Link>
              ) : (
                <span aria-hidden="true" />
              )}
            </nav>
          ) : null}

          <p className="ax-note">
            {tx(locale, "Hanya repo publik, dan hanya member yang memilih tampil.", "Public repositories only, and only members who chose to be shown.")}
          </p>
        </section>
      </div>
    </>
  );
}

function KindIcon({ kind }: { kind: Exclude<GitHubActivityFilter, "all"> }) {
  if (kind === "commits") {
    return (
      <svg className="dx-track-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="3.5" />
        <path d="M3 12h5.5M15.5 12H21" />
      </svg>
    );
  }
  return <PullRequestIcon merged={kind === "merged"} />;
}

function PullRequestIcon({ merged }: { merged: boolean }) {
  return (
    <svg className={`ax-pr-icon ${merged ? "is-merged" : "is-open"}`} viewBox="0 0 16 16" aria-hidden="true">
      {merged ? (
        <path d="M4.25 2.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5ZM4.25 11a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5ZM11.75 11a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5ZM4.25 5v6M4.25 5c0 3 3 4 7.5 4v2" />
      ) : (
        <path d="M4.25 2.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5ZM4.25 11a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5ZM11.75 11a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5ZM4.25 5v6M11.75 11V6.5a2 2 0 0 0-2-2H7.5M9 3 7.5 4.5 9 6" />
      )}
    </svg>
  );
}

function Avatar({ handle, size }: { handle: string; size: number }) {
  // GitHub serves a small avatar at this address for any username, the same
  // way the directory's badges show faces.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="ax-avatar" src={`https://github.com/${encodeURIComponent(handle)}.png?size=${size * 2}`} alt="" width={size} height={size} loading="lazy" />;
}

/** "Hari ini", "Kemarin", or the date, for a day key from groupByDay. */
function dayLabel(day: string, locale: Locale): string {
  const now = new Date();
  if (day === dayKey(now, "Asia/Jakarta")) return tx(locale, "Hari ini", "Today");
  if (day === dayKey(new Date(now.getTime() - 86_400_000), "Asia/Jakarta")) return tx(locale, "Kemarin", "Yesterday");
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", { day: "numeric", month: "long", timeZone: "Asia/Jakarta" }).format(
    new Date(`${day}T12:00:00+07:00`),
  );
}

function Who({ entry }: { entry: GitHubActivityEntry }) {
  return (
    <Link className="ax-who" href={`/u/${entry.person.username}`}>
      {entry.person.name || `@${entry.person.handle}`}
    </Link>
  );
}

function RepoLink({ repo }: { repo: string }) {
  return (
    <a className="ax-repo" href={`https://github.com/${repo}`} target="_blank" rel="noopener noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element -- the repository owner's GitHub picture */}
      <img src={ownerAvatar(repo, 32)} alt="" width={14} height={14} loading="lazy" />
      {repo}
    </a>
  );
}

/** "Zikrul got a pull request merged in owner/repo", then the PR itself. */
function PullRequestEvent({
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
    <div className="ax-event-body">
      <p className="ax-event-line">
        <Who entry={entry} /> {merged ? tx(locale, "PR-nya di-merge di", "got a pull request merged in") : tx(locale, "membuka pull request di", "opened a pull request in")}{" "}
        <RepoLink repo={entry.repo} />
        <span className="ax-time">
          <RelativeTime value={entry.at} locale={locale} />
        </span>
      </p>
      <a className="ax-pr" href={entry.url} target="_blank" rel="noopener noreferrer">
        <PullRequestIcon merged={merged} />
        <span className="ax-pr-title">{entry.title || `#${entry.number}`}</span>
        <span className="ax-number">#{entry.number}</span>
      </a>
      <ReactionBar url={entry.url} initial={reactions} viewerName={viewerName} />
    </div>
  );
}

/** Work on one's own repositories, one event per person. */
function CommitSummaryEvent({
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
    <div className="ax-event-body">
      <p className="ax-event-line">
        <Who entry={entry} />{" "}
        {tx(
          locale,
          `membuat ${entry.commits} commit di ${entry.repos.length} repo miliknya`,
          `made ${entry.commits} ${entry.commits === 1 ? "commit" : "commits"} in ${entry.repos.length} of their own ${entry.repos.length === 1 ? "repo" : "repos"}`,
        )}
        <span className="ax-time">{tx(locale, "30 hari terakhir", "last 30 days")}</span>
      </p>
      <ul className="ax-repos">
        {named.map((repo) => (
          <li key={repo.repo}>
            <a href={`https://github.com/${repo.repo}`} target="_blank" rel="noopener noreferrer">
              {repoName(repo.repo)}
            </a>
            <span>{repo.commits}</span>
          </li>
        ))}
        {more > 0 ? <li className="ax-repos-more">+{more}</li> : null}
      </ul>
      <ReactionBar url={entry.key} initial={reactions} viewerName={viewerName} />
    </div>
  );
}

function ActivitySkeleton({ locale }: { locale: Locale }) {
  return (
    <>
      <Heading locale={locale} />
      <div className="dx-layout" aria-busy="true">
        <div className="dx-side">
          <Skeleton height={220} style={{ borderRadius: 8 }} />
        </div>
        <div className="dx-results">
          <Skeleton height={40} style={{ borderRadius: 8, marginBottom: 14 }} />
          {[0, 1, 2, 3, 4].map((slot) => (
            <Skeleton key={slot} height={96} style={{ borderRadius: 12, marginBottom: 8 }} />
          ))}
        </div>
      </div>
    </>
  );
}
