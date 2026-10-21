"use client";

import { createContext, useContext, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from "react";

type Navigate = (href: string) => void;

const InstantNavContext = createContext<Navigate | null>(null);

/**
 * Hands `InstantLink`s below it a way to change the address without asking
 * the server — for a list that already holds every row it can show, so a
 * filter is a re-render, not a round trip.
 */
export function InstantNav({ navigate, children }: { navigate: Navigate; children: ReactNode }) {
  return <InstantNavContext.Provider value={navigate}>{children}</InstantNavContext.Provider>;
}

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string; children: ReactNode };

/**
 * A real link — it opens in a new tab, copies, and works before hydration —
 * whose plain click is handled in place by the nearest `InstantNav`.
 */
export function InstantLink({ href, onClick, children, ...props }: Props) {
  const navigate = useContext(InstantNavContext);

  const handle = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (!navigate || event.defaultPrevented) return;
    // Let the browser have anything that is not a plain left click.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(href);
  };

  return (
    <a href={href} onClick={handle} {...props}>
      {children}
    </a>
  );
}
