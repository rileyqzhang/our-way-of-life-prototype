import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { ArchiveBookTransition } from "@/components/stories/ArchiveBookTransition";
import { ArchiveVolumeBook, volumeTone, volumeTransitionName } from "@/components/stories/ArchiveVolume";
import { ParticipantCard } from "@/components/stories/ParticipantCard";
import { ArchiveTransitionLink } from "@/components/stories/VolumeLink";
import { collectionTheme, legacyCollections } from "@/lib/content/collections";
import { ui } from "@/lib/content/copy";
import { getArchive } from "@/lib/content/get-content";
import { preferCanonicalStory } from "@/lib/migration/participant-code";
import { pick } from "@/lib/content/text";
import { locales, localizeHref } from "@/lib/i18n";
import { readLang } from "@/lib/i18n/request";

export const dynamicParams = true;
export const revalidate = 60;

export async function generateStaticParams() {
  const archive = await getArchive();
  const slugs = new Set([...legacyCollections.map((collection) => collection.slug), ...archive.collections.map((collection) => collection.slug)]);
  return locales.flatMap((lang) => [...slugs].map((collection) => ({ lang, collection })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; collection: string }>;
}): Promise<Metadata> {
  const { collection } = await params;
  const lang = await readLang(params);
  const archive = await getArchive();
  const volume = archive.collections.find((item) => item.slug === collection);
  if (!volume) return { title: ui[lang].stories.title };
  return { title: pick(volume.name, lang), description: pick(volume.description, lang) };
}

export default async function StoryCollectionPage({
  params,
}: {
  params: Promise<{ lang: string; collection: string }>;
}) {
  const { collection } = await params;
  const lang = await readLang(params);
  const copy = ui[lang];
  const archive = await getArchive();
  const volume = archive.collections.find((item) => item.slug === collection);
  if (!volume) notFound();
  const stories = preferCanonicalStory(archive.stories.filter((story) => story.collection === collection));
  const theme = collectionTheme(volume.theme);
  const wording = archive.collectionPage;
  const name = pick(volume.name, lang);
  const themeStyle = {
    "--collection-bg": theme.background,
    "--collection-accent": theme.accent,
    "--collection-muted": theme.muted,
  } as CSSProperties;

  return (
    <div className="collectionPage" style={themeStyle}>
      <div className="collectionPageInner collectionBackRow">
        <ArchiveTransitionLink className="collectionBack" direction="back" href={localizeHref(lang, "/stories#archive-shelf")}>
          <span aria-hidden="true">←</span> {pick(wording.backLabel, lang)}
        </ArchiveTransitionLink>
      </div>

      <header className="collectionPageInner collectionPageHeader">
        <div className="collectionVolumeHeader">
          <div>
            <p className="collectionEyebrow">{pick(wording.eyebrow, lang)}</p>
            <h1 className="collectionVolumeTitle">
              {name} <span className="collectionVolumeTitleAccent">— {pick(wording.titleSuffix, lang)}</span>
            </h1>
          </div>
          <div className="collectionHeroBook">
            <ArchiveBookTransition name={volumeTransitionName(volume.slug)}>
              <div className={`volume volume--${volumeTone(volume.slug)} volume--hero`}>
                <ArchiveVolumeBook collection={volume} lang={lang} priority />
              </div>
            </ArchiveBookTransition>
          </div>
        </div>
      </header>

      <section className="collectionPageInner collectionGallery" aria-label={name}>
        {stories.length ? (
          <div className="collectionGalleryGrid">
            {stories.map((story) => (
              <ParticipantCard
                comingSoon={copy.stories.comingSoon}
                fromCollection={collection}
                key={story.slug}
                lang={lang}
                readStory={copy.stories.readStory}
                story={story}
                variant="collection"
              />
            ))}
          </div>
        ) : (
          <p className="collectionGalleryEmpty">{copy.stories.emptyCollection}</p>
        )}
      </section>
    </div>
  );
}
