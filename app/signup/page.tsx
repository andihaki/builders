import type { Metadata } from "next";
import Link from "@/app/components/responsive-link";
import { redirect } from "next/navigation";
import { SiteFooter, SiteHeader } from "../components/shell";
import { SignUpForm } from "../components/auth-forms";
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
    title: tx(locale, "Buat akun — Builders", "Create an account — Builders"),
    description: tx(locale, "Buat akun untuk menampilkan apa yang kamu bangun dan membantu proyek lain.", "Create an account to show what you are building and help with other projects."),
    robots: { index: false },
  };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SignUpPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const next = safeNextPath(typeof params.next === "string" ? params.next : "/");
  const locale = await currentLocale();

  // Only whether there is a session, not who it belongs to: this page either
  // bounces them or shows the form, and neither needs a profile.
  if (await viewerId()) redirect(next);

  return (
    <>
      <SiteHeader returnTo="/signup" />

      <main id="main-content" className="page-narrow auth-page">
        <p className="eyebrow">
          <span /> {tx(locale, "Buat akun", "Create an account")}
        </p>
        <h1>{tx(locale, "Mulai dengan sebuah akun.", "Start with an account.")}</h1>
        <p className="lede">
          {tx(locale, "Dengan akun, kamu dapat menampilkan proyek, menjelaskan bantuan yang dibutuhkan, dan berkontribusi pada proyek lain. Halaman profilmu sekaligus menjadi portofolio.", "With an account, you can show projects, name the help you need, and contribute to other projects. Your profile page doubles as a portfolio.")}
        </p>

        {supabaseConfigured() ? (
          <SignUpForm next={next} />
        ) : (
          <p className="form-error">
            {tx(locale, "Situs ini belum terhubung ke Supabase sehingga pendaftaran belum tersedia.", "This site is not connected to Supabase yet, so registration is unavailable.")}
          </p>
        )}

        <p className="auth-switch">
          {tx(locale, "Sudah punya akun?", "Already have an account?")} <Link href={`/signin?next=${encodeURIComponent(next)}`}>{tx(locale, "Masuk", "Sign in")}</Link>.
        </p>
        <p className="auth-privacy-note">
          {tx(locale, "Dengan membuat akun, kamu menyetujui", "By creating an account, you agree to our")} <Link href="/privacy">{tx(locale, "Kebijakan Privasi", "Privacy Policy")}</Link>.
        </p>
      </main>

      <SiteFooter />
    </>
  );
}
