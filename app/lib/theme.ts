/**
 * Light or dark, when the visitor has chosen one. No cookie means "follow the
 * device", which is the default and is handled in CSS alone.
 */
export const THEMES = ["light", "dark"] as const;

export type Theme = (typeof THEMES)[number];

export const THEME_COOKIE = "ahsan-theme";

export function isTheme(value: string | undefined): value is Theme {
  return value === "light" || value === "dark";
}
