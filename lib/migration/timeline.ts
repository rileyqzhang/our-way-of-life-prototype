import { canonicalParticipantSlug } from "@/lib/migration/participant-code";
import { hasWeakReference, omitUnavailableStoryReferences, referencedIds } from "@/lib/migration/references";
import { sanityDocuments } from "@/lib/sanity/documents";
import type { TimelineBlock } from "@/lib/timeline/types";
import type { PreparedTimelineEvent } from "@/lib/content/derive";

export type TimelineBlockDocument = {
  _key: string;
  _type: string;
  text?: { en?: string; es?: string; zh?: string };
  emphasis?: string;
  participantCode?: string;
  title?: { en?: string; es?: string; zh?: string };
  legacySrc?: string;
  imageAlt?: { _type?: string; en?: string; es?: string; zh?: string };
  caption?: { en?: string; es?: string; zh?: string };
  externalHref?: string;
  story?: { _type: "reference"; _ref: string };
  src?: string;
  videoTitle?: string;
  description?: { en?: string; es?: string; zh?: string };
  domain?: string;
};

export type TimelineDocument = {
  _id: string;
  _type: "timelineEvent";
  date: string;
  slug: { _type: string; current: string };
  title: { _type: string; en?: string; es?: string; zh?: string };
  displayOrder: number;
  blocks: TimelineBlockDocument[];
  relatedStories?: { _key: string; _type: "reference"; _ref: string }[];
};

export function sourceTimelineDocuments() {
  return sanityDocuments().filter((document) => document._type === "timelineEvent") as TimelineDocument[];
}

export function publishedTimelineId(eventId: string) {
  return `timeline-${eventId}`;
}

export function draftTimelineId(eventId: string) {
  return `drafts.${publishedTimelineId(eventId)}`;
}

export function logicalDocumentId(id: string) {
  return id.startsWith("drafts.") ? id.slice("drafts.".length) : id;
}

export function sameTimelineEvent(existingId: string, eventId: string) {
  return logicalDocumentId(existingId) === publishedTimelineId(eventId);
}

export function publishedStoryIdsBySlug(records: { _id: string; slug?: string }[]) {
  const published = new Map<string, string>();
  const draftOnly = new Map<string, string>();
  for (const record of records) {
    if (!record.slug) continue;
    if (record._id.startsWith("drafts.")) {
      if (!draftOnly.has(record.slug)) draftOnly.set(record.slug, record._id);
      continue;
    }
    published.set(record.slug, record._id);
  }
  for (const slug of published.keys()) draftOnly.delete(slug);
  return { published, draftOnly };
}

function linkAlt(block: TimelineBlockDocument): TimelineBlockDocument {
  if (block._type !== "timelineLink" || !block.imageAlt?.en) return block;
  if (block.imageAlt.es === block.imageAlt.en && block.imageAlt.zh === block.imageAlt.en) {
    return { ...block, imageAlt: { _type: "localeString", en: block.imageAlt.en } };
  }
  return block;
}

function storySlug(ref: string) {
  return ref.startsWith("story-") ? ref.slice("story-".length) : "";
}

function remapStoryReferences(source: TimelineDocument, storiesBySlug: Map<string, string>) {
  const omittedStoryIds: string[] = [];
  const blocks = source.blocks.map(linkAlt).map((block) => {
    if (!block.story?._ref) return block;
    const actual = storiesBySlug.get(storySlug(block.story._ref));
    if (!actual) {
      omittedStoryIds.push(block.story._ref);
      const next = { ...block };
      delete next.story;
      return next;
    }
    return { ...block, story: { ...block.story, _ref: actual } };
  });
  const relatedStories = (source.relatedStories || []).flatMap((item) => {
    const actual = storiesBySlug.get(storySlug(item._ref));
    if (!actual) {
      omittedStoryIds.push(item._ref);
      return [];
    }
    return [{ ...item, _ref: actual }];
  });
  return {
    document: { ...source, blocks, relatedStories },
    omittedStoryIds: [...new Set(omittedStoryIds)].sort(),
  };
}

