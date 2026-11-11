import type { Metadata } from "next";
import { ArchiveVolumeBook, volumeTone, volumeTransitionName } from "@/components/stories/ArchiveVolume";
import { ParticipantCard } from "@/components/stories/ParticipantCard";
import { VolumeLink } from "@/components/stories/VolumeLink";
import type { ArchiveCollection } from "@/lib/content/collections";
import { ui, type UiCopy } from "@/lib/content/copy";
import type { ArchiveStory } from "@/lib/content/derive";
import { getArchive } from "@/lib/content/get-content";
import { preferCanonicalStory } from "@/lib/migration/participant-code";
import { pick } from "@/lib/content/text";
import { localizeHref } from "@/lib/i18n";
import { readLang } from "@/lib/i18n/request";

function storyGroups(stories: ArchiveStory[], collections: ArchiveCollection[], copy: UiCopy, lang: Parameters<typeof pick>[1]) {
  const known = new Set(collections.map((collection) => collection.slug));
  const assigned = collections
    .map((collection) => ({
      id: collection.slug,
      title: pick(collection.name, lang),
      note: "",
      stories: stories.filter((story) => story.collection === collection.slug),
    }))
    .filter((group) => group.stories.length);
  const unassigned = stories.filter((story) => !story.collection || !known.has(story.collection));
  if (!unassigned.length) return assigned;
  return [
    ...assigned,
    {
      id: "unassigned",
      title: copy.stories.unassignedTitle,
      note: copy.stories.unassignedNote,
      stories: unassigned,
    },
  ];
}

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

  return (
    <>
      <section className="participantsCollections" id="archive-shelf">
        <div className="archiveShelfInner">
          <header className="archiveShelfHead">
            <h1 className="participantsCollectionsTitle">{copy.stories.exploreTitle}</h1>
            <p className="participantsCollectionsLede">{copy.stories.exploreLede}</p>
          </header>
          <div className="archiveShelfStage">
            <div className="volumeShelf">
              {archive.collections.map((collection) => (
                <VolumeLink
                  className={`volume volume--${volumeTone(collection.slug)}`}
                  href={localizeHref(lang, `/stories/collections/${collection.slug}`)}
                  key={collection.slug}
                  transitionName={volumeTransitionName(collection.slug)}
                >
                  <ArchiveVolumeBook collection={collection} cta={copy.stories.exploreVolume} lang={lang} priority />
                </VolumeLink>
              ))}
            </div>
            <div className="archiveLedge" aria-hidden="true">
              <div className="archiveLedgeTop" />
              <div className="archiveLedgeBrass" />
              <div className="archiveLedgeBody" />
              <div className="archiveLedgeShadow" />
            </div>
          </div>
        </div>
      </section>

      <div className="participantStoriesHead">
        <div className="container">
          <p className="participantStoriesEyebrow">{copy.stories.listEyebrow}</p>
          <h2 className="participantStoriesTitle">{copy.stories.listTitle}</h2>
        </div>
      </div>
      <section className="participantStories" id="participant-stories">
        <div className="container">
          {storyGroups(preferCanonicalStory(archive.stories), archive.collections, copy, lang).map((group) => (
            <div className="participantGroup" key={group.id}>
              <h3 className="participantGroupTitle">{group.title}</h3>
              {group.note ? <p className="participantGroupNote">{group.note}</p> : null}
              <div className="participantStoryGrid">
                {group.stories.map((story) => (
                  <ParticipantCard comingSoon={copy.stories.comingSoon} key={story.slug} lang={lang} readStory={copy.stories.readStory} story={story} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
