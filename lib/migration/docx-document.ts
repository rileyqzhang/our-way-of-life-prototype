import { createHash } from "node:crypto";
import type { StoryCollection } from "@/lib/content/collections";
import { prepareTimeline, storiesFromTimeline, type ArchiveStory } from "@/lib/content/derive";
import type { DocxBlock, DocxImage } from "@/lib/migration/docx";
import { detectLanguage, sectionLanguage, type StoryLanguage } from "@/lib/migration/language";
import { timelineEvents } from "@/lib/timeline/events";
import type { LocalizedText } from "@/lib/timeline/types";

const STORY_SECTION = /^story\s+\d+\b/i;
const QUOTED = /^["“«].+["”»]$/;

export type DocumentRole = "primary" | "additional";

export type SourceFile = {
  filename: string;
  relativePath: string;
  storySectionCount: number;
};

export type TimelineAvailability = {
  relatedEventIds: string[];
  missingTimelineIds: string[];
  quotations: { text: LocalizedText; eventId: string }[];
  portraitSrc?: string;
};

function keyFor(value: string) {
  return createHash("sha1").update(value).digest("hex").slice(0, 12);
}

function definedLocale(value: LocalizedText | undefined) {
  if (!value) return undefined;
  const text: { _type: "localeText"; en?: string; es?: string; zh?: string } = { _type: "localeText" };
  if (value.en?.trim()) text.en = value.en;
  if (value.es?.trim()) text.es = value.es;
  if (value.zh?.trim()) text.zh = value.zh;
  return text.en || text.es || text.zh ? text : undefined;
}

export function isQuotedParagraph(text: string) {
  const value = text.trim();
  return value.length > 1 && value.length <= 400 && QUOTED.test(value) && !STORY_SECTION.test(value);
}

export function plainTextFromBlocks(blocks: DocxBlock[]) {
  return blocks
    .map((block) => block.text.trim())
    .filter(Boolean)
    .join("\n\n");
}

function isShortLabel(block: DocxBlock) {
  return block.text.trim().length <= 80;
}

export function blocksByLanguage(blocks: DocxBlock[]) {
  let current: StoryLanguage | undefined;
  const groups: Record<StoryLanguage, DocxBlock[]> = { en: [], es: [], zh: [] };
  const pending: DocxBlock[] = [];
  for (const block of blocks) {
    if (!block.text.trim()) continue;
    const section = sectionLanguage(block.text);
    if (section) {
      current = section;
      continue;
    }
    const detected = detectLanguage(block.text);
    const language = detected === "und" ? current : detected;
    if (!language) {
      pending.push(block);
      continue;
    }
    if (pending.length) groups[language].unshift(...pending.splice(0));
    current = language;
    groups[language].push(block);
  }
  const present = (["en", "es", "zh"] as const).filter((language) => groups[language].length);
  if (pending.length && present.length) {
    const target = present.length === 1 ? present[0] : [...present].sort((left, right) => groups[right].length - groups[left].length)[0];
    groups[target].push(...pending);
  } else if (pending.length) {
    groups.en.push(...pending);
  }
  const unclassified = pending.filter((block) => !isShortLabel(block)).length;
  return { groups, unclassified };
}

export function portableTextFromBlocks(blocks: DocxBlock[], keyPrefix: string) {
  return blocks
    .filter((block) => block.text.trim())
    .map((block, index) => {
      const storySection = STORY_SECTION.test(block.text);
      const style =
        block.kind === "heading" ? (block.level && block.level >= 3 ? "h3" : "h2") : storySection ? "h2" : isQuotedParagraph(block.text) ? "blockquote" : "normal";
      const marks: string[] = [];
      const markDefs: { _key: string; _type: "link"; href: string }[] = [];
      if (block.marks.includes("strong")) marks.push("strong");
      if (block.marks.includes("em")) marks.push("em");
      if (block.href && block.marks.includes("link")) {
        const linkKey = keyFor(`${keyPrefix}-link-${index}-${block.href}`);
        markDefs.push({ _key: linkKey, _type: "link", href: block.href });
        marks.push(linkKey);
      }
      return {
        _key: keyFor(`${keyPrefix}-${index}-${style}-${block.text.slice(0, 40)}`),
        _type: "block",
        style,
        markDefs,
        children: [{ _key: keyFor(`${keyPrefix}-span-${index}`), _type: "span", text: block.text, marks }],
      };
    });
}

