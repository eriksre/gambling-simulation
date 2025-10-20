import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Monte Carlo Casino Lab",
  description:
    "Run Monte Carlo betting experiments and visualise variance against the house edge.",
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <nav className="fixed right-6 top-6 z-50">
          <Link
            href="/about"
            className="inline-flex items-center rounded-full border border-white/10 bg-slate-900/70 px-4 py-2 text-sm font-semibold uppercase tracking-[0.28em] text-slate-100 shadow-lg transition hover:border-white/40 hover:text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 backdrop-blur"
          >
            About
          </Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
