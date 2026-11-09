import Image from "next/image";
import Link from "next/link";
import { ui } from "@/lib/content/copy";
import { localizeHref, type Locale } from "@/lib/i18n";

export function SiteFooter({ lang, accessibilityUrl }: { lang: Locale; accessibilityUrl?: string }) {
  const copy = ui[lang];
  const contactLabel = lang === "en" ? "Contact Us" : copy.nav.contact;

  return (
    <footer className="archiveFooter">
      <div className="archiveFooterInner">
        <Link className="archiveLogo" href={localizeHref(lang, "/")}>
          <Image src="/images/logo.png" alt={copy.siteName} width={64} height={64} />
        </Link>
        <p className="archiveFooterCopy">{copy.story.rights}</p>
        <nav className="archiveFooterNav" aria-label="Footer">
          <Link href={localizeHref(lang, "/")}>{copy.nav.home}</Link>
          <Link href={localizeHref(lang, "/stories")}>{copy.nav.stories}</Link>
          <Link href={localizeHref(lang, "/contact")}>{contactLabel}</Link>
          {accessibilityUrl ? <a href={accessibilityUrl}>{copy.footer.accessibility}</a> : null}
        </nav>
      </div>
    </footer>
  );
}
