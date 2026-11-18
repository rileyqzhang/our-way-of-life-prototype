import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArchiveBookTransition } from "@/components/stories/ArchiveBookTransition";
import { ArchiveVolumeBook } from "@/components/stories/ArchiveVolume";
import { ParticipantCard } from "@/components/stories/ParticipantCard";
import { ArchiveTransitionLink } from "@/components/stories/VolumeLink";
import { collectionColorStyle, legacyCollections } from "@/lib/content/collections";
import { ui } from "@/lib/content/copy";
import { getArchive } from "@/lib/content/get-content";
import { preferCanonicalStory } from "@/lib/migration/participant-code";
import { pick } from "@/lib/content/text";
import { locales, localizeHref } from "@/lib/i18n";
import { readLang } from "@/lib/i18n/request";
import { volumeTransitionName } from "@/lib/viewTransition";

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
  const wording = archive.collectionPage;
  const name = pick(volume.name, lang);

  return (
    <div className="collectionPage" style={collectionColorStyle()}>
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
              <div className="volume volume--hero">
                <ArchiveVolumeBook collection={volume} lang={lang} priority />
              </div>
            </ArchiveBookTransition>
          </div>
        </div>
      </header>

      <section className="collectionPageInner collectionGallery" aria-label={name}>
        {stories.length ? (
          <div className="participantStoryGrid">
            {stories.map((story) => (
              <ParticipantCard comingSoon={copy.stories.comingSoon} key={story.slug} lang={lang} readStory={copy.stories.readStory} story={story} />
            ))}
          </div>
        ) : (
          <p className="collectionGalleryEmpty">{copy.stories.emptyCollection}</p>
        )}
      </section>
    </div>
  );
}
