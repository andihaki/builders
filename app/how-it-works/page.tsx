import type { Metadata } from "next";
import Link from "@/app/components/responsive-link";
import { Arrow, SiteFooter, SiteHeader } from "../components/shell";
import { shareCard, waCommunityUrl } from "../content";
import { currentLocale } from "../lib/locale-server";
import { tx, type Locale } from "../lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  const title = tx(locale, "Cara kerjanya — Builders", "How it works — Builders");
  const description = tx(
    locale,
    "Dari masuk sampai PR pertamamu di-merge: lima langkah kontribusi ke open source bareng komunitas Builders.",
    "From signing in to your first merged PR: five steps to contributing to open source with the Builders community.",
  );
  return {
    title,
    description,
    alternates: { canonical: "/how-it-works" },
    openGraph: shareCard({ title, description, url: "/how-it-works" }),
  };
}

type Step = {
  title: string;
  body: string;
  action?: { href: string; label: string; external?: boolean };
};

/**
 * A first contribution, step by step, naming what there is to press. Its own
 * page so the directory stays the home page's whole job; the home page, the
 * About page and /get-started link here.
 */
function steps(locale: Locale): Step[] {
  return [
    {
      title: tx(locale, "Masuk pakai GitHub", "Sign in with GitHub"),
      body: tx(
        locale,
        "Lalu di profilmu, centang \"Tampilkan aktivitas GitHub\". Dari situ PR-mu tercatat sendiri: nggak ada yang perlu kamu isi atau laporkan.",
        "Then tick \"Show GitHub activity\" on your profile. From there your PRs are recorded on their own: nothing to fill in or report.",
      ),
      action: { href: "/signin", label: tx(locale, "Masuk / gabung", "Sign in / join") },
    },
    ...(waCommunityUrl
      ? [
          {
            title: tx(locale, "Gabung WA Community", "Join the WA Community"),
            body: tx(
              locale,
              "Interaksi paling aktif ada di sana: tanya kalau mentok, cari teman yang pernah kontribusi ke repo yang sama, minta review sebelum PR dikirim, dan rayain PR yang di-merge.",
              "Where most of the talking happens: ask when you are stuck, find somebody who has contributed to the same repo, get a review before your PR goes out, and cheer merged PRs.",
            ),
            action: { href: waCommunityUrl, label: tx(locale, "Gabung WA", "Join on WA"), external: true },
          },
        ]
      : []),
    {
      title: tx(locale, "Pilih project", "Pick a project"),
      body: tx(
        locale,
        "Di direktori, tab Kode di GitHub berisi repo yang nerima PR. Pilih Lokal kalau mau yang maintainer-nya ada di komunitas, lalu cari kartu dengan \"Isu pemula\". Bukan programmer? Tab Peran lain berisi produk member yang lagi cari desainer, product, riset, atau konten.",
        "In the directory, the Code on GitHub tab lists repos that take PRs. Pick Local for ones whose maintainers are in the community, then look for a card with \"Starter issues\". Not a programmer? The Other roles tab lists members' products looking for design, product, research or content help.",
      ),
      action: { href: "/", label: tx(locale, "Buka direktori", "Open the directory") },
    },
    {
      title: tx(locale, "Kerjakan, bareng", "Work on it, together"),
      body: tx(
        locale,
        "Ambil satu issue dan kerjakan di GitHub seperti biasa. Mentok? Tanya di grup WA, atau ke teman yang fotonya ada di badge repo itu: mereka udah pernah lewat jalan yang sama.",
        "Take one issue and work on it on GitHub as usual. Stuck? Ask in the WA group, or the friend whose face is on that repo's badge: they have been down the same road.",
      ),
    },
    {
      title: tx(locale, "PR di-merge, muncul sendiri", "PR merged, shown for you"),
      body: tx(
        locale,
        "Begitu PR-mu di-merge, PR itu muncul di halaman Aktivitas dan di profilmu. Member lain bisa kasih reaksi, dan teman yang lihat jadi ikut berani mulai.",
        "Once your PR is merged, it shows on the Activity page and on your profile. Other members can react, and friends who see it find the nerve to start too.",
      ),
      action: { href: "/activity", label: tx(locale, "Lihat Aktivitas", "See the Activity") },
    },
  ];
}

export default async function HowItWorksPage() {
  const locale = await currentLocale();

  return (
    <>
      <SiteHeader returnTo="/how-it-works" />

      <main id="main-content" className="ab-page">
        <header className="ab-intro" aria-labelledby="how-title">
          <h1 id="how-title">{tx(locale, "Cara kerjanya", "How it works")}</h1>
          <p className="ab-lead hw-lead">
            {tx(
              locale,
              "Dari masuk sampai PR pertamamu di-merge. Kontribusinya terjadi di GitHub; Builders bantu kamu nemu project-nya, nyambungin kamu ke teman yang bisa ditanya, dan nyatat hasilnya.",
              "From signing in to your first merged PR. The contribution happens on GitHub; Builders helps you find the project, connects you with friends to ask, and keeps the record.",
            )}
          </p>
        </header>

        <ol className="hw-steps">
          {steps(locale).map((step, index) => (
            <li key={step.title} className="hw-step">
              <span className="hw-step-mark" aria-hidden="true">{index + 1}</span>
              <div>
                <h2>{step.title}</h2>
                <p>{step.body}</p>
                {step.action ? (
                  step.action.external ? (
                    <a className="ab-button" href={step.action.href} target="_blank" rel="noopener noreferrer">
                      {step.action.label} <span aria-hidden="true">↗</span>
                    </a>
                  ) : (
                    <Link className="ab-button" href={step.action.href}>
                      {step.action.label} <Arrow />
                    </Link>
                  )
                ) : null}
              </div>
            </li>
          ))}
        </ol>

        <p className="hw-more">
          <Link className="ab-more" href="/about#why-together">
            {tx(locale, "Kenapa harus bareng-bareng?", "Why together?")} <Arrow />
          </Link>
          <Link className="ab-more" href="/about">
            {tx(locale, "Tentang Builders", "About Builders")} <Arrow />
          </Link>
        </p>
      </main>

      <SiteFooter />
    </>
  );
}
