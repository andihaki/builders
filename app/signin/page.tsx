import type { Metadata } from "next";
import Link from "@/app/components/responsive-link";
import { redirect } from "next/navigation";
import { SiteFooter, SiteHeader } from "../components/shell";
import { SignInForm } from "../components/auth-forms";
import { viewerId } from "../lib/session";
import { safeNextPath } from "../lib/urls";
import { supabaseConfigured } from "../lib/supabase";
import { currentLocale } from "../lib/locale-server";
import { tx } from "../lib/locale";

/*
 * Allowed to block.
 *
 * This page decides what to render — or whether to redirect — from who is
 * signed in, and there is no useful shell to show before that answer arrives:
 * a visitor who is about to be sent elsewhere should not watch this page paint
 * first. Nothing here is cacheable and nothing here is indexed, so blocking on
 * the session costs a request that was always going to be per-visitor.
 */
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  return {
    title: tx(locale, "Masuk — Builders", "Sign in — Builders"),
    description: tx(locale, "Masuk untuk menampilkan proyekmu, bergabung dalam diskusi, dan membantu membangun proyek orang lain.", "Sign in to show your projects, join discussions, and help build other people's projects."),
    robots: { index: false },
  };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Why a confirmation link sent somebody back here. Set by /auth/confirm. */
const LINK_PROBLEMS: Record<string, { id: string; en: string }> = {
  "expired-link": { id: "Tautan konfirmasi ini telah kedaluwarsa atau sudah digunakan. Coba masuk, atau buat akun baru jika diperlukan.", en: "This confirmation link has expired or has already been used. Try signing in, or create a new account if needed." },
  "incomplete-link": { id: "Tautan konfirmasi ini tidak lengkap. Buka kembali tautan lengkap dari emailmu.", en: "This confirmation link is incomplete. Open the complete link from your email again." },
  "google-failed": { id: "Proses masuk dengan Google tidak berhasil. Coba lagi atau gunakan email.", en: "Google sign-in did not work. Please try again or use email instead." },
  "origin-mismatch": {
    id: "Proses masuk dimulai dari satu alamat dan kembali ke alamat lain sehingga sesi tidak dapat dibuat. Buka situs pada alamat utamanya lalu coba lagi. Administrator situs harus mendaftarkan /auth/callback dan /auth/confirm untuk setiap alamat di Supabase → Authentication → URL Configuration.",
    en: "Sign-in started at one address and returned to another, so the session could not be created. Open the site at its primary address and try again. Site administrators should register /auth/callback and /auth/confirm for each address in Supabase → Authentication → URL Configuration.",
  },
};

export default async function SignInPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const next = safeNextPath(typeof params.next === "string" ? params.next : "/");
  const locale = await currentLocale();

  // Only whether there is a session, not who it belongs to: this page either
  // bounces them or shows the form, and neither needs a profile.
  if (await viewerId()) redirect(next);

  const problem = typeof params.error === "string" ? LINK_PROBLEMS[params.error] : undefined;
  const linkProblem = problem ? tx(locale, problem.id, problem.en) : undefined;

  return (
    <>
      <SiteHeader returnTo="/signin" />

      <main id="main-content" className="signin-page">
        <section className="signin-story" aria-labelledby="signin-story-title">
          <div className="signin-story-copy">
            <p className="eyebrow">
              <span /> {tx(locale, "Ruang untuk proyek yang terus bergerak", "A place for projects in motion")}
            </p>
            <h1 id="signin-story-title">{tx(locale, "Kembali ke hal yang sedang kamu bangun.", "Back to what you are building.")}</h1>
            <p>
              {tx(locale, "Lihat kabar terbaru, tanggapi orang yang ingin membantu, dan terus gerakkan proyekmu dari satu tempat.", "See the latest updates, respond to people who want to help, and keep your project moving from one place.")}
            </p>
          </div>

          <div className="signin-preview" aria-label={tx(locale, "Pratinjau aktivitas Builders", "Builders activity preview")}>
            <div className="signin-preview-top">
              <span>{tx(locale, "Aktivitas proyek", "Project activity")}</span>
              <small>{tx(locale, "Hari ini", "Today")}</small>
            </div>
            <div className="signin-preview-project">
              <span className="signin-preview-logo" aria-hidden="true">WA</span>
              <span>
                <strong>Warung Antre</strong>
                <small>{tx(locale, "Menguji alur pertama", "Testing the first flow")}</small>
              </span>
              <span className="signin-preview-status">{tx(locale, "Dibangun", "Building")}</span>
            </div>
            <div className="signin-preview-update">
              <span className="signin-preview-check" aria-hidden="true">✓</span>
              <p>
                <strong>{tx(locale, "Satu langkah baru telah selesai", "A new step is complete")}</strong>
                <span>{tx(locale, "Sketsa layar penjual siap didiskusikan.", "The seller screen sketch is ready for discussion.")}</span>
              </p>
            </div>
            <div className="signin-preview-people">
              <span className="signin-preview-avatars" aria-hidden="true">
                <i>ZI</i><i>NA</i><i>RF</i>
              </span>
              <span>{tx(locale, "Proyek bertemu orang yang tepat.", "Projects meet the right people.")}</span>
            </div>
          </div>
        </section>

        <section className="signin-panel" aria-labelledby="signin-heading">
          <div className="signin-card">
            <p className="signin-kicker">{tx(locale, "Masuk ke akunmu", "Sign in to your account")}</p>
            <h2 id="signin-heading">{tx(locale, "Selamat datang kembali.", "Welcome back.")}</h2>
            <p className="signin-card-lede">{tx(locale, "Pilih cara tercepat untuk melanjutkan.", "Choose the fastest way to continue.")}</p>

            {linkProblem ? (
              <p className="form-error" role="alert">
                {linkProblem}
              </p>
            ) : null}

            {supabaseConfigured() ? (
              <SignInForm next={next} />
            ) : (
              <>
                <p className="form-error">
                  {tx(locale, "Situs ini belum terhubung ke Supabase sehingga fitur masuk belum tersedia. Kamu tetap dapat menjelajahi papan proyek.", "This site is not connected to Supabase yet, so sign-in is unavailable. You can still browse the board.")}
                </p>
                <p className="signin-fallback-link">
                  <Link href="/forgot-password">{tx(locale, "Lupa kata sandi?", "Forgot your password?")}</Link>
                </p>
              </>
            )}

            <p className="auth-switch">
              {tx(locale, "Baru di Builders?", "New to Builders?")}{" "}
              <Link href={`/signup?next=${encodeURIComponent(next)}`}>{tx(locale, "Buat akun", "Create an account")}</Link>
            </p>
            <p className="signin-privacy">
              {tx(locale, "Saat menggunakan Google, kami hanya menerima nama, alamat email, dan foto profilmu. Lihat ", "When you use Google, we only receive your name, email address, and profile photo. See our ")}<Link href="/privacy">{tx(locale, "Kebijakan Privasi", "Privacy Policy")}</Link>.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
