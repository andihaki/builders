"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "./language-provider";

type ShareStatus = "idle" | "sharing" | "shared" | "copied" | "error";

export function ShareProfileButton({
  name,
  path,
}: {
  name: string;
  path: string;
}) {
  const [status, setStatus] = useState<ShareStatus>("idle");
  const { tx } = useLanguage();
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    };
  }, []);

  const showStatus = (next: "shared" | "copied" | "error") => {
    setStatus(next);
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setStatus("idle"), 2400);
  };

  const share = async () => {
    if (status === "sharing") return;
    setStatus("sharing");
    const url = new URL(path, window.location.origin).toString();

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${name} — Builders`,
          text: tx(`Lihat profil dan karya ${name} di Builders.`, `View ${name}'s profile and work on Builders.`),
          url,
        });
        showStatus("shared");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          setStatus("idle");
          return;
        }
      }
    }

    try {
      await copyToClipboard(url);
      showStatus("copied");
    } catch {
      showStatus("error");
    }
  };

  const label =
    status === "sharing"
      ? tx("Menyiapkan bagikan…", "Preparing share…")
      : status === "shared"
        ? tx("Profil dibagikan", "Profile shared")
        : status === "copied"
      ? tx("Tautan disalin", "Link copied")
      : status === "error"
        ? tx("Tautan tidak dapat disalin", "Could not copy link")
        : tx("Bagikan profil", "Share profile");

  return (
    <div className="profile-share-control">
      <button
        aria-label={label}
        className="profile-share-button"
        title={tx("Bagikan profil", "Share profile")}
        type="button"
        onClick={share}
        disabled={status === "sharing"}
        aria-busy={status === "sharing" || undefined}
      >
        {status === "sharing" ? <span className="action-spinner" aria-hidden="true" /> : status === "copied" || status === "shared" ? <CheckIcon /> : <ShareIcon />}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {status === "sharing"
          ? tx("Menyiapkan opsi bagikan.", "Preparing sharing options.")
          : status === "shared"
            ? tx("Profil dibagikan.", "Profile shared.")
            : status === "copied"
          ? tx("Tautan profil disalin.", "Profile link copied.")
          : status === "error"
            ? tx("Tautan profil tidak dapat disalin.", "Could not copy profile link.")
            : ""}
      </span>
    </div>
  );
}

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  if (!copied) throw new Error("The browser could not copy the link.");
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12.5 4.3 4.3L19 7" />
    </svg>
  );
}
