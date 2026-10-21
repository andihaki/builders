import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "@/app/components/responsive-link";
import { deleteRepo, reviewRepo } from "../actions";
import { SiteFooter, SiteHeader } from "../components/shell";
import { RepoForm } from "../components/repo-form";
import { SubmitButton } from "../components/submit-button";
import { isSiteAdmin, listCatalogueForAdmin } from "../lib/data";
import { listLabel, reasonLabel, repoSlug, repoUrl, statusLabel, type OpenSourceRepo } from "../lib/open-source";
import { viewerId } from "../lib/session";
import { signInPath } from "../lib/urls";
import { currentLocale } from "../lib/locale-server";
import { tx, type Locale } from "../lib/locale";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  return { title: tx(locale, "Admin — Builders", "Admin — Builders"), robots: { index: false } };
}

/**
 * Where site admins curate the open source catalogue.
 *
 * Submissions waiting for a decision first — they are the queue — then what
 * the directory lists now, then what was turned down. An admin can also add a
 * repo directly, or edit any row (`?edit=<id>` opens its form at the top).
 *
 * Anybody who is not an admin gets a 404 rather than a refusal: the page is
 * not something to advertise. The policies on `oss_repos` hold either way.
 */
export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // All at once rather than one after another: each is its own trip to the
  // database, and the catalogue read is harmless for a non-admin — the
  // policies hand them only what they could see anyway, and they get a 404.
  const [viewer, locale, admin, all, query] = await Promise.all([
    viewerId(),
    currentLocale(),
    isSiteAdmin(),
    listCatalogueForAdmin(),
    searchParams ?? Promise.resolve({} as Record<string, string | string[] | undefined>),
  ]);
  if (!viewer) redirect(signInPath("/admin"));
  if (!admin) notFound();

  const editId = Number(typeof query.edit === "string" ? query.edit : NaN);
  const saved = typeof query.saved === "string" ? query.saved : "";
  const pending = all.filter((repo) => repo.status === "pending");
  const approved = all.filter((repo) => repo.status === "approved");
  const rejected = all.filter((repo) => repo.status === "rejected");
  const editing = all.find((repo) => repo.id === editId);

  return (
    <>
      <SiteHeader returnTo="/admin" active="admin" />

      <main id="main-content" className="dx-page adm-page">
        <header className="ob-head adm-head">
          <p className="ob-kicker">Admin</p>
          <h1>{tx(locale, "Katalog open source", "Open source catalogue")}</h1>
          <p>
            {tx(
              locale,
              `${pending.length} menunggu review · ${approved.length} di direktori · ${rejected.length} ditolak`,
              `${pending.length} awaiting review · ${approved.length} in the directory · ${rejected.length} rejected`,
            )}
          </p>
        </header>

        {saved ? (
          <p className="ob-notice" role="status">{tx(locale, `Tersimpan: ${saved}`, `Saved: ${saved}`)}</p>
        ) : null}

        {editing ? (
          <section className="ob-card adm-edit" aria-labelledby="edit-heading">
            <div className="adm-section-head">
              <h2 id="edit-heading">{tx(locale, `Edit ${repoSlug(editing)}`, `Edit ${repoSlug(editing)}`)}</h2>
              <Link href="/admin">{tx(locale, "Batal", "Cancel")}</Link>
            </div>
            <RepoForm
              key={editing.id}
              mode="edit"
              id={editing.id}
              initial={{
                repo: repoSlug(editing),
                list: editing.list,
                reasons: editing.reasons,
                why: editing.why,
                summary: editing.summary,
                indonesian: editing.indonesian,
                starterLabel: editing.starterLabel,
              }}
            />
          </section>
        ) : null}

        <Section title={tx(locale, "Menunggu review", "Awaiting review")} repos={pending} empty={tx(locale, "Tidak ada usulan baru.", "No new suggestions.")} locale={locale} />
        <Section title={tx(locale, "Di direktori", "In the directory")} repos={approved} empty={tx(locale, "Belum ada repo yang disetujui.", "No approved repos yet.")} locale={locale} />
        {rejected.length > 0 ? (
          <details className="adm-rejected">
            <summary>{tx(locale, `Ditolak (${rejected.length})`, `Rejected (${rejected.length})`)}</summary>
            <Section title="" repos={rejected} empty="" locale={locale} />
          </details>
        ) : null}

        <section className="ob-card adm-add" aria-labelledby="add-heading">
          <h2 id="add-heading">{tx(locale, "Tambah repo langsung", "Add a repo directly")}</h2>
          <p className="adm-note">{tx(locale, "Langsung tampil di direktori, tanpa antrean review.", "Shows in the directory straight away, without the review queue.")}</p>
          <RepoForm mode="add" />
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

function Section({ title, repos, empty, locale }: { title: string; repos: OpenSourceRepo[]; empty: string; locale: Locale }) {
  return (
    <section className="adm-section">
      {title ? (
        <div className="adm-section-head">
          <h2>{title} <span>{repos.length}</span></h2>
        </div>
      ) : null}
      {repos.length > 0 ? (
        <ul className="adm-list">
          {repos.map((repo) => <AdminItem key={repo.id} repo={repo} locale={locale} />)}
        </ul>
      ) : empty ? (
        <p className="oss-record-empty">{empty}</p>
      ) : null}
    </section>
  );
}

function AdminItem({ repo, locale }: { repo: OpenSourceRepo; locale: Locale }) {
  return (
    <li className="adm-item" id={`repo-${repo.id}`}>
      <div className="adm-item-head">
        <a href={repoUrl(repo)} target="_blank" rel="noopener noreferrer">{repoSlug(repo)}</a>
        <span className={`adm-status adm-status-${repo.status}`}>{statusLabel(repo.status, locale)}</span>
        <span className="adm-list-tag">{listLabel(repo.list, locale)}</span>
        {repo.indonesian ? <span className="adm-list-tag">{tx(locale, "Maintainer Indonesia", "Indonesian maintainers")}</span> : null}
        {repo.reasons.map((reason) => <span key={reason} className="adm-list-tag">{reasonLabel(reason, locale)}</span>)}
      </div>
      {repo.why ? <p className="adm-why">{repo.why}</p> : null}
      {repo.summary ? <p className="adm-summary">{repo.summary}</p> : null}
      <p className="adm-meta">
        {repo.submittedBy ? (
          <>
            {tx(locale, "Diusulkan oleh ", "Suggested by ")}
            <Link href={`/u/${repo.submittedBy.username}`}>{repo.submittedBy.name}</Link>
          </>
        ) : (
          tx(locale, "Bawaan", "Built in")
        )}
      </p>

      <div className="adm-actions">
        {repo.status !== "approved" ? (
          <form action={reviewRepo}>
            <input type="hidden" name="id" value={repo.id} />
            <input type="hidden" name="decision" value="approved" />
            <SubmitButton className="adm-button adm-button-primary">{tx(locale, "Setujui", "Approve")}</SubmitButton>
          </form>
        ) : null}
        {repo.status !== "rejected" ? (
          <form action={reviewRepo}>
            <input type="hidden" name="id" value={repo.id} />
            <input type="hidden" name="decision" value="rejected" />
            <SubmitButton className="adm-button">
              {repo.status === "approved" ? tx(locale, "Turunkan", "Unlist") : tx(locale, "Tolak", "Reject")}
            </SubmitButton>
          </form>
        ) : null}
        <Link className="adm-button" href={`/admin?edit=${repo.id}`}>{tx(locale, "Edit", "Edit")}</Link>
        <form action={deleteRepo}>
          <input type="hidden" name="id" value={repo.id} />
          <input type="hidden" name="returnTo" value="/admin" />
          <SubmitButton className="adm-button adm-button-danger">{tx(locale, "Hapus", "Delete")}</SubmitButton>
        </form>
      </div>
    </li>
  );
}
