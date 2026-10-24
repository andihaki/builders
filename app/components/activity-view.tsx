"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "./responsive-link";
import { FacetGroup, FacetLink } from "./directory-view";
import { FilterPanel, type ActiveFilter } from "./filter-panel";
import { InstantLink, InstantNav } from "./instant-link";
import { RelativeTime } from "./relative-time";
import { ReactionBar } from "./reaction-bar";
import { activityPath, readActivityFilters, readActivityPage } from "../lib/activity-url";
import {
  activityPeople,
  activityRepos,
  dayKey,
  groupByDay,
  inScope,
  kindCounts,
  ownerAvatar,
  queryActivity,
  repoName,
  scopeCounts,
  ACTIVITY_SCOPES,
  SUMMARY_DAYS,
  type ActivityScope,
  type CommitSummaryEntry,
  type GitHubActivityEntry,
  type GitHubActivityFilter,
  type PullRequestEntry,
  type PullRequestItem,
} from "../lib/github-activity";
import type { ReactionCount } from "../lib/reactions";
import { tx, type Locale } from "../lib/locale";

const PAGE_SIZE = 20;
/** How many repositories a commit summary names before "+N". */
const SUMMARY_REPOS = 4;
/** Pull requests listed in a grouped entry before the rest fold away. */
const PRS_SHOWN = 3;
/** Repositories shown in the sidebar before the rest fold behind "More…". */
const REPOS_SHOWN = 8;
/** How long typing rests before the address catches up. Browsers throttle history writes. */
const SEARCH_SETTLE_MS = 300;

/**
 * The /activity feed and its filters. The page hands it every entry once —
 * read from the server's shared cache — and from then on the scope toggle,
 * the sidebar, the search and the pages are a re-render in the browser, not
 * a round trip: the address follows every choice (`history.pushState`,
 * which the router keeps in step with `useSearchParams`), so a filtered view
 * can still be shared, reloaded, and gone back from. The directory works
 * the same way; see DirectoryView.
 */
