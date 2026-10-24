import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ParticipantCard } from "@/components/stories/ParticipantCard";
import { legacyCollections } from "@/lib/content/collections";
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
  const description = pick(volume.description, lang);

  return (
    <section className="participantStories">
      <div className="container">
        <p className="storyBack">
          <Link href={localizeHref(lang, "/stories")}>{copy.story.back}</Link>
        </p>
        <h1 className="participantStoriesTitle">{pick(volume.name, lang)}</h1>
        {description ? <p className="collectionLede">{description}</p> : null}
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
