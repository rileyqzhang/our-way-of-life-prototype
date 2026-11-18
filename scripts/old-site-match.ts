export type Locale = { en?: string | null; es?: string | null; zh?: string | null };
export type SanitySegment = {
  _key: string;
  _type?: string;
  quote?: (Locale & { _type?: string }) | null;
  isQuote?: boolean | null;
  shortTitle?: (Locale & { _type?: string }) | null;
  body?: Record<string, unknown> | null;
  lifeStage?: string | null;
};
export type OldSegment = { order?: number; position?: number; title: string; bodyStart: string; bodyWords: number; bodyText?: string };

export function plain(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(plain).join(" ");
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.text === "string") return record.text;
    return Object.entries(record)
      .filter(([key]) => !key.startsWith("_") && key !== "markDefs" && key !== "style")
      .map(([, item]) => plain(item))
      .join(" ");
  }
  return "";
}

export function squash(text: string) {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

export function words(text: string, count: number) {
  return text.split(/\s+/).filter(Boolean).slice(0, count).join(" ");
}

export function dice(a: string, b: string) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const grams = (text: string) => {
    const map = new Map<string, number>();
    for (let i = 0; i < text.length - 1; i += 1) map.set(text.slice(i, i + 2), (map.get(text.slice(i, i + 2)) || 0) + 1);
    return map;
  };
  const left = grams(a);
  const right = grams(b);
  let shared = 0;
  for (const [gram, count] of left) shared += Math.min(count, right.get(gram) || 0);
  return (2 * shared) / (Math.max(a.length - 1, 0) + Math.max(b.length - 1, 0) || 1);
}

export function coverage(text: string, haystack: string) {
  const chunks: string[] = [];
  for (let i = 0; i + 40 <= text.length; i += 40) chunks.push(text.slice(i, i + 40));
  if (!chunks.length) return text && haystack.includes(text) ? 1 : 0;
  return chunks.filter((chunk) => haystack.includes(chunk)).length / chunks.length;
}

export function codeKey(code: string) {
  return code.toUpperCase().replace(/\d+$/, "");
}

export function sanityText(segment: SanitySegment) {
  return squash(["en", "es", "zh"].map((language) => plain(segment.body?.[language])).join(" "));
}

export function titleOf(segment: SanitySegment) {
  return segment.quote?.en || segment.quote?.es || segment.quote?.zh || "";
}

export function bodyStartOf(segment: SanitySegment) {
  return words(plain(segment.body?.en) || plain(segment.body?.es) || plain(segment.body?.zh), 20);
}

export function score(old: OldSegment, segment: SanitySegment) {
  const oldTitle = squash(old.title);
  const oldBody = squash(old.bodyStart);
  let title = 0;
  let body = 0;
  for (const language of ["en", "es", "zh"] as const) {
    title = Math.max(title, dice(oldTitle, squash(segment.quote?.[language] || "")));
    const sanityBody = squash(words(plain(segment.body?.[language]), 40));
    body = Math.max(body, dice(oldBody, sanityBody.slice(0, oldBody.length)));
  }
  return { title, body, total: title * 0.5 + body * 0.5 };
}

export function verdict(result: { title: number; body: number }) {
  if ((result.title >= 0.85 && result.body >= 0.6) || result.body >= 0.9 || (result.title >= 0.95 && result.body >= 0.3)) return "match";
  if (result.title >= 0.5 || result.body >= 0.5) return "uncertain";
  return "none";
}
