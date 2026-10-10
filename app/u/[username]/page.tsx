import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "@/app/components/responsive-link";
import { setActivityVisibility } from "../../actions";
import { SiteFooter, SiteHeader } from "../../components/shell";
import { ActivityList, ProjectCard, ProjectIconLink, monthYear } from "../../components/pieces";
import { LinkIcon, type LinkIconKind } from "../../components/link-icons";
import { PageScrollTop } from "../../components/project-scroll-top";
import { ShareProfileButton } from "../../components/share-profile-button";
import { AvailabilityBadges } from "../../components/availability-badges";
import { SubmitButton } from "../../components/submit-button";
import {
  getPerson,
  getPersonStats,
  getPortfolio,
  listPeople,
  listPersonActivity,
  type Contribution,
  type Person,
  type ProjectSummary,
} from "../../lib/data";
import { EVENT_KINDS, HIGHLIGHT_KINDS, eventKindLabel } from "../../lib/activity";
import { domainOf } from "../../lib/brief";
import { nextSteps, remainingSteps } from "../../lib/next-steps";
import { currentViewer } from "../../lib/session";
import { currentLocale } from "../../lib/locale-server";
import { tx, type Locale } from "../../lib/locale";

type Params = Promise<{ username: string }>;

/**
 * Pre-render a bounded set of public portfolios for direct links and shares.
 * Less frequently visited profiles are still cached on their first prefetch
 * or visit, without making a growing directory slow every deployment.
 */
