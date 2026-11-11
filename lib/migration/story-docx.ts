export type PortableSpan = {
  _type: "span";
  _key: string;
  text: string;
  marks: string[];
};

export type PortableBlock = {
  _type: "block";
  _key: string;
  style: "normal";
  markDefs: [];
  children: PortableSpan[];
};

export type { StoryLifeStage } from "@/lib/migration/life-stage-groups";
import { isOtherGroupHeading, lifeStageForGroup as stageForGroup, normalizeGroupText } from "@/lib/migration/life-stage-groups";
import type { StoryLifeStage } from "@/lib/migration/life-stage-groups";

export function lifeStageForGroup(group: string): StoryLifeStage {
  return stageForGroup(group);
}

export type NoteEdit = {
  where: string;
  before: string;
  after: string;
};

export type InterviewEdit = {
  kind: "deleted-prompt" | "kept-prompt" | "generated-title" | "split-heading";
  where: string;
  before: string;
  after: string;
  reason: string;
};

export type HighlightPhrase = {
  where: string;
  text: string;
};

export type StorySegmentPlan = {
  index: number;
  group: string;
  lifeStage: StoryLifeStage;
  title: string;
  isQuote: boolean;
  words: number;
  body: PortableBlock[];
};

export type OutsideParagraph = {
  text: string;
};

export type StoryImportPlan = {
  headline: string;
  overviewText: string;
  overviewPreview: string;
  overview: PortableBlock[];
  segments: StorySegmentPlan[];
  noteEdits: NoteEdit[];
  highlights: HighlightPhrase[];
  warnings: string[];
  unsplit: boolean;
  outside: OutsideParagraph[];
  unmatchedGroups: string[];
  edits: InterviewEdit[];
};

const STORY_HEADING = /^(?:story|historia)\s*(\d+)\s*[:：.．]\s*([\s\S]*)$/i;
const CHINESE_STORY = /^故事\s*([0-9０-９一二三四五六七八九十]+)\s*[:：.．、]?\s*([\s\S]*)$/;
const ELICITATION = /^(?:[a-z]{2,8}\d*\s+)?elicitation\b/i;
const KEPT_SUBHEADINGS = ["reflexiones y consejos", "cambios en la participacion a traves del tiempo"];
const HEARING_MARK = String.raw`\[\s*(?:unintelligible|inaudible|ininteligible)(?:\s+\d{1,2}:\d{2}:\d{2})?\s*\]`;
const CLARIFY_MARK = String.raw`(?:\[\s*)?(?:FOR|ASK)\s+[A-Z0-9]+\s+TO\s+CLARIFY(?:\s*\])?(?:\s*\.)?`;
const EDITORIAL_NOTE = new RegExp(`${HEARING_MARK}|${CLARIFY_MARK}`, "gi");

export function publishBlockers(text: string) {
  const found: string[] = [];
  if (/CLARIFY/i.test(text)) found.push("CLARIFY");
  if (/unintelligible|inaudible|ininteligible/i.test(text)) found.push("hearing mark");
  if (/\b\d{1,2}:\d{2}:\d{2}\b/.test(text) || /\[\s*\d{1,2}:\d{2}/.test(text)) found.push("timecode");
  for (const paragraph of text.split(/\n+/)) {
    if (isStandalonePrompt(paragraph)) found.push("interview prompt");
  }
  return [...new Set(found)];
}

export function cleanEditorialText(text: string) {
  const next = text
    .replace(new RegExp(HEARING_MARK, "gi"), "[…]")
    .replace(new RegExp(CLARIFY_MARK, "gi"), "")
    .replace(/\[\s*\]/g, "");
  return next.replace(/[ ]{2,}/g, " ").replace(/[ ]+([,.;:!?])/g, "$1");
}

export function editorialChanges(where: string, text: string): NoteEdit[] {
  const changes: NoteEdit[] = [];
  for (const match of text.matchAll(EDITORIAL_NOTE)) {
    const before = match[0];
    const after = /^\s*\[\s*(?:unintelligible|inaudible|ininteligible)\b/i.test(before) ? "[…]" : "";
    changes.push({ where, before, after });
  }
  return changes;
}

export function wordCount(text: string) {
  return text.trim().match(/\S+/g)?.length ?? 0;
}

function decode(text: string) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/\u00a0/g, " ");
}

function plain(spans: { text: string }[]) {
  return decode(spans.map((span) => span.text).join(""))
    .replace(/\s+/g, " ")
    .trim();
}

