import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@sanity/client";
import { publishBlockers } from "@/lib/migration/story-docx";

loadEnvConfig(process.cwd());

type Segment = {
  quote?: { en?: string | null; es?: string | null; zh?: string | null };
  body?: { en?: unknown; es?: unknown; zh?: unknown };
};

function plain(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(plain).join("\n");
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.text === "string") return record.text;
    return Object.values(record).map(plain).join("\n");
  }
  return "";
}

function contentReasons(code: string, story: { participantCode?: string; slug?: string; community?: string | null; segments?: Segment[] | null }, codes: string[]) {
  const reasons: string[] = [];
  if (!story.participantCode) reasons.push("没有代号");
  if (!story.slug) reasons.push("没有 slug");
  if (!story.community) reasons.push("没有合集引用");
  const segments = story.segments || [];
  if (!segments.length) reasons.push("没有故事段");
  segments.forEach((segment, index) => {
    const title = segment.quote?.en?.trim() || segment.quote?.es?.trim() || segment.quote?.zh?.trim() || "";
    const body = plain(segment.body?.en) || plain(segment.body?.es) || plain(segment.body?.zh);
    if (!title) reasons.push(`第 ${index + 1} 段没有标题`);
    if (!body.trim()) reasons.push(`第 ${index + 1} 段没有正文`);
    const blockers = publishBlockers(`${title}\n${body}`);
    if (blockers.length) reasons.push(`第 ${index + 1} 段: ${blockers.join(", ")}`);
    for (const other of codes) {
      if (other !== code && new RegExp(`\\b${other}\\b`).test(`${title}\n${body}`)) reasons.push(`第 ${index + 1} 段出现 ${other}`);
    }
  });
  return reasons;
}

async function main() {
  const requested = process.argv.slice(2).map((code) => code.trim()).filter(Boolean);
  if (!requested.length) throw new Error("Pass participant codes. Nothing was published.");
  const backup = join(process.cwd(), "source-documents/backups/full-backup-2026-11-09.tar.gz");
  if (statSync(backup).size < 1000) throw new Error("Dataset backup is missing. Nothing was published.");
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
  const token = process.env.SANITY_API_WRITE_TOKEN?.trim();
  if (!projectId || !token) throw new Error("SANITY_API_WRITE_TOKEN is missing. Nothing was published.");
  const client = createClient({ projectId, dataset, apiVersion: "2024-10-01", token, useCdn: false, perspective: "raw" });
  const stories = await client.fetch<
    { _id: string; _rev?: string; participantCode?: string; slug?: string; community?: string | null; segments?: Segment[] | null }[]
  >(`*[_type=="story"]`);
  const codes = [...new Set(stories.map((story) => story.participantCode || "").filter(Boolean))];
  mkdirSync(join(process.cwd(), "source-documents/backups"), { recursive: true });
  const involved = stories.filter((story) => requested.includes(story.participantCode || ""));
  writeFileSync(join("source-documents/backups", "stories-before-publish.json"), `${JSON.stringify(involved, null, 2)}\n`);
  const report: string[] = [];
  for (const code of requested) {
    const docs = stories.filter((story) => story.participantCode === code);
    const draft = docs.find((story) => story._id.startsWith("drafts."));
    const published = docs.find((story) => !story._id.startsWith("drafts."));
    if (!draft) {
      report.push(`skip\t${code}\t${published?._id || ""}\talready published or missing draft`);
      continue;
    }
    const reasons = contentReasons(code, draft, codes);
    if (reasons.length) {
      report.push(`skip\t${code}\t${draft._id}\t${reasons.join("; ")}`);
      continue;
    }
    const publishedId = draft._id.slice("drafts.".length);
    if (!publishedId || publishedId.startsWith("drafts.") || publishedId === draft._id) {
      report.push(`skip\t${code}\t${draft._id}\trefusing to publish this id`);
      continue;
    }
    if (published && published._id !== publishedId) {
      report.push(`skip\t${code}\t${draft._id}\tpublished id ${published._id} does not match the draft`);
      continue;
    }
    const current = await client.getDocument(draft._id);
    if (!current || current._id !== draft._id) {
      report.push(`skip\t${code}\t${draft._id}\tdraft disappeared before publish`);
      continue;
    }
    const { _id, _rev, _createdAt, _updatedAt, ...rest } = current;
    if (_id !== draft._id) {
      report.push(`skip\t${code}\t${draft._id}\tunexpected document id`);
      continue;
    }
    await client
      .transaction()
      .createOrReplace({ ...rest, _id: publishedId, _type: "story" })
      .delete(draft._id)
      .commit();
    const after = await client.getDocument(publishedId);
    const draftAfter = await client.getDocument(draft._id);
    if (!after) throw new Error(`Published document ${publishedId} is missing after publish. Stopping.`);
    if (draftAfter) throw new Error(`Draft ${draft._id} is still present after publish. Stopping.`);
    report.push(`published\t${code}\t${publishedId}`);
  }
  console.log(report.join("\n"));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Publish failed.");
  process.exit(1);
});
