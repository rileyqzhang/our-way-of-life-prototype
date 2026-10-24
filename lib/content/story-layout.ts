import type { StoryArticleBlock } from "@/lib/content/derive";
import type { Locale } from "@/lib/i18n";

export type StorySpan = { text: string; strong?: boolean; em?: boolean; href?: string };

export type StoryParagraph = { kind: "p" | "h3"; spans: StorySpan[] };

export type StoryChapterModel = {
  id: string;
  navLabel: string;
  tag: string;
  title: string;
  era: string;
  nodes: { id: string; label: string }[];
  quote: string;
  sections: { paragraphs: StoryParagraph[] }[];
};

export type StoryLayoutModel = {
  badge: string;
  heroQuote: string;
  intro: StorySpan[][];
  chapters: StoryChapterModel[];
};

type ContentBlock = {
  style: "normal" | "h2" | "h3" | "blockquote";
  spans: StorySpan[];
  listItem?: string;
};

const STORY_HEADING = /^story\s+\d+\b/i;

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function spansText(spans: StorySpan[]) {
  return clean(spans.map((span) => span.text).join(""));
}

function wrapQuote(value: string) {
  const text = value.trim();
  if (!text) return "";
  if (/^["“«]/.test(text)) return text;
  return `“${text}”`;
}

function stripQuote(value: string) {
  return value.trim().replace(/^["“«]\s*/, "").replace(/\s*["”»]$/, "");
}

function isShortQuote(value: string) {
  const text = clean(value);
  return text.length > 1 && text.length <= 360 && /^["“«].+["”»]$/.test(text);
}

function paragraphsOf(spans: StorySpan[], kind: StoryParagraph["kind"] = "p"): StoryParagraph[] {
  const paragraphs: StorySpan[][] = [[]];
  for (const span of spans) {
    const parts = span.text.split(/\n+/);
    parts.forEach((part, index) => {
      if (index > 0) paragraphs.push([]);
      if (part) paragraphs[paragraphs.length - 1].push({ ...span, text: part });
    });
  }
  return paragraphs
    .filter((paragraph) => paragraph.some((span) => span.text.trim()))
    .map((paragraph) => ({ kind, spans: paragraph }));
}

function fromPlain(text: string): ContentBlock[] {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => {
      if (STORY_HEADING.test(paragraph) && paragraph.length < 80) {
        return { style: "h2" as const, spans: [{ text: paragraph }] };
      }
      if (isShortQuote(paragraph)) return { style: "blockquote" as const, spans: [{ text: paragraph }] };
      return { style: "normal" as const, spans: [{ text: paragraph }] };
    });
}

function fromPortable(blocks: StoryArticleBlock[]): ContentBlock[] {
  let number = 0;
  const content: ContentBlock[] = [];
  for (const block of blocks) {
    if (block._type && block._type !== "block") continue;
    const marks = new Map((block.markDefs || []).map((mark) => [mark._key, mark]));
    const spans = (block.children || [])
      .map((child) => {
        const link = (child.marks || []).map((mark) => marks.get(mark)).find((mark) => mark?._type === "link");
        return {
          text: child.text || "",
          strong: child.marks?.includes("strong") || undefined,
          em: child.marks?.includes("em") || undefined,
          href: link?.href,
        };
      })
      .filter((span) => span.text);
    if (!spansText(spans)) continue;
    if (block.listItem === "number") number += 1;
    else number = 0;
    if (block.listItem === "bullet" || block.listItem === "number") {
      const prefix = block.listItem === "number" ? `${number}. ` : "• ";
      spans[0] = { ...spans[0], text: `${prefix}${spans[0].text}` };
    }
    const style = block.style === "h2" || block.style === "h3" || block.style === "blockquote" ? block.style : "normal";
    content.push({ style, spans, listItem: block.listItem });
  }
  return content;
}

function blockLength(blocks: StoryArticleBlock[] | undefined) {
  return (blocks || []).reduce(
    (total, block) => total + (block.children || []).reduce((sum, child) => sum + (child.text || "").length, 0),
    0,
  );
}

function articleBlocks(
  article: { en: StoryArticleBlock[]; es: StoryArticleBlock[]; zh: StoryArticleBlock[] } | undefined,
  lang: Locale,
) {
  if (!article) return [];
  const order = [lang, "en", "es", "zh"].filter((code, index, all) => all.indexOf(code) === index) as Locale[];
  const substantial = order.find((code) => blockLength(article[code]) > 200);
  if (substantial) return article[substantial];
  return order.map((code) => article[code]).find((blocks) => blocks.length) || [];
}

function sectionsFrom(blocks: ContentBlock[]) {
  return blocks
    .map((block) => ({
      paragraphs: paragraphsOf(
        block.style === "blockquote" ? block.spans.map((span) => ({ ...span, em: true })) : block.spans,
        block.style === "h3" ? "h3" : "p",
      ),
    }))
    .filter((section) => section.paragraphs.length);
}

function isShortLabel(block: ContentBlock) {
  if (block.style === "h3") return true;
  if (block.style !== "normal") return false;
  const text = spansText(block.spans);
  if (!text || text.length > 32 || /[,.!?。！？，]/.test(text)) return false;
  const words = text.split(/\s+/).filter(Boolean);
  return words.every((word) => word === word.toUpperCase() || /^[\p{Lu}\d"“«]/u.test(word));
}

const STORY_LABEL = /^(story\s+\d+)\s*[:：.\-–—]\s*([\s\S]+)$/i;

function headingParts(spans: StorySpan[]) {
  const text = spansText(spans);
  const match = text.match(STORY_LABEL);
  if (!match) return { tag: text, quote: "" };
  return { tag: match[1].replace(/\s+/g, " "), quote: stripQuote(match[2]) };
}

function eraFor(dates: string[]) {
  const values = dates.filter(Boolean);
  if (!values.length) return "";
  if (values.length === 1 || values[0] === values[values.length - 1]) return values[0];
  return `${values[0]} – ${values[values.length - 1]}`;
}

export function buildStoryLayout(input: {
  code: string;
  location: string;
  summary: string;
  body: string;
  lang: Locale;
  article?: { en: StoryArticleBlock[]; es: StoryArticleBlock[]; zh: StoryArticleBlock[] };
  quotations: { text: string }[];
  relatedEvents: { id: string; date: string; title: string }[];
}): StoryLayoutModel {
  const portable = fromPortable(articleBlocks(input.article, input.lang));
  const plain = input.body.trim() ? fromPlain(input.body) : [];
  const portableLength = portable.reduce((total, block) => total + spansText(block.spans).length, 0);
  const blocks = portableLength > 200 ? portable : plain.length ? plain : portable;
  const quotationTexts = input.quotations.map((quotation) => quotation.text.trim()).filter(Boolean);
  const heroSource = quotationTexts[0] || spansText(blocks.find((block) => block.style === "blockquote")?.spans || []) || "";
  const heroQuote = wrapQuote(heroSource);
  const usedAsHero = clean(stripQuote(heroQuote));
  const summary = input.summary.trim();
  const narrative = clean(blocks.filter((block) => block.style !== "h2").map((block) => spansText(block.spans)).join(" "));

  let introBlocks: StorySpan[][] = [];
  let rest = blocks;
  if (summary && summary.length < 1200 && clean(summary) !== usedAsHero && clean(summary) !== narrative) {
    introBlocks = summary
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .map((paragraph) => [{ text: paragraph }]);
  } else {
    let start = 0;
    while (start < blocks.length && blocks[start].style !== "h2" && isShortLabel(blocks[start])) start += 1;
    const opening = blocks[start];
    const hasMore = blocks.slice(start + 1).some((block) => spansText(block.spans).length > 0);
    if (opening && hasMore && opening.style !== "h2" && spansText(opening.spans).length > 80) {
      introBlocks = paragraphsOf(opening.spans)
        .map((paragraph) => paragraph.spans)
        .filter((spans) => clean(stripQuote(spansText(spans))) !== usedAsHero);
      rest = blocks.slice(start + 1);
    }
  }

  const grouped: { heading: StorySpan[]; blocks: ContentBlock[] }[] = [];
  let current: { heading: StorySpan[]; blocks: ContentBlock[] } | undefined;
  for (const block of rest) {
    if (block.style === "h2" || (block.style !== "blockquote" && isShortLabel(block))) {
      current = { heading: block.spans, blocks: [] };
      grouped.push(current);
      continue;
    }
    if (!current) {
      current = { heading: [], blocks: [] };
      grouped.push(current);
    }
    current.blocks.push(block);
  }

  const chapterGroups = grouped.filter((group) => group.heading.length || group.blocks.length);
  const size = Math.ceil(input.relatedEvents.length / Math.max(chapterGroups.length, 1)) || 1;
  const nodesByChapter = chapterGroups.map((_, index) =>
    input.relatedEvents.slice(index * size, index * size + size).map((event) => ({
      id: event.id,
      label: event.title,
      date: event.date,
    })),
  );

  const chapters = chapterGroups.map((group, index) => {
    const parts = headingParts(group.heading);
    const quoteIndex = group.blocks.findIndex((block) => block.style === "blockquote");
    const inlineQuote = quoteIndex >= 0 ? stripQuote(spansText(group.blocks[quoteIndex].spans)) : "";
    const quote = parts.quote || inlineQuote;
    const restBlocks = group.blocks.filter((block, blockIndex) => {
      if (block.style !== "blockquote" || blockIndex !== quoteIndex) return true;
      return Boolean(parts.quote) && clean(inlineQuote) !== clean(parts.quote);
    });
    const tag = parts.tag || input.code;
    const nodes = nodesByChapter[index] || [];
    return {
      id: `chapter-${index + 1}`,
      navLabel: tag,
      tag,
      title: quote || tag,
      era: eraFor(nodes.map((node) => node.date)),
      nodes: nodes.map(({ id, label }) => ({ id, label })),
      quote,
      sections: sectionsFrom(restBlocks),
    };
  });

  if (!introBlocks.length && chapters[0]) {
    const first = chapters[0].sections[0]?.paragraphs[0];
    const firstText = first ? spansText(first.spans) : "";
    const paragraphCount = chapters[0].sections.reduce((total, section) => total + section.paragraphs.length, 0);
    if (first && (paragraphCount > 1 || chapters.length > 1) && first.kind === "p" && firstText.length > 120 && firstText.length < 1600) {
      introBlocks = [first.spans];
      chapters[0].sections[0].paragraphs.shift();
      if (!chapters[0].sections[0].paragraphs.length) chapters[0].sections.shift();
    }
  }

  if (!chapters.length && (heroQuote || input.relatedEvents.length)) {
    const nodes = input.relatedEvents.map((event) => ({ id: event.id, label: event.title }));
    chapters.push({
      id: "chapter-1",
      navLabel: input.code,
      tag: input.code,
      title: stripQuote(heroQuote) || input.code,
      era: eraFor(input.relatedEvents.map((event) => event.date)),
      nodes,
      quote: stripQuote(heroQuote),
      sections: [],
    });
  }

  return {
    badge: input.location ? `${input.code} · ${input.location}` : input.code,
    heroQuote,
    intro: introBlocks,
    chapters,
  };
}