export async function generateStaticParams(): Promise<{ username: string }[]> {
  try {
    const people = await listPeople(80);
    return people.slice(0, 32).map((person) => ({ username: person.username }));
  } catch (error) {
    console.warn("[ahsan] Profile detail was not prerendered:", error);
    return [];
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const [{ username }, locale] = await Promise.all([params, currentLocale()]);
  const person = await getPerson(username);
  if (!person) return { title: tx(locale, "Orang tidak ditemukan — Builders", "Person not found — Builders") };

  const description =
    person.headline || tx(locale, `Hal yang sedang dibangun dan dibantu ${person.name} di Builders.`, `What ${person.name} is building and contributing to on Builders.`);

  return {
    title: `${person.name} — Builders`,
    description,
    alternates: { canonical: `/u/${person.username}` },
    // The card image comes from opengraph-image.tsx beside this file.
    openGraph: {
      type: "profile",
      title: `${person.name} — Builders`,
      description,
      url: `/u/${person.username}`,
    },
  };
}

const TRAIL_PAGE = 40;

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { username } = await params;
  const query = (await searchParams) ?? {};
  const [person, viewer, locale] = await Promise.all([getPerson(username), currentViewer(), currentLocale()]);
  if (!person) notFound();

  // "Muat lebih lama" grows the limit instead of paging cursors: the list is
  // one request either way, and the URL stays shareable.
  const showAll = query.trail === "all";
  const rawLimit = Number(Array.isArray(query.limit) ? query.limit[0] : query.limit);
  const limit = Math.min(Number.isInteger(rawLimit) && rawLimit > 0 ? rawLimit : TRAIL_PAGE, 400);

  const isSelf = viewer?.id === person.id;
  const [{ owned, contributing }, activity, stats] = await Promise.all([
    getPortfolio(person),
    listPersonActivity(person.id, {
      limit: limit + 1,
      kinds: showAll ? undefined : HIGHLIGHT_KINDS,
      viewer,
    }),
    getPersonStats(person.id, viewer),
  ]);
  const hasOlder = activity.length > limit;
  const trail = activity.slice(0, limit);
  const profileProjects = Array.from(
    new Map([...owned, ...contributing].map((project) => [project.id, project])).values(),
  );
  const website = safeWebUrl(person.website);
  const github = safeWebUrl(person.github);
  const linkedin = safeWebUrl(person.linkedin);
  const x = safeWebUrl(person.x);
  const resume = safeWebUrl(person.resume);
  const publicEmail = safePublicEmail(person.publicEmail);
  const contacts: Array<{ href: string; icon: LinkIconKind; label: string; external: boolean }> = [
    ...(website
      ? [{ href: website, icon: "website" as const, label: domainOf(website) || "Website", external: true }]
      : []),
    ...(publicEmail
      ? [{ href: `mailto:${publicEmail}`, icon: "email" as const, label: publicEmail, external: false }]
      : []),
    ...(github
      ? [{ href: github, icon: "github" as const, label: "GitHub", external: true }]
      : []),
    ...(linkedin
      ? [{ href: linkedin, icon: "linkedin" as const, label: "LinkedIn", external: true }]
      : []),
    ...(x
      ? [{ href: x, icon: "x" as const, label: "X", external: true }]
      : []),
  ];

  const trailPath = (next: { trail?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (next.trail === "all") params.set("trail", "all");
    if (next.limit && next.limit > TRAIL_PAGE) params.set("limit", String(next.limit));
    const search = params.toString();
    return `/u/${person.username}${search ? `?${search}` : ""}#activity-heading`;
  };

  return (
    <>
      <PageScrollTop />
      <SiteHeader returnTo={`/u/${person.username}`} />

      <section className="profile-band">
        <div className="profile-band-inner profile-hero">
          <ShareProfileButton name={person.name} path={`/u/${person.username}`} />
          <div className="profile-hero-top">
            <div className="profile-hero-copy">
              <p className="eyebrow light">
                <span /> {tx(locale, "Portofolio pribadi", "Personal portfolio")}
              </p>
              <h1>{person.name}</h1>
              {person.profession ? <p className="profile-profession">{person.profession}</p> : null}
              {person.headline ? <p className="profile-headline">{person.headline}</p> : null}
              <AvailabilityBadges
                status={person.availability}
                fields={person.fields}
                skills={person.skills}
                locale={locale}
              />

              {contacts.length > 0 ? (
                <ul className="profile-contact-list" aria-label={tx(locale, `Tautan ${person.name}`, `${person.name}'s links`)}>
                  {contacts.map((contact) => (
                    <li key={`${contact.icon}-${contact.href}`}>
                      <a
                        href={contact.href}
                        target={contact.external ? "_blank" : undefined}
                        rel={contact.external ? "noreferrer" : undefined}
                      >
                        <LinkIcon kind={contact.icon} />
                        <span>{contact.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
              {resume ? (
                <div className="profile-hero-actions">
                  <a className="profile-resume-link" href={resume} target="_blank" rel="noreferrer">
                    <LinkIcon kind="resume" />
                <span>{tx(locale, "Unduh résumé", "Download résumé")}</span>
                  </a>
                </div>
              ) : null}
            </div>

            <aside className="profile-contributions" aria-labelledby="projects-heading">
              <p id="projects-heading" className="profile-summary-label">{tx(locale, "Proyek:", "Projects:")}</p>
              {profileProjects.length > 0 ? (
                <ul className="profile-project-icon-list">
                  {profileProjects.map((project) => (
                    <ProjectIconLink key={project.id} project={project} />
                  ))}
                </ul>
              ) : (
                <p className="profile-contribution-empty">{tx(locale, "Belum ada proyek yang tercatat.", "No projects recorded yet.")}</p>
              )}
            </aside>
          </div>

          <section className="profile-summary" aria-label={tx(locale, "Ringkasan profil", "Profile summary")}>
            <div className="profile-summary-copy">
              <p className="profile-summary-label">{tx(locale, "Ringkasan", "Summary")}</p>
              {person.bio ? <p className="profile-bio">{person.bio}</p> : null}
            </div>
            <div className="profile-summary-meta">
              {person.skills.length > 0 || person.fields.length > 0 || person.yearsExperience !== null ? (
                <ul className="profile-tags" aria-label={tx(locale, "Keahlian dan pengalaman", "Skills and experience")}>
                  {person.yearsExperience !== null ? <li>{tx(locale, `${person.yearsExperience} tahun pengalaman`, `${person.yearsExperience} years of experience`)}</li> : null}
                  {person.fields.map((field) => <li key={`field-${field}`}>{field}</li>)}
                  {person.skills.slice(0, 6).map((skill) => <li key={`skill-${skill}`}>{skill}</li>)}
                </ul>
              ) : null}
              <ul className="profile-stats">
                <li>
                  <strong>{owned.length}</strong>
                  <span>{tx(locale, "proyek dibangun", "projects built")}</span>
                </li>
                {contributing.length > 0 ? (
                  <li>
                    <strong>{contributing.length}</strong>
                    <span>{tx(locale, "proyek dibantu", "projects supported")}</span>
                  </li>
                ) : null}
                {stats.tasksDone > 0 ? (
                  <li>
                    <strong>{stats.tasksDone}</strong>
                    <span>{tx(locale, "tugas diselesaikan", "tasks completed")}</span>
                  </li>
                ) : null}
                {stats.since ? (
                  <li>
                    <strong>{monthYear(stats.since, locale)}</strong>
                    <span>{tx(locale, "aktif sejak", "active since")}</span>
                  </li>
                ) : null}
              </ul>
            </div>
          </section>
        </div>
      </section>

      <main id="main-content" className="profile-page">
        <div className="profile-content">
            {isSelf ? <SelfTools person={person} owned={owned} contributing={contributing} locale={locale} /> : null}

            <section aria-labelledby="owned-heading">
              <h2 id="owned-heading" className="section-title">
                {tx(locale, "Sedang berjalan", "In progress")}
              </h2>
              {owned.length === 0 ? (
                <p className="muted">
                  {tx(locale, "Belum ada proyek.", "No projects yet.")} {" "}
                  {isSelf ? <Link href="/new">{tx(locale, "Tampilkan proyek pertamamu", "Show your first")}</Link> : null}
                </p>
              ) : (
                <div className="profile-project-grid">
                  {owned.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              )}
            </section>

            <section aria-labelledby="activity-heading">
              <h2 id="activity-heading" className="section-title">
                {tx(locale, "Jejak karya", "Work trail")}
              </h2>
              <p className="trail-note">
                {tx(locale, "Jejak ini dicatat oleh sistem saat pekerjaan berlangsung—bukan ditambahkan setelahnya.", "This trail is recorded by the system when work happens—not added afterwards.")}
              </p>

              <div className="trail-modes">
                <Link className={showAll ? "" : "is-active"} href={trailPath({})}>
                  {tx(locale, "Sorotan", "Highlights")}
                </Link>
                <Link className={showAll ? "is-active" : ""} href={trailPath({ trail: "all" })}>
                  {tx(locale, "Jejak lengkap", "Full trail")}
                </Link>
              </div>

              {trail.length === 0 ? (
                <p className="muted">
                  {showAll ? tx(locale, "Belum ada entri.", "No entries yet.") : tx(locale, "Belum ada sorotan.", "No highlights yet.")}
                  {isSelf
                    ? tx(locale, " Karyamu di sini muncul secara otomatis—kamu tidak perlu menambahkannya secara manual.", " Your work here appears automatically—you do not need to add it manually.")
                    : ""}
                </p>
              ) : (
                <ActivityList events={trail} hidden={isSelf ? person.activityHidden : []} />
              )}

              {hasOlder ? (
                <p className="trail-more">
                  <Link
                    href={trailPath({
                      trail: showAll ? "all" : undefined,
                      limit: limit + TRAIL_PAGE,
                    })}
                  >
                    {tx(locale, "Muat entri sebelumnya", "Load earlier entries")}
                  </Link>
                </p>
              ) : null}

              {isSelf ? (
                <details className="owner-tool">
                  <summary>{tx(locale, "Pilih yang dapat dilihat", "Choose what is visible")}</summary>
                  <form action={setActivityVisibility}>
                    <p className="hint">
                      {tx(locale, "Item yang dicentang muncul di profil publikmu. Item yang tidak dicentang tetap hanya terlihat olehmu—tetap tercatat dan tidak dihapus.", "Checked items appear on your public profile. Unchecked items remain visible only to you—they are still recorded and are not deleted.")}
                    </p>
                    <ul className="kind-list">
                      {EVENT_KINDS.map((kind) => (
                        <li key={kind}>
                          <label htmlFor={`show-${kind}`}>
                            <input
                              id={`show-${kind}`}
                              type="checkbox"
                              name="show"
                              value={kind}
                              defaultChecked={!person.activityHidden.includes(kind)}
                            />
                            {eventKindLabel(kind, locale)}
                          </label>
                        </li>
                      ))}
                    </ul>
                    <SubmitButton pendingLabel={tx(locale, "Menyimpan…", "Saving…")}>{tx(locale, "Simpan", "Save")}</SubmitButton>
                  </form>
                </details>
              ) : null}
            </section>

        </div>
      </main>

      <SiteFooter />
    </>
  );
}

/**
 * What the owner of this page sees that nobody else does.
 *
 * The editor itself used to sit here, expanded from a `<summary>` — thirteen
 * inputs on the page whose whole job is to be shown to other people. It lives
 * at /account/profile now, and this is the doorway to it, plus the one line that
 * says what is still missing before the talent pool can match on anything.
 */
function SelfTools({
  person,
  owned,
  contributing,
  locale,
}: {
  person: Person;
  owned: ProjectSummary[];
  contributing: Contribution[];
  locale: Locale;
}) {
  const remaining = remainingSteps(nextSteps({ person, owned, contributing, locale }));

  return (
    <div className="profile-self-tools">
      <Link className="profile-edit-link" href="/account/profile">
        {tx(locale, "Edit profil", "Edit profile")}
      </Link>
      {remaining.length > 0 ? (
        <p className="profile-self-note">
          {tx(locale, `${remaining.length} langkah tersisa sebelum profilmu dapat ditemukan di talent pool.`, `${remaining.length} steps remain before your profile can be found in the talent pool.`)} {" "}
          <Link href="/get-started?all=1">{tx(locale, "Lihat langkah", "View steps")}</Link>
        </p>
      ) : null}
    </div>
  );
}

function safeWebUrl(value: string): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : "";
  } catch {
    return "";
  }
}

function safePublicEmail(value: string): string {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : "";
}
