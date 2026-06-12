import type { Metadata } from "next";
import { Instrument_Serif, IBM_Plex_Mono, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/providers";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-condensed",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fracture — See The Full Story",
  description:
    "Real-time narrative intelligence platform. See how different outlets frame the same story across the political spectrum.",
  keywords: ["news", "media bias", "narrative analysis", "political coverage", "media intelligence"],
  openGraph: {
    title: "Fracture — See The Full Story",
    description: "Real-time narrative intelligence across the political spectrum.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} ${ibmPlexMono.variable} ${barlowCondensed.variable}`}>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
