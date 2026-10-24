import { createHash } from "node:crypto";
import type { ArchiveStory } from "@/lib/content/derive";
import { portraitAlt } from "@/lib/content/derive";
import { storyUrl } from "@/lib/migration/catalog";
import type { StoryLanguage } from "@/lib/migration/language";
import { countLinks, plainText, quillToParagraphs, splitByLanguage, toPortableText, type WeeblyImage } from "@/lib/migration/quill";

const PLACEHOLDER_TITLE = /^story title$/i;
const PLACEHOLDER_BODY = /start writing your story here/i;

export type WeeblyPost = {
  id?: string;
  slug?: string;
  name?: string;
  post_title?: string;
  content?: { content?: { quill?: { ops?: { insert?: unknown; attributes?: Record<string, unknown> }[] } } };
  image?: unknown;
  created_at?: string;
  updated_at?: string;
  published_date?: string;
};

export type StoryRecord = {
  slug: string;
  participantCode: string;
  sourceUrl: string;
  sourceId: string;
  status: "extracted" | "incomplete" | "missing" | "error";
  notes: string[];
  placeholderTitle: boolean;
  languages: Record<StoryLanguage, boolean>;
  paragraphCounts: Record<StoryLanguage | "undetermined", number>;
  linkCount: number;
  images: { url?: string; legacySrc?: string; alt: { en?: string; es?: string; zh?: string }; caption?: string; source: string }[];
  relatedEventIds: string[];
  contentHash: string;
  document: {
    participantCode: string;
    title: { _type: "localeString"; en?: string; es?: string; zh?: string };
    body?: { _type: "localeText"; en?: string; es?: string; zh?: string };
    article?: { _type: "object"; en?: unknown[]; es?: unknown[]; zh?: unknown[] };
    externalHref: string;
    published: false;
    migration: {
      _type: "migration";
      source: "weebly";
      sourceUrl: string;
      sourceId: string;
      contentHash: string;
      completeness: "complete" | "incomplete";
    };
    quotations?: {
      _key: string;
      _type: "quotation";
      text: { _type: "localeText"; en?: string; es?: string; zh?: string };
      event: { _type: "reference"; _ref: string };
    }[];
    relatedEvents?: { _key: string; _type: "reference"; _ref: string }[];
    photographs?: Record<string, unknown>[];
  };
};

function keyFor(value: string) {
  return createHash("sha1").update(value).digest("hex").slice(0, 12);
}

function localeText(value: { en?: string; es?: string; zh?: string }) {
  const text = {
    _type: "localeText" as const,
    en: value.en || undefined,
    es: value.es || undefined,
    zh: value.zh || undefined,
  };
  return text.en || text.es || text.zh ? text : undefined;
}

function collectImages(post: WeeblyPost, notes: string[]) {
  const images: WeeblyImage[] = [];
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    for (const key of ["url", "src", "href"]) {
      const url = record[key];
      if (typeof url === "string" && /^https?:\/\//.test(url)) images.push({ url });
    }
    for (const nested of Object.values(record)) {
      if (nested && typeof nested === "object") visit(nested);
    }
  };
  visit(post.image);
  if (!images.length && post.image) notes.push("Weebly image field has no public URL.");
  return images;
}