function blockText(block: PortableBlock) {
  return plain(block.children);
}

export function paragraphsFromHtml(html: string) {
  return [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((match) => match[1]);
}

function highlightPhrases(inner: string) {
  const phrases: string[] = [];
  let current = "";
  let inMark = 0;
  let pendingSpace = false;
  const source = inner.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, "");
  for (const match of source.matchAll(/<\/?([a-zA-Z0-9]+)(?:\s[^>]*)?>|([^<]+)/g)) {
    if (match[1]) {
      if (match[1].toLowerCase() !== "mark") continue;
      if (match[0].startsWith("</")) inMark = Math.max(0, inMark - 1);
      else inMark += 1;
      continue;
    }
    const text = decode(match[2] || "");
    if (inMark) {
      if (pendingSpace && current && !current.endsWith(" ") && !text.startsWith(" ")) current += " ";
      pendingSpace = false;
      current += text;
      continue;
    }
    if (!current) continue;
    if (/^\s*$/.test(text)) {
      pendingSpace = true;
      continue;
    }
    const phrase = current.replace(/\s+/g, " ").trim();
    if (phrase) phrases.push(phrase);
    current = "";
    pendingSpace = false;
  }
  const phrase = current.replace(/\s+/g, " ").trim();
  if (phrase) phrases.push(phrase);
  return phrases;
}

function tidySpans(spans: { text: string; marks: Array<"strong" | "em"> }[]) {
  const merged: { text: string; marks: Array<"strong" | "em"> }[] = [];
  for (const span of spans) {
    const text = cleanEditorialText(span.text);
    if (!text) continue;
    const previous = merged[merged.length - 1];
    if (previous && previous.marks.join() === span.marks.join()) previous.text += text;
    else merged.push({ text, marks: [...span.marks] });
  }
  const kept = merged.filter((span) => /[^\s\[\]]/.test(span.text) || !/[\[\]]/.test(span.text));
  for (const span of kept) span.text = cleanEditorialText(span.text);
  for (let index = 0; index < kept.length; index += 1) {
    kept[index].text = kept[index].text.replace(/[ ]{2,}/g, " ");
    if (index > 0 && /^[ ]*[,.;:!?]/.test(kept[index].text)) {
      kept[index - 1].text = kept[index - 1].text.replace(/[ ]+$/, "");
      kept[index].text = kept[index].text.replace(/^[ ]+/, "");
    }
    if (index > 0 && kept[index - 1].text.endsWith(" ") && kept[index].text.startsWith(" ")) {
      kept[index].text = kept[index].text.replace(/^ +/, "");
    }
  }
  return kept.filter((span) => span.text);
}

function spansFromHtml(inner: string) {
  const source = inner.replace(/<br\s*\/?>/gi, " ").replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, "");
  const spans: { text: string; marks: Array<"strong" | "em"> }[] = [];
  const stack: Array<"strong" | "em"> = [];
  for (const match of source.matchAll(/<\/?([a-zA-Z0-9]+)(?:\s[^>]*)?>|([^<]+)/g)) {
    if (match[2]) {
      const text = decode(match[2]).replace(/\s+/g, " ");
      if (text) spans.push({ text, marks: [...stack] });
      continue;
    }
    const tag = match[1].toLowerCase();
    const mark = tag === "strong" || tag === "b" ? "strong" : tag === "em" || tag === "i" ? "em" : null;
    if (!mark) continue;
    if (match[0].startsWith("</")) {
      const index = stack.lastIndexOf(mark);
      if (index >= 0) stack.splice(index, 1);
    } else if (stack[stack.length - 1] !== mark) {
      stack.push(mark);
    }
  }
  const merged: { text: string; marks: Array<"strong" | "em"> }[] = [];
  for (const span of spans) {
    const previous = merged[merged.length - 1];
    if (previous && previous.marks.join() === span.marks.join()) previous.text += span.text;
    else merged.push(span);
  }
  return merged;
}

function boldRatio(spans: { text: string; marks: string[] }[]) {
  const total = plain(spans).length;
  if (!total) return 0;
  const bold = spans
    .filter((span) => span.marks.includes("strong"))
    .reduce((sum, span) => sum + span.text.trim().length, 0);
  return bold / total;
}

function isFullHighlight(inner: string) {
  const stripped = inner.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, "").trim();
  return /^<mark\b[^>]*>[\s\S]*<\/mark>$/i.test(stripped);
}

