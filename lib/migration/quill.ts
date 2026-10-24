import { createHash } from "node:crypto";
import { detectLanguage, sectionLanguage, type StoryLanguage } from "@/lib/migration/language";

export type ParagraphStyle = "normal" | "h2" | "h3" | "blockquote";

export type TextSpan = {
  text: string;
  strong?: boolean;
  em?: boolean;
  href?: string;
};

export type ArticleParagraph = {
  style: ParagraphStyle;
  listItem?: "bullet" | "number";
  spans: TextSpan[];
};

export type WeeblyImage = {
  url: string;
  alt?: string;
  caption?: string;
};

type QuillOp = {
  insert?: unknown;
  attributes?: Record<string, unknown>;
};

function keyFor(value: string) {
  return createHash("sha1").update(value).digest("hex").slice(0, 12);
}

function cleanText(value: string) {
  return value.replace(/\uFEFF/g, "").replace(/\u00a0/g, " ");
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function blockStyle(attributes: Record<string, unknown> | undefined): Pick<ArticleParagraph, "style" | "listItem"> {
  const header = attributes?.header;
  const list = attributes?.list;
  const style: ParagraphStyle = header === 1 || header === 2 ? "h2" : header === 3 ? "h3" : attributes?.blockquote ? "blockquote" : "normal";
  const listItem = list === "bullet" || list === "ordered" ? (list === "ordered" ? "number" : "bullet") : undefined;
  return { style, listItem };
}

function spanFrom(text: string, attributes: Record<string, unknown> | undefined): TextSpan | undefined {
  const value = cleanText(text);
  if (!value) return undefined;
  const href = asString(attributes?.link).trim();
  return {
    text: value,
    strong: attributes?.bold === true || undefined,
    em: attributes?.italic === true || undefined,
    href: href || undefined,
  };
}

export function quillToParagraphs(ops: QuillOp[] | undefined, notes: string[], images: WeeblyImage[]) {
  const paragraphs: ArticleParagraph[] = [];
  let spans: TextSpan[] = [];

  const flush = (attributes: Record<string, unknown> | undefined) => {
    const text = spans.map((span) => span.text).join("").trim();
    if (text) {
      const block = blockStyle(attributes);
      paragraphs.push({ ...block, spans });
    }
    spans = [];
  };

  for (const op of ops || []) {
    const insert = op.insert;
    if (insert && typeof insert === "object") {
      const record = insert as Record<string, unknown>;
      const image = asString(record.image);
      if (image) {
        images.push({ url: image, alt: asString(record.alt) || undefined, caption: asString(record.caption) || undefined });
      } else {
        notes.push(`Unparsed embed: ${Object.keys(record).join(", ") || "empty"}`);
      }
      continue;
    }
    if (typeof insert !== "string") continue;

    const parts = cleanText(insert).split("\n");
    parts.forEach((part, index) => {
      const span = spanFrom(part, op.attributes);
      if (span) spans.push(span);
      if (index < parts.length - 1) flush(op.attributes);
    });
  }
  flush(undefined);
  return paragraphs;
}

export type LanguageArticle = Record<StoryLanguage, ArticleParagraph[]>;

export function splitByLanguage(paragraphs: ArticleParagraph[], notes: string[]) {
  const article: LanguageArticle = { en: [], es: [], zh: [] };
  const undetermined: ArticleParagraph[] = [];
  let sticky: StoryLanguage | undefined;
  let switches = 0;
  let previous: StoryLanguage | undefined;

  for (const paragraph of paragraphs) {
    const text = paragraph.spans.map((span) => span.text).join(" ").replace(/\s+/g, " ").trim();
    const labeled = sectionLanguage(text);
    if (labeled && paragraph.spans.length === 1 && !paragraph.spans[0]?.href) {
      sticky = labeled;
      continue;
    }
    let language = detectLanguage(text);
    if (language === "und" && sticky) language = sticky;
    if (language === "und") {
      undetermined.push(paragraph);
      notes.push(`Language not identified: ${text.slice(0, 80)}`);
      continue;
    }
    if (previous && previous !== language) switches += 1;
    previous = language;
    article[language].push(paragraph);
  }

  if (switches > 2) notes.push("Languages alternate inside the page. Each paragraph stayed in the language it was written in.");
  return { article, undetermined };
}

export function plainText(paragraphs: ArticleParagraph[]) {
  return paragraphs
    .map((paragraph) => paragraph.spans.map((span) => span.text).join("").replace(/[ \t]+\n/g, "\n").trim())
    .filter(Boolean)
    .join("\n\n");
}

export function toPortableText(paragraphs: ArticleParagraph[], seed: string) {
  return paragraphs.map((paragraph, index) => {
    const markDefs: { _key: string; _type: "link"; href: string }[] = [];
    const children = paragraph.spans.map((span, spanIndex) => {
      const marks: string[] = [];
      if (span.strong) marks.push("strong");
      if (span.em) marks.push("em");
      if (span.href) {
        const markKey = keyFor(`${seed}-${index}-link-${spanIndex}-${span.href}`);
        markDefs.push({ _key: markKey, _type: "link", href: span.href });
        marks.push(markKey);
      }
      return {
        _key: keyFor(`${seed}-${index}-span-${spanIndex}-${span.text.slice(0, 24)}`),
        _type: "span" as const,
        text: span.text,
        marks,
      };
    });
    return {
      _key: keyFor(`${seed}-${index}-${children.map((child) => child.text).join("").slice(0, 40)}`),
      _type: "block" as const,
      style: paragraph.style,
      listItem: paragraph.listItem,
      markDefs,
      children,
    };
  });
}

export function countLinks(paragraphs: ArticleParagraph[]) {
  return paragraphs.reduce((total, paragraph) => total + paragraph.spans.filter((span) => span.href).length, 0);
}
