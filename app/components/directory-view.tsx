"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "./responsive-link";
import { InstantLink, InstantNav } from "./instant-link";
import { FilterPanel, type ActiveFilter } from "./filter-panel";
import { ProjectLogo } from "./project-logo";
import { LinkIcon } from "./link-icons";
import { StarButton, StarCount, StarsProvider } from "./star-button";
import { RelativeTime } from "./relative-time";
import {
  DIRECTORY_SOURCES,
  DIRECTORY_TRACKS,
  badgeCounts,
  directoryFacets,
  filterDirectory,
  openingCounts,
  openingLabel,
  paginate,
  prTierCounts,
  prTierLabel,
  sourceLabel,
  type DirectoryEntry,
  type DirectoryTrack,
} from "../lib/directory";
import { badgeKindLabel, badgeLabel, badgePeople, type Badge, type BadgeKind } from "../lib/badges";
import { pathFor, readFilters, readPage } from "../lib/directory-url";
import { tx, type Locale } from "../lib/locale";

/** How long typing rests before the address catches up. Browsers throttle history writes. */
const SEARCH_SETTLE_MS = 300;

/**
 * The directory's list, filtered where it is shown.
 *
 * The page hands over every entry on both tracks — a few hundred rows at
 * most, already read from the cache — so a tab, a facet, a page, or a search
 * is a re-render here rather than a request to the server. The address still
 * follows every choice (`history.pushState`, which the router keeps in step
 * with `useSearchParams`), so a filtered view can be shared, reloaded, and
 * left with Back; and every filter is still a real link for a new tab or a
 * browser without JavaScript.
 */
