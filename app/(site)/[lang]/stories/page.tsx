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
  const page = archive.pages.find((item) => item.slug === "stories");
  return { title: pick(page?.title, lang) || ui[lang].stories.title, description: pick(page?.summary, lang) };
}

export default async function StoriesPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await readLang(params);
  const copy = ui[lang];
  const archive = await getArchive();
  const page = archive.pages.find((item) => item.slug === "stories");

  return (
    <>
      <section className="archiveHero">
        <div className="container archiveHeroSplit">
          <div className="archiveHeroCopy">
            <h1 className="archiveTitle">{pick(page?.title, lang) || copy.stories.title}</h1>
            <p className="archiveLede">{pick(page?.summary, lang) || copy.stories.lede}</p>
            <p className="archiveLede">{pick(page?.body, lang) || copy.stories.ledeContinued}</p>
          </div>
        </div>
      </section>
      <div className="goldBar" aria-hidden="true" />

      <section className="paperBand">
        <div className="container">
          <p className="eyebrow">{copy.stories.listEyebrow}</p>
          <h2 className="sectionTitle">{copy.stories.listTitle}</h2>
          <div className="participantGrid">
            {archive.stories.map((story) => {
              const photo = story.photographs[0];
              return (
                <article className="participantCard" key={story.slug}>
                  {photo ? (
                    <ArchiveImage alt={pick(photo.alt, lang)} className="participantPhoto" height={640} src={photo.src} width={640} />
                  ) : (
                    <div className="participantPhoto participantPhotoEmpty" aria-hidden="true">
                      {story.participantCode.slice(0, 1)}
                    </div>
                  )}
                  <div className="participantCardBody">
                    <h3>{pick(story.title, lang)}</h3>
                    <p>{pick(story.summary, lang)}</p>
                    <Link href={localizeHref(lang, `/stories/${story.slug}`)}>{copy.stories.readStory}</Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
