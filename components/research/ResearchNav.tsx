"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localizeHref, type Locale } from "@/lib/i18n";

const tabs = [
  { id: "overview", path: "/research" },
  { id: "methodology", path: "/research/methodology" },
  { id: "publications", path: "/research/publications" },
] as const;

export function ResearchNav({
  lang,
  label,
  labels,
}: {
  lang: Locale;
  label: string;
  labels: Record<(typeof tabs)[number]["id"], string>;
}) {
  const pathname = usePathname();

  return (
    <nav className="researchNav" aria-label={label || "Research"}>
      <div className="researchNavBar" role="list">
        {tabs.map((tab) => {
          const href = localizeHref(lang, tab.path);
          const current = tab.path === "/research" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link key={tab.id} href={href} aria-current={current ? "page" : undefined} role="listitem">
              {labels[tab.id]}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
