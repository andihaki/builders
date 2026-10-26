/**
 * What a masukan may carry, and what to say when it does not.
 *
 * The ceilings here are the ones the `feedback` table checks in
 * `20260901000000_feedback.sql`, repeated for the same reason `profile.ts`
 * repeats its own: a value the column would refuse should come back as a
 * sentence somebody can act on, not as a Postgres constraint error.
 *
 * Store the key, never the label — the same rule as `roles.ts` and
 * `project-types.ts`. The copy below can be rewritten without touching a row.
 *
 * No Next.js or Supabase imports, so `tests/feedback.test.mjs` can call these
 * directly.
 */

import { tx, type Locale } from "./locale";
import { isEmail } from "./profile";

/**
 * The five things a masukan turns out to be.
 *
 * Deliberately not a severity scale. What the maintainer needs first is which
 * kind of answer is owed — a fix, a decision, a rewrite of some copy, or
 * nothing at all — and asking for that is one click, where asking somebody to
 * rate their own annoyance is a question they cannot answer.
 */
export const FEEDBACK_KINDS = ["bug", "idea", "confusing", "praise", "other"] as const;

export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const FEEDBACK_LIMITS = {
  message: { min: 10, max: 2000 },
  /** The longest address the `contact` column stores. */
  contact: { max: 254 },
} as const;

/** Copy shown when the shared per-account or per-IP hourly quota is full. */
export function feedbackRateLimitMessage(locale: Locale = "en"): string {
  return tx(
    locale,
    "Kamu sudah mencapai batas 5 masukan dalam sejam terakhir. Coba lagi nanti.",
    "You've reached the limit of 5 feedback submissions per hour. Please try again later.",
  );
}

const FEEDBACK_META: Record<FeedbackKind, { label: string; blurb: string }> = {
  bug: {
    label: "Ada yang error",
    blurb: "Sesuatu tidak jalan, salah tampil, atau gagal disimpan.",
  },
  idea: {
    label: "Usul atau ide",
    blurb: "Ada yang menurutmu perlu ada, atau perlu diubah.",
  },
  confusing: {
    label: "Bikin bingung",
    blurb: "Kamu sempat tersesat atau salah paham di suatu halaman.",
  },
  praise: {
    label: "Ada yang enak dipakai",
    blurb: "Bagian yang sudah pas—biar tidak ikut kena rombak.",
  },
  other: {
    label: "Lainnya",
    blurb: "Tidak masuk keempatnya. Tulis saja apa adanya.",
  },
};

const FEEDBACK_EN: Record<FeedbackKind, { label: string; blurb: string }> = {
  bug: {
    label: "Something is broken",
    blurb: "Something did not work, showed the wrong thing, or failed to save.",
  },
  idea: {
    label: "An idea or a request",
    blurb: "Something you think should exist, or should work differently.",
  },
  confusing: {
    label: "Something confusing",
    blurb: "You got lost, or a page led you to the wrong conclusion.",
  },
  praise: {
    label: "Something that works well",
    blurb: "The parts already worth keeping — so they survive the next rewrite.",
  },
  other: {
    label: "Something else",
    blurb: "None of the four. Say it however you like.",
  },
};

export function isFeedbackKind(value: string): value is FeedbackKind {
  return (FEEDBACK_KINDS as readonly string[]).includes(value);
}

export function feedbackKindLabel(value: string, locale: Locale = "en"): string {
  return isFeedbackKind(value) ? tx(locale, FEEDBACK_META[value].label, FEEDBACK_EN[value].label) : "";
}

export function feedbackKindBlurb(value: string, locale: Locale = "en"): string {
  return isFeedbackKind(value) ? tx(locale, FEEDBACK_META[value].blurb, FEEDBACK_EN[value].blurb) : "";
}

export type FeedbackInput = { kind: string; message: string; contact: string };
export type FeedbackErrors = Partial<Record<keyof FeedbackInput, string>>;

export const EMPTY_FEEDBACK: FeedbackInput = { kind: "", message: "", contact: "" };

/**
 * Everything wrong with a masukan, by field.
 *
 * Only the kind and the message are asked for. The floor on the message is the
 * one judgement call here: "error" on its own is not a report anybody can act
 * on, and a person who sent it would never learn why nothing happened. The
 * address is optional because a masukan that wants no reply is still worth
 * having — but if one is given it has to be an address, or the reply goes
 * nowhere and only the sender is surprised.
 */
export function validateFeedback(input: FeedbackInput, locale: Locale = "en"): FeedbackErrors {
  const errors: FeedbackErrors = {};

  if (!isFeedbackKind(input.kind)) {
    errors.kind = tx(locale, "Pilih dulu jenis masukannya.", "Choose what kind of feedback this is.");
  }

  const message = input.message.trim();
  if (!message) {
    errors.message = tx(locale, "Tulis dulu masukanmu.", "Write your feedback first.");
  } else if (message.length < FEEDBACK_LIMITS.message.min) {
    errors.message = tx(
      locale,
      `Ceritakan sedikit lebih panjang—minimal ${FEEDBACK_LIMITS.message.min} karakter.`,
      `Tell us a little more—at least ${FEEDBACK_LIMITS.message.min} characters.`,
    );
  } else if (message.length > FEEDBACK_LIMITS.message.max) {
    errors.message = tx(
      locale,
      `Masukanmu terlalu panjang—maksimal ${FEEDBACK_LIMITS.message.max} karakter.`,
      `Your feedback is too long—at most ${FEEDBACK_LIMITS.message.max} characters.`,
    );
  }

  const contact = input.contact.trim();
  if (contact && !isEmail(contact)) {
    errors.contact = tx(
      locale,
      "Masukkan alamat email yang valid, atau kosongkan saja.",
      "Enter a valid email address, or leave this blank.",
    );
  } else if (contact.length > FEEDBACK_LIMITS.contact.max) {
    errors.contact = tx(
      locale,
      `Alamat emailnya terlalu panjang—maksimal ${FEEDBACK_LIMITS.contact.max} karakter.`,
      `That email address is too long—at most ${FEEDBACK_LIMITS.contact.max} characters.`,
    );
  }

  return errors;
}
