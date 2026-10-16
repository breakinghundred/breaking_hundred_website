import type { Metadata, Viewport } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ScrollProgress } from "@/components/ScrollProgress";
import { site } from "@/lib/site";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://breakinghundred.org"),
  openGraph: {
    title: `${site.tagline.replace(/\.$/, "")} | Breaking Hundred Circle`,
    description:
      "Leadership community, fellowship and annual gatherings for women from minority ethnic backgrounds.",
    url: "/",
    siteName: "Breaking Hundred Circle",
    locale: "en_GB",
    type: "website",
    images: [{ url: "/images/og-default.jpg", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },

  title: {
    default: `${site.tagline.replace(/\.$/, "")} | Breaking Hundred Circle`,
    template: "%s | Breaking Hundred Circle",
  },
  description:
    "Leadership community, fellowship and annual gatherings for women from minority ethnic backgrounds.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#32142b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${dmSans.variable} ${manrope.variable}`}>
      <head>
        {/*
          Framer Motion ships `initial` as inline opacity:0, so content is
          invisible until hydration. Reveal everything when JS is unavailable.
        */}
        <noscript>
          <style>{`[style*="opacity:0"], [style*="opacity: 0"] {
            opacity: 1 !important;
            transform: none !important;
            filter: none !important;
          }`}</style>
        </noscript>
      </head>
      <body>
        <ScrollProgress />
        <Header />
        <main id="content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