export function articleDifference(docxText: string, sanityText: string) {
  const split = (value: string) =>
    value
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
      .filter(Boolean);
  const docxParagraphs = split(docxText);
  const sanityParagraphs = split(sanityText);
  const sanitySet = new Set(sanityParagraphs);
  const identicalParagraphs = docxParagraphs.filter((paragraph) => sanitySet.has(paragraph)).length;
  return {
    docxCharacters: docxText.length,
    sanityCharacters: sanityText.length,
    docxParagraphs: docxParagraphs.length,
    sanityParagraphs: sanityParagraphs.length,
    identicalParagraphs,
    docxOnlyParagraphs: docxParagraphs.length - identicalParagraphs,
    sameText: docxText.replace(/\s+/g, " ").trim() === sanityText.replace(/\s+/g, " ").trim(),
  };
}

export function documentRole(file: SourceFile, files: SourceFile[]): DocumentRole {
  if (files.length < 2) return "primary";
  const score = (item: SourceFile) => (/final/i.test(item.filename) ? 2 : 0) + (item.storySectionCount > 0 ? 1 : 0);
  const primary = [...files].sort((left, right) => score(right) - score(left) || left.relativePath.localeCompare(right.relativePath))[0];
  return primary.relativePath === file.relativePath ? "primary" : "additional";
}

export function storySlug(canonical: string, role: DocumentRole, filename: string) {
  if (role === "primary") return canonical;
  if (/elicit/i.test(filename)) return `${canonical}-elicitation`;
  return `${canonical}-additional`;
}

export function archiveLinks(canonical: string, liveTimelineIds: Set<string>): TimelineAvailability {
  const story = storiesFromTimeline(prepareTimeline(timelineEvents)).find(
    (item) => item.slug === canonical || item.participantCode.toLowerCase() === canonical,
  );
  return linksFromStory(story, liveTimelineIds);
}

function linksFromStory(story: ArchiveStory | undefined, liveTimelineIds: Set<string>): TimelineAvailability {
  const relatedEventIds = story?.relatedEvents.map((event) => event.id) || [];
  const missingTimelineIds = relatedEventIds.filter((id) => !liveTimelineIds.has(`timeline-${id}`)).map((id) => `timeline-${id}`);
  const quotations = (story?.quotations || [])
    .filter((quotation) => quotation.eventId && liveTimelineIds.has(`timeline-${quotation.eventId}`))
    .map((quotation) => ({ text: quotation.text, eventId: quotation.eventId }));
  const portraitSrc = story?.photographs[0]?.src;
  return { relatedEventIds, missingTimelineIds, quotations, portraitSrc };
}

