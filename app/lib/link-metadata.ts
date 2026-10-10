/**
 * Reading a project off the page it already has.
 *
 * The submission form asks for a link and nothing else, which only works if
 * the link can answer the obvious questions on the person's behalf: what is
 * this called, what does it say it does, what does its icon look like. That is
 * what this reads — the same handful of tags every link preview in the world
 * relies on.
 *
 * Two rules shape everything below.
 *
 * First, this never decides whether a project may be saved. A site that is
 * slow, blocks robots, or serves an empty <head> still gets recorded; the
 * caller falls back to the domain and moves on. Refusing a submission because
 * somebody else's server was unhelpful would reintroduce the exact wall this
 * form exists to remove.
 *
 * Second, the URL comes from a stranger and is turned into a request from our
 * server, which makes it an SSRF primitive unless it is fenced in. Hence
 * `assertPublicHttpUrl` on the address, on every redirect hop, and on the
 * addresses that address resolves to.
 */

import { lookup } from "node:dns/promises";
import { domainOf, isHttpUrl } from "./brief";

export type LinkMetadata = {
  /** The address actually read, after redirects. */
  url: string;
  domain: string;
  title: string;
  description: string;
  siteName: string;
  /** Best available square-ish mark: an explicit icon, else the social image. */
  iconUrl: string;
  imageUrl: string;
  /** False when the page could not be read at all; the rest is then derived. */
  fetched: boolean;
};

const MAXIMUM_REDIRECTS = 4;
const MAXIMUM_BYTES = 512 * 1024;
const REQUEST_TIMEOUT_MS = 5_000;

/*
 * A browser's request, near enough. Sites that vary their markup by client
 * hand a plain fetch an app-store interstitial or a consent wall, and the tags
 * we want are missing from both.
 */
const REQUEST_HEADERS = {
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en;q=0.9,id;q=0.8,*;q=0.5",
  "User-Agent":
    "Mozilla/5.0 (compatible; BuildersBot/1.0; +https://builders.swegrowth.id)",
};

/**
 * What somebody typed, as a URL.
 *
 * People paste "pamerin.lol" as often as they paste the whole address, and a
 * form that rejects the shorter one is a form that loses the submission over
 * punctuation. Anything without a scheme becomes https.
 */
export function normaliseLink(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  if (!isHttpUrl(candidate)) return "";

  try {
    const url = new URL(candidate);
    // Credentials in a link are never part of a public project address, and
    // carrying them into a server-side request would leak them upstream.
    url.username = "";
    url.password = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

/** A name for the project when the page would not tell us one. */
export function titleFromLink(url: string): string {
  const domain = domainOf(url);
  if (!domain) return "Project";

  // A GitHub-style path names the project better than the host does.
  const path = pathSegments(url);
  const candidate = path.length > 0 ? path[path.length - 1].replace(/\.(html?|php|aspx)$/i, "") : "";
  const name = titleCase(candidate) || titleCase(domain.split(".")[0]) || domain;
  return name.length >= 3 ? name.slice(0, 60) : domain.slice(0, 60);
}

/**
 * Reads a public page's own description of itself.
 *
 * Never throws for anything the network does: an unreachable, slow, oversized
 * or non-HTML page comes back with `fetched: false` and a title derived from
 * the address. Only an address we refuse to request at all returns empty.
 */
export async function fetchLinkMetadata(
  rawUrl: string,
  request: typeof fetch = fetch,
): Promise<LinkMetadata> {
  const url = normaliseLink(rawUrl);
  if (!url) return empty(rawUrl);

  const unread: LinkMetadata = { ...empty(url), title: titleFromLink(url), domain: domainOf(url) };

  try {
    const page = await readPage(url, request);
    if (!page) return unread;

    const { html, finalUrl } = page;
    const title = firstOf(
      metaContent(html, ["og:title", "twitter:title"]),
      titleTag(html),
      metaContent(html, ["application-name", "apple-mobile-web-app-title"]),
    );
    const siteName = metaContent(html, ["og:site_name"]);

    return {
      url: finalUrl,
      domain: domainOf(finalUrl),
      title: clip(title || siteName || titleFromLink(finalUrl), 60),
      description: clip(
        metaContent(html, ["og:description", "twitter:description", "description"]),
        140,
      ),
      siteName: clip(siteName, 60),
      iconUrl: absolute(iconHref(html), finalUrl),
      imageUrl: absolute(metaContent(html, ["og:image", "og:image:url", "twitter:image"]), finalUrl),
      fetched: true,
    };
  } catch {
    return unread;
  }
}

/* ------------------------------------------------------------------ *
 * Where we are willing to send a request
 * ------------------------------------------------------------------ */

/**
 * Refuses anything that is not a public web address.
 *
 * The loopback, private and link-local ranges are where a cloud host keeps its
 * metadata service and where a deployment keeps its internal services; a form
 * that fetches whatever it is handed would read those out to whoever pasted
 * the link.
 */
export function assertPublicHttpUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https links can be read.");
  }
  if (url.username || url.password) throw new Error("A link cannot carry credentials.");
  if (isPrivateHost(url.hostname)) throw new Error("That address is not publicly reachable.");
  return url;
}

