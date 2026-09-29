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

export type ArchiveStory = {
  slug: string;
  participantCode: string;
  title: LocalizedText;
  summary: LocalizedText;
  photographs: Photo[];
  quotations: StoryQuotation[];
  relatedEvents: RelatedEvent[];
  externalHref?: string;
  published: boolean;
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
  if (code) return code.toLowerCase();
  const fromTitle = block.title.en.split("|")[0]?.trim();
  if (fromTitle) return fromTitle.toLowerCase();
  try {
    const parts = new URL(block.href).pathname.split("/").filter(Boolean);
    return (parts.at(-1) || "").toLowerCase();
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
        let story = bySlug.get(slug);
        if (!story) {
          story = {
            slug,
            participantCode: code,
            title: { en: code, es: code, zh: code },
            summary: {
              en: `Quotations from participant ${code} on the interactive timeline.`,
              es: `Citas de la persona participante ${code} en la línea de tiempo.`,
              zh: `参与者 ${code} 在互动时间线上的引语。`,
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
