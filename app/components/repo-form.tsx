"use client";

import { useActionState } from "react";
import { saveRepo, type RepoFormState } from "../actions";
import { REPO_LIMITS, REPO_REASONS, reasonLabel } from "../lib/open-source";
import { useLanguage } from "./language-provider";

/**
 * The one form for putting a repository in the catalogue.
 *
 *   - `submit` — a member on /recommend; it waits for an admin.
 *   - `add` — an admin on /admin; it goes straight in.
 *   - `edit` — an admin changing a listed repo; the repo itself is fixed.
 */
export function RepoForm({
  mode,
  id,
  initial,
}: {
  mode: "submit" | "add" | "edit";
  id?: number;
  initial?: Partial<RepoFormState["values"]>;
}) {
  const [state, formAction, pending] = useActionState(saveRepo, {
    errors: {},
    values: {
      repo: "",
      list: "recommended",
      reasons: [],
      why: "",
      summary: "",
      indonesian: false,
      starterLabel: "good first issue",
      contributed: "",
      ...initial,
    },
  } satisfies RepoFormState);
  const { errors, values } = state;
  const { tx, locale } = useLanguage();
  const field = (name: string) => `repo-${mode}-${name}`;

  return (
    <form className="rf" action={formAction} noValidate>
      <input type="hidden" name="mode" value={mode} />
      {id !== undefined ? <input type="hidden" name="id" value={id} /> : null}
      {errors.form ? <p className="rf-error rf-error-form" role="alert">{errors.form}</p> : null}

      <div className={`rf-field ${errors.repo ? "has-error" : ""}`}>
        <label htmlFor={field("repo")}>{tx("Repo GitHub", "GitHub repo")} <span aria-hidden="true">*</span></label>
        {mode === "edit" ? (
          <>
            <input type="hidden" name="repo" value={values.repo} />
            <p className="rf-fixed">{values.repo}</p>
          </>
        ) : (
          <input
            id={field("repo")}
            name="repo"
            type="text"
            defaultValue={values.repo}
            placeholder={tx("owner/repo atau URL GitHub", "owner/repo or a GitHub URL")}
            autoComplete="off"
            required
            aria-invalid={errors.repo ? true : undefined}
          />
        )}
        {errors.repo ? <p className="rf-error" role="alert">{errors.repo}</p> : null}
      </div>

      <fieldset className="rf-field">
        <legend>{tx("Repo ini…", "This repo is…")}</legend>
        <div className="rf-choices">
          <label className="rf-choice">
            <input type="radio" name="list" value="recommended" defaultChecked={values.list !== "internal"} />
            <span>
              <strong>{tx("Rekomendasi", "A recommendation")}</strong>
              <small>{tx("Milik orang lain, kamu jamin layak dikontribusi.", "Somebody else's, and you vouch it is worth contributing to.")}</small>
            </span>
          </label>
          <label className="rf-choice">
            <input type="radio" name="list" value="internal" defaultChecked={values.list === "internal"} />
            <span>
              <strong>{tx("Milik kita", "One of ours")}</strong>
              <small>{tx("Dibuat atau di-maintain orang di grup kita.", "Built or maintained by somebody in our group.")}</small>
            </span>
          </label>
        </div>
        {errors.list ? <p className="rf-error" role="alert">{errors.list}</p> : null}
      </fieldset>

      {/* Why, as picks rather than prose: a card shows them as tags, and a
          tag says it in two words where a sentence took two lines. */}
      <fieldset className={`rf-field ${errors.reasons ? "has-error" : ""}`}>
        <legend>{tx("Kenapa layak dikontribusi?", "Why is it worth contributing to?")} <span aria-hidden="true">*</span></legend>
        <p className="rf-hint">{tx("Pilih satu atau lebih. Tampil sebagai tanda di direktori.", "Pick one or more. They show as tags in the directory.")}</p>
        <div className="rf-checks">
          {REPO_REASONS.map((reason) => (
            <label key={reason} className="rf-check">
              <input type="checkbox" name="reasons" value={reason} defaultChecked={values.reasons.includes(reason)} />
              {reasonLabel(reason, locale)}
            </label>
          ))}
          <label className="rf-check">
            <input type="checkbox" name="indonesian" defaultChecked={values.indonesian} />
            {tx("Maintainer orang Indonesia", "Indonesian maintainers")}
          </label>
        </div>
        {errors.reasons ? <p className="rf-error" role="alert">{errors.reasons}</p> : null}
      </fieldset>

      {mode !== "edit" ? (
        <div className="rf-field">
          <label htmlFor={field("contributed")}>{tx("Kamu sendiri pernah di repo ini?", "Have you been in this repo yourself?")}</label>
          <select id={field("contributed")} name="contributed" defaultValue={values.contributed}>
            <option value="">{tx("Belum", "Not yet")}</option>
            <option value="contributor">{tx("Ya, saya pernah kontribusi", "Yes, I have contributed")}</option>
            <option value="maintainer">{tx("Ya, saya maintainer-nya", "Yes, I maintain it")}</option>
          </select>
          <p className="rf-hint">{tx("Kalau ya, ikut tercatat di profilmu dan jadi badge di direktori.", "If so, it goes on your profile too and shows as a badge in the directory.")}</p>
        </div>
      ) : null}

      <details className="rf-more" open={Boolean(errors.summary || errors.starterLabel)}>
        <summary>{tx("Opsional", "Optional")}</summary>
        <div className={`rf-field ${errors.summary ? "has-error" : ""}`}>
          <label htmlFor={field("summary")}>{tx("Deskripsi satu baris", "One-line description")}</label>
          <p className="rf-hint">{tx("Kosongkan untuk memakai deskripsi dari GitHub.", "Leave empty to use GitHub's own description.")}</p>
          <input id={field("summary")} name="summary" type="text" defaultValue={values.summary} maxLength={REPO_LIMITS.summary} />
          {errors.summary ? <p className="rf-error" role="alert">{errors.summary}</p> : null}
        </div>
        <div className={`rf-field ${errors.starterLabel ? "has-error" : ""}`}>
          <label htmlFor={field("starterLabel")}>{tx("Label isu pemula", "Starter-issue label")}</label>
          <p className="rf-hint">{tx("Label yang dipakai maintainer-nya, misal \"good first issue\" atau \"help wanted\".", "The label its maintainers use, such as \"good first issue\" or \"help wanted\".")}</p>
          <input id={field("starterLabel")} name="starterLabel" type="text" defaultValue={values.starterLabel} maxLength={REPO_LIMITS.starterLabel} />
          {errors.starterLabel ? <p className="rf-error" role="alert">{errors.starterLabel}</p> : null}
        </div>
      </details>

      <button className="dx-action rf-submit" type="submit" disabled={pending} aria-busy={pending || undefined}>
        {pending
          ? tx("Menyimpan…", "Saving…")
          : mode === "submit"
            ? tx("Kirim usulan", "Send suggestion")
            : mode === "add"
              ? tx("Tambahkan ke direktori", "Add to the directory")
              : tx("Simpan perubahan", "Save changes")}
      </button>
    </form>
  );
}