export function DirectoryView({
  entries,
  locale,
  unavailable,
}: {
  entries: DirectoryEntry[];
  locale: Locale;
  unavailable: boolean;
}) {
  const searchParams = useSearchParams();
  const fromUrl = readFilters(searchParams);
  // What is typed is held here and written to the address once typing rests:
  // the list follows every key, the history does not.
  const [q, setQ] = useState(fromUrl.q);
  const settle = useRef<number | undefined>(undefined);
  const results = useRef<HTMLElement>(null);

  // Back and Forward make the address the truth again.
  useEffect(() => {
    const onPop = () => {
      window.clearTimeout(settle.current);
      setQ(readFilters(new URLSearchParams(window.location.search)).q);
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.clearTimeout(settle.current);
    };
  }, []);

  const navigate = useCallback((href: string) => {
    window.clearTimeout(settle.current);
    const url = new URL(href, window.location.href);
    setQ(readFilters(url.searchParams).q);
    window.history.pushState(null, "", `${url.pathname}${url.search}`);
    // The list changed under the reader; if its top has scrolled away, bring it back.
    const list = results.current;
    if (list && list.getBoundingClientRect().top < 0) list.scrollIntoView({ block: "start" });
  }, []);

  const search = (value: string, now = false) => {
    setQ(value);
    window.clearTimeout(settle.current);
    const write = () => window.history.replaceState(null, "", pathFor({ ...fromUrl, q: value.trim().slice(0, 100) }));
    if (now) write();
    else settle.current = window.setTimeout(write, SEARCH_SETTLE_MS);
  };

  const filters = { ...fromUrl, q: q.slice(0, 100) };
  // A search still settling has already left the page it started on.
  const requestedPage = q === fromUrl.q ? readPage(searchParams) : "1";
  const matched = useMemo(() => filterDirectory(entries, filters), [entries, filters.track, filters.source, filters.open, filters.pr, filters.badge, filters.facet, filters.q]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = paginate(matched, requestedPage);
  const onTrack = entries.filter((entry) => entry.track === filters.track);
  const facets = directoryFacets(entries, filters.track);
  const sources = DIRECTORY_SOURCES.map((source) => ({
    source,
    count: onTrack.filter((entry) => entry.source === source).length,
  })).filter(({ count }) => count > 0);
  const badges = badgeCounts(entries, filters.track);
  const openings = openingCounts(entries, filters.track);
  const tiers = filters.track === "github" ? prTierCounts(entries) : [];
  const code = filters.track === "github";
  const filtered = Boolean(filters.source || filters.open || filters.pr || filters.badge || filters.facet || filters.q);
  const reset = pathFor({ track: filters.track, source: "", open: "", pr: "", badge: "", facet: "", q: "" });
  // What a phone's filter bar shows as chips, each one a link that drops it.
  const active: ActiveFilter[] = [
    ...(filters.pr ? [{ label: prTierLabel(filters.pr, locale), href: pathFor({ ...filters, pr: "" }) }] : []),
    ...(filters.open ? [{ label: openingLabel(filters.open, locale), href: pathFor({ ...filters, open: "" }) }] : []),
    ...(filters.badge ? [{ label: badgeKindLabel(filters.badge, locale), href: pathFor({ ...filters, badge: "" }) }] : []),
    ...(filters.source ? [{ label: sourceLabel(filters.source, locale), href: pathFor({ ...filters, source: "" }) }] : []),
    ...(filters.facet ? [{ label: filters.facet, href: pathFor({ ...filters, facet: "" }) }] : []),
  ];
  const trackHref = (track: DirectoryTrack) => pathFor({ track, source: "", open: "", pr: "", badge: "", facet: "", q: filters.q });

  return (
    <InstantNav navigate={navigate}>
    <div className="dx-layout">
      {/* On a phone the first choice is a two-way tab across the top; the
          sidebar group below says the same thing on a wide screen. */}
      <nav className="dx-mtabs" aria-label={tx(locale, "Cara kontribusi", "How to contribute")}>
        {DIRECTORY_TRACKS.map((track) => (
          <InstantLink
            key={track}
            className={filters.track === track ? "is-active" : ""}
            aria-current={filters.track === track ? "page" : undefined}
            href={trackHref(track)}
          >
            <TrackIcon track={track} />
            {tx(locale, TRACK_COPY[track].titleId, TRACK_COPY[track].titleEn)}
            <span>{entries.filter((entry) => entry.track === track).length}</span>
          </InstantLink>
        ))}
      </nav>

      <FilterPanel active={active}>
        <FacetGroup className="dx-facet-tracks" title={tx(locale, "Cara kontribusi", "How to contribute")}>
          {DIRECTORY_TRACKS.map((track) => (
            <FacetLink
              key={track}
              active={filters.track === track}
              href={trackHref(track)}
              count={entries.filter((entry) => entry.track === track).length}
              icon={<TrackIcon track={track} />}
              note={tx(locale, TRACK_COPY[track].noteId, TRACK_COPY[track].noteEn)}
            >
              {tx(locale, TRACK_COPY[track].titleId, TRACK_COPY[track].titleEn)}
            </FacetLink>
          ))}
        </FacetGroup>
        {tiers.length > 0 ? (
          <FacetGroup title={tx(locale, "Status PR", "PR status")}>
            {tiers.map(({ tier, count }) => (
              <FacetLink
                key={tier}
                active={filters.pr === tier}
                href={pathFor({ ...filters, pr: filters.pr === tier ? "" : tier })}
                count={count}
                icon={<span className={`dx-tier-dot dx-tier-dot-${tier}`} aria-hidden="true" />}
              >
                {prTierLabel(tier, locale)}
              </FacetLink>
            ))}
          </FacetGroup>
        ) : null}

        {openings.length > 0 ? (
          <FacetGroup title={tx(locale, "Terbuka untuk", "Open for")}>
            {openings.map(({ open, count }) => (
              <FacetLink
                key={open}
                active={filters.open === open}
                href={pathFor({ ...filters, open: filters.open === open ? "" : open })}
                count={count}
                icon={<span className={`dx-open-dot dx-open-dot-${open}`} aria-hidden="true" />}
              >
                {openingLabel(open, locale)}
              </FacetLink>
            ))}
          </FacetGroup>
        ) : null}

        {badges.length > 0 ? (
          <FacetGroup title={tx(locale, "Tanda", "Signals")}>
            {badges.map(({ kind, count }) => (
              <FacetLink
                key={kind}
                active={filters.badge === kind}
                href={pathFor({ ...filters, badge: filters.badge === kind ? "" : kind })}
                count={count}
                icon={<BadgeIcon kind={kind} />}
              >
                {badgeKindLabel(kind, locale)}
              </FacetLink>
            ))}
          </FacetGroup>
        ) : null}

        {sources.length > 1 ? (
          <FacetGroup title={tx(locale, "Sumber", "Source")}>
            {sources.map(({ source, count }) => (
              <FacetLink
                key={source}
                active={filters.source === source}
                href={pathFor({ ...filters, source: filters.source === source ? "" : source })}
                count={count}
              >
                {sourceLabel(source, locale)}
              </FacetLink>
            ))}
          </FacetGroup>
        ) : null}

        {facets.length > 0 ? (
          <FacetGroup
            title={code ? tx(locale, "Bahasa", "Languages") : tx(locale, "Peran yang dicari", "Roles wanted")}
            more={code ? tx(locale, "Bahasa lainnya…", "More languages…") : tx(locale, "Peran lainnya…", "More roles…")}
            openMore={facets.findIndex(({ value }) => value === filters.facet) >= FACETS_SHOWN}
          >
            {facets.map(({ value, count }) => (
              <FacetLink
                key={value}
                active={filters.facet === value}
                href={pathFor({ ...filters, facet: filters.facet === value ? "" : value })}
                count={count}
                icon={code ? <LanguageDot language={value} /> : undefined}
              >
                {value}
              </FacetLink>
            ))}
          </FacetGroup>
        ) : null}
      </FilterPanel>

      <section ref={results} className="dx-results" aria-label={tx(locale, "Hasil", "Results")}>
        <div className="dx-toolbar">
          <form
            className="dx-search"
            action="/"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              search(q, true);
            }}
          >
            {filters.track !== "github" ? <input type="hidden" name="track" value={filters.track} /> : null}
            {filters.source ? <input type="hidden" name="source" value={filters.source} /> : null}
            {filters.open ? <input type="hidden" name="open" value={filters.open} /> : null}
            {filters.pr ? <input type="hidden" name="pr" value={filters.pr} /> : null}
            {filters.badge ? <input type="hidden" name="badge" value={filters.badge} /> : null}
            {filters.facet ? <input type="hidden" name="facet" value={filters.facet} /> : null}
            <label>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <span className="sr-only">{tx(locale, "Cari project", "Search projects")}</span>
              <input type="search" name="q" value={q} onChange={(event) => search(event.target.value)} placeholder={tx(locale, "Cari project…", "Search projects…")} />
            </label>
          </form>
          <p className="dx-count" role="status">
            <strong>{matched.length}</strong> {tx(locale, "project", matched.length === 1 ? "project" : "projects")}
            {filtered ? <> · <InstantLink href={reset}>{tx(locale, "reset", "reset")}</InstantLink></> : null}
          </p>
        </div>

        {unavailable ? (
          <p className="public-data-notice" role="status">
            {tx(locale, "Sebagian daftar tidak dapat dimuat.", "Part of the list could not be loaded.")} <a href={pathFor(filters)}>{tx(locale, "Muat ulang", "Reload")}</a>.
          </p>
        ) : null}

        <StarsProvider repos={code ? shown.items.flatMap((entry) => (entry.repo ? [entry.repo] : [])) : []}>
        <div className={`dx-table dx-table-${filters.track}`} role="table" aria-label={tx(locale, "Daftar project", "Project list")}>
          <div className="dx-row dx-row-head" role="row">
            <span role="columnheader">Project</span>
            {code ? null : <span role="columnheader">{tx(locale, "Mencari", "Looking for")}</span>}
            <span role="columnheader"><span className="sr-only">{tx(locale, "Aksi", "Action")}</span></span>
          </div>

          {matched.length > 0 ? (
            shown.items.map((entry) => <DirectoryRow key={entry.key} entry={entry} locale={locale} />)
          ) : (
            <div className="dx-empty" role="row">
              <p role="cell">
                {tx(locale, "Tidak ada project yang cocok.", "No project matches.")}{" "}
                <InstantLink href={reset}>{tx(locale, "Reset filter", "Reset filters")}</InstantLink>
              </p>
            </div>
          )}
        </div>
        </StarsProvider>

        {shown.pages > 1 ? (
          <nav className="dx-pager" aria-label={tx(locale, "Halaman", "Pages")}>
            {shown.page > 1 ? (
              <InstantLink href={pathFor(filters, shown.page - 1)} rel="prev">
                <span aria-hidden="true">←</span> {tx(locale, "Sebelumnya", "Previous")}
              </InstantLink>
            ) : (
              <span aria-hidden="true" />
            )}
            <p>
              {tx(locale, `Halaman ${shown.page} dari ${shown.pages}`, `Page ${shown.page} of ${shown.pages}`)}
            </p>
            {shown.page < shown.pages ? (
              <InstantLink href={pathFor(filters, shown.page + 1)} rel="next">
                {tx(locale, "Berikutnya", "Next")} <span aria-hidden="true">→</span>
              </InstantLink>
            ) : (
              <span aria-hidden="true" />
            )}
          </nav>
        ) : null}

        <p className="dx-suggest">
          {filters.track === "github"
            ? tx(locale, "Tahu repo yang layak masuk? ", "Know a repo that belongs here? ")
            : tx(locale, "Punya produk yang butuh bantuan? ", "Have a product that needs a hand? ")}
          {filters.track === "github" ? (
            <Link href="/recommend">{tx(locale, "Usulkan repo", "Suggest a repo")}</Link>
          ) : (
            <Link href="/new">{tx(locale, "Daftarkan produk dan buka peran", "List it and open a role")}</Link>
          )}
        </p>
      </section>
    </div>
    </InstantNav>
  );
}


