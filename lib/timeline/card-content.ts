import { pick } from "@/lib/content/text";
import type { Locale } from "@/lib/i18n";
import { canonicalParticipantSlug, normalizeParticipantCode } from "@/lib/migration/participant-code";
import type { TimelineEvent, TimelineParagraph } from "@/lib/timeline/types";

export type StoryRef = {
  slug: string;
  participantCode: string;
};

export type CardStory = {
  code: string;
  quote: string;
  body: string[];
  href: string | null;
};

export type CardVideo = { src: string; title: string };

export type CardMedia =
  | ({ kind: "video" } & CardVideo)
  | { kind: "photo"; src: string; alt: string };

export type CardContent = {
  yearLabel: string;
  hero: string;
  kicker: string;
  eventIntro: string[];
  media: CardMedia[];
  omittedVideos: CardVideo[];
  captions: string[];
  stories: CardStory[];
  elderAdvice: { title: string; body: string } | null;
  links: { href: string; title: string; description: string }[];
};

const OPEN_QUOTE = "\u201c";
const CLOSE_QUOTE = "\u201d";
const quoteOpen = /^["\u201c\u00ab]/;

export function isQuotation(value: string) {
  return quoteOpen.test(value.trim());
}

export function formatQuote(value: string) {
  let opening = true;
  const curled = value
    .trim()
    .replace(/[\u00ab\u00bb]/g, (mark) => (mark === "\u00ab" ? OPEN_QUOTE : CLOSE_QUOTE))
    .replace(/"/g, () => {
      const quote = opening ? OPEN_QUOTE : CLOSE_QUOTE;
      opening = !opening;
      return quote;
    });
  if (!curled || curled.startsWith(OPEN_QUOTE) || curled.startsWith(CLOSE_QUOTE)) return curled;
  return `${OPEN_QUOTE}${curled}${CLOSE_QUOTE}`;
}

export function titleWithoutRepeatedYear(date: string, title: string) {
  const label = date.trim();
  const text = title.trim();
  if (!label || !text) return text;
  const leadingYear = label.match(/^\d{3,4}s?/i)?.[0] ?? "";
  const candidates = leadingYear && leadingYear.toLowerCase() !== label.toLowerCase() ? [label, leadingYear] : [label];
  for (const candidate of candidates.sort((left, right) => right.length - left.length)) {
    const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!new RegExp(`^${escaped}(?=$|[\\s\u2022\u00b7:|\u2013\u2014-])`, "i").test(text)) continue;
    const next = text.slice(candidate.length).replace(/^[\s\u2022\u00b7:|\u2013\u2014-]+/, "").trim();
    if (next) return next;
  }
  return text;
}

export function storyPath(stories: readonly StoryRef[], code: string, lang: Locale) {
  const key = canonicalParticipantSlug(code);
  if (!key) return null;
  const matches = stories.filter((story) => story.slug && canonicalParticipantSlug(story.participantCode || story.slug) === key);
  if (!matches.length) return null;
  const match = matches.find((story) => story.slug === key) ?? matches[0];
  return `/${lang}/stories/${match.slug}`;
}

function isElderAdvice(value: string) {
  const title = value.trim().split("\n")[0] ?? "";
  if (!/^\[[^\]]+\]$/.test(title)) return false;
  const label = title.slice(1, -1).toLowerCase();
  return label.includes("advice") || label.includes("consejo") || label.includes("\u5efa\u8bae");
}

function readElderAdvice(value: string) {
  const [titleLine, ...rest] = value.trim().split("\n");
  return {
    title: titleLine.replace(/^\[|\]$/g, ""),
    body: rest.join("\n").trim(),
  };
}

function youtubeEmbed(src: string) {
  try {
    const url = new URL(src);
    if (url.protocol === "https:" && url.hostname === "www.youtube.com" && url.pathname.startsWith("/embed/")) {
      return url.toString();
    }
  } catch {
    return null;
  }
  return null;
}

function usableImage(src: string) {
  if (!src) return false;
  return !/images\.unsplash\.com/i.test(src);
}

export function cardContent(event: TimelineEvent, lang: Locale, stories: readonly StoryRef[] = []): CardContent {
  const people: CardStory[] = [];
  const preface: string[] = [];
  const captions: string[] = [];
  const videos: CardVideo[] = [];
  const photos: { src: string; alt: string }[] = [];
  const links: CardContent["links"] = [];
  let current: CardStory | null = null;
  let elderAdvice: CardContent["elderAdvice"] = null;

  const takeParagraph = (text: string, caption: boolean) => {
    if (!text) return;
    if (caption) {
      captions.push(text);
      return;
    }
    if (!elderAdvice && isElderAdvice(text)) {
      elderAdvice = readElderAdvice(text);
      return;
    }
    if (current) {
      if (!current.quote && isQuotation(text)) current.quote = text;
      else current.body.push(text);
      return;
    }
    preface.push(text);
  };

  for (const block of event.blocks) {
    if (block.type === "participant") {
      if (current) people.push(current);
      const code = normalizeParticipantCode(block.code) || block.code.trim();
      current = {
        code,
        quote: "",
        body: [],
        href: storyPath(stories, block.code, lang),
      };
      if (usableImage(block.avatar)) {
        photos.push({
          src: block.avatar,
          alt: pick(block.imageAlt, lang) || `Portrait of participant ${code}`,
        });
      }
      continue;
    }

    if (block.type === "paragraph") {
      takeParagraph(pick(block.text, lang), (block as TimelineParagraph).emphasis === "caption");
      continue;
    }

    if (block.type === "video") {
      const src = youtubeEmbed(block.src);
      if (src) videos.push({ src, title: block.title });
      continue;
    }

    const title = pick(block.title, lang);
    const description = pick(block.description, lang);
    if (block.href) links.push({ href: block.href, title, description });
    if (usableImage(block.image)) photos.push({ src: block.image, alt: block.imageAlt || title });
  }

  if (current) people.push(current);

  const prefaceQuote = preface.find(isQuotation) ?? "";
  const hero = prefaceQuote || people.find((story) => story.quote)?.quote || "";
  const yearLabel = event.date.trim();
  const title = titleWithoutRepeatedYear(yearLabel, pick(event.title, lang));

  return {
    yearLabel,
    hero,
    kicker: title ? `${yearLabel} \u2022 ${title}` : yearLabel,
    eventIntro: preface.filter((paragraph) => paragraph !== hero),
    media: videos.length
      ? [{ kind: "video", ...videos[0] }]
      : photos[0]
        ? [{ kind: "photo", ...photos[0] }]
        : [],
    omittedVideos: videos.slice(1),
    captions,
    stories: people,
    elderAdvice,
    links,
  };
}