export function ActivityView({
  entries,
  reactions,
  viewerName,
  today,
  locale,
  unavailable,
}: {
  entries: GitHubActivityEntry[];
  /** Per pull request URL, or per summary key. */
  reactions: Record<string, ReactionCount[]>;
  viewerName: string | null;
  /** Today in Jakarta, from the server, so "Today" and "Yesterday" match on both sides. */
  today: string;
  locale: Locale;
  unavailable: boolean;
}) {
  const searchParams = useSearchParams();
  const fromUrl = readActivityFilters(searchParams);
  // What is typed is held here and written to the address once typing rests:
  // the list follows every key, the history does not.
  const [q, setQ] = useState(fromUrl.q);
  const settle = useRef<number | undefined>(undefined);
  const results = useRef<HTMLElement>(null);

  // Back and Forward make the address the truth again.
  useEffect(() => {
    const onPop = () => {
      window.clearTimeout(settle.current);
      setQ(readActivityFilters(new URLSearchParams(window.location.search)).q);
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.clearTimeout(settle.current);
    };
  }, []);

  const navigate = useCallback((href: string) => {
    const url = new URL(href, window.location.href);
    window.clearTimeout(settle.current);
    setQ(readActivityFilters(url.searchParams).q);
    window.history.pushState(null, "", `${url.pathname}${url.search}`);
    // The list changed under the reader; if its top has scrolled away, bring it back.
    const list = results.current;
    if (list && list.getBoundingClientRect().top < 0) list.scrollIntoView({ block: "start" });
  }, []);

  const search = (value: string, now = false) => {
    setQ(value);
    window.clearTimeout(settle.current);
    const write = () => window.history.replaceState(null, "", activityPath({ ...fromUrl, q: value.trim().slice(0, 100) }));
    if (now) write();
    else settle.current = window.setTimeout(write, SEARCH_SETTLE_MS);
  };

  const current = { ...fromUrl, q: q.slice(0, 100) };
  const scopes = useMemo(() => scopeCounts(entries), [entries]);
  // The sidebar narrows within the scope showing, as the directory's does within local or global.
  const scoped = useMemo(() => inScope(entries, current.scope), [entries, current.scope]);
  const kinds = kindCounts(scoped);
  const people = useMemo(() => activityPeople(scoped), [scoped]);
  const repos = useMemo(() => activityRepos(scoped), [scoped]);
  const matched = useMemo(
    () => queryActivity(scoped, current),
    [scoped, current.kind, current.member, current.repo, current.q], // eslint-disable-line react-hooks/exhaustive-deps
  );
  // A search still settling has already left the page it started on.
  const requested = q === fromUrl.q ? readActivityPage(searchParams) : 1;
  const pages = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
  const page = Math.min(requested, pages);
  const shown = matched.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filtered = current.kind !== "all" || Boolean(current.member || current.repo || current.q.trim());
  const reset = activityPath({ scope: current.scope });

  const scopeLabels: Record<ActivityScope, string> = {
    all: tx(locale, "Semua", "All"),
    external: tx(locale, "Ke luar", "Contributions"),
    own: tx(locale, "Sendiri", "Own"),
  };
  const kindLabels: Record<GitHubActivityFilter, string> = {
    all: tx(locale, "Semua", "All"),
    merged: tx(locale, "PR merged", "Merged PRs"),
    open: tx(locale, "PR direview", "PRs in review"),
    commits: tx(locale, "Ringkasan", "Summaries"),
  };
  const memberName = people.find(({ person }) => person.handle.toLowerCase() === current.member.toLowerCase())?.person.name;
  const active: ActiveFilter[] = [
    ...(current.kind !== "all" ? [{ label: kindLabels[current.kind], href: activityPath({ ...current, kind: "all" }) }] : []),
    ...(current.member ? [{ label: memberName || `@${current.member}`, href: activityPath({ ...current, member: "" }) }] : []),
    ...(current.repo ? [{ label: current.repo, href: activityPath({ ...current, repo: "" }) }] : []),
  ];

  return (
    <InstantNav navigate={navigate}>
      <div className="dx-layout">
        <FilterPanel active={active}>
          <FacetGroup title={tx(locale, "Jenis", "Kind")}>
            {(["all", "merged", "open", "commits"] as const)
              .filter((kind) => kind === "all" || kinds[kind] > 0 || current.kind === kind)
              .map((kind) => (
                <FacetLink
                  key={kind}
                  active={current.kind === kind}
                  href={activityPath({ ...current, kind: current.kind === kind && kind !== "all" ? "all" : kind })}
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
                    href={activityPath({ ...current, member: on ? "" : person.handle })}
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
                  href={activityPath({ ...current, repo: current.repo === repo ? "" : repo })}
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

        <section ref={results} className="dx-results" aria-label={tx(locale, "Aktivitas", "Activity")}>
          <div className="dx-toolbar">
            <form
              className="dx-search"
              action="/activity"
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                search(q, true);
              }}
            >
              <label>
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                <span className="sr-only">{tx(locale, "Cari aktivitas", "Search activity")}</span>
                <input
                  type="search"
                  name="q"
                  value={q}
                  onChange={(event) => search(event.target.value)}
                  placeholder={tx(locale, "Cari judul PR, repo, atau nama…", "Search PR titles, repos, or names…")}
                />
              </label>
            </form>
            {/* Whose repositories: the same toggle as the directory's local and
                global, in plain sight rather than in the sidebar. */}
            <nav className="dx-scope" aria-label={tx(locale, "Repo orang lain atau sendiri", "Other people's repos or their own")}>
              {ACTIVITY_SCOPES.map((scope) => (
                <InstantLink
                  key={scope}
                  className={current.scope === scope ? "is-active" : ""}
                  aria-current={current.scope === scope ? "true" : undefined}
                  // A new scope starts its sidebar afresh: a member or repo picked in one may not be in the other.
                  href={activityPath({ scope, q: current.q })}
                >
                  {scopeLabels[scope]}
                  {scope !== "all" ? <span>{scopes[scope]}</span> : null}
                </InstantLink>
              ))}
            </nav>
            <p className="dx-count" role="status">
              <strong>{matched.length}</strong> {tx(locale, "aktivitas", "entries")}
              {filtered ? <> · <InstantLink href={reset}>reset</InstantLink></> : null}
            </p>
          </div>

          {unavailable ? (
            <p className="public-data-notice" role="status">
              {tx(locale, "Aktivitas belum dapat dimuat.", "The activity could not be loaded.")}{" "}
              <a href={activityPath(current, page)}>{tx(locale, "Muat ulang", "Reload")}</a>.
            </p>
          ) : null}

          {shown.length === 0 ? (
            <div className="dx-empty ax-empty">
              <p>
                {entries.length === 0
                  ? tx(locale, "Belum ada aktivitas yang tercatat. ", "No activity recorded yet. ")
                  : tx(locale, "Tidak ada aktivitas yang cocok. ", "No activity matches. ")}
                {filtered ? <InstantLink href={reset}>{tx(locale, "Reset filter", "Reset filters")}</InstantLink> : null}
              </p>
              <p>
                {tx(locale, "Mau muncul di sini? Isi GitHub-mu dan centang “Tampilkan aktivitas GitHub-ku” di ", "Want to show up here? Add your GitHub and tick “Show my GitHub activity” on ")}
                <Link href="/account/profile#github-account">{tx(locale, "halaman edit profil", "the edit profile page")}</Link>.
              </p>
            </div>
          ) : (
            <div className="ax-timeline">
              {groupByDay(shown).map(({ day, entries: onDay }) => (
                <section key={day} className="ax-day" aria-labelledby={`day-${day}`}>
                  <h2 id={`day-${day}`} className="ax-day-title">
                    {dayLabel(day, today, locale)}
                  </h2>
                  <ol className="ax-events">
                    {onDay.map((entry) => (
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
                <InstantLink href={activityPath(current, page - 1)} rel="prev">
                  <span aria-hidden="true">←</span> {tx(locale, "Sebelumnya", "Previous")}
                </InstantLink>
              ) : (
                <span aria-hidden="true" />
              )}
              <p>{tx(locale, `Halaman ${page} dari ${pages}`, `Page ${page} of ${pages}`)}</p>
              {page < pages ? (
                <InstantLink href={activityPath(current, page + 1)} rel="next">
                  {tx(locale, "Berikutnya", "Next")} <span aria-hidden="true">→</span>
                </InstantLink>
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
    </InstantNav>
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
function dayLabel(day: string, today: string, locale: Locale): string {
  if (day === today) return tx(locale, "Hari ini", "Today");
  if (day === dayKey(new Date(Date.parse(`${today}T12:00:00+07:00`) - 86_400_000), "Asia/Jakarta")) return tx(locale, "Kemarin", "Yesterday");
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

/**
 * "Zikrul got a pull request merged in owner/repo", then the PR itself; or
 * "got 4 pull requests merged", with the first few and the rest folded away.
 */
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
  const count = entry.pullRequests.length;
  const shown = entry.pullRequests.slice(0, count > PRS_SHOWN ? PRS_SHOWN - 1 : PRS_SHOWN);
  const folded = entry.pullRequests.slice(shown.length);
  const what =
    count === 1
      ? merged
        ? tx(locale, "PR-nya di-merge di", "got a pull request merged in")
        : tx(locale, "membuka pull request di", "opened a pull request in")
      : merged
        ? tx(locale, `${count} PR-nya di-merge di`, `got ${count} pull requests merged in`)
        : tx(locale, `membuka ${count} pull request di`, `opened ${count} pull requests in`);
  const item = (pr: PullRequestItem) => (
    <li key={pr.url}>
      <a className="ax-pr" href={pr.url} target="_blank" rel="noopener noreferrer">
        <PullRequestIcon merged={merged} />
        <span className="ax-pr-title">{pr.title || `#${pr.number}`}</span>
        <span className="ax-number">#{pr.number}</span>
      </a>
    </li>
  );
  return (
    <div className="ax-event-body">
      <p className="ax-event-line">
        <Who entry={entry} /> {what} <RepoLink repo={entry.repo} />
        <span className="ax-time">
          <RelativeTime value={entry.at} locale={locale} />
        </span>
      </p>
      <ul className="ax-prs">{shown.map(item)}</ul>
      {folded.length > 0 ? (
        <details className="ax-prs-more">
          <summary>{tx(locale, `${folded.length} PR lainnya`, `${folded.length} more`)}</summary>
          <ul className="ax-prs">{folded.map(item)}</ul>
        </details>
      ) : null}
      <ReactionBar url={entry.url} initial={reactions} viewerName={viewerName} />
    </div>
  );
}

/** Work on one's own repositories — commits and merged PRs — one event per person. */
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
        {ownWork(entry, locale)}
        <span className="ax-time">{tx(locale, `${SUMMARY_DAYS} hari terakhir`, `last ${SUMMARY_DAYS} days`)}</span>
      </p>
      <ul className="ax-repos">
        {named.map((repo) => (
          <li key={repo.repo}>
            <a href={`https://github.com/${repo.repo}`} target="_blank" rel="noopener noreferrer">
              {repoName(repo.repo)}
            </a>
            {repo.commits > 0 ? <span>{repo.commits}</span> : null}
          </li>
        ))}
        {more > 0 ? <li className="ax-repos-more">+{more}</li> : null}
      </ul>
      <ReactionBar url={entry.key} initial={reactions} viewerName={viewerName} />
    </div>
  );
}

/** "made 205 commits and merged 40 pull requests in 7 of their own repos", leaving out what is zero. */
function ownWork(entry: CommitSummaryEntry, locale: Locale): string {
  const repos = entry.repos.length;
  const id = [entry.commits > 0 ? `membuat ${entry.commits} commit` : "", entry.merged > 0 ? `merge ${entry.merged} PR` : ""].filter(Boolean);
  const en = [
    entry.commits > 0 ? `made ${entry.commits} ${entry.commits === 1 ? "commit" : "commits"}` : "",
    entry.merged > 0 ? `merged ${entry.merged} ${entry.merged === 1 ? "pull request" : "pull requests"}` : "",
  ].filter(Boolean);
  return tx(
    locale,
    `${id.join(" dan ")} di ${repos} repo miliknya`,
    `${en.join(" and ")} in ${repos} of their own ${repos === 1 ? "repo" : "repos"}`,
  );
}
