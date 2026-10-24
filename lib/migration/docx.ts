import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import mammoth from "mammoth";
import { detectLanguage, sectionLanguage, type StoryLanguage } from "@/lib/migration/language";

export type DocxBlock = {
  kind: "heading" | "paragraph";
  level?: number;
  text: string;
  marks: ("strong" | "em" | "link")[];
  href?: string;
};

export type DocxImage = {
  filename: string;
  contentType: string;
  bytes: number;
};

export type DocxExtract = {
  blocks: DocxBlock[];
  images: DocxImage[];
  warnings: string[];
  languages: StoryLanguage[];
  headings: string[];
  storyBoundaries: string[];
  storySectionCount: number;
  paragraphCount: number;
};

const LANGUAGE_ORDER: StoryLanguage[] = ["en", "es", "zh"];

function decode(text: string) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function plainText(html: string) {
  return decode(html.replace(/<[^>]+>/g, " "));
}

function marksIn(html: string): DocxBlock["marks"] {
  const marks: DocxBlock["marks"] = [];
  if (/<(strong|b)\b/i.test(html)) marks.push("strong");
  if (/<(em|i)\b/i.test(html)) marks.push("em");
  if (/<a\b/i.test(html)) marks.push("link");
  return marks;
}

function hrefIn(html: string) {
  const match = html.match(/<a\b[^>]*href="([^"]+)"/i);
  return match?.[1];
}

export function blocksFromHtml(html: string): DocxBlock[] {
  const blocks: DocxBlock[] = [];
  const pattern = /<(h[1-6]|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  for (const match of html.matchAll(pattern)) {
    const tag = match[1].toLowerCase();
    const inner = match[2];
    const text = plainText(inner);
    if (!text) continue;
    if (tag.startsWith("h")) {
      blocks.push({ kind: "heading", level: Number(tag.slice(1)), text, marks: marksIn(inner), href: hrefIn(inner) });
    } else {
      blocks.push({ kind: "paragraph", text, marks: marksIn(inner), href: hrefIn(inner) });
    }
  }
  return blocks;
}

const STORY_SECTION = /^story\s+\d+\b/i;

export function describeBlocks(blocks: DocxBlock[]): Pick<DocxExtract, "languages" | "headings" | "storyBoundaries" | "storySectionCount" | "paragraphCount"> {
  const languages = new Set<StoryLanguage>();
  const headings: string[] = [];
  const storyBoundaries: string[] = [];
  let storySectionCount = 0;
  let paragraphCount = 0;
  for (const block of blocks) {
    if (block.kind === "heading") {
      headings.push(block.text);
      const language = sectionLanguage(block.text);
      if (!language) storyBoundaries.push(block.text);
      continue;
    }
    if (STORY_SECTION.test(block.text)) storySectionCount += 1;
    if (sectionLanguage(block.text)) continue;
    paragraphCount += 1;
    const language = detectLanguage(block.text);
    if (language !== "und") languages.add(language);
  }
  return {
    languages: LANGUAGE_ORDER.filter((language) => languages.has(language)),
    headings,
    storyBoundaries,
    storySectionCount,
    paragraphCount,
  };
}

export async function extractDocx(filePath: string, imageDir?: string): Promise<DocxExtract> {
  const images: DocxImage[] = [];
  const warnings: string[] = [];
  let imageIndex = 0;
  const result = await mammoth.convertToHtml(
    { path: filePath },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        imageIndex += 1;
        const buffer = await image.read();
        const extension = image.contentType.split("/")[1]?.replace("jpeg", "jpg") || "bin";
        const filename = `image-${String(imageIndex).padStart(2, "0")}.${extension}`;
        if (imageDir) {
          mkdirSync(imageDir, { recursive: true });
          writeFileSync(path.join(imageDir, filename), buffer);
        }
        images.push({ filename, contentType: image.contentType, bytes: buffer.length });
        return { src: filename };
      }),
    },
  );
  for (const message of result.messages) {
    if (message.type === "warning" || message.type === "error") warnings.push(message.message);
  }
  const blocks = blocksFromHtml(result.value);
  if (!blocks.length) warnings.push("The document produced no paragraphs.");
  return { blocks, images, warnings, ...describeBlocks(blocks) };
}
