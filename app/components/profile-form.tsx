"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileState } from "../actions";
import { PROFILE_LIMITS, PROFILE_MAXIMUM } from "../lib/profile";
import { Field } from "./field";
import { useLanguage } from "./language-provider";

export type EditableProfile = ProfileState["values"];

/**
 * The profile editor: who you are, then how else to reach you.
 *
 * Only what the site shows today. The talent pool's fields (experience,
 * fields, opportunity status, résumé) left with it, and GitHub has its own
 * form above, in github-form.tsx. Saving this leaves both alone.
 */
export function ProfileForm({
  profile,
  skillSuggestions,
  returnTo,
}: {
  profile: EditableProfile;
  skillSuggestions: string[];
  /** Project detail to return to after a blocked proposal is made ready. */
  returnTo?: string;
}) {
  const [state, formAction, pending] = useActionState(updateProfile, {
    errors: {},
    values: profile,
  } satisfies ProfileState);
  const { errors, values } = state;
  const { tx } = useLanguage();

  return (
    <form className="create-form" action={formAction}>
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      {errors.form ? (
        <p className="form-error" role="alert">
          {errors.form}
        </p>
      ) : null}

      <fieldset className="step">
        <legend>
          <span className="step-number">3</span> {tx("Tentang dirimu", "About you")}
        </legend>
        <p className="step-intro">
          {tx(
            "Tampil di profilmu, supaya orang yang melihat fotomu di badge tahu kamu siapa dan bisa bertanya apa. Hanya nama yang wajib.",
            "Shown on your profile, so somebody who sees your face on a badge knows who you are and what to ask you. Only your name is required.",
          )}
        </p>

        <Field
          label={tx("Nama", "Name")}
          name="name"
          error={errors.name}
          defaultValue={values.name}
          maxLength={PROFILE_MAXIMUM.name}
          required
        />

        <Field
          label={tx("Profesi atau peran utama", "Profession or primary role")}
          name="profession"
          error={errors.profession}
          defaultValue={values.profession}
          maxLength={PROFILE_MAXIMUM.profession}
          placeholder={tx("Contoh: Pengembang Frontend", "For example: Frontend Developer")}
        />

        <Field
          label={tx("Perkenalan satu kalimat", "Your one-line introduction")}
          name="headline"
          hint={tx("Tampil tepat di bawah namamu dan saat profilmu dibagikan.", "It appears directly beneath your name and when your profile is shared.")}
          error={errors.headline}
          defaultValue={values.headline}
          maxLength={PROFILE_MAXIMUM.headline}
        />

        <Field
          label={tx("Keahlian", "Skills")}
          name="skills"
          hint={tx(`Pisahkan dengan koma, maksimal ${PROFILE_LIMITS.skills}.`, `Separate with commas, up to ${PROFILE_LIMITS.skills}.`)}
          error={errors.skills}
          defaultValue={values.skills}
          list="skill-suggestions"
          placeholder={tx("Next.js, Go, Riset Pengguna", "Next.js, Go, User Research")}
        />
        <datalist id="skill-suggestions">
          {skillSuggestions.map((skill) => (
            <option key={skill} value={skill} />
          ))}
        </datalist>

        <Field
          label={tx("Bio singkat", "Short bio")}
          name="bio"
          hint={tx("Apa yang biasanya kamu kerjakan dan sedang kamu pelajari sekarang.", "What you usually work on and what you are exploring now.")}
          error={errors.bio}
          defaultValue={values.bio}
          rows={4}
          maxLength={PROFILE_MAXIMUM.bio}
        />
      </fieldset>

      <fieldset className="step" id="contact">
        <legend>
          <span className="step-number">4</span> {tx("Kontak lain", "Other contacts")}
        </legend>
        <p className="step-intro">
          {tx("Opsional. Semua tautan di bawah bersifat publik dan hanya tampil jika diisi. Email yang kamu pakai untuk masuk tidak pernah ditampilkan.", "Optional. All links below are public and only appear when filled in. The email you sign in with is never shown.")}
        </p>

        <Field
          label={tx("Situs web", "Website")}
          name="website"
          error={errors.website}
          defaultValue={values.website}
          type="url"
          maxLength={PROFILE_MAXIMUM.link}
          placeholder="https://"
        />
        <Field
          label="LinkedIn"
          name="linkedin"
          error={errors.linkedin}
          defaultValue={values.linkedin}
          type="url"
          maxLength={PROFILE_MAXIMUM.link}
          placeholder="https://www.linkedin.com/in/"
        />
        <Field
          label="X / Twitter"
          name="x"
          error={errors.x}
          defaultValue={values.x}
          type="url"
          maxLength={PROFILE_MAXIMUM.link}
          placeholder="https://x.com/"
        />
        <Field
          label={tx("Email publik", "Public email")}
          name="publicEmail"
          error={errors.publicEmail}
          defaultValue={values.publicEmail}
          type="email"
          maxLength={PROFILE_MAXIMUM.publicEmail}
          placeholder="name@example.com"
        />
      </fieldset>

      <button className="primary-button create-submit" type="submit" disabled={pending} aria-busy={pending || undefined}>
        {pending ? tx("Menyimpan…", "Saving…") : tx("Simpan profil", "Save profile")}
      </button>
    </form>
  );
}
