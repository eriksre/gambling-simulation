import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "./lib/theme-context";
import { Navigation } from "./components/navigation";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Monte Carlo Casino Lab",
  description:
    "Run Monte Carlo betting experiments and visualise variance against the house edge.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <ThemeProvider>
          <Navigation />
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
