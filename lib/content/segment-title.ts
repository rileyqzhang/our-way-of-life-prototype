const TIMELINE_TITLE_WORDS = 8;

export function truncateAtWordBoundary(text: string, maxWords = TIMELINE_TITLE_WORDS) {
  const normalized = text.trim();
  if (!normalized || maxWords < 1) return "";
  const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
  let words = 0;
  let end = 0;
  for (const part of segmenter.segment(normalized)) {
    if (!part.isWordLike) continue;
    words += 1;
    end = part.index + part.segment.length;
    if (words === maxWords) break;
  }
  if (words < maxWords || end >= normalized.length) return normalized;
  return `${normalized.slice(0, end).trimEnd()}…`;
}

const QUOTATION_MARK = /["“”«»„‟]/;
const WRAPPED_SINGLE_QUOTE = /^[‘’].+[‘’]$/;

export function titleHasQuotationMarks(title: string) {
  const text = title.trim();
  return QUOTATION_MARK.test(text) || WRAPPED_SINGLE_QUOTE.test(text);
}

export function formatSegmentTitle(title: string) {
  let text = title.trim();
  if (text.endsWith(".") && !text.endsWith("...")) text = text.slice(0, -1).trimEnd();
  const chars = [...text];
  const index = chars.findIndex((char) => /\p{L}/u.test(char));
  if (index >= 0) chars[index] = chars[index].toLocaleUpperCase();
  return chars.join("");
}

export function segmentTimelineTitle(shortTitle: string | null | undefined, quote: string | null | undefined) {
  const custom = shortTitle?.trim();
  if (custom) return formatSegmentTitle(custom);
  return truncateAtWordBoundary(formatSegmentTitle(quote ?? ""));
}
