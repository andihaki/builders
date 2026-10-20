import type { Metadata } from "next";
import Link from "@/app/components/responsive-link";
import { Arrow, SiteFooter, SiteHeader } from "../components/shell";
import { shareCard, waCommunityUrl } from "../content";
import { currentLocale } from "../lib/locale-server";
import { tx } from "../lib/locale";
import { prTierLabel, type PRTier } from "../lib/directory";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  const title = tx(locale, "Tentang Kami — Builders", "About Us — Builders");
  const description = tx(
    locale,
    "Bukan cuma open source. Builders terbuka buat semua peran—engineer, PM, desainer, marketing, data—supaya sebuah project bisa benar-benar berdampak.",
    "Not just open source. Builders is open to every role—engineers, PMs, designers, marketers, data people—so a project can actually make an impact.",
  );
  return {
    title,
    description,
    alternates: { canonical: "/about" },
    openGraph: shareCard({ title, description, url: "/about" }),
  };
}

/** The profile that takes both invitations: a new project, or a partner community. */
const CONTACT_PATH = "/u/zikrul-ihsan";

/**
 * Who contributes what.
 *
 * Deliberately opened by a programmer-to-programmer example rather than the
 * usual "developers plus everyone else": the point of the page is that the
 * critique already being made in a group chat is the contribution, whoever is
 * making it. The last entry is left open on purpose — a fixed list of roles
 * would say the opposite of what the section is for.
 */
const ROLES: readonly (readonly [string, string, string, string])[] = [
  [
    "Programmer ke programmer",
    "Programmer to programmer",
    "Lihat performa web temennya kureng, nemu bug atau celah security-nya. Daripada jadi bahan ghibah di grup, mending gas contribute ke projectnya.",
    "You notice a friend's site is sluggish, or you spot a bug or a security hole. Instead of turning it into group-chat gossip, go contribute to the project.",
  ],
  [
    "Product manager",
    "Product manager",
    "Value proposition-nya masih ngambang? Bantu tulis ulang: ini masalah siapa, dan kenapa mereka mau pakai produknya.",
    "Value proposition still vague? Help rewrite it: whose problem this is, and why they would want to use the product.",
  ],
  [
    "Designer",
    "Designer",
    "Alur daftarnya kepanjangan? Kasih satu flow yang lebih pendek.",
    "Sign-up flow running long? Hand over a shorter one.",
  ],
  [
    "Marketing",
    "Marketing",
    "Produknya bagus tapi nggak ada yang tahu. Bantu rapiin distribusinya.",
    "The product is good but nobody knows it exists. Help tidy up its distribution.",
  ],
  [
    "Tim data",
    "Data team",
    "Bantu bikin pipeline datanya, lalu propose analisa yang bikin keputusan berikutnya lebih jelas.",
    "Build the data pipeline, then propose the analysis that makes the next decision obvious.",
  ],
  [
    "Peran kamu",
    "Your role",
    "Apalagi? Masih banyak. Kalau peranmu belum ada di daftar ini, besar kemungkinan ada project di sini yang lagi butuh.",
    "What else? Plenty. If your role is not on this list, chances are a project here still needs it.",
  ],
];

/**
 * What each PR status on a directory card means — the same tiers, in the same
 * order and words, as `prTierLabel` in app/lib/directory.ts. Written out here
 * because "what does this colour mean?" is the first question a card raises.
 */
const TIERS: readonly (readonly [PRTier, string, string])[] = [
  [
    "active",
    "Ada PR dari luar tim yang di-merge dalam 90 hari terakhir. Paling besar kemungkinan PR pertamamu dibaca dan diterima.",
    "A pull request from outside the team was merged in the last 90 days. The best odds that your first PR is read and accepted.",
  ],
  [
    "first",
    "Pemiliknya sudah buka pintu buat PR dan repo-nya masih aktif, tapi belum ada orang luar yang di-merge. Kamu bisa jadi yang pertama.",
    "The owner has opened it to pull requests and the repo is alive, but nobody from outside has been merged yet. You could be the first.",
  ],
  [
    "open",
    "Pemiliknya terbuka buat PR, tapi GitHub belum sempat kami tanya soal siapa saja yang di-merge.",
    "The owner takes pull requests, but we have not heard back from GitHub yet about who gets merged.",
  ],
  [
    "unopened",
    "Kodenya bisa dibaca dan dipelajari, tapi pemiliknya belum bilang siap nerima PR. Tanya dulu sebelum ngirim.",
    "The code is there to read and learn from, but the owner has not said they take PRs. Ask before sending one.",
  ],
  [
    "inactive",
    "Repo-nya di-archive, atau nggak ada push selama 120 hari. PR ke sini kemungkinan besar nggak ada yang baca.",
    "The repo is archived, or nothing has been pushed for 120 days. A PR here will most likely go unread.",
  ],
];

