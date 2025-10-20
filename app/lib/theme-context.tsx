'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  mounted: boolean;
}

const THEME_COLORS: Record<Theme, string> = {
  dark: '#0a0a0f',
  light: '#fafafa',
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  mounted: false,
});

function applyThemeToDocument(mode: Theme) {
  const color = THEME_COLORS[mode];
  document.documentElement.setAttribute('data-theme', mode);

  const metas = Array.from(
    document.querySelectorAll('meta[name="theme-color"]')
  ) as HTMLMetaElement[];

  if (metas.length === 0) {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
    metas.push(meta);
  }

  metas.forEach((meta) => {
    meta.setAttribute('content', color);
    meta.setAttribute('data-managed', 'app-theme');
    if (meta.hasAttribute('media')) {
      meta.removeAttribute('media');
    }
  });
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) {
      setTheme(stored);
      applyThemeToDocument(stored);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const newTheme = prefersDark ? 'dark' : 'light';
      setTheme(newTheme);
      applyThemeToDocument(newTheme);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('theme', theme);
      applyThemeToDocument(theme);
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      applyThemeToDocument(next);
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
