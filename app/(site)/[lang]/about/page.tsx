import type { Metadata } from "next";
import Link from "next/link";
import { ui } from "@/lib/content/copy";
import { getArchive } from "@/lib/content/get-content";
import { pick } from "@/lib/content/text";
import { localizeHref } from "@/lib/i18n";
import { readLang } from "@/lib/i18n/request";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = await readLang(params);
  return { title: ui[lang].about.eyebrow };
}

export default async function AboutPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await readLang(params);
  const copy = ui[lang];
  const archive = await getArchive();
  const page = archive.pages.find((item) => item.slug === "about");

  return (
    <>
      <section className="pageHero">
        <div className="container">
          <p className="eyebrow">{copy.about.eyebrow}</p>
          <h1 className="display">{pick(page?.title, lang) || copy.about.title}</h1>
          <p className="lede">{pick(page?.summary, lang) || copy.about.lede}</p>
        </div>
      </section>

      <section className="section">
        <div className="container widePanel twoCol">
          <div>
            <p className="eyebrow">{copy.about.missionEyebrow}</p>
            <h2 className="sectionTitle">{copy.about.missionTitle}</h2>
            <div className="rule" />
            <p className="prose">{pick(page?.body, lang) || copy.about.missionBody}</p>
          </div>
          <div className="archiveArt" aria-hidden="true" />
        </div>
      </section>

      <section className="section">
        <div className="container widePanel twoCol reverse">
          <div className="archiveArt" aria-hidden="true" />
          <div>
            <p className="eyebrow">{copy.about.approachEyebrow}</p>
            <h2 className="sectionTitle">{copy.about.approachTitle}</h2>
            <div className="rule" />
            <p className="prose">{copy.about.approachBody}</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container collections">
          <div className="collectionCard">
            <span>{copy.about.methodsLabel}</span>
            <h3>{copy.about.methodsTitle}</h3>
            <p>{copy.about.methodsBody}</p>
          </div>
          <div className="collectionCard">
            <span>{copy.about.peopleLabel}</span>
            <h3>{copy.about.peopleTitle}</h3>
            <p>{copy.about.peopleBody}</p>
          </div>
          <div className="collectionCard">
            <span>{copy.about.archiveLabel}</span>
            <h3>{copy.about.archiveTitle}</h3>
            <p>{copy.about.archiveBody}</p>
            <p>
              <Link href={localizeHref(lang, "/stories")}>{copy.about.browse} →</Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