export function repairHeadingText(text: string) {
  return text.replace(/^(\p{Lu})\s+(?=\p{Ll})/u, "$1");
}

const WRAPPED_QUOTE = /^["“«„‟]\s*[\s\S]+\s*["”»]$/;

function cleanTitle(text: string) {
  return text
    .trim()
    .replace(/^["“«„‟]\s*/, "")
    .replace(/\s*["”»]$/, "")
    .trim();
}

export function storyTitle(text: string) {
  const repaired = repairHeadingText(text).trim();
  const match = repaired.match(STORY_HEADING) || repaired.match(CHINESE_STORY);
  if (!match) return null;
  const raw = (match[2] || "").trim();
  return { title: cleanTitle(raw), isQuote: WRAPPED_QUOTE.test(raw) };
}

function isDiscardLabel(text: string) {
  return /^[a-z]{2,8}\d+$/i.test(text.trim()) || /^照片\s*\d+$/u.test(text.trim());
}

function isNarrativeHeading(text: string) {
  const value = text.trim();
  return value.length <= 80 && /^(?:[a-z]{2,8}\d*\s+)?narrative\b/i.test(value);
}

function isKeptSubheading(text: string) {
  const name = normalizeGroupText(text);
  return KEPT_SUBHEADINGS.some((title) => name === title || name.startsWith(`${title} `));
}

function stripGluedQuestion(text: string) {
  const match = text.match(/^(.*?)(\s+(?:¿)?(?:alguna|algo que|c[oó]mo|qu[eé]\s|what\s|how\s|why\s|anything\s|did you|do you|would you).+)$/i);
  if (!match?.[1] || !match[2] || !/[?？]/.test(match[2])) return text;
  const heading = match[1].trim();
  if (heading.length < 8 || (!lifeStageForGroup(heading) && !isOtherGroupHeading(heading))) return text;
  return heading;
}

function splitHeadingQuote(text: string) {
  const match = text.match(/^(.*?)(?:\s*[“"«]([^”"»]+)[”"»])\s*$/);
  const heading = match?.[1]?.trim() || "";
  const quote = match?.[2]?.trim() || "";
  if (!heading || !quote || heading.length < 8) return null;
  if (!lifeStageForGroup(heading) && !isOtherGroupHeading(heading)) return null;
  return { heading, quote };
}

const STANDALONE_PROMPT = /^(?:¿\s*)?(?:anything (?:more you would|you would) like to add\b|por qu[eé] participa\b|c[oó]mo se siente\b|me puede decir\b|qu[eé] apoyos usted cree\b|qu[eé] consejo usted le dar[ií]a\b|algo que quiera agregar\b)[\s\S]*[?？]\s*$/i;

export function isStandalonePrompt(text: string) {
  const value = text.replace(/\s+/g, " ").trim();
  return value.length > 0 && value.length <= 280 && STANDALONE_PROMPT.test(value);
}

function mixedPromptResidue(text: string) {
  const match = text.match(/(¿\s*quiere elaborar sobre esto\??)\s*$/i);
  if (!match || match.index === undefined) return null;
  const residue = text.slice(0, match.index).trim();
  if (!residue) return null;
  return { residue, prompt: match[1].trim() };
}

function isGeneratedTitle(title: string) {
  const name = normalizeGroupText(title);
  return name === "algo que anadir" || name.startsWith("algo que anadir ");
}

function firstSentence(text: string) {
  const value = text.replace(/\s+/g, " ").trim();
  const match = value.match(/^([\s\S]+?[.!?])(?:\s|$)|([\s\S]+?[。！？])/);
  return (match?.[1] || match?.[2] || value).trim();
}

function hanCount(text: string) {
  return text.match(/\p{Script=Han}/gu)?.length ?? 0;
}

export function titleFromFirstSentence(text: string) {
  const sentence = firstSentence(text);
  const words = sentence.match(/\S+/g) || [];
  if (hanCount(sentence) >= 8 && words.length <= 2) {
    if (hanCount(sentence) <= 36) return sentence;
    const chars = [...sentence];
    let count = 0;
    let end = 0;
    for (let index = 0; index < chars.length; index += 1) {
      if (/\p{Script=Han}/u.test(chars[index])) count += 1;
      if (count > 36) break;
      end = index + 1;
    }
    const clipped = chars.slice(0, end).join("").replace(/[，,、\s]+$/, "").trim();
    return `${clipped}…`;
  }
  if (words.length <= 12) return sentence;
  return `${words.slice(0, 12).join(" ").replace(/[,，]\s*$/, "")}…`;
}

export function isQuietEmptyHeading(title: string) {
  return isStandalonePrompt(title) || isGeneratedTitle(title);
}

const PLACEHOLDER_TEXT = /^(?:n\/a|n\.a\.|ninguno|ninguna|无|無)[.。]?$/i;

export function isPlaceholderText(text: string) {
  return PLACEHOLDER_TEXT.test(text.replace(/\s+/g, " ").trim());
}

function sentenceCount(text: string) {
  return text.split(/[.!?。！？]+/).map((part) => part.trim()).filter(Boolean).length;
}

export function titleIsProse(text: string) {
  const value = text.replace(/\s+/g, " ").trim();
  return wordCount(value) > 25 || sentenceCount(value) > 1;
}

export function headingFromLeadingBlock(first: string, next: string) {
  const opening = first.replace(/\s+/g, " ").trim();
  const following = next.replace(/\s+/g, " ").trim();
  if (!opening || isPlaceholderText(opening) || !following) return "";
  const labeled = opening.match(/^(?:故事|Historia|Story)\s*[:：]\s*(.*)$/i);
  if (labeled) {
    const title = labeled[1].replace(/[:：]\s*$/, "").trim();
    return title && !titleIsProse(title) ? title : "";
  }
  const colon = opening.match(/^(.{2,40})[:：]\s*$/);
  if (colon) return colon[1].trim();
  if (/[.!?。！？]/.test(opening) || titleIsProse(opening) || isGroupHeading(opening) || isKeptSubheading(opening)) return "";
  const han = hanCount(opening);
  const words = wordCount(opening);
  const short = (han >= 4 && han <= 30 && words <= 4) || (words >= 2 && words <= 12 && han === 0);
  if (!short || following.length < opening.length + 40) return "";
  return opening;
}

function blockFromPlain(text: string): PortableBlock {
  return {
    _type: "block",
    _key: nextKey("block"),
    style: "normal",
    markDefs: [],
    children: [{ _type: "span", _key: nextKey("span"), text, marks: [] }],
  };
}

function repairStoredShape(segments: StorySegmentPlan[], edits: InterviewEdit[]) {
  for (const segment of segments) {
    const placeholders = segment.body.filter((block) => isPlaceholderText(blockText(block)));
    if (placeholders.length) {
      segment.body = segment.body.filter((block) => !isPlaceholderText(blockText(block)));
      edits.push({
        kind: "split-heading",
        where: segmentLabel(segment),
        before: placeholders.map(blockText).join(" "),
        after: "",
        reason: "正文只有占位词，不生成段落",
      });
    }
    if (!segment.title.trim() && segment.body.length > 1) {
      const first = blockText(segment.body[0]);
      const next = segment.body.slice(1).map(blockText).join(" ");
      const heading = headingFromLeadingBlock(first, next);
      if (heading) {
        edits.push({
          kind: "split-heading",
          where: segmentLabel(segment),
          before: first,
          after: heading,
          reason: "短标题和正文粘在一起，已拆开",
        });
        segment.title = heading;
        segment.isQuote = false;
        segment.body.shift();
      }
    }
    if (segment.title.trim() && !segment.body.length && titleIsProse(segment.title)) {
      const prose = segment.title;
      const title = titleFromFirstSentence(prose);
      edits.push({
        kind: "generated-title",
        where: segmentLabel(segment),
        before: prose,
        after: title,
        reason: "标题由脚本生成，需人工检查",
      });
      segment.body = [blockFromPlain(prose)];
      segment.title = title;
      segment.isQuote = false;
    }
  }
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index];
    if (segment.body.length) continue;
    if (segment.title.trim() && !isPlaceholderText(segment.title)) continue;
    segments.splice(index, 1);
  }
  segments.forEach((segment, index) => {
    segment.index = index + 1;
  });
}

function stripLabels(text: string) {
  return text
    .replace(/\ba good quote\b/gi, "")
    .replace(/^\s*summary\s*[:：]?\s*/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function quotedSentence(text: string) {
  const match = text.match(/[“"«]([\s\S]{8,}?)[”"»]/);
  if (!match) return "";
  return `${text.match(/[“"«]/)?.[0] || "“"}${match[1].trim()}${text.includes("”") ? "”" : text.includes("»") ? "»" : "”"}`;
}

function isElicitationHeading(text: string) {
  const repaired = repairHeadingText(text).trim();
  if (!repaired || repaired.length > 200) return false;
  if (ELICITATION.test(repaired)) return true;
  return /^(?:descripcion de arte|ejercicio creativo|fotografias)\b/.test(normalizeGroupText(repaired));
}

function isGroupHeading(text: string) {
  const repaired = repairHeadingText(text).trim();
  if (!repaired || repaired.length > 180 || storyTitle(repaired)) return false;
  return Boolean(lifeStageForGroup(repaired)) || isOtherGroupHeading(repaired);
}

function isSubheading(text: string, bold: boolean) {
  const value = text.trim();
  if (value.length < 4 || value.length > 90 || /[.!?。！？]$/.test(value) || /^[“"«]/.test(value)) return false;
  if (!bold && !/^[\p{Lu}\p{Script=Han}¿¡]/u.test(value)) return false;
  return bold || value.split(/\s+/).length <= 14;
}

let keyCount = 0;
function nextKey(seed: string) {
  keyCount += 1;
  return `${seed}-${keyCount}`;
}

function withoutLabels(spans: { text: string; marks: Array<"strong" | "em"> }[]) {
  const combined = spans.map((span) => span.text).join("");
  const match = combined.match(/^\s*summary\s*[:：]?\s*/i);
  let next = spans;
  if (match) {
    let drop = match[0].length;
    next = [];
    for (const span of spans) {
      if (drop <= 0) {
        next.push(span);
        continue;
      }
      if (span.text.length <= drop) {
        drop -= span.text.length;
        continue;
      }
      next.push({ ...span, text: span.text.slice(drop) });
      drop = 0;
    }
  }
  return next
    .map((span) => ({ ...span, text: span.text.replace(/\s*\ba good quote\b\s*/gi, " ") }))
    .filter((span) => span.text);
}

function toBlock(inner: string): PortableBlock | null {
  const children = tidySpans(withoutLabels(spansFromHtml(inner)))
    .filter((span) => span.text)
    .map((span) => ({
      _type: "span" as const,
      _key: nextKey("span"),
      text: span.text,
      marks: [...span.marks],
    }));
  if (!plain(children)) return null;
  return { _type: "block", _key: nextKey("block"), style: "normal", markDefs: [], children };
}

type ParsedParagraph = {
  inner: string;
  text: string;
  repaired: string;
  bold: boolean;
  highlighted: boolean;
  kind: "elicitation" | "narrative" | "group" | "story" | "content";
  title: string;
  isQuote?: boolean;
  unmatched?: boolean;
};

function looksLikeSectionDivider(text: string) {
  const value = text.trim();
  if (value.length < 3 || value.length > 140 || /^n\/a$/i.test(value)) return false;
  if (/[.!?。！？;；]$/.test(value) || /[，,]/.test(value) || /^[“"«]/.test(value) || storyTitle(value)) return false;
  return value.split(/\s+/).length <= 18;
}

function isSectionHeading(text: string) {
  const normalized = normalizeGroupText(text);
  return /^(?:stories of|what is civic|cultural differences|the cost of|meaning of being able|significado de|diferencias en culturas|como la identidad|el costo de|historias de|early childhood|adolescen|la ninez|mi ninez|later life|adulthood)/.test(normalized);
}

function markUnrecognizedGroups(items: ParsedParagraph[]) {
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (item.kind !== "content" || isKeptSubheading(item.text) || !looksLikeSectionDivider(item.text)) continue;
    const beforeNumberedStory = items[index + 1]?.kind === "story";
    if (!beforeNumberedStory && !isSectionHeading(item.repaired)) continue;
    item.kind = "group";
    item.unmatched = !lifeStageForGroup(item.repaired) && !isOtherGroupHeading(item.repaired);
  }
}

function parsedParagraph(inner: string): ParsedParagraph | null {
  const spans = spansFromHtml(inner);
  const stripped = stripLabels(plain(spans));
  if (!stripped || isDiscardLabel(stripped)) return null;
  const repaired = repairHeadingText(stripped).trim();
  const bold = boldRatio(spans) >= 0.6;
  const highlighted = isFullHighlight(inner);
  if (isNarrativeHeading(repaired)) return { inner, text: stripped, repaired, bold, highlighted, kind: "narrative", title: "" };
  const story = storyTitle(repaired);
  if (story) return { inner, text: stripped, repaired, bold, highlighted, kind: "story", title: story.title, isQuote: story.isQuote };
  if (isElicitationHeading(repaired)) return { inner, text: stripped, repaired, bold: false, highlighted, kind: "elicitation", title: "" };
  const groupText = stripGluedQuestion(repaired);
  if (isGroupHeading(groupText)) return { inner, text: groupText, repaired: groupText, bold: false, highlighted, kind: "group", title: "" };
  return { inner, text: stripped, repaired, bold: boldRatio(spans) >= 0.6, highlighted: isFullHighlight(inner), kind: "content", title: "" };
}

function splitGluedHeading(item: ParsedParagraph): ParsedParagraph[] {
  const embedded = item.repaired.match(/^(.*?)(\s*(?:story|historia)\s*\d+\s*[:：.．][\s\S]*)$/i);
  if (!embedded) return [item];
  const group = embedded[1].trim();
  const storyText = embedded[2].trim();
  const story = storyTitle(storyText);
  if (!group || !story || !isGroupHeading(group)) return [item];
  return [
    { ...item, text: group, repaired: group, kind: "group", title: "" },
    { ...item, text: storyText, repaired: storyText, kind: "story", title: story.title, isQuote: story.isQuote },
  ];
}

function classifyParagraphs(html: string) {
  const items = paragraphsFromHtml(html).flatMap((inner) => {
    const item = parsedParagraph(inner);
    return item ? splitGluedHeading(item) : [];
  });
  const hasNumberedStory = items.some((item) => item.kind === "story");
  if (hasNumberedStory) markUnrecognizedGroups(items);
  for (const item of items) {
    if (item.kind === "content" && isKeptSubheading(item.text)) {
      item.kind = "story";
      item.title = item.text;
    }
  }
  if (hasNumberedStory) return items;
  const firstHeading = items.findIndex((item) => item.kind !== "content");
  items.forEach((item, index) => {
    if (item.kind !== "content") return;
    if (firstHeading >= 0 && index < firstHeading) return;
    const next = items.slice(index + 1).find((candidate) => candidate.kind === "content");
    if (!isSubheading(item.text, item.bold) || !next || next.text.length < item.text.length + 40) return;
    item.kind = "story";
    item.title = item.text;
  });
  return items;
}

export type StoryOutlineEntry = {
  kind: "group" | "story" | "elicitation" | "unclassified";
  title: string;
  stage: string;
  unmatched: boolean;
  following: string;
};

export function storyOutline(html: string): StoryOutlineEntry[] {
  const items = classifyParagraphs(html);
  const entries: StoryOutlineEntry[] = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const unclassified = item.kind === "content" && looksLikeSectionDivider(item.text);
    if (item.kind !== "group" && item.kind !== "story" && item.kind !== "elicitation" && !unclassified) continue;
    const following = items.slice(index + 1).find((candidate) => candidate.kind === "content" && !looksLikeSectionDivider(candidate.text));
    const kind: StoryOutlineEntry["kind"] = unclassified
      ? "unclassified"
      : item.kind === "group" || item.kind === "story" || item.kind === "elicitation"
        ? item.kind
        : "unclassified";
    entries.push({
      kind,
      title: item.kind === "story" ? item.title || item.text : item.text,
      stage: item.kind === "group" ? lifeStageForGroup(item.repaired) : "",
      unmatched: Boolean(item.unmatched),
      following: following?.text || "",
    });
  }
  return entries;
}

export function stripParticipantCodeSuffix(text: string, code: string) {
  const canonical = code.trim().toUpperCase();
  if (!canonical) return text;
  return text.replace(new RegExp(`\\b${canonical}\\d+\\b`, "gi"), canonical);
}

export function applyParticipantCode(plan: StoryImportPlan, code: string): StoryImportPlan {
  const headline = stripParticipantCodeSuffix(plan.headline, code);
  const overview = plan.overview.map((block) => ({
    ...block,
    children: block.children.map((child) => ({ ...child, text: stripParticipantCodeSuffix(child.text, code) })),
  }));
  const overviewText = overview.map(blockText).join(" ");
  return { ...plan, headline, overview, overviewText, overviewPreview: overviewText.slice(0, 80) };
}

export function parseStoryHtml(html: string): StoryImportPlan {
  keyCount = 0;
  const warnings: string[] = [];
  const noteEdits: NoteEdit[] = [];
  const highlights: HighlightPhrase[] = [];
  const overview: PortableBlock[] = [];
  const segments: StorySegmentPlan[] = [];
  const outside: OutsideParagraph[] = [];
  const unmatchedGroups: string[] = [];
  const edits: InterviewEdit[] = [];
  let headline = "";
  let unsplit = false;
  const items = classifyParagraphs(html);
  let phase: "opening" | "skip" | "body" = "opening";
  let group = "";
  let leadTitle = "";
  let leadBefore = "";
  let current: StorySegmentPlan | null = null;
  let pending: PortableBlock[] = [];
  let pendingText: string[] = [];

  function placePending(segment: StorySegmentPlan) {
    if (!pending.length) return;
    segment.body = [...pending, ...segment.body];
    pending = [];
    pendingText = [];
  }

  function consumeLeadTitle(title: string) {
    if (!leadTitle) return title;
    const quote = leadTitle;
    const before = leadBefore;
    leadTitle = "";
    leadBefore = "";
    if (title.trim()) return title;
    edits.push({
      kind: "split-heading",
      where: `segment ${segments.length + 1}`,
      before,
      after: quote,
      reason: "分组标题里的引语改成这一组第一段的标题",
    });
    return quote;
  }

  function keepOutside() {
    if (!pending.length) return;
    const fromLead = Boolean(leadTitle);
    const segment: StorySegmentPlan = {
      index: segments.length + 1,
      group: group || "(no group)",
      lifeStage: lifeStageForGroup(group),
      title: consumeLeadTitle(""),
      isQuote: fromLead,
      words: 0,
      body: pending,
    };
    segments.push(segment);
    for (const text of pendingText) outside.push({ text });
    pending = [];
    pendingText = [];
    current = null;
  }

  function beginStory(title: string, quoted = false) {
    phase = "body";
    const where = `segment ${segments.length + 1}`;
    noteEdits.push(...editorialChanges(where, title));
    const cleaned = cleanEditorialText(title);
    const fromLead = Boolean(leadTitle) && !cleaned.trim();
    current = {
      index: segments.length + 1,
      group: group || "(no group)",
      lifeStage: lifeStageForGroup(group),
      title: consumeLeadTitle(cleaned),
      isQuote: fromLead || quoted,
      words: 0,
      body: [],
    };
    placePending(current);
    segments.push(current);
  }

  function addContent(item: ParsedParagraph) {
    const block = toBlock(item.inner);
    if (!block) return;
    const where = phase === "opening" ? "overview" : current ? `segment ${current.index}` : "outside";
    noteEdits.push(...editorialChanges(where, item.text));
    if (!item.highlighted) {
      for (const phrase of highlightPhrases(item.inner)) highlights.push({ where, text: phrase });
    }
    if (phase === "opening") {
      overview.push(block);
      return;
    }
    if (current) {
      current.body.push(block);
      return;
    }
    pending.push(block);
    pendingText.push(item.text);
  }

  for (const item of items) {
    if (item.kind === "narrative") {
      if (phase === "skip") phase = segments.length || current ? "body" : "opening";
      continue;
    }
    if (item.kind === "elicitation") {
      if (current) current = null;
      else keepOutside();
      phase = "skip";
      continue;
    }
    if (item.kind === "group") {
      if (current) current = null;
      else keepOutside();
      phase = "body";
      const split = splitHeadingQuote(item.repaired);
      group = split?.heading || item.repaired;
      leadTitle = split?.quote || "";
      leadBefore = split ? item.text : "";
      if (item.unmatched) unmatchedGroups.push(item.text);
      continue;
    }
    if (item.kind === "story") {
      if (phase === "skip") continue;
      beginStory(item.title, item.isQuote === true);
      continue;
    }
    if (phase === "skip") continue;
    if (phase === "opening") {
      const quote = quotedSentence(item.text);
      if (!headline && (item.bold || (quote && quote.length > item.text.length * 0.55))) {
        noteEdits.push(...editorialChanges("headline", item.text));
        headline = cleanEditorialText(item.bold ? item.text : quote);
        continue;
      }
    }
    addContent(item);
  }

  if (!current) keepOutside();
  if (!segments.length && (overview.length || headline)) {
    const body = overview.splice(0, overview.length);
    const [first, ...rest] = body;
    if (first && rest.length) overview.push(first);
    segments.push({
      index: 1,
      group: "(whole story)",
      lifeStage: "",
      title: "",
      isQuote: false,
      words: 0,
      body: rest.length ? rest : body,
    });
    unsplit = true;
  }
  if (!headline) {
    for (const block of overview) {
      const quote = quotedSentence(blockText(block));
      if (!quote) continue;
      headline = cleanEditorialText(quote);
      break;
    }
  }
  for (const segment of segments) segment.words = wordCount(segment.body.map(blockText).join(" "));
  cleanInterviewPrompts(segments, outside, edits);
  repairStoredShape(segments, edits);
  for (const segment of segments) segment.words = wordCount(segment.body.map(blockText).join(" "));
  const overviewText = overview.map(blockText).join(" ");
  if (!headline) warnings.push("No headline quotation was found.");
  return {
    headline,
    overviewText,
    overviewPreview: overviewText.slice(0, 80),
    overview,
    segments,
    noteEdits,
    highlights,
    warnings,
    unsplit,
    outside,
    unmatchedGroups,
    edits,
  };
}

function segmentLabel(segment: StorySegmentPlan) {
  return `segment ${segment.index}${segment.title ? `: ${segment.title}` : ""}`;
}

function cleanInterviewPrompts(segments: StorySegmentPlan[], outside: OutsideParagraph[], edits: InterviewEdit[]) {
  const slots: { segment: StorySegmentPlan; blockIndex: number; text: string }[] = [];
  for (const segment of segments) {
    segment.body.forEach((block, blockIndex) => slots.push({ segment, blockIndex, text: blockText(block) }));
  }
  const drop = new Set<string>();
  for (let index = 0; index < slots.length; index += 1) {
    const slot = slots[index];
    const mixed = mixedPromptResidue(slot.text);
    if (mixed) {
      if (wordCount(mixed.residue) < 15) {
        edits.push({
          kind: "kept-prompt",
          where: segmentLabel(slot.segment),
          before: slot.text.replace(/\s+/g, " ").trim(),
          after: slot.text.replace(/\s+/g, " ").trim(),
          reason: "提问和参与者的短句在同一段，短句少于 15 个词",
        });
      } else {
        const block = slot.segment.body[slot.blockIndex];
        block.children = [{ ...block.children[0], text: mixed.residue }];
        edits.push({
          kind: "deleted-prompt",
          where: segmentLabel(slot.segment),
          before: slot.text.replace(/\s+/g, " ").trim(),
          after: mixed.residue,
          reason: "删掉段末的采访提问",
        });
      }
      continue;
    }
    if (!isStandalonePrompt(slot.text)) continue;
    const next = slots.slice(index + 1).find((item) => !isStandalonePrompt(item.text));
    if (next && wordCount(next.text) < 15) {
      edits.push({
        kind: "kept-prompt",
        where: segmentLabel(slot.segment),
        before: slot.text.replace(/\s+/g, " ").trim(),
        after: slot.text.replace(/\s+/g, " ").trim(),
        reason: "后面的回答少于 15 个词",
      });
      continue;
    }
    drop.add(`${slot.segment.index}:${slot.blockIndex}`);
    edits.push({
      kind: "deleted-prompt",
      where: segmentLabel(slot.segment),
      before: slot.text.replace(/\s+/g, " ").trim(),
      after: "",
      reason: "删除单独成段的采访提问",
    });
  }
  const removed = new Set(edits.filter((edit) => edit.kind === "deleted-prompt" && !edit.after).map((edit) => edit.before));
  for (let index = outside.length - 1; index >= 0; index -= 1) {
    if (removed.has(outside[index].text.replace(/\s+/g, " ").trim())) outside.splice(index, 1);
  }
  for (const segment of segments) {
    segment.body = segment.body.filter((block, blockIndex) => !drop.has(`${segment.index}:${blockIndex}`));
  }
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index];
    if (!segment.title.trim() && !segment.body.length) segments.splice(index, 1);
  }
  segments.forEach((segment, index) => {
    segment.index = index + 1;
  });
  for (const segment of segments) {
    if (!isGeneratedTitle(segment.title)) continue;
    const body = segment.body.map(blockText).join(" ");
    const next = titleFromFirstSentence(body);
    if (!next || next === segment.title) continue;
    edits.push({
      kind: "generated-title",
      where: `segment ${segment.index}`,
      before: segment.title,
      after: next,
      reason: "标题由脚本生成，需人工检查",
    });
    segment.title = next;
    segment.isQuote = false;
  }
}
