"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { InstantLink } from "./instant-link";
import { useLanguage } from "./language-provider";

export type ActiveFilter = { label: string; href: string };

/**
 * The directory's filters, the way GitHub's search lays them out.
 *
 * On a wide screen this is just the sidebar. On a phone the sidebar is folded
 * away behind a bar — what is applied, as removable chips, and a Filter
 * button — and opens as a sheet from the bottom, with the list still showing
 * dimmed above it; tapping there closes it. Picking anything in the sheet
 * applies it, so the sheet closes itself on any link inside it.
 *
 * While open it is a modal: the page behind stops scrolling (so a swipe moves
 * the sheet, never the list under it), Escape closes it, and focus moves in
 * on opening and back to the Filter button on closing.
 */
export function FilterPanel({ active, children }: { active: ActiveFilter[]; children: ReactNode }) {
  const { tx } = useLanguage();
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const closer = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    // Both: some mobile browsers scroll <body>, others <html>.
    const locked = [document.documentElement, document.body];
    const before = locked.map((element) => element.style.overflow);
    for (const element of locked) element.style.overflow = "hidden";
    closer.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const button = opener.current;
    return () => {
      locked.forEach((element, index) => (element.style.overflow = before[index]));
      window.removeEventListener("keydown", onKey);
      button?.focus({ preventScroll: true });
    };
  }, [open]);

  return (
    <>
      <div className="dx-filterbar">
        <span className="dx-filterbar-label">Filter:</span>
        {active.length > 0 ? (
          <ul className="dx-filterbar-chips">
            {active.map((filter) => (
              <li key={filter.href}>
                <InstantLink href={filter.href} aria-label={tx(`Hapus filter ${filter.label}`, `Remove filter ${filter.label}`)}>
                  {filter.label} <span aria-hidden="true">×</span>
                </InstantLink>
              </li>
            ))}
          </ul>
        ) : (
          <span className="dx-filterbar-none">{tx("Semua", "All")}</span>
        )}
        <button
          ref={opener}
          type="button"
          className="dx-filterbar-button"
          aria-expanded={open}
          aria-controls="dx-filters"
          onClick={() => setOpen(true)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M7 12h10M10 17h4" /></svg>
          Filter
          {active.length > 0 ? <span className="dx-filterbar-count">{active.length}</span> : null}
        </button>
      </div>

      {open ? (
        <button type="button" className="dx-sheet-backdrop" aria-label={tx("Tutup filter", "Close filters")} onClick={() => setOpen(false)} />
      ) : null}
      <aside
        id="dx-filters"
        className={`dx-side ${open ? "is-open" : ""}`}
        aria-label={tx("Filter", "Filters")}
        role={open ? "dialog" : undefined}
        aria-modal={open || undefined}
        onClickCapture={(event) => {
          if ((event.target as HTMLElement).closest("a")) setOpen(false);
        }}
      >
        <div className="dx-sheet-head">
          <p>{tx("Filter", "Filters")}</p>
          <button ref={closer} type="button" onClick={() => setOpen(false)} aria-label={tx("Tutup filter", "Close filters")}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <div className="dx-sheet-body">{children}</div>
      </aside>
    </>
  );
}
