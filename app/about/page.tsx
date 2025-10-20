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
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-14 px-6 py-24 lg:px-10">
        <header className="flex flex-col items-center gap-5 text-center">
          <p className="text-xs uppercase tracking-[0.32em] text-slate-400">
            Founders
          </p>
          <h1 className="text-4xl font-semibold text-slate-100 md:text-5xl">
            The minds behind Monte Carlo Casino Lab
          </h1>
          <Link
            href="/"
            className="group relative inline-flex items-center justify-center gap-3 rounded-full border border-sky-400/60 bg-sky-500/20 px-6 py-3 text-sm font-semibold uppercase tracking-[0.28em] text-sky-100 shadow-[0_20px_55px_-32px_rgba(56,189,248,0.9)] transition-all duration-300 hover:border-sky-300 hover:bg-sky-500/30 hover:text-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Back to simulator
            <span
              aria-hidden
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-sky-300/60 bg-sky-500/30 text-xs font-bold transition-transform duration-300 group-hover:translate-x-1 group-focus-visible:translate-x-1"
            >
              ↺
            </span>
          </Link>
        </header>

        <section className="grid gap-8 md:grid-cols-2">
          {leadershipProfiles.map((profile) => (
            <article
              key={profile.name}
              className="group flex flex-col rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_25px_65px_-35px_rgba(15,23,42,0.9)] backdrop-blur transition duration-300 hover:border-sky-300/40 hover:shadow-[0_35px_75px_-35px_rgba(56,189,248,0.5)]"
            >
              <div className="flex flex-col gap-3">
                <h2 className="text-2xl font-semibold text-slate-100">
                  {profile.name}
                </h2>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                  {profile.title}
                </p>
              </div>

              <div className="mt-8 flex-1 rounded-2xl border border-white/10 bg-slate-950/60 p-4 shadow-inner">
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
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-sky-300 transition hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                View full LinkedIn profile
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
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
