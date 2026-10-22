"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { createProject, previewProjectLink, type CreateState, type LinkPreview } from "../actions";
import { MAXIMUM, MINIMUM } from "../lib/brief";
import { CommitmentField } from "./commitment-field";
import { Field } from "./field";
import { RoleFields } from "./role-fields";
import { TopicPicker } from "./topic-picker";
import { useLanguage } from "./language-provider";

const EMPTY: CreateState = { errors: {}, values: {} };

/** How long after the last keystroke we go and read the link. */
const PREVIEW_DELAY_MS = 700;

type EntryMethod = "link" | "description";

/**
 * Adding a product to the directory: one page, three short parts.
 *
 * 1. What it is — a link whose page supplies the name, summary and icon, or,
 *    for something without a page yet, a name and a few sentences.
 * 2. What help it wants — pull requests on GitHub, a role, or both. At least
 *    one, because the directory lists a product only on the code path (it has
 *    a repository) or the role path (it has an open role), and a product
 *    asking for neither would be saved and then shown to nobody.
 * 3. Why somebody should help, and its topics — optional.
 *
 * Everything else a project can carry — stage, the longer brief, documents,
 * what is being worked on now — is filled in later from its edit page, by
 * somebody who has already seen it listed.
 */
export function CreateForm() {
  const [state, formAction, pending] = useActionState(createProject, EMPTY);
  const formRef = useRef<HTMLFormElement>(null);
  const { errors, values } = state;
  const { tx } = useLanguage();

  const [entryMethod, setEntryMethod] = useState<EntryMethod>(values.entryMethod === "description" ? "description" : "link");
  const [link, setLink] = useState(values.link ?? "");
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [reading, startReading] = useTransition();
  const [takesPRs, setTakesPRs] = useState(values.openForGitHubContributions === "yes");
  const [wantsRole, setWantsRole] = useState(values.openSeat === "yes");
  /** What the page objected to itself, before the server saw anything. */
  const [checked, setChecked] = useState<Record<string, string>>({});

  const linkIsRepo = entryMethod === "link" && isGitHubRepository(link.trim());

  function errorFor(field: string): string | undefined {
    return checked[field] || errors[field as keyof typeof errors];
  }

  function changeLink(value: string) {
    setLink(value);
    if (preview && preview.requested !== value.trim()) setPreview(null);
    if (previewError) setPreviewError("");
    // A repository is an offer to take pull requests more often than not.
    if (isGitHubRepository(value.trim()) && !isGitHubRepository(link.trim())) setTakesPRs(true);
  }

  /*
   * Read the link while they are still looking at it. A courtesy, not a gate:
   * `createProject` reads the same page itself when this has not finished.
   */
  useEffect(() => {
    const typed = link.trim();
    if (entryMethod !== "link" || !looksLikeLink(typed) || preview?.requested === typed) return;

    const timer = setTimeout(() => {
      startReading(async () => {
        const result = await previewProjectLink(typed);
        if (!result.ok) {
          setPreviewError(result.error);
          return;
        }
        setPreviewError("");
        setPreview(result.preview);
      });
    }, PREVIEW_DELAY_MS);

    return () => clearTimeout(timer);
  }, [entryMethod, link, preview?.requested]);

  /** The checks worth making before a round trip; the server makes them all again. */
  function submitIfReady(event: React.FormEvent<HTMLFormElement>) {
    const found: Record<string, string> = {};
    if (entryMethod === "link") {
      if (!looksLikeLink(link.trim())) {
        found.link = tx("Tempel tautan produkmu—situs web, halaman aplikasi, atau repositori.", "Paste your product's link — a website, an app listing, or a repository.");
      }
    } else {
      if (fieldValue(formRef.current, "title").length < MINIMUM.title) {
        found.title = tx(`Tuliskan nama produk—minimal ${MINIMUM.title} karakter.`, `Write the product name — at least ${MINIMUM.title} characters.`);
      }
      if (!fieldValue(formRef.current, "highlight")) {
        found.highlight = tx("Ceritakan singkat apa yang sedang kamu buat.", "Say briefly what you are building.");
      }
    }
    if (!takesPRs && !wantsRole) {
      found.help = tx(
        "Pilih minimal satu: terima PR di GitHub, atau cari orang untuk sebuah peran. Tanpa itu produkmu tidak tampil di direktori.",
        "Choose at least one: take pull requests on GitHub, or look for someone for a role. Without one, your product does not show in the directory.",
      );
    }
    setChecked(found);
    if (Object.keys(found).length > 0) {
      event.preventDefault();
      formRef.current?.querySelector<HTMLElement>("[aria-invalid=true], .help-error")?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }

  // Remounts the prefilled inputs when a new page has been read, so the name
  // and summary show what was found. Anything typed there stays typed.
  const prefillKey = preview?.url ?? "no-preview";
  // Either complaint, the page's or the server's, is about having no help
  // ticked; once a box is ticked it no longer applies.
  const helpError = takesPRs || wantsRole ? undefined : errorFor("help");

  return (
    /* Validated here and on the server rather than by the browser, so every
       complaint is a sentence next to the field it is about. */
    <form className="create-form link-form new-product-form" action={formAction} ref={formRef} onSubmit={submitIfReady} noValidate>
      {errors.form ? (
        <p className="form-error" role="alert">
          {errors.form}
        </p>
      ) : null}
      <input type="hidden" name="entryMethod" value={entryMethod} />

      <fieldset className="step">
        <legend>
          <span className="step-number">1</span> {tx("Produkmu", "Your product")}
        </legend>

        {entryMethod === "link" ? (
          <>
            <div className={`field ${errorFor("link") ? "has-error" : ""}`}>
              <label htmlFor="link">{tx("Tautan produk", "Product link")}</label>
              <p className="hint" id="link-hint">
                {tx("Situs web, halaman aplikasi, atau repositori GitHub. Nama, ringkasan, dan logonya kami baca dari sini.", "A website, an app listing, or a GitHub repository. We read its name, summary and logo from here.")}
              </p>
              <input
                id="link"
                name="link"
                type="text"
                inputMode="url"
                autoComplete="url"
                autoFocus
                spellCheck={false}
                placeholder="https://"
                value={link}
                onChange={(event) => changeLink(event.target.value)}
                aria-describedby="link-hint"
                aria-invalid={errorFor("link") ? true : undefined}
              />
              {errorFor("link") ? (
                <p className="field-error" role="alert">
                  {errorFor("link")}
                </p>
              ) : null}
            </div>

            <LinkReading reading={reading} preview={preview} error={previewError} />

            <Field
              key={`title-${prefillKey}`}
              label={tx("Nama produk", "Product name")}
              name="title"
              hint={tx("Diambil dari halaman jika dikosongkan.", "Taken from the page when you leave it blank.")}
              error={errorFor("title")}
              defaultValue={values.title || preview?.title || ""}
              maxLength={MAXIMUM.title}
            />
            <Field
              key={`tagline-${prefillKey}`}
              label={tx("Ringkasan satu kalimat", "One-line summary")}
              name="tagline"
              hint={tx("Diambil dari halaman jika dikosongkan.", "Taken from the page when you leave it blank.")}
              error={errorFor("tagline")}
              defaultValue={values.tagline || preview?.tagline || ""}
              maxLength={MAXIMUM.tagline}
            />

            <button className="text-button" type="button" onClick={() => { setEntryMethod("description"); setChecked({}); }}>
              {tx("Belum punya tautan? Tulis deskripsinya saja", "No link yet? Describe it instead")}
            </button>
          </>
        ) : (
          <>
            <Field
              label={tx("Nama produk atau ide", "Product or idea name")}
              name="title"
              error={errorFor("title")}
              defaultValue={values.title}
              maxLength={MAXIMUM.title}
              required
            />
            <Field
              label={tx("Apa yang sedang kamu buat?", "What are you building?")}
              name="highlight"
              hint={tx("Satu sampai tiga kalimat: apa itu, dan untuk siapa.", "One to three sentences: what it is, and who it is for.")}
              error={errorFor("highlight")}
              defaultValue={values.highlight}
              rows={3}
              maxLength={MAXIMUM.highlight}
              required
            />
            <button className="text-button" type="button" onClick={() => { setEntryMethod("link"); setChecked({}); }}>
              {tx("Punya tautan? Pakai tautan saja", "Have a link? Use it instead")}
            </button>
          </>
        )}
      </fieldset>

      <fieldset className={`step ${helpError ? "has-error" : ""}`}>
        <legend>
          <span className="step-number">2</span> {tx("Butuh bantuan apa?", "What help do you need?")}
        </legend>
        <p className="step-intro">
          {tx("Pilih minimal satu. Ini yang menentukan di mana produkmu tampil di direktori.", "Choose at least one. This decides where your product shows in the directory.")}
        </p>

        <label className={`help-toggle ${takesPRs ? "is-on" : ""}`}>
          <input type="checkbox" checked={takesPRs} onChange={(event) => setTakesPRs(event.target.checked)} />
          <span>
            <strong>{tx("Terima pull request di GitHub", "Take pull requests on GitHub")}</strong>
            <small>{tx("Tampil di jalur “Kirim PR di GitHub”: orang langsung mencari issue di repomu.", "Shows on the “Send a pull request” path: people go straight to your repository's issues.")}</small>
          </span>
        </label>
        <input type="hidden" name="openForGitHubContributions" value={takesPRs ? "yes" : "no"} />
        {takesPRs ? (
          <div className="progressive-panel">
            {linkIsRepo ? (
              <p className="hint">{tx("Memakai repositori dari tautan di atas.", "Using the repository from the link above.")}</p>
            ) : (
              <Field
                label={tx("URL repositori GitHub", "GitHub repository URL")}
                name="repoUrl"
                hint={tx("Repositori publik, misalnya https://github.com/organisasi/proyek.", "A public repository, for example https://github.com/organization/project.")}
                error={errors.repoUrl}
                defaultValue={values.repoUrl}
                type="url"
                placeholder="https://github.com/"
              />
            )}
          </div>
        ) : null}

        <label className={`help-toggle ${wantsRole ? "is-on" : ""}`}>
          <input type="checkbox" checked={wantsRole} onChange={(event) => setWantsRole(event.target.checked)} />
          <span>
            <strong>{tx("Cari orang untuk sebuah peran", "Look for someone for a role")}</strong>
            <small>{tx("Tampil di jalur “Peran lain”: desain, produk, riset, konten, dan lainnya. Peran lain bisa ditambah dari halaman produk.", "Shows on the “Other roles” path: design, product, research, content and more. More roles can be added from the product page.")}</small>
          </span>
        </label>
        {wantsRole ? (
          <div className="progressive-panel">
            <input type="hidden" name="openSeat" value="yes" />
            <RoleFields
              id="seatRole"
              roleName="seatRole"
              roleTitleName="seatRoleTitle"
              defaultRole={values.seatRole}
              defaultRoleTitle={values.seatRoleTitle}
              roleError={errors.seatRole}
              roleTitleError={errors.seatRoleTitle}
            />
            <Field
              label={tx("Pekerjaannya", "The work")}
              name="seatBrief"
              error={errors.seatBrief}
              defaultValue={values.seatBrief}
              rows={3}
              maxLength={MAXIMUM.seatBrief}
              placeholder={tx("Contoh: Rapikan alur daftar akun di aplikasi mobile.", "For example: Tidy up the sign-up flow in the mobile app.")}
            />
            <CommitmentField id="seatCommitment" name="seatCommitment" defaultValue={values.seatCommitment} error={errors.seatCommitment} />
          </div>
        ) : null}

        {helpError ? (
          <p className="field-error help-error" role="alert">
            {helpError}
          </p>
        ) : null}
      </fieldset>

      <fieldset className="step">
        <legend>
          <span className="step-number">3</span> {tx("Biar orang tertarik", "Make people want to help")}
        </legend>
        <p className="step-intro">{tx("Opsional. Detail lain bisa dilengkapi nanti dari halaman produk.", "Optional. Everything else can be filled in later from the product page.")}</p>
        {entryMethod === "link" ? (
          <Field
            label={tx("Kenapa layak dibantu?", "Why is it worth helping?")}
            name="highlight"
            hint={tx("Satu sampai tiga kalimat dengan kata-katamu sendiri: siapa yang terbantu, atau apa yang bisa dipelajari kontributor.", "One to three sentences in your own words: who it helps, or what a contributor gets to learn.")}
            error={errorFor("highlight")}
            defaultValue={values.highlight}
            rows={3}
            maxLength={MAXIMUM.highlight}
          />
        ) : null}
        <TopicPicker defaultValue={values.tags} error={errors.tags} />
      </fieldset>

      <button className="primary-button create-submit" type="submit" disabled={pending} aria-busy={pending || undefined}>
        {pending ? tx("Menambahkan…", "Adding…") : tx("Tambah produk", "Add product")}
      </button>
    </form>
  );
}

/** What we found behind the link, what we are still reading, or nothing. */
function LinkReading({
  reading,
  preview,
  error,
}: {
  reading: boolean;
  preview: LinkPreview | null;
  error: string;
}) {
  const { tx } = useLanguage();
  if (reading) {
    return (
      <>
        <div className="link-preview is-loading">
          <span className="link-preview-mark">
            <span className="skeleton" style={{ height: "100%", width: "100%" }} />
          </span>
          <div className="link-preview-copy">
            <span className="skeleton" style={{ height: 15, width: "48%" }} />
            <span className="skeleton" style={{ height: 11, width: "84%", marginTop: 9 }} />
            <span className="skeleton" style={{ height: 10, width: "30%", marginTop: 9 }} />
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          {tx("Membaca halaman…", "Reading the page…")}
        </p>
      </>
    );
  }

  if (error) {
    return (
      <p className="link-reading is-quiet" aria-live="polite">
        {error}
      </p>
    );
  }

  if (!preview) return null;

  return (
    <div className="link-preview" aria-live="polite">
      <span className="link-preview-mark" aria-hidden="true">
        {preview.logoUrl ? (
          // A runtime URL from somebody else's domain, which is exactly what
          // next/image's configured host list cannot cover.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview.logoUrl} alt="" />
        ) : (
          <span>{preview.title.slice(0, 1).toUpperCase() || "?"}</span>
        )}
      </span>
      <div className="link-preview-copy">
        <strong>{preview.title}</strong>
        {preview.tagline ? <p>{preview.tagline}</p> : null}
        <small>{preview.domain}</small>
      </div>
      {/* When the read worked, the card is the message. Only the case that
          needs explaining gets a sentence. */}
      {preview.fetched ? null : (
        <p className="link-preview-note">{tx("Halaman tersebut tidak dapat kami baca, jadi kami menggunakan alamatnya.", "That page would not let us read it, so we used its address.")}</p>
      )}
    </div>
  );
}

/** The value a named control currently holds, trimmed, or an empty string. */
function fieldValue(form: HTMLFormElement | null, name: string): string {
  const control = form?.elements.namedItem(name);
  if (!control || !("value" in control) || typeof control.value !== "string") return "";
  return control.value.trim();
}

/** Good enough for a preview; the server decides what is really a repository. */
function isGitHubRepository(value: string): boolean {
  return /^(https?:\/\/)?(www\.)?github\.com\/[^/]+\/[^/]+/i.test(value);
}

/**
 * Whether it is worth spending a request on what has been typed so far.
 *
 * Deliberately looser than the parser the server runs: somebody halfway
 * through "pamerin.lol" should not see an error, they should see nothing.
 */
function looksLikeLink(value: string): boolean {
  if (!value || /\s/.test(value)) return false;
  const withoutScheme = value.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  const host = withoutScheme.split(/[/?#]/)[0];
  return /^[^.]+\.[a-z]{2,}$/i.test(host) || /^[^.]+(\.[^.]+)+\.[a-z]{2,}$/i.test(host);
}