export function timelineDocumentForCreate(source: TimelineDocument, storiesBySlug: Map<string, string>) {
  const remapped = remapStoryReferences(source, storiesBySlug);
  const storyIds = new Set(storiesBySlug.values());
  const published = omitUnavailableStoryReferences(remapped.document, storyIds);
  const draft = { ...published, _id: draftTimelineId(source.slug.current) };
  const omittedStoryIds = remapped.omittedStoryIds;
  const problems: string[] = [];
  if (!source.date?.trim()) problems.push("The date label is empty.");
  if (!source.slug?.current) problems.push("The slug is empty.");
  if (source.slug?.current && source._id !== publishedTimelineId(source.slug.current)) problems.push("The document id does not match the event id.");
  if (!source.title?.en && !source.title?.es && !source.title?.zh) problems.push("The title is empty.");
  if (!Number.isInteger(source.displayOrder) || source.displayOrder < 0) problems.push("The display order is missing.");
  if (hasWeakReference(draft)) problems.push("The document contains a weak reference.");
  const dangling = [...referencedIds(draft)].filter((id) => !storyIds.has(id));
  if (dangling.length) problems.push(`Unresolved references: ${dangling.join(", ")}.`);
  for (const block of source.blocks) {
    if (block._type === "timelineVideo" && !block.src?.trim()) problems.push("A video is missing its URL.");
    if (block._type === "timelineLink" && !block.externalHref?.trim()) problems.push("An external link is missing its URL.");
  }
  return { draft, omittedStoryIds, problems };
}

export function participantSlugs(document: TimelineDocument) {
  return [
    ...new Set(
      document.blocks
        .map((block) => block.participantCode)
        .filter((code): code is string => Boolean(code))
        .map((code) => canonicalParticipantSlug(code)),
    ),
  ];
}

export function missingLocaleFields(value: { en?: string; es?: string; zh?: string } | undefined) {
  return (["en", "es", "zh"] as const).filter((language) => !value?.[language]?.trim());
}

function blockShape(block: TimelineBlock) {
  if (block.type === "paragraph") {
    return { type: "paragraph", en: block.text.en.length, es: block.text.es.length, zh: block.text.zh.length, emphasis: block.emphasis || "" };
  }
  if (block.type === "participant") return { type: "participant", code: block.code, avatar: block.avatar || "", href: block.href };
  if (block.type === "video") return { type: "video", src: block.src, title: block.title };
  return { type: "link", href: block.href, image: block.image || "", domain: block.domain };
}

export function timelineShape(event: PreparedTimelineEvent) {
  return {
    id: event.id,
    date: event.date,
    title: { en: event.title.en.length, es: event.title.es.length, zh: event.title.zh.length },
    blocks: event.blocks.map(blockShape),
  };
}

export function documentShape(document: TimelineDocument) {
  return {
    id: document.slug.current,
    date: document.date,
    title: { en: document.title.en?.length || 0, es: document.title.es?.length || 0, zh: document.title.zh?.length || 0 },
    blocks: document.blocks.map((block) => {
      if (block._type === "timelineParagraph") {
        return { type: "paragraph", en: block.text?.en?.length || 0, es: block.text?.es?.length || 0, zh: block.text?.zh?.length || 0, emphasis: block.emphasis || "" };
      }
      if (block._type === "timelineParticipant") {
        return { type: "participant", code: block.participantCode || "", avatar: block.legacySrc || "", href: block.externalHref || "" };
      }
      if (block._type === "timelineVideo") return { type: "video", src: block.src || "", title: block.videoTitle || "" };
      return { type: "link", href: block.externalHref || "", image: block.legacySrc || "", domain: block.domain || "" };
    }),
  };
}

export function timelineRowIsApproved(row: { action: string; eventId: string }, only: Set<string>) {
  if (row.action !== "Create") return false;
  return only.has(row.eventId) || only.has(publishedTimelineId(row.eventId)) || only.has(draftTimelineId(row.eventId));
}
