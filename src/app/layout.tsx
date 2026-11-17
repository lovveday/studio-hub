import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  applicationName: "Studio Hub",
  authors: [{ name: "Osekhuemen Peter-imoisili" }],
  creator: "Osekhuemen Peter-imoisili",
  publisher: "Osekhuemen Peter-imoisili",
  title: "Studio Hub — social media command center",
  description:
    "Plan, create, approve, schedule, publish and report across every client brand — with a knowledge inbox that turns voice notes into brand facts.",
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: "Studio Hub",
    title: "Studio Hub — social media command center",
    description:
      "Every brand, every channel, one calm place. Knowledge inbox, calendar, assisted publishing and client reports.",
    locale: "en_NG",
  },
  twitter: {
    card: "summary",
    title: "Studio Hub — social media command center",
    description:
      "Every brand, every channel, one calm place. Knowledge inbox, calendar, assisted publishing and client reports.",
  },
};

export const viewport: Viewport = {
  themeColor: "#111318",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
