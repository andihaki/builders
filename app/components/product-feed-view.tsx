import Link from "./responsive-link";
import { ProjectLogo } from "./project-logo";
import { ReactionBar } from "./reaction-bar";
import { RelativeTime } from "./relative-time";
import { dayLabel, feedDays, feedLine, type ProductDay } from "../lib/product-feed";
import { eventReactionKey, type ReactionCount } from "../lib/reactions";
import { tx, type Locale } from "../lib/locale";

export type FeedProductLook = { logoUrl: string; website: string };

/**
 * The builders site's activity: one card per product per day, saying what
 * happened on it in the trail's own words — added, moved to a stage, an
 * update, a role opened or filled — with reactions under each card. Laid out
 * like the open source site's PR feed (the `ax-` timeline), so the two read as
 * one family.
 */
export function ProductFeedView({
  entries,
  looks,
  reactions,
  viewerName,
  today,
  locale,
}: {
  entries: ProductDay[];
  looks: Record<string, FeedProductLook>;
  reactions: Record<string, ReactionCount[]>;
  viewerName: string | null;
  today: string;
  locale: Locale;
}) {
  if (entries.length === 0) {
    return (
      <div className="ax-note">
        <p>{tx(locale, "Belum ada kabar dari produk member.", "No news from members' products yet.")}</p>
        <p>
          {tx(locale, "Punya produk? ", "Building one? ")}
          <Link href="/new">{tx(locale, "Daftarkan, lalu tulis kabar terbarunya.", "List it, then post its latest news.")}</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="ax-timeline">
      {feedDays(entries).map(({ day, entries: onDay }) => (
        <section key={day} className="ax-day" aria-labelledby={`day-${day}`}>
          <h2 id={`day-${day}`} className="ax-day-title">
            {dayLabel(day, today, locale)}
          </h2>
          <ol className="ax-events">
            {onDay.map((entry) => {
              const key = eventReactionKey(entry.firstEventId);
              const look = looks[entry.product.slug];
              return (
                <li key={key} className="ax-event">
                  <ProjectLogo
                    className="pfeed-logo"
                    title={entry.product.title}
                    website={look?.website ?? ""}
                    logoUrl={look?.logoUrl ?? ""}
                    fallback={entry.product.title.slice(0, 1).toUpperCase()}
                  />
                  <div className="ax-event-body">
                    <p className="ax-event-line">
                      {entry.product.slug ? (
                        <Link className="ax-who" href={`/projects/${entry.product.slug}`}>
                          {entry.product.title}
                        </Link>
                      ) : (
                        <strong className="ax-who">{entry.product.title}</strong>
                      )}
                      <span className="ax-time">
                        <RelativeTime value={entry.at} locale={locale} />
                      </span>
                    </p>
                    <ul className="pfeed-lines">
                      {/* Oldest first within the day, so the card reads as it happened. */}
                      {[...entry.events].reverse().map((event) => (
                        <li key={event.id} className={`pfeed-line pfeed-${event.kind}`}>
                          {event.actor ? <Link href={`/u/${event.actor.username}`}>{event.actor.name || `@${event.actor.username}`}</Link> : tx(locale, "Seseorang", "Somebody")}{" "}
                          {feedLine(event, locale)}
                        </li>
                      ))}
                    </ul>
                    <ReactionBar url={key} initial={reactions[key] ?? []} viewerName={viewerName} />
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
