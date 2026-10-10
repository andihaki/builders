import type { Metadata } from "next";
import Link from "@/app/components/responsive-link";
import { SiteFooter, SiteHeader } from "../components/shell";
import { ForgotPasswordForm } from "../components/auth-forms";
import { supabaseConfigured } from "../lib/supabase";
import { currentLocale } from "../lib/locale-server";
import { tx } from "../lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  return {
    title: tx(locale, "Lupa kata sandi — Builders", "Forgot password — Builders"),
    description: tx(locale, "Minta tautan untuk mengatur ulang kata sandi akun Builders.", "Request a link to reset your Builders account password."),
    robots: { index: false },
  };
}

export default async function ForgotPasswordPage() {
  const locale = await currentLocale();
  return (
    <>
      <SiteHeader returnTo="/forgot-password" />

      <main id="main-content" className="page-narrow auth-page">
        <p className="eyebrow">
          <span /> {tx(locale, "Lupa kata sandi", "Forgot password")}
        </p>
        <h1>{tx(locale, "Tidak masalah.", "No problem.")}</h1>
        <p className="lede">
          {tx(locale, "Masukkan alamat emailmu dan kami akan mengirim tautan untuk membuat kata sandi baru.", "Enter your email address and we will send you a link to set a new password.")}
        </p>

        {supabaseConfigured() ? (
          <ForgotPasswordForm />
        ) : (
          <p className="form-error">
            {tx(locale, "Situs ini belum terhubung ke Supabase sehingga kata sandi belum dapat diatur ulang.", "This site is not connected to Supabase yet, so passwords cannot be reset.")}
          </p>
        )}

        <p className="auth-switch">
          {tx(locale, "Sudah ingat?", "Remembered it?")} <Link href="/signin">{tx(locale, "Masuk", "Sign in")}</Link>.
        </p>
      </main>

      <SiteFooter />
    </>
  );
}
