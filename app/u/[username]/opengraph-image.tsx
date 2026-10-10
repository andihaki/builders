import { ImageResponse } from "next/og";
import { getPerson, getPersonStats, getPortfolio } from "../../lib/data";
import { monthYear } from "../../components/pieces";
import { currentLocale } from "../../lib/locale-server";
import { tx } from "../../lib/locale";

/**
 * The share card for a profile — the page doing the actual promoting when a
 * portfolio link lands in a chat or a feed. Name, headline, and the numbers
 * the trail can back up.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Builders";

const PAPER = "#f8f6f0";
const INK = "#183d34";
const MUTED = "#68746d";
const ORANGE = "#ed714b";

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const [{ username }, locale] = await Promise.all([params, currentLocale()]);
  const person = await getPerson(username);

  if (!person) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: PAPER,
            color: INK,
            fontSize: 64,
            fontWeight: 700,
          }}
        >
          Builders
        </div>
      ),
      size,
    );
  }

  const [{ owned, contributing }, stats] = await Promise.all([
    getPortfolio(person),
    getPersonStats(person.id),
  ]);
  const live = owned.filter((project) => project.stage === "live").length;

  const numbers = [
    tx(locale, `${owned.length} proyek`, `${owned.length} project`),
    live > 0 ? tx(locale, `${live} aktif`, `${live} live`) : "",
    contributing.length > 0 ? tx(locale, `${contributing.length} kontribusi`, `${contributing.length} contributions`) : "",
    stats.rolesTaken > 0 ? tx(locale, `${stats.rolesTaken} peran diikuti`, `${stats.rolesTaken} roles joined`) : "",
    stats.tasksDone > 0 ? tx(locale, `${stats.tasksDone} tugas selesai`, `${stats.tasksDone} tasks completed`) : "",
  ]
    .filter(Boolean)
    .join("  ·  ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: PAPER,
          color: INK,
          padding: "64px 72px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 26,
            letterSpacing: 6,
            color: MUTED,
          }}
        >
          <div style={{ display: "flex" }}>BUILDERS</div>
          <div style={{ display: "flex" }}>{tx(locale, "PORTOFOLIO", "PORTFOLIO")}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 700, lineHeight: 1.05 }}>
            {person.name}
          </div>
          {person.headline ? (
            <div style={{ display: "flex", fontSize: 36, color: MUTED, lineHeight: 1.3 }}>
              {person.headline}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            borderTop: `3px solid ${ORANGE}`,
            paddingTop: 28,
          }}
        >
          {numbers ? <div style={{ display: "flex", fontSize: 32 }}>{numbers}</div> : null}
          <div style={{ display: "flex", fontSize: 24, color: MUTED }}>
            {stats.since
              ? tx(locale, `Aktif sejak ${monthYear(stats.since, locale)} — sistem mencatat jejak ini; bukan diketik belakangan.`, `Active since ${monthYear(stats.since, locale)} — the system records this trail; it is not typed in later.`)
              : tx(locale, "Sistem mencatat jejak ini; bukan diketik belakangan.", "The system records this trail; it is not typed in later.")}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