/** Hostnames that never belong to a public project, before any resolution. */
function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".home.arpa")) return true;
  return isPrivateAddress(host);
}

/** True for an IP literal inside a range that is not routed on the internet. */
export function isPrivateAddress(host: string): boolean {
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = ipv4.slice(1).map(Number);
    if (ipv4.slice(1).some((part) => Number(part) > 255)) return true;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
  }

  if (!host.includes(":")) return false;

  const ipv6 = host.toLowerCase();
  if (ipv6 === "::" || ipv6 === "::1") return true;
  if (/^f[cd][0-9a-f]{2}:/.test(ipv6)) return true;
  if (/^fe[89ab][0-9a-f]:/.test(ipv6)) return true;
  // ::ffff:10.0.0.1 and friends are IPv4 wearing a hat.
  const mapped = ipv6.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  return mapped ? isPrivateAddress(mapped[1]) : false;
}

/**
 * The same check, against what the name actually resolves to.
 *
 * A public hostname pointing at 127.0.0.1 is the ordinary way past a
 * name-only check. A resolution we cannot perform is treated as one we cannot
 * trust: the page goes unread, and the submission still succeeds without it.
 */
async function resolvesPublicly(hostname: string): Promise<boolean> {
  if (isPrivateAddress(hostname.replace(/^\[|\]$/g, ""))) return false;

  try {
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    return addresses.length > 0 && addresses.every((entry) => !isPrivateAddress(entry.address));
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * Fetching
 * ------------------------------------------------------------------ */

type Page = { html: string; finalUrl: string };

/** Follows redirects by hand so every hop is checked, not just the first. */
async function readPage(startUrl: string, request: typeof fetch): Promise<Page | null> {
  const deadline = Date.now() + REQUEST_TIMEOUT_MS;
  let current = startUrl;

  for (let hop = 0; hop <= MAXIMUM_REDIRECTS; hop += 1) {
    const url = assertPublicHttpUrl(current);
    if (!(await resolvesPublicly(url.hostname))) return null;

    const remaining = deadline - Date.now();
    if (remaining <= 0) return null;

    const response = await request(url.toString(), {
      headers: REQUEST_HEADERS,
      redirect: "manual",
      signal: AbortSignal.timeout(remaining),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel().catch(() => undefined);
      if (!location) return null;
      current = new URL(location, url).toString();
      continue;
    }

    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType && !/text\/html|application\/xhtml|text\/plain/i.test(contentType)) {
      await response.body?.cancel().catch(() => undefined);
      return null;
    }

    return { html: await readCapped(response), finalUrl: url.toString() };
  }

  return null;
}

/**
 * Reads the start of the document and stops.
 *
 * Everything worth having lives in <head>, while the body of a large page is
 * unbounded — and holding a server action open to stream megabytes we intend
 * to discard is how one paste becomes everybody's slow form.
 */
async function readCapped(response: Response): Promise<string> {
  const body = response.body;
  if (!body) return await response.text();

  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let html = "";
  let bytes = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      html += decoder.decode(value, { stream: true });
      if (bytes >= MAXIMUM_BYTES || /<\/head>/i.test(html)) break;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  return html;
}

/* ------------------------------------------------------------------ *
 * Parsing
 * ------------------------------------------------------------------ */

const TAG = /<(meta|link)\b([^>]*)>/gi;

/**
 * The content of a <meta>, by `property` or by `name`.
 *
 * `keys` is a preference order, not a set: the caller asking for og:description
 * before description means the Open Graph one wins even on a page that wrote
 * the plain one first, which is the usual order in a real <head>.
 */
export function metaContent(html: string, keys: string[]): string {
  const found = new Map<string, string>();

  for (const [, tag, rawAttributes] of html.matchAll(TAG)) {
    if (tag.toLowerCase() !== "meta") continue;
    const attributes = parseAttributes(rawAttributes);
    const key = (attributes.property || attributes.name || attributes.itemprop || "").toLowerCase();
    if (!key || found.has(key)) continue;
    const content = collapse(decodeEntities(attributes.content || ""));
    if (content) found.set(key, content);
  }

  for (const key of keys) {
    const content = found.get(key.toLowerCase());
    if (content) return content;
  }

  return "";
}

/** The best declared icon, preferring an explicitly sized or Apple touch one. */
export function iconHref(html: string): string {
  const candidates: Array<{ href: string; score: number }> = [];

  for (const [, tag, rawAttributes] of html.matchAll(TAG)) {
    if (tag.toLowerCase() !== "link") continue;
    const attributes = parseAttributes(rawAttributes);
    const rel = (attributes.rel || "").toLowerCase();
    const href = decodeEntities(attributes.href || "").trim();
    if (!href || !/(^|\s)(icon|apple-touch-icon|apple-touch-icon-precomposed|shortcut icon|mask-icon)(\s|$)/.test(rel)) {
      continue;
    }

    const size = Number.parseInt((attributes.sizes || "").split("x")[0], 10);
    const score = rel.includes("apple-touch-icon") ? 300 : Number.isFinite(size) ? size : 32;
    candidates.push({ href, score });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.href || "";
}

function titleTag(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? collapse(decodeEntities(match[1])) : "";
}

function parseAttributes(raw: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const [, name, quoted, single, bare] of raw.matchAll(
    /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g,
  )) {
    attributes[name.toLowerCase()] = quoted ?? single ?? bare ?? "";
  }
  return attributes;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  "#39": "'",
  "#x27": "'",
  "#34": '"',
};

function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, name: string) => {
    const key = name.toLowerCase();
    if (key in ENTITIES) return ENTITIES[key];
    if (key.startsWith("#x")) return codePoint(Number.parseInt(key.slice(2), 16)) || match;
    if (key.startsWith("#")) return codePoint(Number.parseInt(key.slice(1), 10)) || match;
    return match;
  });
}

function codePoint(value: number): string {
  return Number.isFinite(value) && value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : "";
}

/** Resolves a page-relative icon or image against the page it was found on. */
function absolute(href: string, base: string): string {
  if (!href) return "";
  // Inline data is a valid icon on the page and a poor thing to store: the
  // column is 500 characters and a base64 PNG is not.
  if (/^data:/i.test(href)) return "";

  try {
    const url = new URL(href, base);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function pathSegments(url: string): string[] {
  try {
    return new URL(url).pathname.split("/").filter(Boolean);
  } catch {
    return [];
  }
}

function titleCase(value: string): string {
  return collapse(value.replace(/[-_]+/g, " "))
    .split(" ")
    .filter(Boolean)
    .map((word) => (word.length > 2 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

function firstOf(...values: string[]): string {
  return values.find((value) => value.trim().length > 0)?.trim() || "";
}

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function clip(value: string, maximum: number): string {
  return value.length <= maximum ? value : value.slice(0, maximum).trimEnd();
}

function empty(url: string): LinkMetadata {
  return {
    url,
    domain: "",
    title: "",
    description: "",
    siteName: "",
    iconUrl: "",
    imageUrl: "",
    fetched: false,
  };
}
