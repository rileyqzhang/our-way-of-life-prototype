import { readFileSync, writeFileSync } from "node:fs";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@sanity/client";

loadEnvConfig(process.cwd());

const PLAN = "source-documents/chinese-stage-plan.json";
const LOG = "source-documents/chinese-stage-applied.json";
const STAGES = ["youth", "adulthood", "olderAdulthood"] as const;
type Stage = (typeof STAGES)[number];
type Row = { key: string; currentIndex: number; title: string; group: string; stage: Stage; rule: string };
type Person = { code: string; _id: string; rows: Row[] };
type Segment = { _key: string; lifeStage?: string | null; quote?: { zh?: string | null; en?: string | null } };

function adjusted(code: string, row: Row): { stage: Stage; reason: string } {
  const group = row.group.toLowerCase();
  if (group.includes("what is civic")) return { stage: "olderAdulthood", reason: "现在对公民参与的看法" };
  if (code === "GJSF" && row.title.startsWith("学校种族凸显")) return { stage: "youth", reason: "按内容：学校里的种族经历" };
  if (code === "GJSF" && row.title.startsWith("双语掌握优势在学校")) return { stage: "youth", reason: "按内容：学校里的语言经历" };
  if (code === "LLSF" && row.title.startsWith("香港的邻里")) {
    return { stage: "youth", reason: "1950 年出生，约 6 岁到香港，1969 年 17 岁移民，邻里发生在 6–17 岁" };
  }
  if (code === "WLOK" && row.title.startsWith("初到美国")) {
    return { stage: "olderAdulthood", reason: "1938 年出生；Overview 把移民和 2001 年左右住在奥克兰写在一起，当年 63 岁" };
  }
  return { stage: row.stage, reason: `规则 ${row.rule}` };
}

async function main() {
  const write = process.argv.includes("--write");
  const plan = JSON.parse(readFileSync(PLAN, "utf8")) as { people: Person[] };
  const client = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!.trim(),
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production",
    apiVersion: "2024-10-01",
    token: process.env.SANITY_API_WRITE_TOKEN!.trim(),
    useCdn: false,
    perspective: "raw",
  });
  const docs = await client.fetch<{ _id: string; participantCode: string; segments?: Segment[] }[]>(
    `*[_type=="story" && community->slug.current=="chinese" && !(_id in path("drafts.**"))]{_id, participantCode, segments}`,
  );
  const byId = new Map(docs.map((doc) => [doc._id, doc]));
  const applied: { code: string; title: string; from: string; to: Stage; reason: string }[] = [];
  const kept: { code: string; title: string; existing: string; planned: Stage }[] = [];

  for (const person of plan.people) {
    const doc = byId.get(person._id);
    if (!doc) throw new Error(`missing ${person._id}`);
    const segments = doc.segments || [];
    const rows = [...person.rows].sort((a, b) => a.currentIndex - b.currentIndex);
    if (segments.map((segment) => segment._key).join("|") !== rows.map((row) => row.key).join("|")) {
      throw new Error(`${person.code} order no longer matches the plan`);
    }
    const next = segments.map((segment, index) => {
      const row = rows[index];
      const choice = adjusted(person.code, row);
      if (!STAGES.includes(choice.stage)) throw new Error(`${person.code} ${row.title} has no stage`);
      if (segment.lifeStage) {
        if (segment.lifeStage !== choice.stage) kept.push({ code: person.code, title: row.title, existing: segment.lifeStage, planned: choice.stage });
        return segment;
      }
      applied.push({ code: person.code, title: row.title, from: "", to: choice.stage, reason: choice.reason });
      return { ...segment, lifeStage: choice.stage };
    });
    const missing = next.filter((segment) => !segment.lifeStage).length;
    console.log(`${person.code}\tfilled ${applied.filter((item) => item.code === person.code).length}\tstill empty ${missing}`);
    if (write) await client.patch(person._id).set({ segments: next }).commit();
  }

  const missing = await client.fetch<{ code: string; missing: number }[]>(
    `*[_type=="story" && !(_id in path("drafts.**"))]{"code": participantCode, "missing": count(segments[!defined(lifeStage) || lifeStage == ""])}`,
  );
  writeFileSync(LOG, `${JSON.stringify({ savedAt: new Date().toISOString(), wrote: write, applied, kept, missing: missing.filter((item) => item.missing > 0) }, null, 2)}\n`);
  console.log(`kept existing ${kept.length}`);
  console.log(`site missing ${missing.filter((item) => item.missing > 0).map((item) => `${item.code}:${item.missing}`).join(", ") || "none"}`);
  console.log(write ? `wrote ${plan.people.length} stories` : "dry run, add --write to apply");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "apply failed");
  process.exit(1);
});
