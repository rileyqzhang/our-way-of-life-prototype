import { mkdirSync, writeFileSync } from "node:fs";
import { createClient } from "@sanity/client";
import { sanityDocuments } from "@/lib/sanity/documents";

const documents = sanityDocuments();
mkdirSync("cms/seed", { recursive: true });
writeFileSync("cms/seed/content.ndjson", `${documents.map((document) => JSON.stringify(document)).join("\n")}\n`);

const events = documents.filter((document) => document._type === "timelineEvent").length;
const stories = documents.filter((document) => document._type === "story").length;
console.log(`Wrote cms/seed/content.ndjson (${documents.length} documents, ${events} timeline events, ${stories} stories).`);

async function importDocuments() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
  const token = process.env.SANITY_API_WRITE_TOKEN?.trim();

  if (!projectId || !token) {
    console.log(
      "Sanity write credentials are not set. The seed file is ready. Set NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_API_WRITE_TOKEN, then run npm run sanity:import.",
    );
    return;
  }

  const client = createClient({
    projectId,
    dataset,
    apiVersion: "2024-10-01",
    token,
    useCdn: false,
  });

  const existingIds = new Set(await client.fetch<string[]>(`*[_id in $ids]._id`, { ids: documents.map((document) => document._id) }));
  const existingStorySlugs = new Set(
    await client.fetch<string[]>(`*[_type == "story" && defined(slug.current)].slug.current`),
  );
  const pending = documents.filter((document) => {
    if (existingIds.has(String(document._id))) return false;
    const slug = (document as { slug?: { current?: string } }).slug?.current;
    if (document._type === "story" && slug && existingStorySlugs.has(slug)) return false;
    return true;
  });
  console.log(`Skipping ${documents.length - pending.length} documents that already exist.`);

  for (let index = 0; index < pending.length; index += 25) {
    const batch = pending.slice(index, index + 25);
    let transaction = client.transaction();
    for (const document of batch) {
      transaction = transaction.createIfNotExists(document as { _id: string; _type: string });
    }
    await transaction.commit();
    console.log(`Imported ${Math.min(index + 25, pending.length)} / ${pending.length}`);
  }
}

if (process.argv.includes("--import")) {
  importDocuments().catch((error) => {
    console.error(error instanceof Error ? error.message : "Sanity import failed.");
    process.exit(1);
  });
}
