/**
 * Gives every colour in `app/globals.css` a dark-mode partner.
 *
 *   npm run theme:colors          rewrite globals.css in place
 *   npm run theme:colors -- --check   exit 1 if any colour still lacks one
 *
 * A literal like `#fff` becomes `light-dark(#fff, #1d2321)`. The browser picks
 * one by the element's `color-scheme`, which the root sets from the visitor's
 * choice (see `:root[data-theme]` in globals.css). Rewriting in place, rather
 * than adding a second set of dark rules, keeps every rule where it was — same
 * selector, same order — so the cascade cannot shift between the two themes.
 *
 * The dark colour is the light one with its lightness turned over, measured in
 * OKLab so equal steps look equal: paper becomes near-black, ink becomes pale.
 * Pairs that sat far apart in light mode stay far apart in dark. Two kinds of
 * colour are left alone: saturated mid-tones (coral, GitHub's language dots),
 * which read on either background, and dark shadows, which only deepen.
 *
 * Already-paired colours are skipped, so this is safe to run again after new
 * CSS is written. Hand-tune a pair by editing its second value; the script
 * will not touch it again.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const FILE = resolve(dirname(fileURLToPath(import.meta.url)), "..", "app", "globals.css");

/** sRGB 0–255 → OKLab. */
export function toOklab([r, g, b]) {
  const lin = (c) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [lr, lg, lb] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** OKLab → sRGB 0–255, or null when it falls outside sRGB. */
export function fromOklab([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  const out = rgb.map((c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055));
  if (out.some((c) => c < -0.001 || c > 1.001)) return null;
  return out.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255));
}

function parse(literal) {
  if (literal.startsWith("#")) {
    let hex = literal.slice(1);
    if (hex.length <= 4) hex = [...hex].map((c) => c + c).join("");
    const n = (i) => parseInt(hex.slice(i, i + 2), 16);
    return { rgb: [n(0), n(2), n(4)], alpha: hex.length === 8 ? n(6) / 255 : 1 };
  }
  const parts = literal.slice(literal.indexOf("(") + 1, -1).split(/[\s,/]+/).filter(Boolean).map(Number);
  return { rgb: parts.slice(0, 3), alpha: parts[3] ?? 1 };
}

function format({ rgb, alpha }) {
  if (alpha >= 1) return `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
  return `rgba(${rgb.join(", ")}, ${String(Math.round(alpha * 1000) / 1000).replace(/^0\./, ".")})`;
}

/** The dark partner of one colour, or null when it should stay as it is. */
export function darkPartner(literal, property) {
  const { rgb, alpha } = parse(literal);
  const [L, a, b] = toOklab(rgb);
  const C = Math.hypot(a, b);

  if (/shadow/.test(property) && L < 0.5) {
    // A shadow cannot glow. Keep it black, a little stronger on dark paper.
    return format({ rgb: [0, 0, 0], alpha: Math.min(0.6, alpha * 2) });
  }
  if (C >= 0.1 && L >= 0.45 && L <= 0.82) {
    // A saturated colour reads on either paper — except as text, where a dark
    // one (a red error, a green "done") is lifted until it can be read.
    if (!/^(color|fill|stroke)$/.test(property) || L >= 0.66) return null;
    return format({ rgb: inGamut(0.74, a, b), alpha });
  }

  // Hairlines have to stay visible against the dark paper they now sit on.
  const lifted = /border|outline|line/.test(property) ? Math.max(turnOver(L), 0.32) : turnOver(L);
  return format({ rgb: inGamut(soften(lifted), a, b), alpha });
}

/**
 * Light paper to dark paper, dark ink to light ink. Not a straight line: the
 * pale tints that make up most backgrounds stay close together near black,
 * and the mid-greys used for secondary text are pushed well clear of it.
 * The top bends back up: the tinted page (#f8f6f0) becomes the darkest
 * surface and pure white cards sit a step above it, as raised things do in
 * the dark.
 */
const CURVE = [
  [0, 0.97],
  [0.3, 0.9],
  [0.55, 0.72],
  [0.85, 0.26],
  [0.965, 0.17],
  [1, 0.215],
];

/**
 * How far the darkest surfaces are lifted off black, fading to nothing by
 * mid-grey: a soft dark, like GitHub's "dimmed", rather than near-black. Text
 * and anything brighter than SOFT_UNTIL is left exactly where it was, so the
 * contrast that matters most barely moves.
 */
const SOFT_LIFT = 0.03;
const SOFT_FROM = 0.17;
const SOFT_UNTIL = 0.6;

export function soften(L) {
  const t = Math.min(1, Math.max(0, (L - SOFT_FROM) / (SOFT_UNTIL - SOFT_FROM)));
  return L + SOFT_LIFT * (1 - t);
}

function turnOver(L) {
  for (let i = 1; i < CURVE.length; i += 1) {
    const [x0, y0] = CURVE[i - 1];
    const [x1, y1] = CURVE[i];
    if (L <= x1) return y0 + ((L - x0) / (x1 - x0)) * (y1 - y0);
  }
  return CURVE.at(-1)[1];
}

/** The nearest sRGB colour at lightness `L`, giving up chroma until it fits. */
function inGamut(L, a, b) {
  let scale = L < 0.45 ? 0.75 : 0.9;
  for (; scale > 0; scale -= 0.05) {
    const rgb = fromOklab([L, a * scale, b * scale]);
    if (rgb) return rgb;
  }
  return fromOklab([L, 0, 0]);
}

const COLOUR = /#[0-9a-fA-F]{3,8}\b|rgba?\([^()]*\)/g;

/** Rewrites one stylesheet, returning the new text and how many colours changed. */
export function pairColours(css) {
  // Comments and existing light-dark() pairs are masked so nothing inside them
  // is matched; the mask keeps offsets, so positions still line up.
  const blank = (text) => text.replace(/[^\n]/g, " ");
  let masked = css.replace(/\/\*[\s\S]*?\*\//g, blank);
  masked = masked.replace(/light-dark\((?:[^()]|\([^()]*\))*\)/g, blank);

  let changed = 0;
  let out = "";
  let last = 0;
  for (const match of masked.matchAll(COLOUR)) {
    const start = match.index;
    const before = masked.slice(0, start);
    const property = before.slice(Math.max(before.lastIndexOf("{"), before.lastIndexOf(";")) + 1).split(":")[0].trim();
    const literal = css.slice(start, start + match[0].length);
    const dark = darkPartner(literal, property);
    if (!dark) continue;
    out += css.slice(last, start) + `light-dark(${literal}, ${dark})`;
    last = start + match[0].length;
    changed += 1;
  }
  return { css: out + css.slice(last), changed };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const css = await readFile(FILE, "utf8");
  const result = pairColours(css);
  if (process.argv.includes("--check")) {
    if (result.changed > 0) {
      console.error(`${result.changed} colour(s) in app/globals.css have no dark-mode partner. Run: npm run theme:colors`);
      process.exit(1);
    }
  } else {
    await writeFile(FILE, result.css);
    console.log(`Paired ${result.changed} colour(s) in app/globals.css.`);
  }
}
