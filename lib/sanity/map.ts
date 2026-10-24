import { isStoryCollection } from "@/lib/content/collections";
import type { PageDocument, SiteSettings } from "@/lib/content/copy";
import { localPages, localSettings } from "@/lib/content/copy";
import type { ArchiveStory, Photo, PreparedTimelineEvent, StoryArticleBlock } from "@/lib/content/derive";
import { portraitAlt } from "@/lib/content/derive";
import type { LocalizedText, TimelineBlock } from "@/lib/timeline/types";
import { sanityImageUrl } from "@/lib/sanity/image";

type LocaleValue = Partial<LocalizedText> | null | undefined;

type SanityImage = { asset?: { _ref?: string } } | null;

type SanityBlock = {
  _type?: string;
  text?: LocaleValue;
  emphasis?: "caption";
  participantCode?: string;
  externalHref?: string;
  legacySrc?: string;
  image?: SanityImage;
  imageAlt?: LocaleValue;
  caption?: LocaleValue;
  title?: LocaleValue;
  storySlug?: string;
  description?: LocaleValue;
  domain?: string;
  linkImage?: SanityImage;
  src?: string;
  videoTitle?: string;
};

type SanityEvent = {
  id?: string;
  date?: string;
  title?: LocaleValue;
  displayOrder?: number;
  blocks?: SanityBlock[] | null;
};

type SanityPhoto = {
  image?: SanityImage;
  legacySrc?: string;
  alt?: LocaleValue;
  caption?: LocaleValue;
  source?: string;
  usagePermission?: string;
};

type SanityStory = {
  slug?: string;
  participantCode?: string;
  collection?: string;
  title?: LocaleValue;
  summary?: LocaleValue;
  body?: LocaleValue;
  article?: { en?: StoryArticleBlock[] | null; es?: StoryArticleBlock[] | null; zh?: StoryArticleBlock[] | null } | null;
  location?: LocaleValue;
  externalHref?: string;
  published?: boolean;
  photographs?: SanityPhoto[] | null;
  quotations?: { text?: LocaleValue; eventId?: string; eventDate?: string; eventTitle?: LocaleValue }[] | null;
  relatedEvents?: { id?: string; date?: string; title?: LocaleValue }[] | null;
};

type SanityPage = { slug?: string; title?: LocaleValue; summary?: LocaleValue; body?: LocaleValue };

type SanitySettings = {
  siteName?: LocaleValue;
  contactEmail?: string;
  accessibilityUrl?: string;
  navigation?: { label?: LocaleValue; path?: string }[] | null;
};

export type SanityArchive = {
  timeline?: SanityEvent[] | null;
  stories?: SanityStory[] | null;
  pages?: SanityPage[] | null;
  settings?: SanitySettings | null;
};

function locale(value: LocaleValue): LocalizedText {
  return { en: value?.en || "", es: value?.es || "", zh: value?.zh || "" };
}

function photoSrc(image: SanityImage | undefined, legacySrc: string | undefined, width: number) {
  return sanityImageUrl(image, width) || legacySrc || "";
}

function mapPhoto(photo: SanityPhoto, code: string): Photo | null {
  const src = photoSrc(photo.image, photo.legacySrc, 1600);
  if (!src) return null;
  const alt = locale(photo.alt);
  return {
    src,
    alt: alt.en || alt.es || alt.zh ? alt : portraitAlt(code),
    caption: photo.caption ? locale(photo.caption) : undefined,
    source: photo.source || undefined,
    usagePermission: photo.usagePermission || undefined,
  };
}

