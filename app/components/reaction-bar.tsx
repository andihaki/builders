"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setReaction } from "../actions";
import { REACTIONS, toggleReaction, type ReactionCount, type ReactionKey } from "../lib/reactions";
import { useLanguage } from "./language-provider";

/**
 * Slack's reaction row under a pull request on /activity: a pill for each
 * emoji somebody has left, and a button to leave another.
 *
 * The press shows at once and is saved behind it; if saving fails the bar
 * goes back to what it was. A guest pressing anything is sent to sign in and
 * back to the page.
 */
export function ReactionBar({
  url,
  initial,
  viewerName,
}: {
  url: string;
  initial: ReactionCount[];
  /** Null for a guest. */
  viewerName: string | null;
}) {
  const { tx, locale } = useLanguage();
  const [counts, setCounts] = useState(initial);
  const [picking, setPicking] = useState(false);
  const [failed, setFailed] = useState(false);
  const [, startTransition] = useTransition();
  const picker = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!picking) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !picker.current?.contains(event.target as Node)) setPicking(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [picking]);

  const signIn = () => {
    const next = `${window.location.pathname}${window.location.search}`;
    router.push(`/signin?next=${encodeURIComponent(next)}`);
  };

  const press = (key: ReactionKey) => {
    setPicking(false);
    if (viewerName === null) return signIn();
    const before = counts;
    const on = !before.find((count) => count.key === key)?.mine;
    setFailed(false);
    setCounts(toggleReaction(before, key, viewerName));
    startTransition(async () => {
      // A dropped connection throws rather than answering; it is the same
      // failure to the person pressing, and must not take the page down.
      const result = await setReaction(url, key, on).catch(() => ({ ok: false, reason: "failed" }) as const);
      if (result.ok) return;
      setCounts(before);
      if (result.reason === "signin") signIn();
      else setFailed(true);
    });
  };

  const label = (key: ReactionKey) => {
    const reaction = REACTIONS.find((each) => each.key === key)!;
    return locale === "id" ? reaction.label : reaction.labelEn;
  };

  return (
    <div className="reaction-bar">
      {counts.map((count) => {
        const reaction = REACTIONS.find((each) => each.key === count.key)!;
        const who = count.names.length > 0 ? count.names.join(", ") : tx(`${count.count} orang`, `${count.count} people`);
        return (
          <button
            key={count.key}
            type="button"
            className={`reaction-pill ${count.mine ? "is-mine" : ""}`}
            aria-pressed={count.mine}
            title={`${reaction.emoji} ${who}`}
            onClick={() => press(count.key)}
          >
            <span aria-hidden="true">{reaction.emoji}</span>
            <span className="reaction-count">{count.count}</span>
            <span className="sr-only">{label(count.key)}</span>
          </button>
        );
      })}

      <div className="reaction-add-wrap" ref={picker}>
        <button
          type="button"
          className="reaction-add"
          aria-expanded={picking}
          aria-label={tx("Beri reaksi", "Add a reaction")}
          title={viewerName === null ? tx("Masuk untuk memberi reaksi", "Sign in to react") : tx("Beri reaksi", "Add a reaction")}
          onClick={() => (viewerName === null ? signIn() : setPicking((open) => !open))}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="12" r="8" />
            <path d="M8 14.5a4 4 0 0 0 6 0M8.5 9.8h.01M13.5 9.8h.01M19 3v5M16.5 5.5h5" />
          </svg>
        </button>
        {picking ? (
          <div className="reaction-picker" role="menu" aria-label={tx("Pilih reaksi", "Choose a reaction")}>
            {REACTIONS.map((reaction) => (
              <button key={reaction.key} type="button" role="menuitem" title={label(reaction.key)} onClick={() => press(reaction.key)}>
                <span aria-hidden="true">{reaction.emoji}</span>
                <span className="sr-only">{label(reaction.key)}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {failed ? (
        <span className="reaction-failed" role="status">
          {tx("Gagal menyimpan. Coba lagi.", "Could not save. Try again.")}
        </span>
      ) : null}
    </div>
  );
}
