/** Canonical origin for metadata, share cards, and the sitemap. */
export const siteUrl = "https://builders.swegrowth.id";

/** The shared picture, for pages that do not draw a card of their own. */
export const defaultShareImage = { url: "/opengraph-image", width: 1200, height: 630 };

/**
 * Share-card fields for a page with no `opengraph-image` file beside it.
 *
 * Next.js replaces the whole `openGraph` object rather than merging into the
 * one on the layout, so a page that names its own title has to re-state the
 * image too — otherwise it quietly ships a card with no picture at all.
 * Pages that do have an `opengraph-image` file (profiles, projects) get their
 * image from that file and should not call this.
 */
export function shareCard(fields: {
  title: string;
  description: string;
  url: string;
  locale?: string;
}) {
  return { ...fields, images: [defaultShareImage] };
}
