"use client";

import { useActionState } from "react";
import { saveGitHub, type GitHubState } from "../actions";
import { PROFILE_MAXIMUM } from "../lib/profile";
import { Field } from "./field";
import { useLanguage } from "./language-provider";

/**
 * The GitHub account, first on /account/profile: the directory's badges, the
 * profile picture and the Activity page are all built from it. The yes to
 * /activity sits with it, since it is about this account and nothing else.
 */
export function GitHubForm({ github, shown }: { github: string; shown: boolean }) {
  const [state, formAction, pending] = useActionState(saveGitHub, {
    errors: {},
    values: { github, shown },
  } satisfies GitHubState);
  const { errors, values } = state;
  const { tx } = useLanguage();

  return (
    <form className="create-form gh-form" action={formAction} id="github-account">
      <fieldset className="step">
        <legend>
          <span className="step-number">1</span> GitHub
        </legend>
        <p className="step-intro">
          {tx(
            "Akun yang kamu pakai untuk kirim PR. Fotonya muncul di badge direktori dan di profilmu, dan dari sini orang bisa melihat kontribusimu.",
            "The account you send pull requests from. Its picture shows on directory badges and on your profile, and it is how people find your contributions.",
          )}
        </p>
        {errors.form ? (
          <p className="form-error" role="alert">
            {errors.form}
          </p>
        ) : null}

        <Field
          label={tx("Username atau tautan GitHub", "GitHub username or link")}
          name="github"
          hint={tx("Sangat disarankan. Contoh: zikrulihsan atau https://github.com/zikrulihsan", "Strongly recommended. For example: zikrulihsan or https://github.com/zikrulihsan")}
          error={errors.github}
          defaultValue={values.github}
          maxLength={PROFILE_MAXIMUM.link}
          placeholder="zikrulihsan"
        />

        <div className="gh-consent">
          <label htmlFor="github-activity">
            <input id="github-activity" type="checkbox" name="github_activity" value="1" defaultChecked={values.shown} />
            {tx("Tampilkan aktivitas GitHub-ku di halaman Aktivitas", "Show my GitHub activity on the Activity page")}
          </label>
          <p className="hint">
            {tx(
              "Opsional, mati sampai kamu menyalakannya. Kalau dicentang, Builders membaca pull request dan jumlah commit publikmu dari GitHub tiap beberapa jam. Hilangkan centangnya kapan saja: datanya langsung disembunyikan lalu dihapus.",
              "Optional, and off until you turn it on. When ticked, Builders reads your public pull requests and commit counts from GitHub every few hours. Untick it any time: they are hidden at once, then deleted.",
            )}
          </p>
        </div>

        <div className="gh-form-actions">
          <button className="ghost-button" type="submit" disabled={pending} aria-busy={pending || undefined}>
            {pending ? tx("Menyimpan…", "Saving…") : tx("Simpan GitHub", "Save GitHub")}
          </button>
          {state.saved && !pending ? (
            <span className="gh-form-saved" role="status">
              {tx("Tersimpan.", "Saved.")}
            </span>
          ) : null}
        </div>
      </fieldset>
    </form>
  );
}
