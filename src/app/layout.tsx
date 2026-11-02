import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Studio Hub — social media command center",
  description:
    "Plan, create, approve, schedule, publish and report across every client brand — with a knowledge inbox that turns voice notes into brand facts.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
