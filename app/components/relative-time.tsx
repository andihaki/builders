"use client";

import { useEffect, useState } from "react";
import type { Locale } from "../lib/locale";
import { tx } from "../lib/locale";

/**
 * A time label that stays prerender-safe.
 *
 * The server and the first client render use a deterministic calendar date.
 * Once hydrated, the label becomes relative. Keeping `Date.now()` inside the
 * effect prevents it from invalidating Cache Components or a route prefetch.
 */
export function RelativeTime({ value, locale = "en" }: { value: string; locale?: Locale }) {
  const timestamp = parseTimestamp(value);
  const [label, setLabel] = useState(() => absoluteDate(timestamp, locale));

  useEffect(() => {
    if (!Number.isFinite(timestamp)) return;
    const timer = window.setTimeout(() => {
      setLabel(relativeDate(timestamp, Date.now(), locale));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [locale, timestamp]);

  if (!Number.isFinite(timestamp)) return null;
  return <time dateTime={value}>{label}</time>;
}

function parseTimestamp(value: string): number {
  return Date.parse(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
}

function absoluteDate(timestamp: number, locale: Locale): string {
  if (!Number.isFinite(timestamp)) return "";
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(timestamp);
}

function relativeDate(timestamp: number, now: number, locale: Locale): string {
  const days = Math.max(0, Math.floor((now - timestamp) / 86_400_000));
  if (days < 1) return tx(locale, "hari ini", "today");
  if (days < 30) return tx(locale, `${days} hari lalu`, `${days} ${days === 1 ? "day" : "days"} ago`);
  if (days < 365) {
    const months = Math.floor(days / 30);
    return tx(locale, `${months} bulan lalu`, `${months} ${months === 1 ? "month" : "months"} ago`);
  }
  const years = Math.floor(days / 365);
  return tx(locale, `${years} tahun lalu`, `${years} ${years === 1 ? "year" : "years"} ago`);
}
