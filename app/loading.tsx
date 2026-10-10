import { Skeleton } from "./components/skeleton";
import { Logo } from "./logo";

/**
 * Catch-all route feedback for pages without a more specific skeleton.
 *
 * The header and a stable reading column are enough to acknowledge navigation
 * immediately without pretending to know the destination page's exact shape.
 */
export default function Loading() {
  return (
    <>
      <header className="site-header">
        <div className="topbar-inner">
          <div className="brand" aria-hidden="true">
            <Logo className="brand-mark" />
            <span><strong>builders</strong><span className="brand-alt">.swegrowth</span></span>
          </div>
          <nav className="desktop-nav generic-loading-nav" aria-hidden="true">
            {[68, 74, 88, 72].map((width) => <Skeleton key={width} height={12} width={width} />)}
          </nav>
          <div className="header-actions header-shell-actions header-account-skeleton" aria-hidden="true">
            <Skeleton height={38} width={38} round />
            <Skeleton height={40} width={116} style={{ borderRadius: 999 }} />
          </div>
        </div>
      </header>
      <main id="main-content" className="page-narrow generic-route-loading" aria-busy="true">
        <p className="sr-only">Memuat… / Loading…</p>
        <Skeleton height={11} width={150} style={{ marginBottom: 22 }} />
        <Skeleton height={58} width="78%" style={{ marginBottom: 14 }} />
        <Skeleton height={58} width="58%" style={{ marginBottom: 30 }} />
        <Skeleton height={16} width="92%" style={{ marginBottom: 10 }} />
        <Skeleton height={16} width="84%" style={{ marginBottom: 10 }} />
        <Skeleton height={16} width="65%" style={{ marginBottom: 34 }} />
        <div className="skeleton-panel" style={{ minHeight: 210 }}>
          <Skeleton height={20} width="34%" style={{ marginBottom: 22 }} />
          <Skeleton height={14} style={{ marginBottom: 10 }} />
          <Skeleton height={14} width="88%" style={{ marginBottom: 10 }} />
          <Skeleton height={14} width="72%" />
        </div>
      </main>
    </>
  );
}
