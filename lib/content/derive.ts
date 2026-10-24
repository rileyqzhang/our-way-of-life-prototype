import type { StoryCollection } from "@/lib/content/collections";
import { canonicalParticipantSlug, normalizeParticipantCode } from "@/lib/migration/participant-code";
import type { LocalizedText, TimelineBlock, TimelineEvent } from "@/lib/timeline/types";

export type Photo = {
  src: string;
  alt: LocalizedText;
  caption?: LocalizedText;
  source?: string;
  usagePermission?: string;
};

export type StoryQuotation = {
  text: LocalizedText;
  eventId: string;
  eventDate: string;
  eventTitle: LocalizedText;
};

export type RelatedEvent = {
  id: string;
  date: string;
  title: LocalizedText;
};

export type StoryArticleSpan = {
  _key?: string;
  _type?: string;
  text?: string;
  marks?: string[];
};

export type StoryArticleBlock = {
  _key?: string;
  _type?: string;
  style?: string;
  listItem?: string;
  level?: number;
  children?: StoryArticleSpan[];
  markDefs?: { _key?: string; _type?: string; href?: string }[];
};

export type ArchiveStory = {
  slug: string;
  participantCode: string;
  title: LocalizedText;
  summary: LocalizedText;
  body?: LocalizedText;
  location?: LocalizedText;
  photographs: Photo[];
  quotations: StoryQuotation[];
  relatedEvents: RelatedEvent[];
  article?: { en: StoryArticleBlock[]; es: StoryArticleBlock[]; zh: StoryArticleBlock[] };
  externalHref?: string;
  published: boolean;
  collection?: StoryCollection;
};

export type PreparedTimelineEvent = TimelineEvent & { displayOrder: number };

type ParticipantBlock = Extract<TimelineBlock, { type: "participant" }>;

export function portraitAlt(code: string): LocalizedText {
  return {
    en: `Portrait of participant ${code}`,
    es: `Retrato de la persona participante ${code}`,
    zh: `参与者 ${code} 的肖像`,
  };
}

function hasText(value: LocalizedText | undefined) {
  return Boolean(value && (value.en.trim() || value.es.trim() || value.zh.trim()));
}

export function participantSlug(block: ParticipantBlock) {
  const code = block.code.trim();
  if (code) return canonicalParticipantSlug(code);
  const fromTitle = block.title.en.split("|")[0]?.trim();
  if (fromTitle) return canonicalParticipantSlug(fromTitle);
  try {
    const parts = new URL(block.href).pathname.split("/").filter(Boolean);
    return canonicalParticipantSlug(parts.at(-1) || "");
  } catch {
    return "";
  }
}

export function participantCode(block: ParticipantBlock, slug: string) {
  return block.code.trim() || block.title.en.split("|")[0]?.trim() || slug.toUpperCase();
}

export function prepareTimeline(events: TimelineEvent[]): PreparedTimelineEvent[] {
  return events.map((event, displayOrder) => ({
    ...event,
    displayOrder,
    blocks: event.blocks.map((block) => {
      if (block.type !== "participant") return block;
      const slug = block.slug || participantSlug(block);
      const code = participantCode(block, slug);
      return {
        ...block,
        code,
        slug,
        imageAlt: block.imageAlt?.en ? block.imageAlt : portraitAlt(code),
      };
    }),
  }));
}

export function storiesFromTimeline(events: PreparedTimelineEvent[]): ArchiveStory[] {
  const bySlug = new Map<string, ArchiveStory>();

  for (const event of events) {
    let current: ArchiveStory | undefined;

    for (const block of event.blocks) {
      if (block.type === "participant") {
        const slug = block.slug || participantSlug(block);
        if (!slug) {
          current = undefined;
          continue;
        }

        const code = block.code || participantCode(block, slug);
        const canonicalCode = normalizeParticipantCode(code);
        let story = bySlug.get(slug);
        if (!story) {
          story = {
            slug,
            participantCode: canonicalCode,
            title: { en: canonicalCode, es: canonicalCode, zh: canonicalCode },
            summary: {
              en: `Quotations from participant ${canonicalCode} on the interactive timeline.`,
              es: `Citas de la persona participante ${canonicalCode} en la línea de tiempo.`,
              zh: `参与者 ${canonicalCode} 在互动时间线上的引语。`,
            },
            photographs: [],
            quotations: [],
            relatedEvents: [],
            externalHref: block.href.startsWith("http") ? block.href : undefined,
            published: true,
          };
          bySlug.set(slug, story);
        }

        if (block.avatar && !story.photographs.some((photo) => photo.src === block.avatar)) {
          story.photographs.push({
            src: block.avatar,
            alt: block.imageAlt ?? portraitAlt(code),
            caption: block.caption ?? block.title,
          });
        }

        if (!story.relatedEvents.some((item) => item.id === event.id)) {
          story.relatedEvents.push({ id: event.id, date: event.date, title: event.title });
        }

        current = story;
        continue;
      }

      if (!current) continue;

      if (block.type === "paragraph" && block.emphasis !== "caption" && hasText(block.text)) {
        current.quotations.push({
          text: block.text,
          eventId: event.id,
          eventDate: event.date,
          eventTitle: event.title,
        });
      }

      if (block.type !== "paragraph") current = undefined;
    }
  }

  for (const story of bySlug.values()) {
    const first = story.quotations[0];
    if (first) story.summary = first.text;
  }

  return [...bySlug.values()].sort((a, b) => a.participantCode.localeCompare(b.participantCode));
}

/** Keep the archive order. Published Sanity events replace the matching local event. */
export function mergeTimeline(remote: PreparedTimelineEvent[], local: PreparedTimelineEvent[]) {
  if (!remote.length) return local;
  const remoteById = new Map(remote.filter((event) => event.id).map((event) => [event.id, event]));
  const seen = new Set<string>();
  const merged = local.map((event) => {
    seen.add(event.id);
    const published = remoteById.get(event.id);
    return published ? { ...published, displayOrder: event.displayOrder } : event;
  });
  for (const event of remote) {
    if (!event.id || seen.has(event.id)) continue;
    merged.push({ ...event, displayOrder: merged.length });
  }
  const remoteIds = new Set(remote.map((event) => event.id));
  const complete = local.every((event) => remoteIds.has(event.id));
  if (!complete) return merged;
  return [...remote].sort((left, right) => left.displayOrder - right.displayOrder || left.id.localeCompare(right.id));
}
