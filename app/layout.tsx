import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { defaultShareImage, siteUrl } from "./content";
import { LanguageProvider } from "./components/language-provider";
import { currentLocale } from "./lib/locale-server";
import { cookies } from "next/headers";
import { isTheme, THEME_COOKIE } from "./lib/theme";
import "./globals.css";

export const instant = false;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f6f0" },
    { media: "(prefers-color-scheme: dark)", color: "#13120f" },
  ],
};

// Each page sets its own title, description and canonical. The share metadata
// here is the fallback: pages with an opengraph-image file (profiles,
// projects) get their own card image, everything else shares the generated root card.
export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  return {
    metadataBase: new URL(siteUrl),
    title: { default: "Builders", template: "%s" },
    openGraph: {
      siteName: "Builders",
      type: "website",
      locale: locale === "id" ? "id_ID" : "en_US",
      images: [defaultShareImage],
    },
    twitter: { card: "summary_large_image", images: [defaultShareImage.url] },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
        { url: "/favicon.svg", type: "image/svg+xml" },
      ],
      shortcut: "/favicon.ico",
      apple: "/apple-touch-icon.png",
    },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await currentLocale();
  // A chosen theme is rendered on the server so the first paint is already
  // right; with none, globals.css follows the device.
  const chosen = (await cookies()).get(THEME_COOKIE)?.value;
  const theme = isTheme(chosen) ? chosen : undefined;

  return (
    <html lang={locale} data-theme={theme}>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <LanguageProvider locale={locale}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
