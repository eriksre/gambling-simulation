'use client';

import { useEffect } from 'react';
import Link from 'next/link';

type LeadershipProfile = {
  name: string;
  title: string;
  linkedinUrl: string;
  linkedinVanity: string;
};

declare global {
  interface Window {
    LIRenderAll?: () => void;
  }
}

const leadershipProfiles: LeadershipProfile[] = [
  {
    name: 'Eriks Reinfelds',
    title: 'CEO · Lead Design Architect',
    linkedinUrl: 'https://www.linkedin.com/in/eriksre/',
    linkedinVanity: 'eriksre',
  },
  {
    name: 'Harris Hisham',
    title: 'CFO · Design Consultant',
    linkedinUrl: 'https://www.linkedin.com/in/harris-hisham-45b670209/',
    linkedinVanity: 'harris-hisham-45b670209',
  },
];

export default function AboutPage() {
  useEffect(() => {
    const scriptId = 'linkedin-badge-script';
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;

    const renderBadges = () => {
      window.LIRenderAll?.();
      // Defer sizing tweaks until LinkedIn injects the iframe.
      window.setTimeout(() => {
        document
          .querySelectorAll<HTMLIFrameElement>('.linkedin-embed iframe')
          .forEach((iframe) => {
            iframe.style.width = '100%';
            iframe.style.minHeight = '360px';
            iframe.style.border = '0';
            iframe.style.borderRadius = '1.25rem';
          });
      }, 400);
    };

    if (existingScript) {
      if (existingScript.dataset.rendered === 'true') {
        renderBadges();
      } else {
        existingScript.addEventListener('load', renderBadges, { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://platform.linkedin.com/badges/js/profile.js';
    script.async = true;
    script.defer = true;
    script.dataset.rendered = 'false';
    script.addEventListener('load', () => {
      script.dataset.rendered = 'true';
      renderBadges();
    });
    document.body.appendChild(script);

    return () => {
      script.removeEventListener('load', renderBadges);
    };
  }, []);

  return (
    <main className="min-h-screen relative overflow-hidden" style={{ background: 'var(--background)' }}>
      <div className="fixed inset-0 opacity-40 dark:opacity-100 transition-opacity" style={{ background: 'linear-gradient(to bottom right, var(--gradient-from), transparent)' }} />
      <div className="fixed inset-0 backdrop-blur-[120px]" style={{ background: 'radial-gradient(circle at 20% 20%, var(--gradient-from) 0%, transparent 50%)' }} />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-16 px-6 py-24 lg:px-12">
        <header className="flex flex-col items-center gap-6 text-center">
          <p className="text-xs uppercase tracking-[0.4em] font-medium" style={{ color: 'var(--text-muted)' }}>
            Founders
          </p>
          <h1 className="text-5xl font-bold md:text-6xl leading-tight" style={{ color: 'var(--foreground)' }}>
            The minds behind<br />Monte Carlo Casino Lab
          </h1>
          <Link
            href="/"
            className="pressable group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full px-8 py-4 text-sm font-bold uppercase tracking-[0.25em] transition-transform duration-300 hover:-translate-y-0.5"
            style={{ color: '#ffffff' }}
          >
            <div
              className="absolute inset-0 rounded-full transition-all"
              style={{
                background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.75), rgba(99, 102, 241, 0.65))',
                boxShadow: '0 18px 45px rgba(124, 58, 237, 0.35)',
              }}
            />
            <span className="relative">Back to simulator</span>
            <span
              aria-hidden
              className="relative inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-transform duration-300 group-hover:translate-x-1"
              style={{
                background: 'rgba(255, 255, 255, 0.18)',
                color: '#ffffff',
              }}
            >
              ↺
            </span>
          </Link>
        </header>

        <section className="grid gap-8 md:grid-cols-2">
          {leadershipProfiles.map((profile) => (
            <article
              key={profile.name}
              className="group relative flex flex-col overflow-hidden rounded-3xl p-8 transition duration-300 theme-card"
            >
              <div
                className="absolute inset-0 rounded-3xl transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background:
                    'radial-gradient(circle at top left, rgba(124, 58, 237, 0.16), transparent 65%)',
                  opacity: 0.75,
                }}
              />

              <div className="relative flex flex-col gap-4">
                <h2 className="text-3xl font-bold theme-text">
                  {profile.name}
                </h2>
                <p className="text-xs uppercase tracking-[0.3em] theme-text-muted">
                  {profile.title}
                </p>
              </div>

              <div
                className="relative mt-8 flex-1 rounded-3xl border p-5 backdrop-blur-sm theme-border"
                style={{ background: 'var(--surface-bg)' }}
              >
                <div className="linkedin-embed min-h-[360px] w-full overflow-hidden">
                  <div
                    className="badge-base LI-profile-badge"
                    data-locale="en_US"
                    data-size="large"
                    data-theme="dark"
                    data-type="VERTICAL"
                    data-vanity={profile.linkedinVanity}
                    data-version="v1"
                  >
                    <a
                      className="badge-base__link LI-simple-link"
                      href={profile.linkedinUrl}
                    >
                      {profile.name}
                    </a>
                  </div>
                </div>
              </div>

              <a
                href={profile.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="relative mt-8 inline-flex items-center gap-2 text-sm font-bold transition-colors duration-200 group/link"
                style={{ color: 'var(--accent-violet)' }}
              >
                View full LinkedIn profile
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4 transition-transform group-hover/link:translate-x-1"
                  aria-hidden
                >
                  <path d="M6 4a1 1 0 0 1 1-1h9.5a.5.5 0 0 1 .5.5V13a1 1 0 1 1-2 0V7.414l-9.293 9.293a1 1 0 0 1-1.414-1.414L13.586 6H7a1 1 0 0 1-1-1V4Z" />
                </svg>
              </a>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
