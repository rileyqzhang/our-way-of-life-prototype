"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ui } from "@/lib/content/copy";
import { isLocale, localizeHref, type Locale } from "@/lib/i18n";

const tabs = [
  { id: "transcripts", path: "/research" },
  { id: "publications", path: "/research/publications" },
  { id: "methodology", path: "/research/methodology" },
] as const;

export function ResearchNav() {
  const pathname = usePathname();
  const segment = pathname.split("/")[1];
  const lang: Locale = isLocale(segment) ? segment : "en";
  const copy = ui[lang].research;

  return (
    <nav className="researchNav" aria-label={copy.transcripts}>
      {tabs.map((tab) => {
        const href = localizeHref(lang, tab.path);
        const current = tab.path === "/research" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={tab.id} href={href} aria-current={current ? "page" : undefined}>
            {copy[tab.id]}
          </Link>
        );
      })}
    </nav>
  );
}
