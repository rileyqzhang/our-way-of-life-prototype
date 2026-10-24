import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans, Plus_Jakarta_Sans, Source_Serif_4 } from "next/font/google";
import { notFound } from "next/navigation";
import { StoryDetailView } from "@/components/stories/StoryDetailView";
import { ui } from "@/lib/content/copy";
import { getArchive, getStory } from "@/lib/content/get-content";
import { buildStoryLayout } from "@/lib/content/story-layout";
import { pick } from "@/lib/content/text";
import { locales, localizeHref } from "@/lib/i18n";
import { readLang } from "@/lib/i18n/request";

const storySans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-story-sans",
  display: "swap",
});

const storyDm = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-story-dm",
  display: "swap",
});

const storySerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-story-serif",
  display: "swap",
});

const storyDisplay = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-story-display",
  display: "swap",
});

export async function generateStaticParams() {
  const archive = await getArchive();
  return locales.flatMap((lang) => archive.stories.map((story) => ({ lang, slug: story.slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lang = await readLang(params);
  const story = await getStory(slug);
  if (!story) return { title: ui[lang].stories.title };
  return { title: pick(story.title, lang), description: pick(story.summary, lang) };
}

export default async function StoryPage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { slug } = await params;
  const lang = await readLang(params);
  const [story, archive] = await Promise.all([getStory(slug), getArchive()]);
  if (!story) notFound();
  const copy = ui[lang];
  const portrait = story.photographs[0];
  const volume = story.collection ? archive.collections.find((item) => item.slug === story.collection) : undefined;
  const siblings = archive.stories
    .filter((item) => item.collection === story.collection)
    .sort((a, b) => a.participantCode.localeCompare(b.participantCode));
  const index = siblings.findIndex((item) => item.slug === story.slug);
  const next = siblings.length > 1 && index >= 0 ? siblings[(index + 1) % siblings.length] : undefined;
  const layout = buildStoryLayout({
    code: story.participantCode,
    location: pick(story.location, lang),
    summary: pick(story.summary, lang),
    body: pick(story.body, lang),
    lang,
    article: story.article,
    quotations: story.quotations.map((quotation) => ({ text: pick(quotation.text, lang) })),
    relatedEvents: story.relatedEvents.map((event) => ({ id: event.id, date: event.date, title: pick(event.title, lang) })),
  });

  return (
    <StoryDetailView
      lang={lang}
      fontClassName={`${storySans.variable} ${storyDm.variable} ${storySerif.variable} ${storyDisplay.variable}`}
      image={portrait ? { src: portrait.src, alt: pick(portrait.alt, lang) } : undefined}
      layout={layout}
      collectionHref={story.collection ? localizeHref(lang, `/stories/collections/${story.collection}`) : undefined}
      collectionLabel={volume ? `${copy.story.backTo} ${pick(volume.name, lang)}` : undefined}
      nextHref={next ? localizeHref(lang, `/stories/${next.slug}`) : undefined}
      externalHref={story.externalHref}
    />
  );
}
