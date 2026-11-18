import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@sanity/client";
import sharp from "sharp";
import { bodyStartOf, codeKey, coverage, sanityText, score, squash, titleOf, verdict, type OldSegment, type SanitySegment } from "./old-site-match";

loadEnvConfig(process.cwd());

const INVENTORY = "source-documents/old-site-inventory.json";
const PHOTO_DIR = "source-documents/old-site-photos";
const PLAN = "source-documents/old-site-latine-aa-plan.json";
const DELETED = "source-documents/backups/deleted-segments-2026-11-14.json";
const STAGES = ["youth", "adulthood", "olderAdulthood"] as const;
type Stage = (typeof STAGES)[number];
const STAGE_HEADING: [RegExp, Stage][] = [
  [/^(childhood|youth( and adolescence)?|adolescence|growing up|la niñez|niñez|infancia|juventud|adolescencia)$/i, "youth"],
  [/^(adulthood(\s*\(.*\))?|adult life|la adultez|adultez|edad adulta|vida adulta)$/i, "adulthood"],
  [/^(later life|older adulthood(\s*\(.*\))?|old age|la vejez|vejez|tercera edad|edad mayor)$/i, "olderAdulthood"],
];

type OutlineItem = { position: number; tag: string; text: string };
type Card = { code: string; photo?: string; storyUrl: string; cardIntro?: string; cardQuote?: string };
type Story = {
  _id: string;
  participantCode: string;
  collection?: string | null;
  segments?: SanitySegment[] | null;
  photo?: { alt?: { en?: string }; asset?: { _id: string; sha1hash?: string; originalFilename?: string; size?: number; metadata?: { dimensions?: { width: number; height: number } } } } | null;
};

function isStage(value: unknown): value is Stage {
  return STAGES.includes(value as Stage);
}

function pageStageFor(outline: OutlineItem[] | undefined, segment: OldSegment | undefined): Stage | null {
  const position = segment?.position;
  if (!outline || position == null || position < 0) return null;
  const headings = outline
    .filter((item) => item.position < position)
    .map((item) => STAGE_HEADING.find(([pattern]) => pattern.test(item.text.replace(/[:.]$/, "").trim()))?.[1])
    .filter((stage): stage is Stage => Boolean(stage));
  return headings.at(-1) || null;
}

