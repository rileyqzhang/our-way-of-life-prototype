import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@sanity/client";
import sharp from "sharp";
import { bodyStartOf, codeKey, coverage, sanityText, score, squash, titleOf, verdict, type Locale, type OldSegment, type SanitySegment } from "./old-site-match";

loadEnvConfig(process.cwd());

const INVENTORY = "source-documents/old-site-inventory.json";
const REPORT = "source-documents/old-site-sync-report.json";
const PHOTO_DIR = "source-documents/old-site-photos";

type SanityStory = {
  _id: string;
  participantCode?: string;
  slug?: string;
  collection?: string;
  segments?: SanitySegment[] | null;
  photographs?: { _key: string; image?: { asset?: { _ref?: string } }; alt?: Locale }[] | null;
};
type Inventory = {
  cards: { code: string; photo: string; storyUrl: string }[];
  stories: Record<string, { segments: OldSegment[] }>;
};

async function main() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
  const token = process.env.SANITY_API_WRITE_TOKEN?.trim();
  if (!projectId || !token) throw new Error("missing credentials");
  const client = createClient({ projectId, dataset, apiVersion: "2024-10-01", token, useCdn: false, perspective: "raw" });

  const inventory = JSON.parse(readFileSync(INVENTORY, "utf8")) as Inventory;
  const docs = await client.fetch<SanityStory[]>(
    `*[_type=="story"]{_id, participantCode, "slug": slug.current, "collection": community->slug.current, segments, photographs}`,
  );
  const assets = await client.fetch<{ _id: string; sha1hash: string; size: number; originalFilename?: string; metadata?: { dimensions?: { width: number; height: number } } }[]>(
    `*[_type=="sanity.imageAsset"]{_id, sha1hash, size, originalFilename, metadata{dimensions}}`,
  );
  const assetById = new Map(assets.map((asset) => [asset._id, asset]));
  const assetBySha = new Map(assets.map((asset) => [asset.sha1hash, asset]));

  const byCode = new Map<string, SanityStory[]>();
  for (const doc of docs) {
    const key = codeKey(doc.participantCode || doc.slug || "");
    byCode.set(key, [...(byCode.get(key) || []), doc]);
  }
  const oldKeys = new Set(inventory.cards.map((card) => codeKey(card.code)));

  mkdirSync(PHOTO_DIR, { recursive: true });
  const people = [];
  for (const card of inventory.cards) {
    const key = codeKey(card.code);
    const versions = byCode.get(key) || [];
    const current = versions.find((doc) => doc._id.startsWith("drafts.")) || versions[0];
    const oldSegments = inventory.stories[card.storyUrl]?.segments || [];
    const sanitySegments = current?.segments || [];

    const pairs = oldSegments.flatMap((old, oldIndex) =>
      sanitySegments.map((segment, sanityIndex) => ({ oldIndex, sanityIndex, ...score(old, segment) })),
    );
    pairs.sort((a, b) => b.total - a.total);
    const usedOld = new Set<number>();
    const usedSanity = new Set<number>();
    const matches: { oldIndex: number; sanityIndex: number; title: number; body: number; status: string }[] = [];
    for (const pair of pairs) {
      if (usedOld.has(pair.oldIndex) || usedSanity.has(pair.sanityIndex)) continue;
      const status = verdict(pair);
      if (status === "none") continue;
      usedOld.add(pair.oldIndex);
      usedSanity.add(pair.sanityIndex);
      matches.push({ ...pair, status });
    }

    let photo: Record<string, unknown> = { source: card.photo || null };
    if (card.photo) {
      const response = await fetch(card.photo);
      if (!response.ok) throw new Error(`photo download failed ${response.status}: ${card.photo}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      const meta = await sharp(buffer).metadata();
      const sha1 = createHash("sha1").update(buffer).digest("hex");
      const extension = meta.format === "jpeg" ? "jpg" : meta.format || "bin";
      const file = path.join(PHOTO_DIR, `${key.toLowerCase()}.${extension}`);
      if (!existsSync(file)) writeFileSync(file, buffer);
      const currentRef = current?.photographs?.[0]?.image?.asset?._ref;
      const currentAsset = currentRef ? assetById.get(currentRef) : undefined;
      const existing = assetBySha.get(sha1);
      const sourceName = decodeURIComponent(card.photo.split("/").pop() || "");
      const sameImage =
        currentAsset &&
        (currentAsset.sha1hash === sha1 ||
          (currentAsset.originalFilename === sourceName &&
            currentAsset.metadata?.dimensions?.width === meta.width &&
            currentAsset.metadata?.dimensions?.height === meta.height));
      photo = {
        source: card.photo,
        file,
        bytes: buffer.length,
        width: meta.width,
        height: meta.height,
        format: meta.format,
        sha1,
        currentAsset: currentAsset
          ? { id: currentAsset._id, filename: currentAsset.originalFilename, width: currentAsset.metadata?.dimensions?.width, height: currentAsset.metadata?.dimensions?.height }
          : null,
        action: sameImage ? "same" : existing ? "reuse-asset" : "upload",
        reuseAssetId: existing?._id || null,
      };
    }

    const oldAll = squash(oldSegments.map((old) => `${old.title} ${old.bodyText || old.bodyStart}`).join(" "));
    const sanityAll = sanitySegments.map(sanityText).join(" ");
    const matchedSanity = new Set(matches.filter((match) => match.status === "match").map((match) => match.sanityIndex));
    const uncertainSanity = new Set(matches.filter((match) => match.status === "uncertain").map((match) => match.sanityIndex));
    people.push({
      code: card.code,
      key,
      storyUrl: card.storyUrl,
      sanityIds: versions.map((doc) => doc._id),
      collection: current?.collection || null,
      oldCount: oldSegments.length,
      sanityCount: sanitySegments.length,
      matched: matchedSanity.size,
      uncertain: matches
        .filter((match) => match.status === "uncertain")
        .map((match) => ({
          oldIndex: match.oldIndex,
          sanityKey: sanitySegments[match.sanityIndex]._key,
          titleScore: Number(match.title.toFixed(2)),
          bodyScore: Number(match.body.toFixed(2)),
          old: oldSegments[match.oldIndex],
          sanity: { title: titleOf(sanitySegments[match.sanityIndex]), bodyStart: bodyStartOf(sanitySegments[match.sanityIndex]) },
        })),
      unmatchedOld: oldSegments
        .map((old, index) => ({ index, title: old.title, bodyStart: old.bodyStart, bodyWords: old.bodyWords, inSanity: Number(coverage(squash(old.bodyText || old.bodyStart), sanityAll).toFixed(2)) }))
        .filter((old) => !usedOld.has(old.index)),
      toDelete: sanitySegments
        .map((segment, index) => ({ index, segment }))
        .filter(({ index }) => !matchedSanity.has(index) && !uncertainSanity.has(index))
        .map(({ index, segment }) => ({
          index,
          key: segment._key,
          title: titleOf(segment),
          bodyStart: bodyStartOf(segment),
          lifeStage: segment.lifeStage || null,
          onOldSite: Number(coverage(sanityText(segment), oldAll).toFixed(2)),
        })),
      photo,
    });
  }

  const absent = [...byCode.entries()]
    .filter(([key]) => key && !oldKeys.has(key))
    .map(([key, versions]) => ({
      key,
      code: versions[0].participantCode,
      ids: versions.map((doc) => doc._id),
      collection: versions[0].collection || null,
      segments: (versions.find((doc) => doc._id.startsWith("drafts.")) || versions[0]).segments?.length || 0,
    }));

  writeFileSync(REPORT, `${JSON.stringify({ generatedAt: new Date().toISOString(), people, absent }, null, 2)}\n`);

  console.log("\n== 每人统计 ==");
  console.log(["代号", "旧站段数", "Sanity段数", "匹配", "不确定", "旧站无匹配", "待删", "照片"].join("\t"));
  for (const person of people) {
    const photo = person.photo as { action?: string };
    console.log(
      [person.code, person.oldCount, person.sanityCount, person.matched, person.uncertain.length, person.unmatchedOld.length, person.toDelete.length, photo.action || "无"].join("\t"),
    );
  }
  console.log("\n== 旧站没有的参与者 ==");
  for (const item of absent) console.log([item.code, item.collection, `${item.segments} 段`, item.ids.join(", ")].join("\t"));
  console.log(`\nSaved ${REPORT}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "sync failed");
  process.exit(1);
});
