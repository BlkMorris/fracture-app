import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fracture — Editorial Mockups",
  description: "Interactive homepage, story detail, and sources guide mockups for the Fracture platform.",
};

export default function MockupsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=DM+Sans:wght@400;500;600;700&family=Source+Serif+4:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600;700&family=Instrument+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&family=Archivo:wght@500;600;700;800&family=IBM+Plex+Sans:wght@400;500;600;700&family=Bodoni+Moda:opsz,wght@6..96,500;6..96,600;6..96,700&family=Outfit:wght@400;500;600;700;800&display=swap"
      />
      {children}
    </>
  );
}
