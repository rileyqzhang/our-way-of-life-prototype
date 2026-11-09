"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ui } from "@/lib/content/copy";
import { locales, localizeHref, swapLocale, type Locale } from "@/lib/i18n";

const languageLabel: Record<Locale, string> = { en: "English", es: "Español", zh: "中文" };
const languageShort: Record<Locale, string> = { en: "EN", es: "ES", zh: "中文" };

function isCurrent(pathname: string, lang: Locale, path: string) {
  const href = localizeHref(lang, path);
  if (path === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({ lang }: { lang: Locale }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const copy = ui[lang];
  const items = [
    { label: copy.nav.home, path: "/" },
    { label: copy.nav.timeline, path: "/timeline" },
    { label: copy.nav.share, path: "/share-your-story" },
    { label: copy.nav.stories, path: "/stories" },
    { label: copy.story.team, path: "/about" },
    { label: copy.nav.research, path: "/research" },
    { label: lang === "en" ? "Contact Us" : copy.nav.contact, path: "/contact" },
  ];

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="archiveHeader">
      <div className="archiveHeaderBar">
        <Link className="archiveLogo" href={localizeHref(lang, "/")} onClick={() => setOpen(false)}>
          <Image src="/images/logo.png" alt={copy.siteName} width={64} height={64} priority />
        </Link>
        <button
          ref={toggleRef}
          type="button"
          className="archiveNavToggle"
          aria-expanded={open}
          aria-controls="primary-navigation"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="visuallyHidden">{open ? copy.menuClose : copy.menuOpen}</span>
          {open ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
        <div className="archiveHeaderTools">
          <div className="archiveLang" role="group" aria-label={copy.languageLabel}>
            {locales.map((locale) => (
              <Link
                key={locale}
                href={swapLocale(pathname, locale)}
                hrefLang={locale}
                lang={locale}
                aria-current={locale === lang ? "true" : undefined}
                onClick={() => setOpen(false)}
              >
                <span className="archiveLangFull">{languageLabel[locale]}</span>
                <span className="archiveLangShort">{languageShort[locale]}</span>
              </Link>
            ))}
          </div>
        </div>
        <nav id="primary-navigation" className={open ? "archiveNav isOpen" : "archiveNav"} aria-label="Primary">
          {items.map((item) => {
            const href = localizeHref(lang, item.path);
            const current = isCurrent(pathname, lang, item.path);
            return (
              <Link
                key={item.path}
                href={href}
                aria-current={current ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
