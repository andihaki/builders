"use client";

import { useEffect, useSyncExternalStore } from "react";
import { LANGUAGE_COOKIE, tx, type Locale } from "./lib/locale";

function browserLocale(): Locale {
  const saved = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${LANGUAGE_COOKIE}=`))
    ?.split("=")[1];
  return saved === "id" ? "id" : "en";
}

function subscribeToNothing() {
  return () => undefined;
}

/**
 * The outermost net. `app/error.tsx` cannot catch a failure in the root layout
 * or in `generateMetadata`, and without this one those turn into a blank page
 * with a raw script payload in it.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useSyncExternalStore<Locale>(subscribeToNothing, browserLocale, () => "en");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang={locale}>
      <body
        style={{
          background: "#f8f6f0",
          color: "#183d34",
          fontFamily: "Arial, sans-serif",
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 460 }}>
          <h1 style={{ fontSize: 40, letterSpacing: "-0.04em", marginBottom: 12 }}>
            {tx(locale, "Terjadi kesalahan.", "Something went wrong.")}
          </h1>
          <p style={{ color: "#68746d", lineHeight: 1.7, marginBottom: 24 }}>
            {tx(locale, "Builders tidak dapat dimuat. Biasanya ini hanya sementara, jadi coba lagi sebentar lagi.", "Builders could not load. This is usually temporary, so please try again shortly.")}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#183d34",
              border: 0,
              borderRadius: 100,
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 650,
              padding: "14px 24px",
            }}
          >
            {tx(locale, "Coba lagi", "Try again")}
          </button>
        </div>
      </body>
    </html>
  );
}
