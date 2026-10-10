import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "@/app/components/responsive-link";
import { shareCard } from "../content";
import { CollaborationTrail, initials } from "../components/pieces";
import { Arrow, SiteFooter, SiteHeader } from "../components/shell";
import { ProjectLogo } from "../components/project-logo";
import { RotatingHeadline } from "../components/rotating-headline";
import {
  listPeople,
  listProjects,
  listRecentActivity,
  type Person,
  type ProjectSummary,
} from "../lib/data";
import { Skeleton } from "../components/skeleton";
import { readPublicly } from "../lib/public-read";
import { projectBlurb } from "../lib/brief";
import { projectTypeLabel } from "../lib/project-types";
import { roleLabel } from "../lib/roles";
import { stageLabel } from "../lib/stages";
import { currentLocale } from "../lib/locale-server";
import { tx, type Locale } from "../lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  const title = tx(locale, "Builders — Tampilkan Karyamu dan Bangun Portofolio yang Berdampak", "Builders — Show Your Work and Build a Portfolio That Matters");
  const description = tx(locale, "Ruang publik untuk menampilkan karyamu, menunjukkan karya nyata, dan membuatmu lebih mudah ditemukan oleh tim yang tepat.", "A public place to build tech projects, show real work, and get discovered by the right team.");
  return { title, description, alternates: { canonical: "/" }, openGraph: shareCard({ title, description, url: "/" }) };
}

const USE_CASES = [
  ["Membangun secara terbuka agar orang dapat melihatnya", "Building in public, so people can see"],
  ["Menemukan kolaborator untuk tumbuh bersama", "Finding a collaborator, to grow together"],
  ["Mengubah karya menjadi portofolio", "Turning work into a portfolio"],
  ["Terhubung dengan orang yang membutuhkanmu", "Connected by people who need you"],
];

const WORKFLOW = [
  ["Cantumkan proyek", "List a project", "Tuliskan masalahnya, sasarannya, dan sudah sejauh apa pekerjaannya.", "Write down the problem, who it is for, and where the work stands."],
  ["Pilih cara proyek berjalan", "Choose how it lives", "Buka peran atau jadikan proyek sebagai catatan pengembangan publik.", "Open a role, or leave the project as a public build log."],
  ["Kolaborasi di proyek nyata", "Collaborate on real projects", "Ambil peran, kerjakan kontribusi nyata, dan bangun pengalaman yang dapat dibuktikan.", "Take a role, make a real contribution, and build experience you can prove."],
  ["Rilis dan simpan buktinya", "Ship and keep the proof", "Karya selesai dan kontribusi nyata masuk ke portofoliomu.", "Finished work and real contributions land on your portfolio."],
  ["Ditemukan oleh tim tech", "Get discovered by tech teams", "Profilmu masuk ke Talent Pool agar recruiter, hiring manager, dan tim tech dapat melihat buktinya.", "Your profile enters the Talent Pool so recruiters, hiring managers, and tech teams can see the evidence."],
] as const;

