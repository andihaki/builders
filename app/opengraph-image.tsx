import { ImageResponse } from "next/og";
import { currentLocale } from "./lib/locale-server";
import { tx } from "./lib/locale";

export const alt = "Builders";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const locale = await currentLocale();
  return new ImageResponse(
    <div
      style={{
        alignItems: "stretch",
        background: "#f3f6f4",
        color: "#173d32",
        display: "flex",
        fontFamily: "Arial, sans-serif",
        height: "100%",
        overflow: "hidden",
        padding: "68px 76px",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          border: "1px solid rgba(23, 61, 50, .1)",
          borderRadius: "50%",
          display: "flex",
          height: 330,
          position: "absolute",
          right: -70,
          top: -80,
          width: 330,
        }}
      />
      <div
        style={{
          border: "1px solid rgba(241, 104, 75, .14)",
          borderRadius: "50%",
          bottom: -80,
          display: "flex",
          height: 210,
          left: -45,
          position: "absolute",
          width: 210,
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          width: "100%",
        }}
      >
        <div style={{ alignItems: "center", display: "flex", gap: 18 }}>
          <div
            style={{
              alignItems: "center",
              background: "#173d32",
              borderRadius: 15,
              display: "flex",
              height: 62,
              justifyContent: "center",
              width: 62,
            }}
          >
            <svg width="44" height="44" viewBox="0 0 40 40" fill="none">
              <g transform="translate(20 20.6) scale(.74) translate(-20 -20)">
                <path
                  d="M6.8 32C7.6 28 8 24.6 9.4 21.2 11 17 17.2 14.6 20 7.6 22.8 14.6 29 17 30.6 21.2 32 24.6 32.4 28 33.2 32"
                  stroke="#f3f0e8"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 800, letterSpacing: "-1.5px" }}>
            builders<span style={{ color: "#315f51", display: "flex", fontWeight: 650 }}>.swegrowth</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              color: "#ef684b",
              display: "flex",
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "4px",
              textTransform: "uppercase",
            }}
          >
            {tx(locale, "Indeks publik untuk karya nyata", "A public index of real work")}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 70,
              fontWeight: 800,
              letterSpacing: "-4px",
              lineHeight: 1.02,
              maxWidth: 960,
            }}
          >
            {tx(locale, "Tampilkan karyamu. Bangun portofolio. Jadilah mudah ditemukan.", "Show your work. Build your portfolio. Get discovered.")}
          </div>
        </div>

        <div style={{ color: "#667970", display: "flex", fontSize: 22 }}>builders.swegrowth.id</div>
      </div>
    </div>,
    size,
  );
}
