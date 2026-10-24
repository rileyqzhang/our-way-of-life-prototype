import Link from "next/link";
import { ui } from "@/lib/content/copy";
import type { SiteSettings } from "@/lib/content/copy";
import { localizeHref, type Locale } from "@/lib/i18n";
import { pick } from "@/lib/content/text";

export function SiteFooter({ lang, settings }: { lang: Locale; settings: SiteSettings }) {
  const copy = ui[lang];

  return (
    <footer className="footer">
      <div className="goldBar" aria-hidden="true" />
      <div className="container footerInner">
        <strong>{pick(settings.siteName, lang)}</strong>
        <div className="footerLinks">
          <Link href={localizeHref(lang, "/research")}>{copy.footer.about}</Link>
          <Link href={localizeHref(lang, "/contact")}>{copy.footer.contact}</Link>
          <Link href={localizeHref(lang, "/share-your-story")}>{copy.footer.share}</Link>
          <a href={settings.accessibilityUrl}>{copy.footer.accessibility}</a>
        </div>
      </div>
    </footer>
  );
}
