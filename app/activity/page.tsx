import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "@/app/components/responsive-link";
import { SiteFooter, SiteHeader } from "../components/shell";
import { ActivityView } from "../components/activity-view";
import { Skeleton } from "../components/skeleton";
import { shareCard } from "../content";
import { activityPath, readActivityFilters, readActivityPage } from "../lib/activity-url";
import { listActivityReactions, listGitHubActivity } from "../lib/data";
import { summarizeReactions } from "../lib/reactions";
import { currentViewer } from "../lib/session";
import { activityStats, dayKey, type GitHubActivityEntry } from "../lib/github-activity";
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
      <SiteHeader returnTo={query.then((values) => activityPath(readActivityFilters(values), readActivityPage(values)))} active="activity" />

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
  // Waiting for the request keeps the feed in the server's first answer,
  // filtered as the address asks; from then on it filters in the browser.
  await query;
  const [result, reactionRows, viewer] = await Promise.all([
    readPublicly<GitHubActivityEntry[]>("github activity", listGitHubActivity, []),
    readPublicly("activity reactions", listActivityReactions, []),
    currentViewer(),
  ]);
  const stats = activityStats(result.value);

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

      <ActivityView
        entries={result.value}
        reactions={summarizeReactions(reactionRows.value, viewer?.id ?? null)}
        viewerName={viewer ? viewer.name || viewer.username : null}
        today={dayKey(new Date(), "Asia/Jakarta")}
        locale={locale}
        unavailable={result.unavailable}
      />
    </>
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