const TRACK_COPY: Record<DirectoryTrack, { titleId: string; titleEn: string; noteId: string; noteEn: string }> = {
  github: {
    titleId: "Kode di GitHub",
    titleEn: "Code on GitHub",
    noteId: "Kirim pull request",
    noteEn: "Send a pull request",
  },
  role: {
    titleId: "Peran lain",
    titleEn: "Other roles",
    noteId: "Desain, produk, riset, konten",
    noteEn: "Design, product, research, content",
  },
};

/** GitHub's own colours for the languages in the catalogue, so a dot reads at a glance. */
const LANGUAGE_COLOURS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Go: "#00add8",
  Python: "#3572a5",
  PHP: "#4f5d95",
  Markdown: "#083fa1",
  Rust: "#dea584",
  Java: "#b07219",
  Kotlin: "#a97bff",
  Dart: "#00b4ab",
  Ruby: "#701516",
  Swift: "#f05138",
  HTML: "#e34c26",
  CSS: "#663399",
  "Objective-C": "#438eff",
  Shell: "#89e051",
  "C#": "#178600",
  "C++": "#f34b7d",
  C: "#555555",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  "Jupyter Notebook": "#da5b0b",
  Elixir: "#6e4a7e",
  Lua: "#000080",
};

/** How many entries a long group shows before folding the rest away, as GitHub does with languages. */
const FACETS_SHOWN = 6;

