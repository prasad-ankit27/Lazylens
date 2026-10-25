import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lazylens | Deterministic 1080x1350 Social Layout Generator",
  description: "Merge 4 user photos deterministically into Instagram 4:5 portrait formats with instant React index-swapping.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Allura&family=Anton&family=Bebas+Neue&family=Caveat:wght@400..700&family=Cinzel:wght@600..800&family=Cormorant+Garamond:ital,wght@0,400..700;1,400..700&family=DM+Serif+Display:ital@0;1&family=Great+Vibes&family=Inter:wght@300..900&family=JetBrains+Mono:wght@400..700&family=Kalam:wght@300;400;700&family=Manrope:wght@300..800&family=Oswald:wght@300..700&family=Outfit:wght@400..800&family=Patrick+Hand&family=Permanent+Marker&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:wght@300..800&family=Sacramento&family=Special+Elite&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
