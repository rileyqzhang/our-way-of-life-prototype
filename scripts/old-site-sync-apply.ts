import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@sanity/client";

loadEnvConfig(process.cwd());

const REPORT = "source-documents/old-site-sync-report.json";
const BACKUP = "source-documents/backups/deleted-2026-11-11.json";
const ABSENT_THRESHOLD = 0.15;

type Person = {
  code: string;
  sanityIds: string[];
  toDelete: { key: string; onOldSite: number; title: string }[];
  photo: { source?: string; file?: string; action?: string; reuseAssetId?: string | null };
};
type Photograph = { _key: string; image?: { asset?: { _ref?: string } } };
type Story = { _id: string; participantCode: string; segments?: { _key: string }[]; photographs?: Photograph[] };

async function main() {
  const write = process.argv.includes("--write");
  const client = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!.trim(),
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production",
    apiVersion: "2024-10-01",
    token: process.env.SANITY_API_WRITE_TOKEN!.trim(),
    useCdn: false,
    perspective: "raw",
  });
  const report = JSON.parse(readFileSync(REPORT, "utf8")) as { people: Person[] };
  const people = report.people.filter((person) => person.sanityIds.length === 1);
  const docs = await client.fetch<Story[]>(`*[_id in $ids]{_id, participantCode, segments, photographs}`, {
    ids: people.map((person) => person.sanityIds[0]),
  });
  const docById = new Map(docs.map((doc) => [doc._id, doc]));

  const plan = people.map((person) => {
    const doc = docById.get(person.sanityIds[0]);
    if (!doc) throw new Error(`missing ${person.sanityIds[0]}`);
    const keys = person.toDelete.filter((item) => item.onOldSite < ABSENT_THRESHOLD).map((item) => item.key);
    const removed = (doc.segments || []).filter((segment) => keys.includes(segment._key));
    if (removed.length !== keys.length) throw new Error(`${doc._id}: ${keys.length - removed.length} segment keys no longer exist`);
    return { person, doc, keys, removed, replacedPhoto: doc.photographs?.[0] || null };
  });

  const total = plan.reduce((sum, item) => sum + item.keys.length, 0);
  for (const item of plan) console.log(`${item.doc.participantCode}\t删除 ${item.keys.length} 段\t照片 ${item.person.photo.action}`);
  console.log(`共删除 ${total} 段`);
  if (!write) return console.log("Dry run. Add --write to apply.");

  writeFileSync(
    BACKUP,
    `${JSON.stringify(
      {
        savedAt: new Date().toISOString(),
        note: "Story segments removed because they are not on ourwayoflifearchive.com, and the first photograph each story had before the old-site photo replaced it.",
        stories: plan.map((item) => ({ _id: item.doc._id, participantCode: item.doc.participantCode, segments: item.removed, replacedPhotograph: item.replacedPhoto })),
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Saved ${BACKUP}`);

  for (const { person, doc, keys } of plan) {
    const code = doc.participantCode;
    const alt = `Image shared by ${code}`;
    let assetId = doc.photographs?.[0]?.image?.asset?._ref;
    if (person.photo.action === "upload" && person.photo.file) {
      const asset = await client.assets.upload("image", readFileSync(person.photo.file), { filename: path.basename(person.photo.file) });
      assetId = asset._id;
    } else if (person.photo.action === "reuse-asset" && person.photo.reuseAssetId) {
      assetId = person.photo.reuseAssetId;
    }
    const photograph = {
      _key: doc.photographs?.[0]?._key || randomBytes(6).toString("hex"),
      _type: "photograph",
      image: { _type: "image", asset: { _type: "reference", _ref: assetId } },
      alt: { _type: "localeString", en: alt, es: alt, zh: alt },
      source: person.photo.source,
    };
    let patch = client.patch(doc._id);
    if (keys.length) patch = patch.unset(keys.map((key) => `segments[_key=="${key}"]`));
    patch = doc.photographs?.length
      ? patch.set({ [`photographs[_key=="${photograph._key}"]`]: photograph })
      : patch.setIfMissing({ photographs: [] }).append("photographs", [photograph]);
    await patch.commit();
    console.log(`${code}: removed ${keys.length}, photo ${person.photo.action} ${assetId}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "apply failed");
  process.exit(1);
});
