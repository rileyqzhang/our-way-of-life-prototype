import type { Metadata } from "next";
import Link from "next/link";
import { ArchiveImage } from "@/components/media/ArchiveImage";
import { ui } from "@/lib/content/copy";
import { getArchive } from "@/lib/content/get-content";
import { pick } from "@/lib/content/text";
import { localizeHref } from "@/lib/i18n";
import { readLang } from "@/lib/i18n/request";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = await readLang(params);
  const archive = await getArchive();
  const home = archive.pages.find((page) => page.slug === "home");
  return { title: pick(home?.title, lang) || ui[lang].home.title, description: pick(home?.summary, lang) };
}

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await readLang(params);
  const copy = ui[lang];
  const archive = await getArchive();
  const home = archive.pages.find((page) => page.slug === "home");
  const featured = archive.stories.find((story) => story.photographs[0] && story.quotations[0]) ?? archive.stories[0];
  const photo = featured?.photographs[0];

  return (
    <>
      <section className="pageHero">
        <div className="container">
          <p className="eyebrow">{copy.home.eyebrow}</p>
          <h1 className="display">{pick(home?.title, lang) || copy.home.title}</h1>
          <p className="lede">{pick(home?.summary, lang) || copy.home.lede}</p>
          <div className="heroActions">
            <Link className="button" href={localizeHref(lang, "/stories")}>
              {copy.home.exploreStories}
            </Link>
            <Link className="button secondary" href={localizeHref(lang, "/timeline")}>
              {copy.home.openTimeline}
            </Link>
          </div>
        </div>
      </section>

      {featured ? (
        <section className="section">
          <div className="container widePanel twoCol">
            <div>
              <p className="eyebrow">{copy.home.featuredEyebrow}</p>
              <h2 className="sectionTitle">{pick(featured.title, lang)}</h2>
              <div className="rule" />
              <blockquote className="prose">{pick(featured.summary, lang)}</blockquote>
              <div className="heroActions" style={{ justifyContent: "flex-start" }}>
                <Link className="button" href={localizeHref(lang, `/stories/${featured.slug}`)}>
                  {copy.home.readStory}
                </Link>
              </div>
            </div>
            {photo ? (
              <ArchiveImage
                alt={pick(photo.alt, lang)}
                className="featuredPhoto"
                height={720}
                priority
                src={photo.src}
                width={720}
              />
            ) : (
              <div className="archiveArt" aria-hidden="true" />
            )}
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="container">
          <p className="eyebrow">{copy.home.collectionsEyebrow}</p>
          <h2 className="sectionTitle">{copy.home.collectionsTitle}</h2>
          <div className="collections">
            {copy.collections.map((collection) => (
              <Link className="collectionCard" href={localizeHref(lang, `/stories/collections/${collection.id}`)} key={collection.id}>
                <span>{collection.label}</span>
                <h3>{collection.title}</h3>
                <p>{collection.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container callout">
          <p className="eyebrow">{copy.home.timelineEyebrow}</p>
          <h2>{copy.home.timelineTitle}</h2>
          <p>{copy.home.timelineBody}</p>
          <Link className="button" href={localizeHref(lang, "/timeline")}>
            {copy.home.openTimeline}
          </Link>
        </div>
      </section>
    </>
  );
}