export default async function Home() {
  const [projectsResult, peopleResult, activityResult, askingResult, locale] = await Promise.all([
    readPublicly("projects on the home page", () => listProjects({ lane: "newest" }), []),
    readPublicly("people on the home page", () => listPeople(400), []),
    readPublicly("recent collaboration on the home page", () => listRecentActivity(5), []),
    readPublicly("projects asking for a role", () => listProjects({ lane: "needs-help" }), []),
    currentLocale(),
  ]);
  const projects = projectsResult.value;
  const people = peopleResult.value;
  const activity = activityResult.value;
  // Only the ones that actually name a role: "mencari kolaborator" with nothing
  // said about what for is not an invitation anybody can answer.
  const asking = askingResult.value.filter((project) => project.openRoles.length > 0).slice(0, 4);
  const dataUnavailable = [projectsResult, peopleResult, activityResult, askingResult]
    .some((result) => result.unavailable);
  const openRoles = projects.reduce((total, project) => total + project.openSeatCount, 0);

  return (
    <>
      <SiteHeader returnTo="/" active="home" />

      <main id="main-content" className="landing-page">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero-copy">
            <RotatingHeadline />
            <p className="landing-hero-lead">
              {tx(locale, "Ruang publik untuk membangun dan mengembangkan proyek techmu, membuktikan keahlianmu, dan berkolaborasi.", "A public place to build and grow your tech project, prove your skill and collaborate.")}
            </p>

            <div className="home-hero-actions" aria-label={tx(locale, "Mulai menggunakan Builders", "Get started with Builders")}>
              <Link className="home-hero-primary" href="/new">
                <span aria-hidden="true">+</span> {tx(locale, "Tambah proyek", "Add a project")}
              </Link>
              <Link className="home-hero-secondary" href="/explore">
                {tx(locale, "Jelajahi proyek", "Browse projects")} <Arrow />
              </Link>
            </div>

            <div className="landing-counts" aria-label={tx(locale, "Aktivitas Builders saat ini", "Current Builders activity")}>
              <span className="landing-count">
                <strong>{people.length}</strong>
                <span>{tx(locale, "orang", "people")}</span>
              </span>
              <span className="landing-count">
                <strong>{projects.length}</strong>
                <span>{tx(locale, "proyek", "projects")}</span>
              </span>
              <span className="landing-count">
                <strong>{openRoles}</strong>
                <span>{tx(locale, "peran terbuka", "open roles")}</span>
              </span>
            </div>
          </div>
        </section>

        {dataUnavailable ? (
          <p className="public-data-notice" role="status">
            {tx(locale, "Sebagian data terbaru tidak dapat dimuat.", "Some live data could not be loaded.")} <Link href="/">{tx(locale, "Muat ulang halaman ini", "Refresh this page")}</Link>.
          </p>
        ) : null}

        <section className="landing-project-feature solo-builder-feature" aria-labelledby="solo-builder-title">
          <div className="landing-project-feature-head">
            <div>
              <p className="home-eyebrow">{tx(locale, "Untuk solo builder", "For solo builders")}</p>
              <h2 id="solo-builder-title">
                {tx(locale, "Jangan sampai proyekmu berhenti dan stuck di kamu sendirian.", "Don't let your project stop and get stuck with just you.")}
              </h2>
            </div>
            <p>
              {tx(
                locale,
                "Di sini kamu bisa cari orang untuk berkolaborasi dan membuat proyekmu terus bertumbuh — bukan cuma jadi folder yang didiamkan.",
                "Find people to collaborate with here, and keep your project growing — instead of it becoming a folder nobody touches again.",
              )}
            </p>
          </div>

          <div className="landing-index-filters" aria-label={tx(locale, "Manfaat berkolaborasi", "Benefits of collaborating")}>
            <span>✅ {tx(locale, "Buka peran", "Open roles")}</span><span>✅ {tx(locale, "Cari kolaborator", "Find collaborators")}</span><span>✅ {tx(locale, "Bagi kepemilikan", "Share ownership")}</span><span>✅ {tx(locale, "Proyek tetap jalan", "Keep it moving")}</span>
          </div>

          <div className="solo-builder-panels">
            <div className="solo-builder-panel" aria-labelledby="contribution-activity-title">
              <div className="solo-builder-panel-head">
                <div>
                  <p className="home-eyebrow">{tx(locale, "Sedang terjadi", "Happening now")}</p>
                  <h3 id="contribution-activity-title">{tx(locale, "Aktivitas kontribusi", "Contribution activity")}</h3>
                </div>
                <span className="live-dot" title={tx(locale, "Diperbarui dari aktivitas proyek", "Updated from project activity")} />
              </div>
              <p className="solo-builder-panel-note">
                {tx(locale, "Kontribusi nyata yang baru saja terjadi di proyek orang lain.", "Real contributions that just happened on other people's projects.")}
              </p>
              {/* The trail reads the clock for "2 hari lalu", so it arrives at
                  request time behind its own boundary rather than holding the
                  rest of the page back. */}
              <Suspense fallback={<Skeleton height={196} />}>
                <CollaborationTrail
                  events={activity}
                  locale={locale}
                  emptyNote={tx(locale, "Belum ada aktivitas. Jadilah yang pertama berkontribusi.", "No activity yet. Be the first to contribute.")}
                />
              </Suspense>
              <Link className="solo-builder-panel-link" href="/explore?lane=active">
                {tx(locale, "Lihat proyek yang sedang bergerak", "See the projects on the move")} <Arrow />
              </Link>
            </div>

            <div className="solo-builder-panel" aria-labelledby="asking-for-role-title">
              <div className="solo-builder-panel-head">
                <div>
                  <p className="home-eyebrow">{tx(locale, "Sedang dicari", "Wanted right now")}</p>
                  <h3 id="asking-for-role-title">{tx(locale, "Proyek ini mencari peran apa", "Which project needs which role")}</h3>
                </div>
              </div>
              <p className="solo-builder-panel-note">
                {tx(locale, "Proyek yang sudah menyebutkan peran yang mereka butuhkan.", "Projects that have already named the role they need.")}
              </p>
              {asking.length > 0 ? (
                <ul className="role-wanted-list">
                  {asking.map((project) => (
                    <li key={project.id}>
                      <Link href={`/projects/${project.slug}`}>
                        <strong>{project.title}</strong>
                        <small>{stageLabel(project.stage, locale)}</small>
                      </Link>
                      <span className="role-wanted-roles" aria-label={tx(locale, `Peran yang dicari ${project.title}`, `Roles ${project.title} is looking for`)}>
                        {project.openRoles.slice(0, 2).map((role) => (
                          <i key={role}>{roleLabel(role, "", locale)}</i>
                        ))}
                        {project.openRoles.length > 2 ? <i>+{project.openRoles.length - 2}</i> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="solo-builder-panel-empty">
                  {tx(locale, "Belum ada peran yang dibuka. Proyekmu bisa jadi yang pertama.", "No roles are open yet. Yours could be the first.")}
                </p>
              )}
              <Link className="solo-builder-panel-link" href="/explore?needs=open">
                {tx(locale, "Lihat semua peran yang dicari", "See every role being asked for")} <Arrow />
              </Link>
            </div>
          </div>

          <Link className="landing-inline-link" href="/new">
            {tx(locale, "Cantumkan proyek dan buka peran", "List your project and open a role")} <Arrow />
          </Link>
        </section>

        <section className="landing-use-cases" aria-labelledby="use-cases-title">
          <div className="landing-section-intro">
            <p className="home-eyebrow">{tx(locale, "Mengapa upload karyamu di sini?", "Why share your project here?")}</p>
            <h2 id="use-cases-title">{tx(locale, "Bagikan proyekmu agar dilihat semua.", "Put your project, so everyone can see.")}</h2>
            <p className="landing-section-lead">{tx(locale, "Setelah dibagikan, kamu dapat:", "Once you share it, you can:")}</p>
          </div>

          <div className="use-case-layout">
            <ul className="use-case-list">
              {USE_CASES.map(([idCopy, enCopy]) => (
                <li key={enCopy}><span aria-hidden="true">↗</span>{tx(locale, idCopy, enCopy)}</li>
              ))}
            </ul>
          </div>

          <Link className="landing-inline-link" href="/explore">
            {tx(locale, "Lihat contoh proyek", "See example projects")} <Arrow />
          </Link>
        </section>

        <section className="landing-project-feature" id="projects" aria-labelledby="project-feature-title">
          <div className="landing-project-feature-head">
            <div>
              <p className="home-eyebrow">01 · {tx(locale, "Galeri Proyek", "Project Showcase")}</p>
              <h2 id="project-feature-title">{tx(locale, "Satu proyek yang dibagikan membuka banyak peluang.", "One shared project creates multiple opportunities.")}</h2>
            </div>
          </div>

          <div className="landing-index-filters" aria-label={tx(locale, "Contoh filter proyek", "Example project filters")}>
            <span>✅ {tx(locale, "Mudah dicari", "Searchable")}</span><span>✅ {tx(locale, "Menginspirasi dan terinspirasi", "Inspire and get inspired")}</span><span>✅ {tx(locale, "Tumbuh bersama kontributor", "Grow with contributors")}</span><span>✅ {tx(locale, "Temukan kolaborator", "Find collaborators")}</span>
          </div>

          {projects.length > 0 ? (
            <div className="landing-project-index">
              {projects.slice(0, 3).map((project) => <ProjectIndexRow key={project.id} project={project} locale={locale} />)}
            </div>
          ) : (
            <p className="landing-data-empty">{tx(locale, "Belum ada proyek. Tambahkan karya pertama.", "No projects yet. Add the first piece of work.")}</p>
          )}

          <Link className="landing-inline-link" href="/explore">{tx(locale, "Jelajahi semua proyek", "Browse all projects")} <Arrow /></Link>
        </section>

        <section className="portfolio-story" id="portfolio" aria-labelledby="portfolio-story-title">
          <div className="portfolio-story-copy">
            <p className="home-eyebrow">02 · {tx(locale, "Pembuat portofolio", "Portfolio builder")}</p>
            <h2 id="portfolio-story-title">{tx(locale, "Capek ngurus web portofolio sendirian?", "Tired of maintaining a portfolio on your own?")}</h2>
            <p>
              {tx(locale, "Profilmu mengumpulkan proyek, kontribusi, dan peran yang benar-benar dijalani. Satu tautan yang terus berkembang setiap kali sesuatu dirilis.", "Your profile collects projects, contributions, and the roles that actually happened. One link that grows every time something ships.")}
            </p>
            <ul>
              <li><span>01</span> {tx(locale, "Portofolio pribadi yang berpusat pada proyek", "A project-first personal portfolio")}</li>
              <li><span>02</span> {tx(locale, "Tidak perlu deployment", "No deployment required")}</li>
              <li><span>03</span> {tx(locale, "Keahlian dibuktikan melalui karya yang dirilis", "Skills proven by shipped work")}</li>
            </ul>
            <a className="portfolio-story-link" href="https://builders.swegrowth.id/u/zikrul-ihsan">
              {tx(locale, "Lihat portofolio aktif", "See a live portfolio")} <Arrow />
            </a>
          </div>

          <a
            className="portfolio-preview"
            href="https://builders.swegrowth.id/u/zikrul-ihsan"
            aria-label={tx(locale, "Lihat portofolio Zikrul Ihsan", "See Zikrul Ihsan's portfolio")}
          >
            <div className="portfolio-preview-label">
              <span>{tx(locale, "PORTOFOLIO BERBASIS KARYA", "WORK-BUILT PORTFOLIO")}</span>
              <i><b /> {tx(locale, "Profil aktif", "Active profile")}</i>
            </div>
            <div className="portfolio-preview-person">
              <span className="portfolio-preview-avatar" aria-hidden="true">ZI</span>
              <div>
                <h3>Zikrul Ihsan</h3>
                <p>{tx(locale, "Insinyur Perangkat Lunak · Penggerak Komunitas", "Software Engineer · Community Builder")}</p>
              </div>
            </div>
            <p className="portfolio-preview-bio">
              {tx(locale, "Membangun produk digital, komunitas, dan proyek publik yang bermanfaat.", "Building digital products, communities, and useful public projects.")}
            </p>
            <ul className="portfolio-preview-skills" aria-label={tx(locale, "Keahlian Zikrul Ihsan", "Zikrul Ihsan's skills")}>
              <li>{tx(locale, "5 tahun", "5 years")}</li><li>Python</li><li>{tx(locale, "Rekayasa AI", "AI Engineering")}</li>
            </ul>
            <div className="portfolio-preview-proof">
              <div><strong>6</strong><span>{tx(locale, "proyek dibangun", "projects built")}</span></div>
              <div><span>{tx(locale, "Karya pilihan", "Selected work")}</span><p>Swegrowth · Main Aman · CariKontak</p></div>
            </div>
            <span className="portfolio-preview-url"><span>builders.swegrowth.id/u/zikrul-ihsan</span> <Arrow diagonal /></span>
          </a>
        </section>

        <section className="talent-story" aria-labelledby="talent-story-title">
          <div className="talent-story-copy">
            <p className="home-eyebrow">03 · Talent pool</p>
            <h2 id="talent-story-title">{tx(locale, "Lengkapi profil profesionalmu agar ditemukan oleh recruiters", "Complete your professional profile, then get discovered by recruiters")}</h2>
            <p>
              {tx(locale, "Kolaborasi di proyek tech membangun pengalaman nyata. Talent Pool menghubungkanmu dengan recruiter, hiring manager, dan tim tech.", "Collaborating on tech projects builds real experience. Talent Pool connects you with recruiters, hiring managers, and tech teams.")}
            </p>
            <ul>
              <li><span>✓</span> {tx(locale, "Recruiter dapat menemukan tech talent melalui peran, keahlian, dan status peluang", "Recruiters can find tech talent through role, skills, and opportunity status")}</li>
              <li><span>✓</span> {tx(locale, "Hiring manager dapat menilai keahlianmu dari proyek yang kamu kerjakan", "Hiring managers can assess your skills through the projects you worked on")}</li>
              <li><span>✓</span> {tx(locale, "Tim tech dapat menemukan rekan yang tepat untuk diajak bekerja bersama", "Tech teams can find the right people to work with")}</li>
            </ul>
            <Link className="talent-story-link" href="/people">{tx(locale, "Jelajahi tech talent", "Browse tech talent")} <Arrow /></Link>
          </div>

          <div className="talent-preview" aria-label={tx(locale, "Tech talent di Builders", "Tech talent on Builders")}>
            <div className="talent-preview-head">
              <span>{tx(locale, "Tech talent dengan karya yang terlihat", "Tech talent with visible work")}</span>
              <Link href="/people">{tx(locale, "Lihat semua", "View all")}</Link>
            </div>
            {people.length > 0 ? (
              <ul>
                {people.slice(0, 3).map((person) => <TalentRow key={person.id} person={person} locale={locale} />)}
              </ul>
            ) : (
              <div className="talent-preview-empty"><p>{tx(locale, "Belum ada profil.", "No profiles yet.")}</p><Link href="/signup">{tx(locale, "Buat profilmu", "Create yours")}</Link></div>
            )}
          </div>
        </section>

        <section className="how-it-works" aria-labelledby="how-title">
          <div className="how-heading">
            <div>
              <p className="home-eyebrow">{tx(locale, "Cara semuanya terhubung", "How it fits together")}</p>
              <h2 id="how-title">{tx(locale, "Cara memulai 🏁", "How to get started 🏁")}</h2>
            </div>
            <p>{tx(locale, "Cantumkan karya sekali saja. Indeks proyek, portofolio, dan talent pool berkembang dari bukti yang sama.", "List the work once. The project index, portfolio, and talent pool grow from the same evidence.")}</p>
          </div>
          <ol className="how-steps how-steps-five">
            {WORKFLOW.map(([titleId, titleEn, bodyId, bodyEn], index) => (
              <li key={titleEn}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div className="how-step-mark" aria-hidden="true">{index + 1}</div>
                <h3>{tx(locale, titleId, titleEn)}</h3>
                <p>{tx(locale, bodyId, bodyEn)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="landing-final-cta" aria-labelledby="final-cta-title">
          <p className="home-eyebrow">{tx(locale, "Mulai dari kamu", "Start with you")}</p>
          <h2 id="final-cta-title">{tx(locale, "Tampilkan karya agar orang dapat melihatnya.", "Show your work so people can see it.")}</h2>
          <p>{tx(locale, "Tambahkan proyek meski masih berupa ide. Perbarui seiring perkembangannya.", "Add a project even if it's still an idea. Update it as it moves.")}</p>
          <div>
            <Link className="home-hero-primary" href="/new"><span aria-hidden="true">+</span> {tx(locale, "Tambah proyek", "Add a project")}</Link>
            <Link className="landing-final-secondary" href="/explore">{tx(locale, "Temukan tempat untuk berkontribusi", "Find a place to contribute")} <Arrow /></Link>
          </div>
          <small>{tx(locale, "Gratis untuk komunitas.", "Free for the community.")}</small>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

function ProjectIndexRow({ project, locale }: { project: ProjectSummary; locale: Locale }) {
  const openRole = project.openRoles[0];
  return (
    <article className="landing-index-row">
      <ProjectLogo title={project.title} website={project.liveUrl} logoUrl={project.logoUrl} />
      <div className="landing-index-main">
        <p>
          <span>{stageLabel(project.stage, locale)}</span>
          {projectTypeLabel(project.projectType, locale) ? ` · ${projectTypeLabel(project.projectType, locale)}` : ""}
          {project.tags[0] ? ` · ${project.tags[0]}` : ""}
        </p>
        <h3><Link className="card-cover-link" href={`/projects/${project.slug}`}>{project.title}</Link></h3>
        <p>{projectBlurb(project)}</p>
      </div>
      <div className="landing-index-role">
        <small>{openRole ? tx(locale, "Peran terbuka", "Open role") : tx(locale, "Catatan pengembangan", "Build log")}</small>
        <strong>{openRole ? roleLabel(openRole, "", locale) : tx(locale, "Tidak ada peran terbuka", "No role open")}</strong>
      </div>
      <Link className="landing-index-owner" href={`/u/${project.owner.username}`}>
        <span aria-hidden="true">{initials(project.owner.name)}</span>
        <small>{project.owner.name}</small>
      </Link>
    </article>
  );
}

function TalentRow({ person, locale }: { person: Person; locale: Locale }) {
  return (
    <li>
      <Link href={`/u/${person.username}`}>
        <span className="talent-avatar" aria-hidden="true">{initials(person.name)}</span>
        <span className="talent-person-copy">
          <strong>{person.name}</strong>
          <small>{person.profession || person.headline || tx(locale, "Pengembang", "Builder")}</small>
        </span>
        <span className="talent-skills" aria-label={tx(locale, `Keahlian ${person.name}`, `${person.name}'s skills`)}>
          {person.skills.slice(0, 2).map((skill) => <i key={skill}>{skill}</i>)}
        </span>
        <Arrow />
      </Link>
    </li>
  );
}
