"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { NavItem } from "@/lib/content/copy";
import { ui } from "@/lib/content/copy";
import { locales, localizeHref, swapLocale, type Locale } from "@/lib/i18n";
import { pick } from "@/lib/content/text";

const languageLabel: Record<Locale, string> = { en: "English", es: "Español", zh: "中文" };

export function SiteHeader({ lang, navigation }: { lang: Locale; navigation: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const copy = ui[lang];

  return (
    <header className="siteHeader">
      <div className="container nav">
        <Link className="brand" href={localizeHref(lang, "/")} onClick={() => setOpen(false)}>
          <img className="brandLogo" src="/logo.png" alt={copy.siteName} width={80} height={80} />
        </Link>
        <button
          type="button"
          className="navToggle"
          aria-expanded={open}
          aria-controls="primary-navigation"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? copy.menuClose : copy.menuOpen}
        </button>
        <nav
          id="primary-navigation"
          className={open ? "navLinks isOpen" : "navLinks"}
          aria-label="Primary navigation"
        >
          {navigation.map((item) => {
            const href = localizeHref(lang, item.path);
            const current = item.path === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={item.path}
                href={href}
                aria-current={current ? "page" : undefined}
                className={current ? "isCurrent" : undefined}
                onClick={() => setOpen(false)}
              >
                {pick(item.label, lang)}
              </Link>
            );
          })}
          <div className="langSwitch" role="group" aria-label={copy.languageLabel}>
            {locales.map((locale) => (
              <Link
                key={locale}
                href={swapLocale(pathname, locale)}
                hrefLang={locale}
                lang={locale}
                aria-current={locale === lang ? "true" : undefined}
                onClick={() => setOpen(false)}
              >
                {languageLabel[locale]}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
