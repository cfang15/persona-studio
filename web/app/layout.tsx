import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Persona Studio",
  description: "Write NPC personalities, talk to them, and check they stay in character.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&display=swap"
        />
      </head>
      <body className="min-h-screen">
        <header className="border-b border-line bg-sheet">
          <div className="mx-auto flex max-w-6xl items-baseline justify-between px-4 py-4 sm:px-6">
            <Link href="/" className="font-display text-2xl font-bold tracking-tight">
              Persona Studio
            </Link>
            <p className="hidden text-sm text-muted sm:block">Write a character. Talk to it. Check it stays in character.</p>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
