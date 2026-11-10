import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans, Plus_Jakarta_Sans, Source_Serif_4 } from "next/font/google";
import { draftMode } from "next/headers";
import { VisualEditing } from "next-sanity";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getArchive } from "@/lib/content/get-content";
import { ui } from "@/lib/content/copy";
import { locales } from "@/lib/i18n";
import { readLang } from "@/lib/i18n/request";
import "../../globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-source-serif",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
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
    <html lang={lang} className={`${dmSans.variable} ${plusJakarta.variable} ${sourceSerif.variable} ${cormorant.variable}`}>
      <body>
        <a className="skipLink" href="#main">
          {copy.skip}
        </a>
        <SiteHeader lang={lang} />
        <main id="main">{children}</main>
        <SiteFooter lang={lang} accessibilityUrl={archive.settings.accessibilityUrl} />
        {draft.isEnabled ? <VisualEditing /> : null}
      </body>
    </html>
  );
}