function FacetGroup({
  title,
  className = "",
  more,
  openMore = false,
  children,
}: {
  title: string;
  className?: string;
  /** Label for the fold, when the group may run long. */
  more?: string;
  /** Unfolded from the start, because what is selected is inside it. */
  openMore?: boolean;
  children: React.ReactNode;
}) {
  const items = React.Children.toArray(children);
  const shown = more ? items.slice(0, FACETS_SHOWN) : items;
  const rest = more ? items.slice(FACETS_SHOWN) : [];
  return (
    <div className={`dx-facet ${className}`}>
      <p className="dx-facet-title">{title}</p>
      <ul>
        {shown}
        {rest.length > 0 ? (
          <li className="dx-facet-more">
            <details open={openMore}>
              <summary>
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>
                {more}
              </summary>
              <ul>{rest}</ul>
            </details>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function FacetLink({
  active,
  href,
  count,
  icon,
  note,
  children,
}: {
  active: boolean;
  href: string;
  count: number;
  icon?: React.ReactNode;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <InstantLink
        className={`dx-facet-link ${active ? "is-active" : ""}`}
        aria-current={active ? "true" : undefined}
        href={href}
      >
        {icon}
        <span className="dx-facet-label">
          {children}
          {note ? <small>{note}</small> : null}
        </span>
        <span className="dx-facet-count">{count}</span>
      </InstantLink>
    </li>
  );
}

/**
 * One badge on a row. When it names people, their GitHub avatars ride along —
 * a face is what makes "a friend has been here" believable — and the badge
 * links to the first of them: their profile here when the badge comes from
 * members' own records, their GitHub otherwise.
 */
function BadgeChip({ badge, locale }: { badge: Badge; locale: Locale }) {
  const people = badgePeople(badge);
  const label = badgeLabel(badge, locale);
  const title = people.length > 0 ? `${label}: ${people.map((person) => `@${person}`).join(", ")}` : label;
  const content = (
    <>
      <BadgeIcon kind={badge.kind} />
      <span>{label}</span>
      {people.length > 0 ? (
        <span className="dx-badge-faces" aria-hidden="true">
          {people.slice(0, 3).map((person) => (
            // GitHub serves a small avatar at this address for any username;
            // next/image would need the host allow-listed for a 20px picture.
            // eslint-disable-next-line @next/next/no-img-element
            <img key={person} src={`https://github.com/${person}.png?size=40`} alt="" width={18} height={18} loading="lazy" />
          ))}
        </span>
      ) : null}
    </>
  );

  const profile = badge.profiles?.[0];

  return (
    <li className={`dx-badge dx-badge-${badge.kind}`} title={title}>
      {profile ? (
        <Link href={`/u/${profile}`} aria-label={title}>{content}</Link>
      ) : people.length > 0 ? (
        <a href={`https://github.com/${people[0]}`} target="_blank" rel="noopener noreferrer" aria-label={title}>{content}</a>
      ) : (
        content
      )}
    </li>
  );
}

function BadgeIcon({ kind }: { kind: BadgeKind }) {
  if (kind === "indonesian") {
    return (
      <svg className="dx-badge-icon dx-flag" viewBox="0 0 16 12" aria-hidden="true">
        <rect width="16" height="6" fill="#e70011" />
        <rect y="6" width="16" height="6" fill="#fff" />
        <rect x=".5" y=".5" width="15" height="11" fill="none" stroke="#d4d4d8" />
      </svg>
    );
  }
  if (kind === "in-our-group") {
    return (
      <svg className="dx-badge-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.5M17.5 14a5 5 0 0 1 3 5" />
      </svg>
    );
  }
  return (
    <svg className="dx-badge-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4.5 4.5L19 7" />
    </svg>
  );
}

function LanguageDot({ language }: { language: string }) {
  return <span className="dx-lang-dot" style={{ background: LANGUAGE_COLOURS[language] ?? "#a1a1aa" }} aria-hidden="true" />;
}

function TrackIcon({ track }: { track: DirectoryTrack }) {
  return track === "github" ? (
    <svg className="dx-track-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" stroke="none" d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.58 9.58 0 0 1 5 0c1.91-1.3 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
    </svg>
  ) : (
    <svg className="dx-track-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

function DirectoryRow({ entry, locale }: { entry: DirectoryEntry; locale: Locale }) {
  const external = { target: "_blank", rel: "noopener noreferrer" };
  const owner = entry.kind === "product" ? tx(locale, `oleh ${entry.owner}`, `by ${entry.owner}`) : entry.owner;
  const code = entry.track === "github";
  const issues = code && entry.actionKind === "issues";
  // On the code path a card reads like a row of GitHub's repository list:
  // titled `owner/repo` in GitHub's own spelling, the owner's avatar beside
  // it, no separate repo or website links — the title is the repo link.
  const slug = entry.links.find((link) => link.kind === "github")?.label ?? `${entry.owner}/${entry.name}`;
  const title = code ? slug : entry.name;
  const avatar = code ? `https://github.com/${encodeURIComponent(slug.split("/")[0])}.png?size=80` : entry.logoUrl;

  return (
    // A repository not taking PRs stays findable for its code, but recedes.
    <div className={`dx-row ${entry.prTier && !entry.welcomesPRs && entry.track === "github" ? "dx-row-quiet" : ""}`} role="row">
      <div className="dx-cell-main" role="cell">
        <ProjectLogo
          className={`dx-logo ${code ? "dx-logo-avatar" : ""}`}
          title={title}
          website={code ? "" : entry.website}
          logoUrl={avatar}
          fallback={title.slice(0, 1).toUpperCase()}
        />
        <div className="dx-main-copy">
          <p className="dx-name">
            {entry.href.startsWith("http") ? (
              <a href={entry.href} {...external}>{title}</a>
            ) : (
              <Link href={entry.href}>{title}</Link>
            )}
            {/* The PR status belongs to the code path. A product asking for
                both simply appears on both tabs; neither card points at the
                other. */}
            {code && entry.prTier ? (
              <span className={`dx-prs dx-prs-${entry.prTier}`}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="6" cy="6" r="2.5" /><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="18" r="2.5" />
                  <path d="M6 8.5v7M18 15.5V9a3 3 0 0 0-3-3h-4m2-2.5L10.5 6 13 8.5" />
                </svg>
                {prTierLabel(entry.prTier, locale)}
              </span>
            ) : null}
            {code ? null : <span className="dx-owner">{owner}</span>}
          </p>
          {!code && entry.links.length > 0 ? (
            <p className="dx-links">
              {/* Icons only: the repo's name is already the card's title, and
                  the address is a hover away. */}
              {entry.links.map((link) => {
                const label = `${link.kind === "github" ? "GitHub" : tx(locale, "Situs", "Website")}: ${link.label}`;
                return (
                  <a key={link.kind} className="dx-icon-link" href={link.href} title={label} aria-label={label} {...external}>
                    <LinkIcon kind={link.kind} className="dx-link-icon" />
                  </a>
                );
              })}
            </p>
          ) : null}
          {entry.description ? <p className="dx-desc">{entry.description}</p> : null}
          {entry.badges.length > 0 ? (
            <ul className="dx-badges" aria-label={tx(locale, "Tanda", "Signals")}>
              {entry.badges.map((badge) => <BadgeChip key={badge.kind} badge={badge} locale={locale} />)}
            </ul>
          ) : null}
          {entry.track === "github" && entry.labels.length > 0 ? (
            <p className="dx-tags">
              {entry.labels.map((label) => <span key={label} className="dx-tag">{label}</span>)}
            </p>
          ) : null}
          {/* GitHub's own footer line: language · stars · last push. The
              count lives here, apart from the Star button that changes it. */}
          {code && (entry.language || entry.stars !== null || entry.updatedAt || issues) ? (
            <p className="dx-meta">
              {entry.language ? <span className="dx-lang"><LanguageDot language={entry.language} />{entry.language}</span> : null}
              {entry.stars !== null && entry.repo ? <StarCount repo={entry.repo} stars={entry.stars} /> : null}
              {entry.updatedAt ? (
                <span>
                  {tx(locale, "Diperbarui ", "Updated ")}
                  <RelativeTime value={entry.updatedAt} locale={locale} />
                </span>
              ) : null}
              {/* Where a first PR starts. */}
              {issues ? (
                <a className="dx-issues-link" href={entry.actionHref} {...external}>
                  <svg className="dx-link-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
                  </svg>
                  {entry.kind === "repo" ? tx(locale, "Isu pemula", "Starter issues") : tx(locale, "Isu", "Issues")}
                </a>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>

      {/* The roles column is the role path's only; on the code path the
          language sits in the card's meta line instead. */}
      {code ? null : (
        <div className="dx-cell-meta" role="cell">
          <span className="dx-roles">
            {/* The column header says this on a wide table; a stacked card
                has no header, so the chips would otherwise be unexplained. */}
            <span className="dx-roles-label">{tx(locale, "Mencari:", "Looking for:")}</span>
            {entry.labels.slice(0, 2).map((label) => <span key={label} className="dx-role">{label}</span>)}
            {entry.labels.length > 2 ? <span className="dx-muted">+{entry.labels.length - 2}</span> : null}
          </span>
        </div>
      )}

      <div className="dx-cell-action" role="cell">
        {/* On the code path the row ends like a GitHub search result: the Star
            button. Elsewhere, the way in. */}
        {code && entry.repo ? (
          <StarButton repo={entry.repo} />
        ) : entry.external ? (
          <a className="dx-action" href={entry.actionHref} {...external}>
            {tx(locale, "Repo", "Repo")} <span aria-hidden="true">↗</span>
          </a>
        ) : (
          <Link className="dx-action" href={entry.actionHref}>
            {tx(locale, "Ajukan diri", "Offer to help")} <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
    </div>
  );
}
