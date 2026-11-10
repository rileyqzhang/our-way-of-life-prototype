import { lifeStages, lifeStageTitle, type LifeStage } from "@/cms/schemaTypes/lifeStage";
import { formatSegmentTitle, segmentTimelineTitle } from "@/lib/content/segment-title";
import type { Locale } from "@/lib/i18n";

export type StoryText = { en?: string | null; es?: string | null; zh?: string | null } | null | undefined;

export type StoryBlock = {
  _key?: string;
  _type?: string;
  style?: string;
  listItem?: string;
  level?: number;
  children?: { _key?: string; _type?: string; text?: string; marks?: string[] }[];
  markDefs?: { _key?: string; _type?: string; href?: string }[];
};

export type StoryBlocks = { en?: StoryBlock[] | null; es?: StoryBlock[] | null; zh?: StoryBlock[] | null } | null | undefined;

export type StorySegmentSource = {
  _key?: string | null;
  quote?: StoryText;
  isQuote?: boolean | null;
  shortTitle?: StoryText;
  body?: StoryBlocks;
  lifeStage?: string | null;
};

export type StorySegmentView = {
  id: string;
  stage: LifeStage | "other";
  title: string;
  isQuote: boolean;
  timelineTitle: string;
  body: StoryBlock[];
};

export type StoryStageView = {
  id: LifeStage | "other";
  title: string;
  empty: boolean;
  segments: StorySegmentView[];
};

const OTHER_TITLE = "Other Stories";

export function storyContentLocale(
  story: {
    overview?: StoryBlocks;
    segments?: StorySegmentSource[] | null;
    headline?: StoryText;
    article?: StoryBlocks;
    body?: StoryText;
  },
  lang: Locale,
): Locale {
  const score = (locale: Locale) => {
    const quotations = (story.headline?.[locale] || "").trim().length;
    const segments = (story.segments || []).reduce(
      (sum, segment) => sum + (segment.quote?.[locale] || "").trim().length + (segment.shortTitle?.[locale] || "").trim().length + blockText(segment.body?.[locale]),
      0,
    );
    return blockText(story.overview?.[locale]) + blockText(story.article?.[locale]) + (story.body?.[locale] || "").trim().length + quotations + segments;
  };
  if (score(lang) > 0) return lang;
  const available = (["en", "es", "zh"] as const)
    .filter((locale) => locale !== lang && score(locale) > 0)
    .sort((a, b) => score(b) - score(a));
  return available[0] || lang;
}

export function localizedPlain(value: StoryText, lang: Locale) {
  const preferred = value?.[lang]?.trim();
  if (preferred) return preferred;
  if (lang === "en") return "";
  return value?.en?.trim() || "";
}

export function blockText(blocks: StoryBlock[] | null | undefined) {
  return (blocks || []).reduce(
    (total, block) => total + (block.children || []).reduce((sum, child) => sum + (child.text || "").length, 0),
    0,
  );
}

export function localizedBlocks(value: StoryBlocks, lang: Locale) {
  const preferred = value?.[lang] || [];
  if (blockText(preferred) > 0) return preferred;
  if (lang === "en") return [];
  const english = value?.en || [];
  return blockText(english) > 0 ? english : [];
}

export function portablePlain(blocks: StoryBlock[] | null | undefined) {
  return (blocks || [])
    .map((block) => (block.children || []).map((child) => child.text || "").join("").trim())
    .filter(Boolean)
    .join("\n\n");
}

export function segmentAnchorId(englishQuote: string, key: string) {
  const slug = englishQuote
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return `segment-${slug || key || "section"}`;
}

function stageOf(value: string | null | undefined): LifeStage | "other" {
  return lifeStages.some((stage) => stage.value === value) ? (value as LifeStage) : "other";
}

export function groupStorySegments(segments: StorySegmentSource[] | null | undefined, lang: Locale): StoryStageView[] {
  const grouped = new Map<LifeStage | "other", StorySegmentView[]>();
  for (const stage of lifeStages) grouped.set(stage.value, []);
  grouped.set("other", []);
  const used = new Set<string>();

  (segments || []).forEach((segment, index) => {
    const key = segment._key?.trim() || `segment-${index + 1}`;
    const quote = localizedPlain(segment.quote, lang);
    const englishQuote = segment.quote?.en?.trim() || quote;
    const shortTitle = localizedPlain(segment.shortTitle, lang);
    const body = localizedBlocks(segment.body, lang);
    if (!quote && !shortTitle && blockText(body) === 0) return;
    let id = segmentAnchorId(englishQuote, key);
    if (used.has(id)) id = `${id}-${key}`;
    used.add(id);
    const stage = stageOf(segment.lifeStage);
    grouped.get(stage)?.push({
      id,
      stage,
      title: formatSegmentTitle(quote),
      isQuote: segment.isQuote === true,
      timelineTitle: segmentTimelineTitle(shortTitle, quote),
      body,
    });
  });

  const stages: StoryStageView[] = lifeStages.map((stage) => {
    const items = grouped.get(stage.value) || [];
    return { id: stage.value, title: lifeStageTitle(stage.value) || stage.title, empty: items.length === 0, segments: items };
  });
  const other = grouped.get("other") || [];
  if (other.length) stages.push({ id: "other", title: OTHER_TITLE, empty: false, segments: other });
  return stages;
}

const ELICITATION = /^elicitation document\b/i;
const NEXT_SECTION = /^(story\s+\d+\b|stories of cp\b|what is civic participation\b)/i;

function blockPlain(block: StoryBlock) {
  return (block.children || []).map((child) => child.text || "").join("").trim();
}

function startsStorySection(text: string, style?: string) {
  if (style === "h2" || style === "h3") return true;
  return NEXT_SECTION.test(text);
}

export function omitElicitationBlocks(blocks: StoryBlock[] | null | undefined) {
  const kept: StoryBlock[] = [];
  let skipping = false;
  for (const block of blocks || []) {
    const text = blockPlain(block);
    if (ELICITATION.test(text)) {
      skipping = true;
      continue;
    }
    if (skipping && startsStorySection(text, block.style)) skipping = false;
    if (!skipping) kept.push(block);
  }
  return kept;
}

export function omitElicitationPlain(text: string) {
  const kept: string[] = [];
  let skipping = false;
  for (const paragraph of text.split(/\n\s*\n/)) {
    const value = paragraph.trim();
    if (!value) continue;
    if (ELICITATION.test(value)) {
      skipping = true;
      continue;
    }
    if (skipping && startsStorySection(value)) skipping = false;
    if (!skipping) kept.push(value);
  }
  return kept.join("\n\n");
}

export function readingFallback(article: StoryBlocks, body: StoryText, lang: Locale) {
  const blocks = omitElicitationBlocks(localizedBlocks(article, lang));
  const paragraphs = omitElicitationPlain(localizedPlain(body, lang))
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const plainLength = paragraphs.join("").length;
  if (blockText(blocks) >= plainLength && blockText(blocks) > 0) return { kind: "blocks" as const, blocks, paragraphs: [] as string[] };
  if (paragraphs.length) return { kind: "plain" as const, blocks: [] as StoryBlock[], paragraphs };
  return null;
}
