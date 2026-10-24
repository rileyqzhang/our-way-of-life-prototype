import type { Metadata } from "next";
import { Libre_Baskerville, Libre_Franklin } from "next/font/google";
import { draftMode } from "next/headers";
import { VisualEditing } from "next-sanity";
import { HideOnStoryDetail } from "@/components/HideOnStoryDetail";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getArchive } from "@/lib/content/get-content";
import { ui } from "@/lib/content/copy";
import { locales } from "@/lib/i18n";
import { readLang } from "@/lib/i18n/request";
import "../../globals.css";

const bodyFont = Libre_Franklin({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const displayFont = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
  adjustFontFallback: false,
});

export const revalidate = 60;

export const metadata: Metadata = {
  title: { default: "Our Way of Life Archive", template: "%s | Our Way of Life Archive" },
  description: "Immigrant and elder life stories through art and storytelling.",
};

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function SiteLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ lang: string }> }>) {
  const lang = await readLang(params);
  const archive = await getArchive();
  const draft = await draftMode();
  const copy = ui[lang];

  return (
    <html lang={lang} className={`${bodyFont.variable} ${displayFont.variable}`}>
      <body className={bodyFont.className}>
        <a className="skipLink" href="#main">
          {copy.skip}
        </a>
        <HideOnStoryDetail>
          <SiteHeader lang={lang} navigation={archive.settings.navigation} />
        </HideOnStoryDetail>
        <main id="main">{children}</main>
        <HideOnStoryDetail>
          <SiteFooter lang={lang} settings={archive.settings} />
        </HideOnStoryDetail>
        {draft.isEnabled ? <VisualEditing /> : null}
      </body>
    </html>
  );
}