function planPerson(story: Story, oldSegments: OldSegment[], outline: OutlineItem[] | undefined) {
  const segments = story.segments || [];
  const oldAll = squash(oldSegments.map((old) => `${old.title} ${old.bodyText || old.bodyStart}`).join(" "));
  const candidates = oldSegments.flatMap((old, oldIndex) =>
    segments.map((segment, index) => {
      const rated = score(old, segment);
      const oldText = squash(`${old.title} ${old.bodyText || old.bodyStart}`);
      const text = sanityText(segment);
      const overlap = Math.max(coverage(text, oldText), coverage(oldText, text));
      const status = verdict(rated) === "match" ? "match" : verdict(rated) === "uncertain" || overlap >= 0.35 ? "uncertain" : "none";
      return { oldIndex, index, ...rated, overlap, status };
    }),
  );
  candidates.sort((a, b) => Number(b.status === "match") - Number(a.status === "match") || b.total - a.total || b.overlap - a.overlap);
  const usedOld = new Set<number>();
  const usedSanity = new Set<number>();
  const pairs: typeof candidates = [];
  for (const candidate of candidates) {
    if (candidate.status === "none" || usedOld.has(candidate.oldIndex) || usedSanity.has(candidate.index)) continue;
    usedOld.add(candidate.oldIndex);
    usedSanity.add(candidate.index);
    pairs.push(candidate);
  }

  const kept = segments
    .map((segment, index) => ({ segment, index, pair: pairs.find((pair) => pair.index === index) }))
    .filter((item): item is { segment: SanitySegment; index: number; pair: (typeof pairs)[number] } => Boolean(item.pair))
    .sort((a, b) => a.pair.oldIndex - b.pair.oldIndex || a.index - b.index);
  const rescued = segments
    .map((segment, index) => ({ segment, index, onOldSite: coverage(sanityText(segment), oldAll) }))
    .filter(({ index, onOldSite }) => !usedSanity.has(index) && onOldSite >= 0.2);
  for (const item of rescued) {
    const ranked = oldSegments
      .map((old, oldIndex) => ({ oldIndex, overlap: coverage(sanityText(item.segment), squash(`${old.title} ${old.bodyText || old.bodyStart}`)) }))
      .sort((a, b) => b.overlap - a.overlap)[0];
    const insertAt = kept.findIndex((entry) => entry.pair.oldIndex > (ranked?.oldIndex ?? -1));
    kept.splice(insertAt < 0 ? kept.length : insertAt, 0, {
      segment: item.segment,
      index: item.index,
      pair: { oldIndex: ranked?.oldIndex ?? kept.length, index: item.index, title: 0, body: 0, total: 0, overlap: ranked?.overlap ?? item.onOldSite, status: "uncertain" },
    });
  }

  const rows = kept.map((item) => {
    const old = oldSegments[item.pair.oldIndex];
    const page = pageStageFor(outline, old);
    const word = isStage(item.segment.lifeStage) ? item.segment.lifeStage : null;
    return {
      key: item.segment._key,
      currentIndex: item.index,
      oldOrder: item.pair.oldIndex,
      title: titleOf(item.segment),
      oldTitle: old.title,
      bodyStart: bodyStartOf(item.segment),
      oldBodyStart: old.bodyStart,
      titleScore: Number(item.pair.title.toFixed(2)),
      bodyScore: Number(item.pair.body.toFixed(2)),
      overlap: Number(item.pair.overlap.toFixed(2)),
      status: item.pair.status as "match" | "uncertain",
      pageStage: page,
      wordStage: item.segment.lifeStage || null,
      stage: (page || word) as Stage | null,
      rule: (page ? "a" : word ? "b" : "c") as "a" | "b" | "c",
    };
  });
  for (const [index, row] of rows.entries()) {
    if (row.stage) continue;
    row.stage = index === 0 ? "youth" : rows[index - 1].stage;
    row.rule = "c";
  }
  const regressions = rows.flatMap((row, index) => {
    const previous = [...rows.slice(0, index)].reverse().find((item) => item.stage);
    if (!previous?.stage || !row.stage || STAGES.indexOf(row.stage) >= STAGES.indexOf(previous.stage)) return [];
    return [{ from: { order: previous.oldOrder, stage: previous.stage, rule: previous.rule, title: previous.title }, to: { order: row.oldOrder, stage: row.stage, rule: row.rule, title: row.title } }];
  });
  const removed = segments
    .map((segment, index) => ({ segment, index, onOldSite: coverage(sanityText(segment), oldAll) }))
    .filter(({ index, onOldSite }) => !usedSanity.has(index) && onOldSite < 0.2)
    .map(({ segment, index, onOldSite }) => ({ index, key: segment._key, title: titleOf(segment), bodyStart: bodyStartOf(segment), lifeStage: segment.lifeStage || null, onOldSite: Number(onOldSite.toFixed(2)), segment }));
  const missingOnSanity = oldSegments
    .map((old, index) => ({ index, title: old.title, bodyStart: old.bodyStart, bodyWords: old.bodyWords, inSanity: Number(coverage(squash(old.bodyText || old.bodyStart), segments.map(sanityText).join(" ")).toFixed(2)) }))
    .filter((old) => !usedOld.has(old.index));
  return { rows, regressions, removed, missingOnSanity, matched: rows.filter((row) => row.status === "match").length, uncertain: rows.filter((row) => row.status === "uncertain") };
}

