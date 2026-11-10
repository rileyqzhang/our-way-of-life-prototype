import { writeFileSync } from "node:fs";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@sanity/client";
import { publishBlockers } from "@/lib/migration/story-docx";

loadEnvConfig(process.cwd());

type Segment = {
  quote?: { en?: string | null; es?: string | null; zh?: string | null };
  shortTitle?: { en?: string | null; es?: string | null; zh?: string | null };
  body?: { en?: unknown; es?: unknown; zh?: unknown };
  lifeStage?: string | null;
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

function titleOf(segment: Segment) {
  return segment.quote?.en?.trim() || segment.quote?.es?.trim() || segment.quote?.zh?.trim() || "";
}

function bodyOf(segment: Segment) {
  return plain(segment.body?.en) || plain(segment.body?.es) || plain(segment.body?.zh);
}

async function main() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
  const token = process.env.SANITY_API_WRITE_TOKEN?.trim();
  if (!projectId || !token) throw new Error("missing credentials");
  const client = createClient({ projectId, dataset, apiVersion: "2024-10-01", token, useCdn: false, perspective: "raw" });
  const stories = await client.fetch<
    {
      _id: string;
      participantCode?: string;
      slug?: string;
      community?: string | null;
      segments?: Segment[] | null;
    }[]
  >(`*[_type=="story"]{_id, participantCode, "slug": slug.current, "community": community._ref, segments}`);
  const codes = [...new Set(stories.map((story) => story.participantCode || "").filter(Boolean))];
  const rows: { code: string; id: string; ok: boolean; reasons: string[] }[] = [];
  for (const code of codes.sort()) {
    const docs = stories.filter((story) => story.participantCode === code);
    const draft = docs.find((story) => story._id.startsWith("drafts.")) || docs.find((story) => !story._id.startsWith("drafts."));
    const reasons: string[] = [];
    if (!draft) reasons.push("没有文档");
    else {
      if (!draft.participantCode) reasons.push("没有代号");
      if (!draft.slug) reasons.push("没有 slug");
      if (!draft.community) reasons.push("没有合集引用");
      const segments = draft.segments || [];
      if (!segments.length) reasons.push("没有故事段");
      segments.forEach((segment, index) => {
        const title = titleOf(segment);
        const body = bodyOf(segment);
        if (!title) reasons.push(`第 ${index + 1} 段没有标题`);
        if (!body.trim()) reasons.push(`第 ${index + 1} 段没有正文`);
        const blockers = publishBlockers(`${title}\n${body}`);
        if (blockers.length) reasons.push(`第 ${index + 1} 段: ${blockers.join(", ")}`);
        for (const other of codes) {
          if (other !== code && new RegExp(`\\b${other}\\b`).test(`${title}\n${body}`)) reasons.push(`第 ${index + 1} 段出现 ${other}`);
        }
      });
    }
    rows.push({ code, id: draft?._id || "", ok: reasons.length === 0, reasons });
    console.log([code, reasons.length ? "FAIL" : "PASS", reasons.join("; ") || draft?._id].join("\t"));
  }
  writeFileSync("source-documents/backups/story-check.json", `${JSON.stringify(rows, null, 2)}\n`);
  console.log(`pass ${rows.filter((row) => row.ok).length} / ${rows.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "check failed");
  process.exit(1);
});
