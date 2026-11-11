import type { Locale } from "@/lib/i18n";
import type { LocalizedText } from "@/lib/timeline/types";

export function pick(value: LocalizedText | undefined, lang: Locale) {
  if (!value) return "";
  return value[lang] || value.en || value.es || value.zh || "";
}

export function pickRich<T>(value: { en?: T[] | null; es?: T[] | null; zh?: T[] | null } | null | undefined, lang: Locale) {
  if (!value) return [] as T[];
  return [value[lang], value.en, value.es, value.zh].find((items) => items && items.length) || [];
}

const CLOSERS: Record<string, string> = { "“": "”", "«": "»", '"': '"' };

export function openingQuotation(value: LocalizedText | undefined, lang: Locale) {
  const first = pick(value, lang)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .find(Boolean);
  const opener = first?.[0];
  const closer = opener ? CLOSERS[opener] : undefined;
  if (!first || !closer) return "";
  const end = first.indexOf(closer, 1);
  if (end <= 1) return "";
  return first.slice(0, end + 1);
}
