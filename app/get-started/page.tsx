import type { Metadata } from "next";
import Link from "@/app/components/responsive-link";
import { redirect } from "next/navigation";
import { setNow } from "../actions";
import { SiteFooter, SiteHeader } from "../components/shell";
import { StageBadge } from "../components/pieces";
import { ProjectLogo } from "../components/project-logo";
import { SubmitButton } from "../components/submit-button";
import { MAXIMUM } from "../lib/brief";
import { getPortfolio, type ProjectSummary } from "../lib/data";
import { nextSteps, remainingSteps, type NextStep } from "../lib/next-steps";
import { currentViewer } from "../lib/session";
import { signInPath } from "../lib/urls";
import { currentLocale } from "../lib/locale-server";
import { tx } from "../lib/locale";

/*
 * Allowed to block — same reason as /inbox. The whole page is one person's
 * own state, there is nothing cacheable to paint before knowing who is asking,
 * and a visitor about to be redirected should not watch it render first.
 */
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  return {
    title: tx(locale, "Langkah berikutnya — Builders", "Next steps — Builders"),
    description: tx(locale, "Langkah yang tersisa agar proyekmu terlihat dan profilmu mudah ditemukan.", "What remains to make your projects visible and your profile discoverable."),
    robots: { index: false },
  };
}

/**
 * Where signing in lands, until there is nothing left to do here.
 *
 * A named list, not a progress bar: `docs/redesign-showcase.md` threw the
 * brief's completeness percentage out because a number turns a story into a
 * form to finish, and that argument does not stop being true one page over.
 * Each line says what it is for and links straight at the thing that does it.
 *
 * Nothing here blocks anybody. Every step can be skipped, and once none are
 * owed the page forwards to the board instead of standing in the way of every
 * future sign-in — `?all=1` keeps it reachable on purpose from the menu.
 */
export default async function StartPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [viewer, locale] = await Promise.all([currentViewer(), currentLocale()]);
  if (!viewer) redirect(signInPath("/get-started"));

  const query = (await searchParams) ?? {};
  const keepOpen = query.all === "1";

  const { owned, contributing } = await getPortfolio(viewer);
  const steps = nextSteps({ person: viewer, owned, contributing, locale });
  const remaining = remainingSteps(steps);
  if (remaining.length === 0 && !keepOpen) redirect("/");

  const [owed, extras] = [steps.filter((step) => !step.optional), steps.filter((step) => step.optional)];
  const firstName = viewer.name.split(" ")[0];

  return (
    <>
      <SiteHeader returnTo="/get-started" />

      <main id="main-content" className="page-narrow start-page">
        <p className="eyebrow">
          <span /> {tx(locale, "Langkah berikutnya", "Next steps")}
        </p>
        <h1>{tx(locale, `Halo, ${firstName}.`, `Hello, ${firstName}.`)}</h1>
        <p className="lede">
          {remaining.length === 0
            ? tx(locale, "Kamu telah menyelesaikan semua langkah. Gunakan pilihan di bawah untuk memperbaruinya kembali.", "You have completed all the steps. Use the options below to update them again.")
            : tx(locale, `${remaining.length} langkah tersisa agar proyekmu terlihat dan profilmu mudah ditemukan. Tidak ada yang wajib diselesaikan sekarang.`, `${remaining.length} steps remain to make your projects visible and your profile discoverable. None are required right now.`)}
        </p>

        <ol className="next-steps">
          {owed.map((step) => (
            <StepRow key={step.id} step={step} locale={locale} />
          ))}
        </ol>

        {extras.length > 0 ? (
          <section className="next-step-optional" aria-labelledby="optional-heading">
            <h2 id="optional-heading" className="section-title">
              {tx(locale, "Jika kamu membutuhkannya", "If you need it")}
            </h2>
            <ol className="next-steps">
              {extras.map((step) => (
                <StepRow key={step.id} step={step} locale={locale} />
              ))}
            </ol>
          </section>
        ) : null}

        <section aria-labelledby="projects-heading">
          <h2 id="projects-heading" className="section-title">
            {tx(locale, "Proyekmu", "Your projects")}
          </h2>

          {owned.length === 0 ? (
            <p className="muted">
              {tx(locale, "Belum ada apa pun di sini.", "Nothing here yet.")} <Link href="/new">{tx(locale, "Tampilkan proyek pertamamu", "Show your first project")}</Link>—{tx(locale, "sebuah ide saja sudah cukup.", "an idea is enough.")}
            </p>
          ) : (
            <ul className="start-project-list">
              {owned.map((project) => (
                <StartProjectRow key={project.id} project={project} locale={locale} />
              ))}
            </ul>
          )}
        </section>

        <p className="start-skip">
          <Link href="/">{tx(locale, "Lewati untuk sekarang dan jelajahi papan proyek", "Skip for now and browse the board")}</Link>
        </p>
      </main>

      <SiteFooter />
    </>
  );
}