const BENEFITS: readonly (readonly [string, string, string, string])[] = [
  [
    "Jadi web portfolio pribadi",
    "A personal portfolio site",
    "Setiap project dan kontribusi yang selesai nempel di profil. Satu tautan yang tumbuh sendiri, tanpa perlu deploy apa pun.",
    "Every project and finished contribution lands on the profile. One link that grows on its own, with nothing to deploy.",
  ],
  [
    "Masuk talent pool",
    "A place in the talent pool",
    "Profil bisa ditemukan recruiter, hiring manager, dan tim tech lewat peran, keahlian, dan status peluangnya.",
    "Recruiters, hiring managers, and tech teams can find the profile by role, skills, and opportunity status.",
  ],
  [
    "Kolaborator lintas peran",
    "Collaborators across roles",
    "Member komunitasmu ketemu orang dengan keahlian yang beda dari mereka—dan itu yang bikin produknya jalan.",
    "Your members meet people whose skills are nothing like their own—which is what moves a product forward.",
  ],
];

const FAQ: readonly (readonly [string, string, string, string])[] = [
  [
    "Builders itu apa?",
    "What is Builders?",
    "Ruang publik buat naruh project tech kamu, nunjukin karya nyatanya, dan cari orang yang mau bantu ngembangin. Dari yang masih ide sampai yang sudah live.",
    "A public place to put your tech project, show the real work behind it, and find people who want to help it grow. From a raw idea to something already live.",
  ],
  [
    "Bedanya open contribution sama open source apa?",
    "How is open contribution different from open source?",
    "Open source biasanya berhenti di kode. Open contribution kebuka buat semua peran—riset, produk, desain, copy, marketing, data—karena produk nggak bertumbuh cuma dari pull request.",
    "Open source usually stops at the code. Open contribution is open to every role—research, product, design, copy, marketing, data—because a product does not grow on pull requests alone.",
  ],
  [
    "Saya bukan programmer. Masih bisa kontribusi?",
    "I am not a programmer. Can I still contribute?",
    "Justru itu intinya. Nulis ulang value proposition, mendekin alur daftar, atau ngerapiin distribusi itu kontribusi yang sama nyatanya dengan nge-fix bug.",
    "That is exactly the point. Rewriting a value proposition, shortening a sign-up flow, or fixing distribution is as real a contribution as fixing a bug.",
  ],
  [
    "Project saya masih ide dan berantakan. Boleh ditaruh?",
    "My project is still a messy idea. Can I post it?",
    "Boleh. Tulis aja masalahnya, buat siapa, dan sekarang sudah sampai mana. Perbarui seiring jalan—jejaknya justru jadi bukti kerjamu.",
    "Yes. Just write down the problem, who it is for, and where it stands today. Update it as it moves—that trail becomes the proof of your work.",
  ],
  [
    "Wajib buka peran, nggak?",
    "Do I have to open a role?",
    "Nggak. Project boleh dibiarin jadi catatan pengembangan publik dulu, dan peran dibuka kapan pun kamu siap nerima bantuan.",
    "No. A project can stay a public build log for as long as you like, and you can open a role whenever you are ready for help.",
  ],
  [
    "Apa untungnya buat saya?",
    "What do I get out of it?",
    "Profil yang jalan sebagai web portfolio pribadi, plus tempat di talent pool biar recruiter dan tim tech bisa nilai keahlianmu dari karya yang nyata—bukan dari klaim di CV.",
    "A profile that doubles as your personal portfolio site, plus a place in the talent pool so recruiters and tech teams can judge your skills from real work rather than claims on a CV.",
  ],
  [
    "Komunitas saya mau jadi community partner. Gimana caranya?",
    "My community wants to be a community partner. How?",
    "Hubungi lewat kontak di profil ini. Ceritain komunitasmu dan member-nya siapa aja—sisanya kita obrolin bareng.",
    "Reach out through the contact links on this profile. Tell us about your community and who your members are—we will work out the rest together.",
  ],
  [
    "Repo yang saya tahu belum ada. Bisa diusulin?",
    "A repo I know is missing. Can I suggest it?",
    "Bisa. Klik “Usulkan project”, pilih “Repo open source”, lalu pilih alasan kenapa repo itu layak. Setelah dicek admin, repo-nya masuk direktori.",
    "Yes. Press “Suggest a project”, choose “An open source repo”, and pick why it belongs. Once an admin has checked it, the repo joins the directory.",
  ],
  [
    "Kenapa masuknya pakai GitHub?",
    "Why sign in with GitHub?",
    "Karena kebanyakan yang datang ke sini mau kontribusi kode, dan dengan GitHub kamu bisa kasih bintang ke repo langsung dari direktori. Izin yang diminta cuma email dan memberi bintang—nggak bisa nyentuh kode atau repo-mu. Lebih suka Google? Tautannya ada di bawah tombol GitHub.",
    "Because most people here come to contribute code, and with GitHub you can star repos straight from the directory. It asks only for your email and permission to star—nothing that can touch your code or repositories. Prefer Google? The link is just below the GitHub button.",
  ],
  [
    "Berbayar?",
    "Is there a cost?",
    "Nggak. Gratis untuk komunitas.",
    "No. Free for the community.",
  ],
];

