import { createHash } from "node:crypto";
import type { ArchiveContent } from "@/lib/content/local";
import { localArchive } from "@/lib/content/local";
import type { LocalizedText } from "@/lib/timeline/types";

function keyFor(value: string) {
  return createHash("sha1").update(value).digest("hex").slice(0, 12);
}

function localeString(value: LocalizedText) {
  return { _type: "localeString", en: value.en, es: value.es, zh: value.zh };
}

function localeText(value: LocalizedText) {
  return { _type: "localeText", en: value.en, es: value.es, zh: value.zh };
}

function sameLanguage(value: string): LocalizedText {
  return { en: value, es: value, zh: value };
}

export function sanityDocuments(archive: ArchiveContent = localArchive()) {
  const storyId = new Map(archive.stories.map((story) => [story.slug, `story-${story.slug}`] as const));
  const eventId = new Map(archive.timeline.map((event) => [event.id, `timeline-${event.id}`] as const));

  const stories = archive.stories.map((story) => ({
    _id: `story-${story.slug}`,
    _type: "story",
    participantCode: story.participantCode,
    slug: { _type: "slug", current: story.slug },
    title: localeString(story.title),
    summary: localeText(story.summary),
    quotations: story.quotations.map((quotation, index) => ({
      _key: keyFor(`${story.slug}-quotation-${index}`),
      _type: "quotation",
      text: localeText(quotation.text),
      event: eventId.has(quotation.eventId)
        ? { _type: "reference", _ref: eventId.get(quotation.eventId) as string }
        : undefined,
    })),
    photographs: story.photographs.map((photo, index) => ({
      _key: keyFor(`${story.slug}-photo-${index}-${photo.src}`),
      _type: "photograph",
      legacySrc: photo.src,
      alt: localeString(photo.alt),
      caption: photo.caption ? localeText(photo.caption) : undefined,
      source: photo.source,
      usagePermission: photo.usagePermission,
    })),
    relatedEvents: story.relatedEvents
      .filter((event) => eventId.has(event.id))
      .map((event) => ({
        _key: keyFor(`${story.slug}-event-${event.id}`),
        _type: "reference",
        _ref: eventId.get(event.id) as string,
      })),
    externalHref: story.externalHref,
    published: story.published,
  }));

  const events = archive.timeline.map((event) => {
    const related = new Set<string>();
    const blocks = event.blocks.map((block, index) => {
      const _key = keyFor(`${event.id}-${index}-${block.type}`);
      if (block.type === "paragraph") {
        return {
          _key,
          _type: "timelineParagraph",
          text: localeText(block.text),
          emphasis: block.emphasis,
        };
      }
      if (block.type === "participant") {
        if (block.slug) related.add(block.slug);
        return {
          _key,
          _type: "timelineParticipant",
          participantCode: block.code,
          title: localeString(block.title),
          legacySrc: block.avatar || undefined,
          imageAlt: localeString(block.imageAlt ?? sameLanguage(block.code)),
          caption: block.caption ? localeText(block.caption) : undefined,
          externalHref: block.href.startsWith("http") ? block.href : undefined,
          story:
            block.slug && storyId.has(block.slug)
              ? { _type: "reference", _ref: storyId.get(block.slug) as string }
              : undefined,
        };
      }
      if (block.type === "video") {
        return { _key, _type: "timelineVideo", src: block.src, videoTitle: block.title };
      }
      const alt = block.imageAlt || block.title.en;
      return {
        _key,
        _type: "timelineLink",
        externalHref: block.href,
        title: localeString(block.title),
        description: localeText(block.description),
        domain: block.domain,
        legacySrc: block.image || undefined,
        imageAlt: localeString(sameLanguage(alt)),
      };
    });

    return {
      _id: `timeline-${event.id}`,
      _type: "timelineEvent",
      date: event.date,
      slug: { _type: "slug", current: event.id },
      title: localeString(event.title),
      displayOrder: event.displayOrder,
      blocks,
      relatedStories: [...related]
        .filter((slug) => storyId.has(slug))
        .map((slug) => ({
          _key: keyFor(`${event.id}-story-${slug}`),
          _type: "reference",
          _ref: storyId.get(slug) as string,
        })),
    };
  });

  const pages = archive.pages.map((page) => ({
    _id: `page-${page.slug}`,
    _type: "page",
    slug: { _type: "slug", current: page.slug },
    title: localeString(page.title),
    summary: localeText(page.summary),
    body: page.body ? localeText(page.body) : undefined,
  }));

  const settings = {
    _id: "siteSettings",
    _type: "siteSettings",
    siteName: localeString(archive.settings.siteName),
    navigation: archive.settings.navigation.map((item) => ({
      _key: keyFor(`nav-${item.path}`),
      _type: "navigationItem",
      label: localeString(item.label),
      path: item.path,
    })),
    contactEmail: archive.settings.contactEmail,
    accessibilityUrl: archive.settings.accessibilityUrl,
  };

  return [...events, ...stories, ...pages, settings];
}
