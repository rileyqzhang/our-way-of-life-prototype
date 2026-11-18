import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@sanity/client";

loadEnvConfig(process.cwd());

const SLUGS = ["latine", "africanAmerican", "chinese"];
const COLOR_FIELDS = ["backgroundGradient", "accentColor", "mutedColor", "coverColor"];

type CollectionDoc = {
  _id: string;
  slug?: { current?: string } | string;
  backgroundGradient?: { from?: { hex?: string }; to?: { hex?: string } } | null;
  accentColor?: { hex?: string } | null;
  mutedColor?: { hex?: string } | null;
  coverColor?: { hex?: string } | null;
};

function slugOf(doc: CollectionDoc) {
  if (!doc.slug) return "no slug";
  return typeof doc.slug === "string" ? doc.slug : doc.slug.current || "no slug";
}

function describe(doc: CollectionDoc) {
  const gradient = doc.backgroundGradient;
  return [
    gradient ? `background ${gradient.from?.hex || "missing"} to ${gradient.to?.hex || "missing"}` : "",
    doc.accentColor?.hex ? `accent ${doc.accentColor.hex}` : "",
    doc.mutedColor?.hex ? `muted ${doc.mutedColor.hex}` : "",
    doc.coverColor?.hex ? `cover ${doc.coverColor.hex}` : "",
  ].filter(Boolean);
}

async function main() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
  const token = process.env.SANITY_API_WRITE_TOKEN?.trim();
  if (!projectId || !token) throw new Error("SANITY_API_WRITE_TOKEN is missing. Nothing was written.");
  const client = createClient({ projectId, dataset, apiVersion: "2024-10-01", token, useCdn: false, perspective: "raw" });

  const docs = await client.fetch<CollectionDoc[]>(
    `*[_type == "collection" && (slug.current in $slugs || _id in $ids)]`,
    {
      slugs: SLUGS,
      ids: [...SLUGS.flatMap((slug) => [`collection-${slug}`, `drafts.collection-${slug}`])],
    },
  );

  const backupDir = path.join(process.cwd(), "source-documents/backups");
  mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `collections-before-color-unset-${stamp}.json`);
  writeFileSync(backupFile, JSON.stringify(docs, null, 2));
  console.log(`Backup written: ${path.relative(process.cwd(), backupFile)} (${docs.length} documents)`);

  for (const doc of docs) {
    const present = describe(doc);
    const stored = COLOR_FIELDS.filter((field) => doc[field as keyof CollectionDoc] != null);
    console.log(`${doc._id} (${slugOf(doc)}): ${present.length ? present.join(", ") : "no color fields"}`);
    if (!stored.length) continue;
    await client.patch(doc._id).unset(stored).commit();
    console.log(`Unset ${stored.join(", ")} on ${doc._id}`);
  }

  const after = await client.fetch<CollectionDoc[]>(
    `*[_type == "collection" && (slug.current in $slugs || _id in $ids)]{
      _id,
      "slug": slug.current,
      backgroundGradient,
      accentColor,
      mutedColor,
      coverColor
    }`,
    {
      slugs: SLUGS,
      ids: [...SLUGS.flatMap((slug) => [`collection-${slug}`, `drafts.collection-${slug}`])],
    },
  );
  const leftover = after.filter((doc) => COLOR_FIELDS.some((field) => doc[field as keyof CollectionDoc] != null));
  if (leftover.length) throw new Error(`Color fields remain on ${leftover.map((doc) => doc._id).join(", ")}`);
  console.log(`Color fields cleared on ${after.length} collection documents.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