function mapBlock(block: SanityBlock): TimelineBlock | null {
  if (block._type === "timelineParagraph") {
    return { type: "paragraph", text: locale(block.text), emphasis: block.emphasis };
  }

  if (block._type === "timelineParticipant") {
    const code = block.participantCode || "";
    const slug = block.storySlug || code.toLowerCase();
    return {
      type: "participant",
      code,
      href: block.externalHref || "",
      avatar: photoSrc(block.image, block.legacySrc, 240),
      title: locale(block.title),
      slug,
      imageAlt: block.imageAlt ? locale(block.imageAlt) : portraitAlt(code),
      caption: block.caption ? locale(block.caption) : undefined,
    };
  }

  if (block._type === "timelineVideo" && block.src) {
    return { type: "video", src: block.src, title: block.videoTitle || "Video" };
  }

  if (block._type === "timelineLink" && block.externalHref) {
    return {
      type: "link",
      href: block.externalHref,
      image: photoSrc(block.linkImage, block.legacySrc, 800),
      imageAlt: locale(block.imageAlt).en || locale(block.title).en,
      title: locale(block.title),
      description: locale(block.description),
      domain: block.domain || "",
    };
  }

  return null;
}

export function mapTimeline(events: SanityEvent[] | null | undefined): PreparedTimelineEvent[] {
  return (events || [])
    .filter((event) => event.id && event.title)
    .map((event, index) => ({
      id: event.id as string,
      date: event.date || "",
      title: locale(event.title),
      displayOrder: event.displayOrder ?? index,
      blocks: (event.blocks || []).map(mapBlock).filter((block): block is TimelineBlock => Boolean(block)),
    }));
}

function mapArticle(article: SanityStory["article"]): ArchiveStory["article"] {
  const en = article?.en || [];
  const es = article?.es || [];
  const zh = article?.zh || [];
  if (!en.length && !es.length && !zh.length) return undefined;
  return { en, es, zh };
}

export function mapStories(stories: SanityStory[] | null | undefined): ArchiveStory[] {
  return (stories || [])
    .filter((story) => story.slug && story.participantCode)
    .map((story) => {
      const code = story.participantCode as string;
      return {
        slug: story.slug as string,
        participantCode: code,
        title: locale(story.title).en ? locale(story.title) : { en: code, es: code, zh: code },
        summary: locale(story.summary),
        body: story.body && (story.body.en || story.body.es || story.body.zh) ? locale(story.body) : undefined,
        article: mapArticle(story.article),
        location: story.location && (story.location.en || story.location.es || story.location.zh) ? locale(story.location) : undefined,
        photographs: (story.photographs || []).map((photo) => mapPhoto(photo, code)).filter((photo): photo is Photo => Boolean(photo)),
        quotations: (story.quotations || [])
          .filter((quotation) => quotation.text && (quotation.text.en || quotation.text.es || quotation.text.zh))
          .map((quotation) => ({
            text: locale(quotation.text),
            eventId: quotation.eventId || "",
            eventDate: quotation.eventDate || "",
            eventTitle: locale(quotation.eventTitle),
          })),
        relatedEvents: (story.relatedEvents || [])
          .filter((event) => event.id)
          .map((event) => ({ id: event.id as string, date: event.date || "", title: locale(event.title) })),
        externalHref: story.externalHref || undefined,
        published: story.published !== false,
        collection: isStoryCollection(story.collection) ? story.collection : undefined,
      };
    });
}

export function mapPages(pages: SanityPage[] | null | undefined): PageDocument[] {
  const remote = (pages || [])
    .filter((page) => page.slug && page.title)
    .map((page) => ({
      slug: page.slug as string,
      title: locale(page.title),
      summary: locale(page.summary),
      body: page.body ? locale(page.body) : undefined,
    }));
  if (!remote.length) return localPages;
  const bySlug = new Map(localPages.map((page) => [page.slug, page]));
  for (const page of remote) bySlug.set(page.slug, page);
  return [...bySlug.values()];
}

export function mapSettings(settings: SanitySettings | null | undefined): SiteSettings {
  if (!settings?.navigation?.length) return localSettings;
  return {
    siteName: settings.siteName ? locale(settings.siteName) : localSettings.siteName,
    navigation: settings.navigation
      .filter((item) => item.path && item.label)
      .map((item) => ({ path: item.path as string, label: locale(item.label) })),
    contactEmail: settings.contactEmail || undefined,
    accessibilityUrl: settings.accessibilityUrl || localSettings.accessibilityUrl,
  };
}