export function buildStoryDraft(input: {
  canonical: string;
  originalCode: string;
  filename: string;
  relativePath: string;
  driveId: string;
  collection: StoryCollection;
  role: DocumentRole;
  blocks: DocxBlock[];
  images: DocxImage[];
  links: TimelineAvailability;
}) {
  const slug = storySlug(input.canonical, input.role, input.filename);
  const storyId = `story-${slug}`;
  const { groups, unclassified } = blocksByLanguage(input.blocks);
  const plainByLanguage = {
    en: plainTextFromBlocks(groups.en),
    es: plainTextFromBlocks(groups.es),
    zh: plainTextFromBlocks(groups.zh),
  };
  const plain = [plainByLanguage.en, plainByLanguage.es, plainByLanguage.zh].filter(Boolean).join("\n\n");
  const articleByLanguage = {
    en: portableTextFromBlocks(groups.en, `${storyId}-en`),
    es: portableTextFromBlocks(groups.es, `${storyId}-es`),
    zh: portableTextFromBlocks(groups.zh, `${storyId}-zh`),
  };
  const availableEvents = new Set(input.links.relatedEventIds.filter((id) => !input.links.missingTimelineIds.includes(`timeline-${id}`)));
  const photographs = input.links.portraitSrc
    ? [
        {
          _key: keyFor(`${storyId}-portrait`),
          _type: "photograph",
          legacySrc: input.links.portraitSrc,
          alt: { _type: "localeString", en: `Portrait of participant ${input.canonical.toUpperCase()}` },
          source: "Timeline portrait already stored with the archive",
        },
      ]
    : [];
  const embeddedImages = input.images.map((image, index) => ({
    _key: keyFor(`${storyId}-image-${index}-${image.filename}`),
    filename: image.filename,
    bytes: image.bytes,
    alt: `Image ${index + 1} from ${input.filename}`,
    source: input.filename,
  }));
  const quotations = input.links.quotations
    .map((quotation, index) => {
      const text = definedLocale(quotation.text);
      if (!text || !availableEvents.has(quotation.eventId)) return undefined;
      return {
        _key: keyFor(`${storyId}-quotation-${quotation.eventId}-${index}`),
        _type: "quotation",
        text,
        event: { _type: "reference", _ref: `timeline-${quotation.eventId}` },
      };
    })
    .filter((quotation) => quotation);
  const contentHash = createHash("sha256")
    .update(JSON.stringify({ plain, sections: input.blocks.filter((block) => STORY_SECTION.test(block.text)).length, images: input.images.map((image) => `${image.filename}:${image.bytes}`) }))
    .digest("hex");
  const document = {
    _id: `drafts.${storyId}`,
    _type: "story",
    participantCode: input.canonical.toUpperCase(),
    participant: { _type: "reference", _ref: `person-${input.canonical}` },
    collection: input.collection,
    slug: { _type: "slug", current: slug },
    title: { _type: "localeString", en: input.canonical.toUpperCase() },
    body: {
      _type: "localeText",
      ...(plainByLanguage.en ? { en: plainByLanguage.en } : {}),
      ...(plainByLanguage.es ? { es: plainByLanguage.es } : {}),
      ...(plainByLanguage.zh ? { zh: plainByLanguage.zh } : {}),
    },
    article: {
      _type: "object",
      ...(articleByLanguage.en.length ? { en: articleByLanguage.en } : {}),
      ...(articleByLanguage.es.length ? { es: articleByLanguage.es } : {}),
      ...(articleByLanguage.zh.length ? { zh: articleByLanguage.zh } : {}),
    },
    externalHref: `https://www.ourwayoflifearchive.com/s/stories/${input.canonical}`,
    published: false,
    migration: {
      _type: "object",
      source: "docx",
      sourceUrl: input.driveId ? `https://drive.google.com/open?id=${input.driveId}` : undefined,
      sourceId: input.driveId,
      sourceFilename: input.filename,
      originalCode: input.originalCode,
      contentHash,
      completeness: plain ? "complete" : "incomplete",
    },
    quotations: quotations.length ? quotations : undefined,
    relatedEvents: [...availableEvents].map((id) => ({
      _key: keyFor(`${storyId}-event-${id}`),
      _type: "reference",
      _ref: `timeline-${id}`,
    })),
    photographs: photographs.length ? photographs : undefined,
  };
  const languages = (["en", "es", "zh"] as const).filter((language) => articleByLanguage[language].length);
  const bodyLanguages = languages.filter((language) => groups[language].some((block) => block.text.trim().length > 200));
  const headingLanguages = languages.filter((language) => !bodyLanguages.includes(language));
  document.body = {
    _type: "localeText",
    ...(bodyLanguages.includes("en") ? { en: plainByLanguage.en } : {}),
    ...(bodyLanguages.includes("es") ? { es: plainByLanguage.es } : {}),
    ...(bodyLanguages.includes("zh") ? { zh: plainByLanguage.zh } : {}),
  };
  return {
    storyId,
    draftId: `drafts.${storyId}`,
    personId: `person-${input.canonical}`,
    slug,
    contentHash,
    plain,
    languages,
    bodyLanguages,
    headingLanguages,
    unclassified,
    document,
    photographs,
    embeddedImages,
  };
}

export function rowIsApproved(
  row: { proposedAction: string; normalizedCode: string; slug: string },
  only: Set<string>,
) {
  if (row.proposedAction === "Preserve" || row.proposedAction === "Skip") return false;
  const code = row.normalizedCode.toLowerCase();
  if (row.proposedAction === "Create") return only.has(code) || only.has(row.slug);
  if (row.proposedAction === "Review") return only.has(row.slug) && row.slug !== code;
  return false;
}
