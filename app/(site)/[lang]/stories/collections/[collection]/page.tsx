import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ParticipantCard } from "@/components/stories/ParticipantCard";
import { isStoryCollection, storyCollections } from "@/lib/content/collections";
import { ui } from "@/lib/content/copy";
import { getArchive } from "@/lib/content/get-content";
import { preferCanonicalStory } from "@/lib/migration/participant-code";
import { locales, localizeHref } from "@/lib/i18n";
import { readLang } from "@/lib/i18n/request";

export function generateStaticParams() {
  return locales.flatMap((lang) => storyCollections.map((collection) => ({ lang, collection })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; collection: string }>;
}): Promise<Metadata> {
  const { collection } = await params;
  const lang = await readLang(params);
  const volume = ui[lang].stories.volumes.find((item) => item.id === collection);
  if (!volume) return { title: ui[lang].stories.title };
  return { title: volume.title, description: volume.description };
}

export default async function StoryCollectionPage({
  params,
}: {
  params: Promise<{ lang: string; collection: string }>;
}) {
  const { collection } = await params;
  if (!isStoryCollection(collection)) notFound();
  const lang = await readLang(params);
  const copy = ui[lang];
  const volume = copy.stories.volumes.find((item) => item.id === collection);
  if (!volume) notFound();
  const archive = await getArchive();
  const stories = preferCanonicalStory(archive.stories.filter((story) => story.collection === collection));

  return (
    <section className="participantStories">
      <div className="container">
        <p className="storyBack">
          <Link href={localizeHref(lang, "/stories")}>{copy.story.back}</Link>
        </p>
        <h1 className="participantStoriesTitle">{volume.title}</h1>
        <p className="collectionLede">{volume.description}</p>
        {stories.length ? (
          <div className="participantStoryGrid">
            {stories.map((story) => (
              <ParticipantCard key={story.slug} lang={lang} readStory={copy.stories.readStory} story={story} />
            ))}
          </div>
        ) : (
          <p className="collectionEmpty">{copy.stories.emptyCollection}</p>
        )}
      </div>
    </section>
  );
}