function StepRow({ step, locale }: { step: NextStep; locale: Awaited<ReturnType<typeof currentLocale>> }) {
  return (
    <li className={`next-step ${step.done ? "is-done" : ""}`}>
      <span className="next-step-mark" aria-hidden="true">
        {step.done ? "✓" : ""}
      </span>
      <div className="next-step-copy">
        <h3>
          {step.title}
          {step.done ? <span className="next-step-state"> · {tx(locale, "selesai", "done")}</span> : null}
        </h3>
        <p>{step.blurb}</p>
      </div>
      <Link className="next-step-cta" href={step.href}>
        {step.done ? tx(locale, "Edit", "Edit") : step.cta}
      </Link>
    </li>
  );
}

/**
 * One owned project with the three things its owner most often comes back for.
 *
 * The "sekarang sedang…" line is edited here rather than linked to, because it
 * otherwise lives inside a collapsed panel inside a tab on the project page —
 * far enough away that the line people read for freshness is the one least
 * likely to be kept fresh. `setNow` is the same action that panel calls.
 */
function StartProjectRow({ project, locale }: { project: ProjectSummary; locale: Awaited<ReturnType<typeof currentLocale>> }) {
  return (
    <li className="start-project-row">
      <div className="start-project-head">
        <ProjectLogo title={project.title} website={project.liveUrl} logoUrl={project.logoUrl} />
        <div className="start-project-title">
          <h3>
            <Link href={`/projects/${project.slug}`}>{project.title}</Link>
          </h3>
          <StageBadge stage={project.stage} />
        </div>
        <Link className="start-project-edit" href={`/projects/${project.slug}/edit`}>
          {tx(locale, "Edit brief", "Edit brief")}
        </Link>
      </div>

      <form className="start-now-form" action={setNow}>
        <input type="hidden" name="slug" value={project.slug} />
        <label htmlFor={`now-${project.slug}`}>{tx(locale, "Sedang dikerjakan…", "Working on now…")}</label>
        <div className="start-now-row">
          <input
            id={`now-${project.slug}`}
            name="now"
            type="text"
            maxLength={MAXIMUM.now}
            defaultValue={project.nowText}
            placeholder={tx(locale, "Contoh: Menyusun draf materi keamanan pertama.", "For example: Drafting the first safety materials.")}
          />
          <SubmitButton pendingLabel={tx(locale, "Menyimpan…", "Saving…")}>{tx(locale, "Simpan", "Save")}</SubmitButton>
        </div>
      </form>

      <p className="start-project-seats">
        {project.openSeatCount > 0
          ? tx(locale, `${project.openSeatCount} peran terbuka.`, `${project.openSeatCount} open roles.`)
          : tx(locale, "Belum ada peran terbuka.", "No open roles yet.")}{" "}
        <Link href={`/projects/${project.slug}?tab=collaboration`}>
          {project.openSeatCount > 0 ? tx(locale, "Lihat kolaborasi", "View collaboration") : tx(locale, "Buka peran", "Open a role")}
        </Link>
      </p>
    </li>
  );
}
