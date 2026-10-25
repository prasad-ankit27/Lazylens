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
      </head>
      <body>{children}</body>
    </html>
  );
}
