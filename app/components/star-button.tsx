"use client";

import { useLanguage } from "./language-provider";

const STAR_PATH = "m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z";

/** The star count on the card's meta line, as GitHub last reported it. */
export function StarCount({ stars }: { stars: number }) {
  const { tx, locale } = useLanguage();
  // "0 stars" says nothing worth the space.
  if (stars <= 0) return null;
  return (
    <span className="dx-meta-stars" title={tx(`${stars} bintang di GitHub`, `${stars} stars on GitHub`)}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={STAR_PATH} />
      </svg>
      {new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-US", { notation: "compact", maximumFractionDigits: 1 }).format(stars)}
      <span className="sr-only">{tx(" bintang", " stars")}</span>
    </span>
  );
}

/**
 * Starring happens on GitHub itself. A GitHub App's user token can only star
 * repositories the app is installed on, and the scope an OAuth app needs for
 * it (`public_repo`) also writes code — so the row sends people to the repo,
 * and says where they are going.
 */
export function StarLink({ repo }: { repo: string }) {
  const { tx } = useLanguage();
  return (
    <a
      className="dx-star"
      href={`https://github.com/${repo}`}
      target="_blank"
      rel="noopener noreferrer"
      title={tx(`Beri bintang ${repo} di GitHub`, `Star ${repo} on GitHub`)}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={STAR_PATH} />
      </svg>
      <span className="dx-star-label">{tx("Star di GitHub", "Star on GitHub")}</span>
      <span aria-hidden="true">↗</span>
    </a>
  );
}
