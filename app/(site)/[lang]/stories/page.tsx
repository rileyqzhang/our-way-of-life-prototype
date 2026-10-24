import type { Metadata } from "next";
import Link from "next/link";
import { ArchiveImage } from "@/components/media/ArchiveImage";
import { ParticipantCard } from "@/components/stories/ParticipantCard";
import { isStoryCollection } from "@/lib/content/collections";
import { ui, type UiCopy } from "@/lib/content/copy";
import type { ArchiveStory } from "@/lib/content/derive";
import { getArchive } from "@/lib/content/get-content";
import { preferCanonicalStory } from "@/lib/migration/participant-code";
import { pick } from "@/lib/content/text";
import { localizeHref } from "@/lib/i18n";
import { readLang } from "@/lib/i18n/request";

function storyGroups(stories: ArchiveStory[], copy: UiCopy) {
  const assigned = copy.stories.volumes
    .map((volume) => ({
      id: volume.id,
      title: volume.title,
      note: "",
      stories: stories.filter((story) => story.collection === volume.id),
    }))
    .filter((group) => group.stories.length);
  const unassigned = stories.filter((story) => !isStoryCollection(story.collection));
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

const heroImage = "/timeline/2021-07-19_19-55-12_1626738877.jpg";
const volumeImages = [
  "/timeline/Resized_Resized_20210308_132735003001_1620660343.jpg",
  "/timeline/2024-11-10_20-46-17_1731300393.jpg",
  "/timeline/food-pantry.jpg",
] as const;
const volumeTones = ["rust", "navy", "forest"] as const;

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
      <section className="archiveHero participantsHero">
        <div className="container archiveHeroSplit">
          <div className="archiveHeroCopy">
            <h1 className="archiveTitle">{pick(page?.title, lang) || copy.stories.title}</h1>
            <p className="archiveLede">{pick(page?.summary, lang) || copy.stories.lede}</p>
            <p className="archiveLede">{pick(page?.body, lang) || copy.stories.ledeContinued}</p>
          </div>
          <figure className="participantsHeroFrame">
            <ArchiveImage
              alt={copy.stories.heroImageAlt}
              className="participantsHeroPhoto"
              height={720}
              priority
              src={heroImage}
              width={960}
            />
          </figure>
        </div>
      </section>

      <section className="participantsCollections">
        <div className="container">
          <h2 className="participantsCollectionsTitle">{copy.stories.exploreTitle}</h2>
          <p className="participantsCollectionsLede">{copy.stories.exploreLede}</p>
          <div className="volumeShelf">
            {copy.stories.volumes.map((volume, index) => (
              <Link className={`volume volume--${volumeTones[index]}`} href={localizeHref(lang, `/stories/collections/${volume.id}`)} key={volume.id}>
                <span className="volumeTitle">{volume.title}</span>
                <ArchiveImage
                  alt={volume.imageAlt}
                  className="volumePhoto"
                  height={640}
                  src={volumeImages[index]}
                  width={480}
                />
                <span className="volumeBlurb">{volume.description}</span>
                <span className="volumeCta">
                  {copy.stories.exploreVolume} <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="participantStories" id="participant-stories">
        <div className="container">
          <p className="participantStoriesEyebrow">{copy.stories.listEyebrow}</p>
          <h2 className="participantStoriesTitle">{copy.stories.listTitle}</h2>
          {storyGroups(preferCanonicalStory(archive.stories), copy).map((group) => (
            <div className="participantGroup" key={group.id}>
              <h3 className="participantGroupTitle">{group.title}</h3>
              {group.note ? <p className="participantGroupNote">{group.note}</p> : null}
              <div className="participantStoryGrid">
                {group.stories.map((story) => (
                  <ParticipantCard key={story.slug} lang={lang} readStory={copy.stories.readStory} story={story} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
