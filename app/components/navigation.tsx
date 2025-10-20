'use client';

import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function Navigation() {
  return (
    <nav className="fixed right-8 top-8 z-50 flex items-center gap-3">
      <ThemeToggle />
      <Link
        href="/about"
        className="group relative inline-flex items-center px-5 py-2.5 text-xs font-bold uppercase tracking-[0.25em] transition-all overflow-hidden rounded-full"
        style={{ color: 'var(--foreground)' }}
      >
        <div className="absolute inset-0 backdrop-blur-xl transition-all rounded-full" style={{ background: 'var(--surface-bg)' }} />
        <div className="absolute inset-0 backdrop-blur-xl transition-all rounded-full opacity-0 group-hover:opacity-100" style={{ background: 'var(--surface-hover)' }} />
        <span className="relative">About</span>
      </Link>
    </nav>
  );
}