export function recordFromPost(post: WeeblyPost, timeline: ArchiveStory | undefined): StoryRecord {
  const slug = (post.slug || timeline?.slug || "").trim().toLowerCase();
  const participantCode = (post.name || timeline?.participantCode || slug).trim();
  const notes: string[] = [];
  const quillImages: WeeblyImage[] = [];
  const paragraphs = quillToParagraphs(post.content?.content?.quill?.ops, notes, quillImages);
  const { article, undetermined } = splitByLanguage(paragraphs, notes);
  const fieldImages = collectImages(post, notes).filter((image) => !quillImages.some((existing) => existing.url === image.url));
  const images = [...quillImages, ...fieldImages];

  const plain = {
    en: plainText(article.en),
    es: plainText(article.es),
    zh: plainText(article.zh),
  };
  const languages = {
    en: Boolean(plain.en),
    es: Boolean(plain.es),
    zh: Boolean(plain.zh),
  };
  const placeholderTitle = !post.post_title || PLACEHOLDER_TITLE.test(post.post_title.trim());
  if (placeholderTitle) notes.push('Weebly post title is the placeholder "Story title" and was not used.');
  const combined = [plain.en, plain.es, plain.zh].filter(Boolean).join("\n");
  const placeholderBody = !combined || PLACEHOLDER_BODY.test(combined);
  if (placeholderBody) notes.push("Weebly page has no article text beyond the empty-story placeholder.");
  if (undetermined.length) notes.push(`${undetermined.length} paragraph(s) were left out because their language was not clear.`);
  if (!timeline) notes.push("This story URL is not linked from the timeline data in the repository.");

  const titleText = placeholderTitle ? participantCode : post.post_title!.trim();
  const titleLanguage = languages.en ? "en" : languages.es ? "es" : languages.zh ? "zh" : "en";
  const status = placeholderBody ? "incomplete" : undetermined.length ? "incomplete" : "extracted";

  const portable = {
    en: languages.en ? toPortableText(article.en, `${slug}-en`) : undefined,
    es: languages.es ? toPortableText(article.es, `${slug}-es`) : undefined,
    zh: languages.zh ? toPortableText(article.zh, `${slug}-zh`) : undefined,
  };

  const photographs: {
    _key: string;
    _type: "photograph";
    legacySrc: string;
    alt: { _type: "localeString"; en?: string; es?: string; zh?: string };
    caption?: { _type: "localeText"; en?: string; es?: string; zh?: string };
    source: string;
  }[] = images.map((image, index) => ({
    _key: keyFor(`${slug}-weebly-${index}-${image.url}`),
    _type: "photograph",
    legacySrc: image.url,
    alt: { _type: "localeString", en: image.alt || `Photograph published on the ${participantCode} archive page` },
    caption: image.caption ? { _type: "localeText", en: image.caption } : undefined,
    source: image.url,
  }));

  if (timeline) {
    for (const [index, photo] of timeline.photographs.entries()) {
      if (photographs.some((item) => item.legacySrc === photo.src)) continue;
      photographs.push({
        _key: keyFor(`${slug}-timeline-${index}-${photo.src}`),
        _type: "photograph",
        legacySrc: photo.src,
        alt: { _type: "localeString", ...portraitAlt(participantCode) },
        caption: photo.caption ? { _type: "localeText", en: photo.caption.en, es: photo.caption.es, zh: photo.caption.zh } : undefined,
        source: "Timeline portrait already stored with the archive",
      });
    }
  }

  const quotations = (timeline?.quotations || []).map((quotation, index) => ({
    _key: keyFor(`${slug}-quotation-${quotation.eventId}-${index}`),
    _type: "quotation" as const,
    text: {
      _type: "localeText" as const,
      en: quotation.text.en || undefined,
      es: quotation.text.es || undefined,
      zh: quotation.text.zh || undefined,
    },
    event: { _type: "reference" as const, _ref: `timeline-${quotation.eventId}` },
  }));
  const relatedEvents = (timeline?.relatedEvents || []).map((event) => ({
    _key: keyFor(`${slug}-event-${event.id}`),
    _type: "reference" as const,
    _ref: `timeline-${event.id}`,
  }));

  const contentHash = createHash("sha256")
    .update(JSON.stringify({ plain, portable, quotations: quotations.map((item) => item._key), photos: photographs.map((item) => item.legacySrc) }))
    .digest("hex");

  const body = localeText(plain);
  return {
    slug,
    participantCode,
    sourceUrl: storyUrl(slug),
    sourceId: post.id || "",
    status,
    notes,
    placeholderTitle,
    languages,
    paragraphCounts: {
      en: article.en.length,
      es: article.es.length,
      zh: article.zh.length,
      undetermined: undetermined.length,
    },
    linkCount: countLinks([...article.en, ...article.es, ...article.zh]),
    images: photographs.map((photo) => ({
      url: typeof photo.legacySrc === "string" && photo.legacySrc.startsWith("http") ? photo.legacySrc : undefined,
      legacySrc: photo.legacySrc,
      alt: { en: (photo.alt as { en?: string }).en },
      source: String(photo.source),
    })),
    relatedEventIds: (timeline?.relatedEvents || []).map((event) => event.id),
    contentHash,
    document: {
      participantCode,
      title: {
        _type: "localeString",
        en: placeholderTitle || titleLanguage === "en" ? titleText : participantCode,
        es: placeholderTitle || titleLanguage === "es" ? titleText : undefined,
        zh: placeholderTitle || titleLanguage === "zh" ? titleText : undefined,
      },
      body,
      article: portable.en || portable.es || portable.zh ? { _type: "object", ...portable } : undefined,
      externalHref: storyUrl(slug),
      published: false,
      migration: {
        _type: "migration",
        source: "weebly",
        sourceUrl: storyUrl(slug),
        sourceId: post.id || "",
        contentHash,
        completeness: status === "extracted" ? "complete" : "incomplete",
      },
      quotations: quotations.length ? quotations : undefined,
      relatedEvents: relatedEvents.length ? relatedEvents : undefined,
      photographs: photographs.length ? photographs : undefined,
    },
  };
}

export function missingRecord(slug: string, timeline: ArchiveStory | undefined, reason: string): StoryRecord {
  const participantCode = timeline?.participantCode || slug.toUpperCase();
  return {
    slug,
    participantCode,
    sourceUrl: storyUrl(slug),
    sourceId: "",
    status: "missing",
    notes: [reason],
    placeholderTitle: true,
    languages: { en: false, es: false, zh: false },
    paragraphCounts: { en: 0, es: 0, zh: 0, undetermined: 0 },
    linkCount: 0,
    images: [],
    relatedEventIds: (timeline?.relatedEvents || []).map((event) => event.id),
    contentHash: "",
    document: {
      participantCode,
      title: { _type: "localeString", en: participantCode },
      externalHref: storyUrl(slug),
      published: false,
      migration: {
        _type: "migration",
        source: "weebly",
        sourceUrl: storyUrl(slug),
        sourceId: "",
        contentHash: "",
        completeness: "incomplete",
      },
    },
  };
}
