import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reel → Recipe Card",
  description: "Turn any Instagram Reel or TikTok cooking video into a printable recipe card.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-charcoal text-paper antialiased">{children}</body>
    </html>
  );
}
