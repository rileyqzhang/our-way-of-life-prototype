import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@sanity/client";
import { legacyCollections } from "@/lib/content/collections";
import {
  collectionDraft,
  collectionRowIsApproved,
  planCollections,
  planStoryLinks,
  type CollectionPresence,
  type CollectionStoryRecord,
} from "@/lib/migration/collections";

loadEnvConfig(process.cwd());

const REPORT_PATH = path.join("cms", "seed", "collections", "collection-report.json");

type LiveCollection = { _id: string; slug?: string };
type LiveStory = { _id: string; legacy?: string | null; communitySlug?: string | null };

function onlyArg(argv: string[]) {
  const match = argv.find((arg) => arg.startsWith("--only="));
  if (!match) return undefined;
  return new Set(match.slice("--only=".length).split(",").map((item) => item.trim()).filter(Boolean));
}

function presence(records: LiveCollection[]): CollectionPresence[] {
  return legacyCollections.map((collection) => ({
    slug: collection.slug,
    published: records.some((record) => record.slug === collection.slug && !record._id.startsWith("drafts.")),
    draft: records.some((record) => record.slug === collection.slug && record._id.startsWith("drafts.")),
  }));
}

async function main() {
  const apply = process.argv.includes("--apply");
  const linkDrafts = process.argv.includes("--link-drafts");
  const only = onlyArg(process.argv);
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
  const token = process.env.SANITY_API_WRITE_TOKEN?.trim();
  if (!projectId) throw new Error("NEXT_PUBLIC_SANITY_PROJECT_ID is missing. Nothing was written.");
  const client = createClient({
    projectId,
    dataset,
    apiVersion: "2024-10-01",
    token,
    useCdn: false,
    perspective: "raw",
  });
  const [collections, stories] = await Promise.all([
    client.fetch<LiveCollection[]>(`*[_type=="collection"]{_id,"slug":slug.current}`),
    client.fetch<LiveStory[]>(`*[_type=="story"]{_id,"legacy":collection,"communitySlug":community->slug.current}`),
  ]);
  const existing = presence(collections);
  const collectionRows = planCollections(existing);
  const publishedSlugs = existing.filter((item) => item.published).map((item) => item.slug);
  const storyRecords: CollectionStoryRecord[] = stories.map((story) => ({
    id: story._id,
    legacy: story.legacy,
    communitySlug: story.communitySlug,
  }));
  const storyRows = planStoryLinks(storyRecords, publishedSlugs);
  const ready = collectionRows.filter((row) => row.action === "CreateDraft").map((row) => row.slug);
  const report = {
    writtenAt: new Date().toISOString(),
    dataset,
    sanityWrites: 0,
    note: "Dry run. Published stories and collection documents are not modified. Draft collections are created only with --apply. Draft story references are added only with --link-drafts after the collection is published.",
    summary: {
      preserve: collectionRows.filter((row) => row.action === "Preserve").length,
      createDraft: collectionRows.filter((row) => row.action === "CreateDraft").length,
      storiesSkipped: storyRows.filter((row) => row.action === "Skip").length,
      storiesWaiting: storyRows.filter((row) => row.action === "Wait").length,
      storyDraftsReadyToLink: storyRows.filter((row) => row.action === "LinkDraft").length,
    },
    importCommand: ready.length ? `npx tsx scripts/migrate-collections.ts --apply --only=${ready.join(",")}` : "",
    linkCommand: "npx tsx scripts/migrate-collections.ts --apply --link-drafts --only=latine,africanAmerican,chinese",
    collections: collectionRows,
    stories: storyRows,
  };
  mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote ${REPORT_PATH}`);
  console.log(JSON.stringify(report.summary));
  for (const row of collectionRows) console.log(`${row.action}\t${row.slug}\t${row.draftId}`);
  if (!apply) return;
  if (!token) throw new Error("SANITY_API_WRITE_TOKEN is missing or empty. Nothing was written.");
  if (!only) throw new Error("Pass --only=latine,africanAmerican,chinese. Nothing was written.");

  let writes = 0;
  for (const row of collectionRows.filter((item) => collectionRowIsApproved(item, only))) {
    const ids = [row.documentId, row.draftId];
    const existingId = await client.fetch<string | null>(`*[_type=="collection" && _id in $ids][0]._id`, { ids });
    if (existingId) {
      console.log(`skip\t${row.slug}\t${existingId} already exists. It was not changed.`);
      continue;
    }
    const source = legacyCollections.find((collection) => collection.slug === row.slug);
    if (!source || (source.slug !== "latine" && source.slug !== "africanAmerican" && source.slug !== "chinese")) continue;
    await client.createIfNotExists(collectionDraft(source.slug));
    writes += 1;
    console.log(`create\t${row.draftId}`);
  }

  if (linkDrafts) {
    const publishedNow = await client.fetch<string[]>(
      `*[_type=="collection" && !(_id in path("drafts.**"))].slug.current`,
    );
    const links = planStoryLinks(storyRecords, publishedNow).filter(
      (row) => row.action === "LinkDraft" && row.referenceId && (!only || only.has(row.legacy)),
    );
    for (const row of links) {
      if (!row.id.startsWith("drafts.") || !row.referenceId) continue;
      await client.patch(row.id).setIfMissing({ community: { _type: "reference", _ref: row.referenceId } }).commit();
      writes += 1;
      console.log(`link\t${row.id}\t${row.referenceId}`);
    }
  }
  console.log(JSON.stringify({ sanityWrites: writes }));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Collection migration failed.";
  console.error(message);
  process.exitCode = 1;
});