export default async function AboutPage() {
  const locale = await currentLocale();

  return (
    <>
      <SiteHeader returnTo="/about" active="about" />

      <main id="main-content" className="ab-page">
        <header className="ab-intro" aria-labelledby="about-title">
          <p className="ab-kicker">{tx(locale, "Tentang kami", "About us")}</p>
          <h1 id="about-title">
            {tx(locale, "Bukan cuma open source. Tapi open contribution.", "Not just open source. But open contribution.")}
          </h1>
          <div className="ab-story">
            <p className="ab-quote">
              <strong>{tx(locale, "“Oke, kamu bisa bikin softwarenya. Tapi bisa nggak jualinnya?”", "“Sure, you can build the software. But can you sell it?”")}</strong>{" "}
              {tx(locale, "Celetuk orang yang paham bisnis, tepat setelah seorang programmer launch produknya.", "That is the business-minded one talking, right after a programmer ships their product.")}
            </p>
            <p>
              {tx(
                locale,
                "Giliran orang bisnis yang tiba-tiba vibe coding, programmernya balik nyeletuk: “Coba aja terus. Tapi kalau nanti ada user beneran, bisa nggak tuh maintain-nya?”",
                "Then the business person tries vibe coding, and the programmer fires back: “Keep at it. But once there are real users, can you maintain it?”",
              )}
            </p>
            <p>
              {tx(
                locale,
                "Dua-duanya punya concern yang mungkin ada benernya. Valid. Tapi dua-duanya juga nggak nolong siapa-siapa kalau berhenti di komentar.",
                "Both concerns have a point. Both are valid. And neither one helps anybody if it stops at a comment.",
              )}
            </p>
            <p>
              {tx(
                locale,
                "Padahal kalau dilihat lagi, masing-masing justru megang bagian yang dibutuhin sama yang satunya.",
                "Look again, though, and each of them is holding exactly the piece the other is missing.",
              )}
            </p>
            <p>
              {tx(
                locale,
                "Jadi kenapa nggak kita buka aja jadi open contribution? Bukan cuma kodenya yang open source, tapi terbuka buat semua peran—dikembangin bareng sampai produknya bisa ngasih impact beneran.",
                "So why not open it up as open contribution? Not just open source code, but open to every role—built together until the product actually makes an impact.",
              )}
            </p>
          </div>
        </header>

        <section className="ab-section" aria-labelledby="directory-title">
          <h2 id="directory-title">{tx(locale, "Cara pakai direktorinya", "How the directory works")}</h2>
          <p className="ab-lead">
            {tx(
              locale,
              "Halaman depan Builders adalah direktori project yang lagi nerima kontributor. Ada dua jalur, dan kamu tinggal pilih yang paling cocok sama keahlianmu.",
              "Builders' front page is a directory of projects taking contributors right now. There are two paths; pick the one that fits what you do.",
            )}
          </p>

          <div className="ab-cards ab-cards-two">
            <Link className="ab-card" href="/">
              <h3>{tx(locale, "Kode di GitHub", "Code on GitHub")}</h3>
              <p>
                {tx(
                  locale,
                  "Repo open source—usulan komunitas, rekomendasi, dan produk member yang punya repo GitHub. Tiap kartu nunjukin bahasa, jumlah bintang, isu pemula, dan status PR-nya, jadi kamu tahu mana yang paling mungkin nerima PR pertamamu.",
                  "Open source repositories—community suggestions, recommendations, and members' products with a GitHub repo. Each card shows the language, stars, starter issues, and PR status, so you know which is most likely to take your first PR.",
                )}
              </p>
            </Link>
            <Link className="ab-card" href="/?track=role">
              <h3>{tx(locale, "Peran lain", "Other roles")}</h3>
              <p>
                {tx(
                  locale,
                  "Produk member yang lagi cari desainer, PM, peneliti, marketing, QA, dan peran lain. Klik “Ajukan diri”, pilih perannya, dan pemilik project yang memutuskan.",
                  "Members' products looking for designers, PMs, researchers, marketers, QA, and more. Press “Offer to help”, pick the role, and the project's owner decides.",
                )}
              </p>
            </Link>
          </div>

          <h3 className="ab-subhead">{tx(locale, "Arti status PR", "What the PR status means")}</h3>
          <p className="ab-lead">
            {tx(
              locale,
              "Bukan sekadar centang dari pemiliknya. Status ini dihitung dari GitHub dan diperbarui tiap beberapa jam.",
              "Not just a box the owner ticked. It is worked out from GitHub and refreshed every few hours.",
            )}
          </p>
          <ul className="ab-list">
            {TIERS.map(([tier, bodyId, bodyEn]) => (
              <li key={tier}>
                <span className={`dx-tier-dot dx-tier-dot-${tier}`} aria-hidden="true" />
                <div>
                  <strong>{prTierLabel(tier, locale)}</strong>
                  <p>{tx(locale, bodyId, bodyEn)}</p>
                </div>
              </li>
            ))}
          </ul>

          <h3 className="ab-subhead">{tx(locale, "Tanda di kartu", "The signs on a card")}</h3>
          <ul className="ab-list">
            <li>
              <span className="ab-sign" aria-hidden="true">✓</span>
              <div>
                <strong>{tx(locale, "Teman kita pernah kontribusi", "Friends have contributed")}</strong>
                <p>{tx(locale, "Ada member Builders yang PR-nya pernah masuk ke sini. Kamu bisa tanya-tanya ke mereka dulu.", "A Builders member has landed a PR here before. You can ask them first.")}</p>
              </div>
            </li>
            <li>
              <span className="ab-sign" aria-hidden="true">●</span>
              <div>
                <strong>{tx(locale, "Ada di grup kita", "In our group")}</strong>
                <p>{tx(locale, "Maintainer-nya ada di komunitas kita, jadi PR pertamamu dibaca orang yang kenal kamu.", "The maintainer is in our community, so your first PR is read by someone who knows you.")}</p>
              </div>
            </li>
            <li>
              <span className="ab-sign" aria-hidden="true">☆</span>
              <div>
                <strong>Star</strong>
                <p>{tx(locale, "Kasih bintang langsung dari direktori, persis seperti di GitHub. Cukup masuk dengan GitHub sekali.", "Star a repo straight from the directory, just like on GitHub. Sign in with GitHub once.")}</p>
              </div>
            </li>
          </ul>
        </section>

        <section className="ab-section" aria-labelledby="roles-title">
          <h2 id="roles-title">{tx(locale, "Kontribusi nggak cuma soal kode", "Contribution is not only about code")}</h2>
          <p className="ab-lead">
            {tx(
              locale,
              "Bahkan nggak cuma dari programmer ke orang bisnis. Tiap peran ngelihat hal yang beda, dan tiap penglihatan itu bisa jadi kontribusi.",
              "And it is not only programmer-to-business. Every role sees something different, and every one of those views can become a contribution.",
            )}
          </p>

          <ul className="ab-cards">
            {ROLES.map(([titleId, titleEn, bodyId, bodyEn]) => (
              <li key={titleEn} className="ab-card">
                <h3>{tx(locale, titleId, titleEn)}</h3>
                <p>{tx(locale, bodyId, bodyEn)}</p>
              </li>
            ))}
          </ul>

          <Link className="ab-more" href="/?track=role">
            {tx(locale, "Lihat project yang lagi cari peran lain", "See projects looking for other roles")} <Arrow />
          </Link>
        </section>

        <section className="ab-section" aria-labelledby="partner-title">
          <h2 id="partner-title">{tx(locale, "Terbuka juga buat community partner", "Open to community partners, too")}</h2>
          <p className="ab-lead">
            {tx(
              locale,
              "Platform ini dibuat buat bangun personal project sekaligus cari teman kolaborasi, biar projectnya bisa impactful beneran. Targetnya lintas peran di ekosistem tech: engineer, PM, UI/UX, copywriter, marketing, data, dan siapa pun yang bisa bikin produk bertumbuh.",
              "This platform exists so people can build personal projects and find collaborators, so those projects can actually become impactful. It is aimed across the whole tech ecosystem: engineers, PMs, UI/UX, copywriters, marketers, data people, and anyone else who can make a product grow.",
            )}
          </p>
          <p className="ab-lead">
            {tx(
              locale,
              "Kalau kamu ngelola komunitas tech, kami terbuka buat jadi community partner. Perannya sederhana: bagikan info ke member biar mereka bisa naruh projectnya di sini dan saling kontribusi.",
              "If you run a tech community, we are open to partnering. The role is simple: share the word with your members so they can put their projects here and contribute to each other's.",
            )}
          </p>

          <ul className="ab-cards">
            {BENEFITS.map(([titleId, titleEn, bodyId, bodyEn]) => (
              <li key={titleEn} className="ab-card">
                <h3>{tx(locale, titleId, titleEn)}</h3>
                <p>{tx(locale, bodyId, bodyEn)}</p>
              </li>
            ))}
          </ul>

          <p className="ab-lead">
            {tx(
              locale,
              "Harapannya makin banyak project yang beneran berdampak—buat masyarakat yang pakai, sekaligus buat karier orang yang ngerjain.",
              "The hope is straightforward: more projects that genuinely matter—for the people who use them, and for the careers of the people who build them.",
            )}
          </p>

          <Link className="ab-more" href={CONTACT_PATH}>
            {tx(locale, "Ajak komunitasmu jadi community partner", "Bring your community in as a partner")} <Arrow />
          </Link>
        </section>

        <section className="ab-section" aria-labelledby="faq-title">
          <h2 id="faq-title">{tx(locale, "Pertanyaan yang sering muncul", "Frequently asked questions")}</h2>

          <div className="ab-faq">
            {FAQ.map(([questionId, questionEn, answerId, answerEn]) => (
              <details key={questionEn}>
                <summary>{tx(locale, questionId, questionEn)}</summary>
                <p>{tx(locale, answerId, answerEn)}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="ab-cta" aria-labelledby="about-cta-title">
          <h2 id="about-cta-title">{tx(locale, "Gas aja kita saling kontribusi.", "Let's just contribute to each other.")}</h2>
          <p>
            {tx(
              locale,
              "Usulkan projectmu atau repo yang layak dikontribusiin, atau ajak komunitasmu jadi community partner. Gratis untuk komunitas.",
              "Suggest your project or a repo worth contributing to, or bring your community in as a partner. Free for the community.",
            )}
          </p>
          <div className="ab-cta-actions">
            <Link className="ab-button ab-button-primary" href="/submit">
              <span aria-hidden="true">+</span> {tx(locale, "Usulkan project", "Suggest a project")}
            </Link>
            {waCommunityUrl ? (
              <a className="ab-button" href={waCommunityUrl} target="_blank" rel="noopener noreferrer">
                Join WA Community
              </a>
            ) : null}
            <Link className="ab-button" href={CONTACT_PATH}>
              {tx(locale, "Jadi community partner", "Become a community partner")}
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
