import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@sanity/client";
import { localCollectionPage } from "@/lib/content/collections";

loadEnvConfig(process.cwd());

function words(value: { en: string; es: string; zh: string }) {
  return { _type: "localeString", ...value };
}

async function main() {
  const write = process.argv.includes("--write");
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
  const token = process.env.SANITY_API_WRITE_TOKEN?.trim();
  if (!projectId || !token) throw new Error("SANITY_API_WRITE_TOKEN is missing. Nothing was written.");
  const client = createClient({ projectId, dataset, apiVersion: "2024-10-01", token, useCdn: false, perspective: "raw" });

  const before = await client.fetch(`*[_id in ["collectionPage", "drafts.collectionPage"]]`);
  if (!write) {
    console.log("Dry run. Add --write to back up and publish collection page wording.");
    return;
  }

  const backupDir = path.join(process.cwd(), "source-documents/backups");
  mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `collection-page-before-wording-${new Date().toISOString().slice(0, 10)}.json`);
  writeFileSync(backupFile, JSON.stringify(before, null, 2));
  console.log(`Backup written: ${path.relative(process.cwd(), backupFile)} (${before.length} documents)`);

  const wording = {
    backLabel: words(localCollectionPage.backLabel),
    eyebrow: words(localCollectionPage.eyebrow),
    titleSuffix: words(localCollectionPage.titleSuffix),
  };
  await client.createIfNotExists({ _id: "collectionPage", _type: "collectionPage" });
  await client.patch("collectionPage").set(wording).commit();
  if (await client.getDocument("drafts.collectionPage")) await client.patch("drafts.collectionPage").set(wording).commit();
  console.log("Collection page wording published (collectionPage).");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