async function photoPlan(code: string, card: Card | undefined, story: Story) {
  const file = readdirSync(PHOTO_DIR).find((name) => name.toLowerCase().startsWith(`${codeKey(code).toLowerCase()}.`));
  if (!card?.photo || !file) return { source: card?.photo || null, action: "missing" };
  const buffer = readFileSync(path.join(PHOTO_DIR, file));
  const meta = await sharp(buffer).metadata();
  const sha1 = createHash("sha1").update(buffer).digest("hex");
    const asset = story.photo?.asset;
    const sameImage = asset?.metadata?.dimensions?.width === meta.width && asset?.metadata?.dimensions?.height === meta.height && asset.originalFilename === decodeURIComponent((card.photo.split("/").pop() || ""));
    return {
    source: card.photo,
    file: path.join(PHOTO_DIR, file),
    bytes: buffer.length,
    width: meta.width,
    height: meta.height,
    current: asset ? { id: asset._id, filename: asset.originalFilename, width: asset.metadata?.dimensions?.width, height: asset.metadata?.dimensions?.height, alt: story.photo?.alt?.en || "" } : null,
    action: asset?.sha1hash === sha1 || sameImage ? "same" : "replace",
    bytesDiffer: Boolean(asset && asset.sha1hash !== sha1 && sameImage),
  };
}

async function main() {
  const client = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!.trim(),
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production",
    apiVersion: "2024-10-01",
    token: process.env.SANITY_API_WRITE_TOKEN!.trim(),
    useCdn: false,
    perspective: "raw",
  });
  const inventory = JSON.parse(readFileSync(INVENTORY, "utf8")) as { cards: Card[]; stories: Record<string, { outline?: OutlineItem[]; segments: OldSegment[]; intro?: string[] }> };
  const docs = await client.fetch<Story[]>(
    `*[_type=="story" && !(_id in path("drafts.**"))]{_id, participantCode, "collection": community->slug.current, segments, "photo": photographs[0]{alt, "asset": image.asset->{_id, sha1hash, originalFilename, size, metadata{dimensions}}}} | order(participantCode asc)`,
  );
  const skipped = docs.filter((story) => story.collection === "chinese");
  const people = [];
  for (const story of docs.filter((item) => item.collection !== "chinese")) {
    const card = inventory.cards.find((item) => codeKey(item.code) === codeKey(story.participantCode));
    const page = card ? inventory.stories[card.storyUrl] : undefined;
    if (!page) throw new Error(`${story.participantCode} has no old-site page`);
    people.push({ code: story.participantCode, _id: story._id, collection: story.collection, oldCode: card?.code, oldCount: page.segments.length, ...planPerson(story, page.segments, page.outline), photo: await photoPlan(story.participantCode, card, story) });
  }
  const emnj = inventory.cards.find((card) => codeKey(card.code) === "EMNJ");
  const emnjPage = emnj ? inventory.stories[emnj.storyUrl] : undefined;
  const emnjDocx = existsSync("source-documents") && readdirSync("source-documents", { recursive: true }).some((name) => /emnj/i.test(String(name)) && /\.docx?$/i.test(String(name)));

  writeFileSync(PLAN, `${JSON.stringify({ generatedAt: new Date().toISOString(), skippedChinese: skipped.map((story) => story.participantCode), people }, null, 2)}\n`);
  writeFileSync(
    DELETED,
    `${JSON.stringify({ savedAt: new Date().toISOString(), note: "Planned only. These Latine and African American segments are not on the old site and will be deleted after confirmation. Chinese stories are not included.", stories: people.map((person) => ({ _id: person._id, participantCode: person.code, segments: person.removed.map((item) => item.segment) })) }, null, 2)}\n`,
  );
  console.log(["代号", "合集", "旧站", "匹配", "不确定", "删除", "倒回", "缺阶段", "照片"].join("\t"));
  for (const person of people) {
    const unstaged = person.rows.filter((row) => !row.stage).length;
    console.log([person.code, person.collection, person.oldCount, person.matched, person.uncertain.length, person.removed.length, person.regressions.length, unstaged, person.photo.action].join("\t"));
  }
  console.log(`chinese skipped ${skipped.length}: ${skipped.map((story) => story.participantCode).join(", ")}`);
  console.log(`emnj docx ${emnjDocx}; emnj segments ${emnjPage?.segments.length ?? 0}`);
  console.log(`saved ${PLAN}`);
  console.log(`saved ${DELETED}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "plan failed");
  process.exit(1);
});
