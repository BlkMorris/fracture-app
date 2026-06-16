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
    <html lang="en" className={`${instrumentSerif.variable} ${ibmPlexMono.variable} ${barlowCondensed.variable} pulse-booting`} suppressHydrationWarning>
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
html.pulse-booting,html.pulse-booting body{background:#fcfcf8;color:#101114}
html.pulse-booting:not(.pulse-ready) #pulse-app-root{visibility:hidden}
html.pulse-booting::before{content:"FRACTURE";position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:#fcfcf8;color:#101114;font-family:Inter,"Public Sans",Arial,sans-serif;font-size:clamp(42px,8vw,96px);line-height:.82;font-weight:1000;letter-spacing:-.055em;opacity:1;transition:opacity 220ms cubic-bezier(.22,1,.36,1);pointer-events:none}
html.pulse-ready::before{opacity:0}
`,
          }}
        />
      </head>
      <body>
        <div id="pulse-app-root">
          <Providers>
            {children}
          </Providers>
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(() => {
  const root = document.documentElement;
  const release = () => {
    root.classList.add("pulse-ready");
    window.setTimeout(() => root.classList.remove("pulse-booting", "pulse-ready"), 260);
  };
  const afterPaint = () => requestAnimationFrame(() => requestAnimationFrame(release));
  if (document.readyState === "complete") afterPaint();
  else window.addEventListener("load", afterPaint, { once: true });
})();
`,
          }}
        />
      </body>
    </html>
  );
}
