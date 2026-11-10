import { loadEnvConfig } from "@next/env";
import { createClient } from "@sanity/client";
import { planCollectionReferenceBackfill, type CollectionDocumentRecord, type StoryReferenceRecord } from "@/lib/migration/collections";
import { preferCanonicalStory } from "@/lib/migration/participant-code";

loadEnvConfig(process.cwd());

type LiveCollection = { _id: string; slug?: string | null; name?: string | null };
type LiveStory = {
  _id: string;
  slug?: string | null;
  participantCode?: string | null;
  legacy?: string | null;
  communitySlug?: string | null;
};

function publishedStories(stories: LiveStory[]) {
  return stories.filter((story) => !story._id.startsWith("drafts."));
}

function membership(story: LiveStory, useReferenceOnly: boolean) {
  if (story.communitySlug?.trim()) return story.communitySlug.trim();
  if (useReferenceOnly) return "";
  return story.legacy?.trim() || "";
}

function counts(stories: LiveStory[], resolve: (story: LiveStory) => string) {
  const visible = preferCanonicalStory(
    publishedStories(stories).map((story) => ({
      ...story,
      slug: story.slug || story._id,
      participantCode: story.participantCode || story._id,
      resolved: resolve(story),
    })),
  );
  const totals = new Map<string, number>();
  for (const story of visible) {
    if (!story.resolved) continue;
    totals.set(story.resolved, (totals.get(story.resolved) || 0) + 1);
  }
  return totals;
}

async function main() {
  const write = process.argv.includes("--write");
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
    client.fetch<LiveCollection[]>(`*[_type=="collection"]{_id,"slug":slug.current,"name":name.en}`),
    client.fetch<LiveStory[]>(
      `*[_type=="story"]|order(participantCode asc){_id,"slug":slug.current,participantCode,"legacy":collection,"communitySlug":community->slug.current}`,
    ),
  ]);
  const collectionRecords: CollectionDocumentRecord[] = collections.map((collection) => ({
    id: collection._id,
    slug: collection.slug?.trim() || "",
    name: collection.name,
  }));
  const storyRecords: StoryReferenceRecord[] = stories.map((story) => ({
    id: story._id,
    participantCode: story.participantCode,
    legacy: story.legacy,
    communitySlug: story.communitySlug,
  }));
  const plan = planCollectionReferenceBackfill(storyRecords, collectionRecords);
  console.log("collections");
  for (const collection of collectionRecords) {
    console.log(`${collection.id}\t${collection.slug}\t${collection.name || ""}`);
  }
  console.log("participantCode\tlegacy\tcollection\tdocument");
  for (const row of plan.ready) {
    const document = row.documentId.startsWith("drafts.") ? "draft" : "published";
    console.log(`${row.participantCode}\t${row.legacy}\t${row.collectionName} (${row.collectionSlug})\t${document}`);
  }
  if (plan.unmatched.length) {
    console.log("\nUnmatched legacy values were not planned:");
    for (const row of plan.unmatched) console.log(`${row.participantCode}\t${row.documentId}\t${row.legacy}`);
  }
  const plannedIds = new Set(plan.ready.map((row) => row.documentId));
  const before = counts(stories, (story) => membership(story, false));
  const afterReferenceOnly = counts(stories, (story) => membership(story, true));
  const afterWrite = counts(stories, (story) => {
    if (story.communitySlug?.trim()) return story.communitySlug.trim();
    if (plannedIds.has(story._id)) return story.legacy?.trim() || "";
    return "";
  });
  const slugs = [...new Set([...before.keys(), ...afterReferenceOnly.keys(), ...afterWrite.keys()])].sort();
  console.log("\nslug\tbefore\treference-only\tafter-planned-write");
  for (const slug of slugs) {
    console.log(`${slug}\t${before.get(slug) || 0}\t${afterReferenceOnly.get(slug) || 0}\t${afterWrite.get(slug) || 0}`);
  }
  console.log(`planned\t${plan.ready.length}`);
  if (!write) {
    console.log("Dry run. Pass --write to set missing Collection references.");
    return;
  }
  if (plan.unmatched.length) throw new Error("Unmatched legacy values are present. Nothing was written.");
  if (!token) throw new Error("SANITY_API_WRITE_TOKEN is missing or empty. Nothing was written.");
  let writes = 0;
  for (const row of plan.ready) {
    await client
      .patch(row.documentId)
      .setIfMissing({ community: { _type: "reference", _ref: row.collectionId } })
      .commit();
    writes += 1;
    console.log(`setIfMissing\t${row.documentId}\t${row.collectionId}`);
  }
  console.log(JSON.stringify({ sanityWrites: writes }));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Collection reference backfill failed.";
  console.error(message);
  process.exitCode = 1;
});
