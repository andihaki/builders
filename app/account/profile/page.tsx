import type { Metadata } from "next";
import Link from "@/app/components/responsive-link";
import { redirect } from "next/navigation";
import { SiteFooter, SiteHeader } from "../../components/shell";
import { ProfileForm, type EditableProfile } from "../../components/profile-form";
import { listPeople } from "../../lib/data";
import { termSuggestions } from "../../lib/people";
import { readPublicly } from "../../lib/public-read";
import { currentViewer, type Viewer } from "../../lib/session";
import { signInPath } from "../../lib/urls";
import { currentLocale } from "../../lib/locale-server";
import { tx } from "../../lib/locale";

/*
 * Allowed to block — same reason as the rest of /account. Nothing here is
 * cacheable or indexed: the page is one person's own form, and a visitor
 * about to be redirected should not watch it paint first.
 */
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  return {
    title: tx(locale, "Edit profil — Builders", "Edit profile — Builders"),
    description: tx(locale, "Edit profil, keahlian, dan tautan kontakmu di Builders.", "Edit your profile, skills, and contact links on Builders."),
    robots: { index: false },
  };
}

export default async function EditProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const [viewer, locale] = await Promise.all([currentViewer(), currentLocale()]);
  if (!viewer) redirect(signInPath("/account/profile"));
  const query = await searchParams;
  const requestedReturnTo = Array.isArray(query.returnTo) ? query.returnTo[0] : query.returnTo;
  // This is only a convenience after a blocked proposal, never an external
  // redirect destination supplied by a query string.
  const returnTo = requestedReturnTo?.startsWith("/projects/") ? requestedReturnTo : undefined;

  // Suggestions only. If the directory cannot be read the form still works —
  // it just stops proposing the words other people already use.
  const people = await readPublicly("profile term suggestions", () => listPeople(400), []);

  return (
    <>
      <SiteHeader returnTo="/account/profile" />

      <main id="main-content" className="page-narrow">
        <p className="eyebrow">
          <span /> {tx(locale, "Profil", "Profile")}
        </p>
        <h1>{tx(locale, "Lengkapi profilmu.", "Complete your profile.")}</h1>
        <p className="lede">
          {tx(locale, "Inilah yang dilihat orang di ", "This is what people see on ")}<Link href={`/u/${viewer.username}`}>{tx(locale, "halaman portofoliomu", "your portfolio page")}</Link>{" "}
          {tx(locale, "dan digunakan untuk menemukanmu di ", "and use to find you in the ")}<Link href="/people">talent pool</Link>{tx(locale, ", tempat recruiter, hiring manager, dan pembangun tim mencari talent berdasarkan bukti pengalaman. Kamu dapat memperbaruinya kapan saja.", ", where recruiters, hiring managers, and team builders look for talent through proof of experience. You can update it at any time.")}
        </p>

        <ProfileForm
          profile={toEditable(viewer)}
          skillSuggestions={termSuggestions(people.value, "skills")}
          fieldSuggestions={termSuggestions(people.value, "fields")}
          returnTo={returnTo}
        />

        <p className="hint">
          {tx(locale, "URL profilmu—", "Your profile URL—")}<code>/u/{viewer.username}</code>{tx(locale, "—dibuat oleh sistem dan tidak dapat diubah di sini. Ubah kata sandimu di ", "—is created by the system and cannot be changed here. Change your password on the ")}<Link href="/account/password">{tx(locale, "halaman kata sandi", "password page")}</Link>.
        </p>
      </main>

      <SiteFooter />
    </>
  );
}

/** The stored profile as the form's string fields. */
function toEditable(viewer: Viewer): EditableProfile {
  return {
    name: viewer.name,
    profession: viewer.profession,
    headline: viewer.headline,
    bio: viewer.bio,
    skills: viewer.skills.join(", "),
    yearsExperience: viewer.yearsExperience === null ? "" : String(viewer.yearsExperience),
    fields: viewer.fields.join(", "),
    availability: viewer.availability,
    website: viewer.website,
    publicEmail: viewer.publicEmail,
    github: viewer.github,
    linkedin: viewer.linkedin,
    x: viewer.x,
    resume: viewer.resume,
  };
}
