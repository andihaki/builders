import Image from "next/image";
import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "@/app/components/responsive-link";
import { shareCard, waCommunityUrl } from "../content";
import { SiteFooter, SiteHeader } from "../components/shell";
import { Skeleton } from "../components/skeleton";
import { DirectoryView } from "../components/directory-view";
import { listOssMembers, listProjects, listRepoSignals } from "../lib/data";
import { readPublicly } from "../lib/public-read";
import { projectBlurb } from "../lib/brief";
import { productEntries, repoEntry, type DirectoryEntry } from "../lib/directory";
import { pathFor, readFilters } from "../lib/directory-url";
import { listOpenSourceRepos, signalsFor } from "../lib/open-source-live";
import { parseGitHubRepositoryUrl } from "../lib/github";
import { roleLabel } from "../lib/roles";
import { currentLocale } from "../lib/locale-server";
import { tx, type Locale } from "../lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  const title = tx(locale, "Builders — Direktori Project untuk Dikontribusikan", "Builders — A Directory of Projects to Contribute To");
  const description = tx(
    locale,
    "Kirim kode ke project open source di GitHub, atau bantu produk builders lewat peran lain. Pilih caramu, pilih project-nya, mulai.",
    "Send code to open source projects on GitHub, or help builders' products in another role. Pick your way, pick a project, start.",
  );
  return { title, description, alternates: { canonical: "/" }, openGraph: shareCard({ title, description, url: "/" }) };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * The directory, read like an index rather than a landing page.
 *
 * A sidebar of facets with their counts on the left — how you contribute,
 * where the project comes from, and its language or the role it wants — and a
 * dense table on the right: one row per project, the same columns down the
 * page, the button that starts the work always at the end of the row.
 */
export default async function Directory({ searchParams }: { searchParams?: SearchParams }) {
  const query = searchParams ?? Promise.resolve({});
  const locale = await currentLocale();

  return (
    <>
      <SiteHeader returnTo={query.then((value) => pathFor(readFilters(value)))} active="home" />

      <main id="main-content" className="dx-page">
        <header className="dx-head">
          <div>
            <h1>{tx(locale, "Direktori kontribusi", "Contribution directory")}</h1>
            <p className="dx-head-community">
              {locale === "id" ? (
                <>
                  Repo dan produk terkurasi dari <Link href="/about">komunitas builder dan kontributor swegrowth</Link>. Gabung untuk update
                  dan berbagi project pilihanmu.
                </>
              ) : (
                <>
                  Repos and products curated in the <Link href="/about">swegrowth builders and contributors community</Link>. Join for updates
                  and to share your preferred projects.
                </>
              )}
            </p>
            <div className="dx-head-actions">
              {waCommunityUrl ? (
                <a className="dx-wa-cta" href={waCommunityUrl} target="_blank" rel="noopener noreferrer">
                  <span className="dx-wa-icon" aria-hidden="true" />
                  Join WA Community
                </a>
              ) : null}
              <p className="dx-head-powered">
                Powered by
                <a href="https://swegrowth.id/" target="_blank" rel="noopener noreferrer">
                  <Image src="/swegrowth-logo.png" alt="Software Engineer Growth Community" width={25} height={24} />
                </a>
              </p>
            </div>
          </div>
          <Suspense fallback={null}>
            <HeadStats locale={locale} />
          </Suspense>
        </header>

        <Suspense fallback={<DirectorySkeleton />}>
          <DirectoryBody query={query} locale={locale} />
        </Suspense>
      </main>

      <SiteFooter />
    </>
  );
}

/**
 * Everything listed, both tracks. Every read underneath is cached, so the
 * heading's numbers and the list share one trip to the database.
 */
async function readDirectory(locale: Locale) {
  // GitHub's facts come from the database, read once and shared by catalogue
  // repos and products; nothing on this page calls GitHub.
  const signalsResult = await readPublicly("repository signals in the directory", () => listRepoSignals(), {});
  const signals = signalsResult.value;
  const [reposResult, projectsResult, membersResult] = await Promise.all([
    readPublicly("open source repos in the directory", () => listOpenSourceRepos(signals), []),
    readPublicly("products in the directory", () => listProjects({ lane: "active" }), []),
    readPublicly("members' open source records in the directory", () => listOssMembers(), []),
  ]);

  const repos = reposResult.value;
  const members = membersResult.value;
  const products = projectsResult.value.map((project) => {
    const repository = parseGitHubRepositoryUrl(project.repoUrl);
    const found = repository ? signalsFor(signals, repository.owner, repository.repo) : null;
    return { ...project, repoStats: found?.stats ?? null, repoActivity: found?.activity ?? null };
  });
  const entries: DirectoryEntry[] = [
    ...repos.filter((repo) => repo.list === "internal").map((repo) => repoEntry(repo, locale, members)),
    ...repos.filter((repo) => repo.list === "recommended").map((repo) => repoEntry(repo, locale, members)),
    ...products.flatMap((project) =>
      productEntries(project, projectBlurb, (role) => roleLabel(role, "", locale), locale),
    ),
  ];
  return { entries, members, unavailable: reposResult.unavailable || projectsResult.unavailable };
}

/** The directory in three numbers, beside the heading on a wide screen. */
async function HeadStats({ locale }: { locale: Locale }) {
  const { entries, members } = await readDirectory(locale);
  const stats = [
    { value: entries.filter((entry) => entry.track === "github").length, label: tx(locale, "Repo", "Repos") },
    { value: entries.filter((entry) => entry.track === "role").length, label: tx(locale, "Produk cari bantuan", "Products seeking help") },
    { value: members.length, label: tx(locale, "Terdaftar", "Registered") },
  ];
  return (
    <dl className="dx-head-stats">
      {stats.map((stat) => (
        <div key={stat.label}>
          <dt>{stat.label}</dt>
          <dd>{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}

async function DirectoryBody({ query, locale }: { query: SearchParams; locale: Locale }) {
  // Waiting for the request keeps the list in the server's first answer,
  // filtered as the address asks; from then on it filters in the browser.
  await query;
  const { entries, unavailable } = await readDirectory(locale);
  return <DirectoryView entries={entries} locale={locale} unavailable={unavailable} />;
}

function DirectorySkeleton() {
  return (
    <div className="dx-layout" aria-busy="true">
      <div className="dx-side">
        <Skeleton height={220} style={{ borderRadius: 8 }} />
      </div>
      <div className="dx-results">
        <Skeleton height={40} style={{ borderRadius: 8, marginBottom: 14 }} />
        {[0, 1, 2, 3, 4, 5].map((slot) => <Skeleton key={slot} height={78} style={{ borderRadius: 0, marginBottom: 1 }} />)}
      </div>
    </div>
  );
}
