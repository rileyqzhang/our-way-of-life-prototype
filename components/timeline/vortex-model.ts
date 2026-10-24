import { pick } from "@/lib/content/text";
import type { Locale } from "@/lib/i18n";
import type { TimelineEvent } from "@/lib/timeline/types";

export const VORTEX_MAX_Z = 1350;
export const VORTEX_CAMERA_TRAVEL = 1100;

export type VortexQuote = {
  code: string;
  tag: string;
  quote: string;
  href: string;
  external: boolean;
  avatar: string;
  alt: string;
};

export type VortexLink = {
  href: string;
  image: string;
  imageAlt: string;
  title: string;
  description: string;
  domain: string;
};

export type VortexNode = {
  id: string;
  date: string;
  label: string;
  headline: string;
  excerpt: string;
  paragraphs: { text: string; caption: boolean }[];
  quotes: VortexQuote[];
  photoUrl: string;
  photoAlt: string;
  links: VortexLink[];
  videos: { src: string; title: string }[];
  spiralParam: number;
  isCore: boolean;
  isTerminal: boolean;
  isOngoing: boolean;
};

export function plainText(value: string) {
  return value
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function excerpt(value: string, limit = 180) {
  const text = plainText(value);
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trimEnd()}…`;
}

export function scrollProgressFor(spiralParam: number) {
  const target = (1 - spiralParam) * VORTEX_MAX_Z - 180;
  return Math.max(0, Math.min(1, target / VORTEX_CAMERA_TRAVEL));
}

export function toVortexNodes(events: TimelineEvent[], lang: Locale): VortexNode[] {
  const last = Math.max(events.length - 1, 1);
  return events.map((event, index) => {
    const headline = pick(event.title, lang);
    const paragraphs: VortexNode["paragraphs"] = [];
    const quotes: VortexQuote[] = [];
    const links: VortexLink[] = [];
    const videos: VortexNode["videos"] = [];
    let photoUrl = "";
    let photoAlt = headline;
    let current: VortexQuote | null = null;

    for (const block of event.blocks) {
      if (block.type === "participant") {
        const href = block.slug ? `/${lang}/stories/${block.slug}` : block.href;
        const alt = pick(block.imageAlt, lang) || `Portrait of participant ${block.code}`;
        current = {
          code: block.code,
          tag: pick(block.title, lang) || block.code,
          quote: "",
          href,
          external: href.startsWith("http"),
          avatar: block.avatar,
          alt,
        };
        quotes.push(current);
        if (!photoUrl && block.avatar) {
          photoUrl = block.avatar;
          photoAlt = alt;
        }
        continue;
      }

      if (block.type === "paragraph") {
        const text = pick(block.text, lang);
        paragraphs.push({ text, caption: block.emphasis === "caption" });
        if (block.emphasis === "caption") continue;
        if (current && !current.quote) current.quote = plainText(text);
        continue;
      }

      if (block.type === "video") {
        videos.push({ src: block.src, title: block.title });
        continue;
      }

      const title = pick(block.title, lang);
      links.push({
        href: block.href,
        image: block.image,
        imageAlt: block.imageAlt || title,
        title,
        description: pick(block.description, lang),
        domain: block.domain,
      });
      if (!photoUrl && block.image) {
        photoUrl = block.image;
        photoAlt = block.imageAlt || title;
      }
    }

    const lead = quotes.find((quote) => quote.quote)?.quote || paragraphs.find((item) => !item.caption)?.text || headline;
    const ongoing = /^ongoing$/i.test(event.date.trim());

    return {
      id: event.id,
      date: event.date,
      label: ongoing ? event.date.toUpperCase() : event.date,
      headline,
      excerpt: excerpt(lead),
      paragraphs,
      quotes,
      photoUrl,
      photoAlt,
      links,
      videos,
      spiralParam: events.length === 1 ? 0.5 : index / last,
      isCore: index === 0,
      isTerminal: index === events.length - 1,
      isOngoing: ongoing,
    };
  });
}
