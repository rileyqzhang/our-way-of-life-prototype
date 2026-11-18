import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@sanity/client";
import { cardContent, storyPath, titleWithoutRepeatedYear, type StoryRef } from "@/lib/timeline/card-content";
import { normalizeParticipantCode } from "@/lib/migration/participant-code";
import type { TimelineEvent } from "@/lib/timeline/types";

loadEnvConfig(process.cwd());

const events = JSON.parse(readFileSync(path.join(process.cwd(), "lib/timeline/events.json"), "utf8")) as TimelineEvent[];

function printLocalReport() {
  console.log("YEAR LINES");
  for (const event of events) {
    const before = `${event.date.trim()} • ${event.title.en.trim()}`;
    const afterTitle = titleWithoutRepeatedYear(event.date, event.title.en);
    const after = afterTitle ? `${event.date.trim()} • ${afterTitle}` : event.date.trim();
    console.log(`${before}  =>  ${after}`);
  }

  console.log("\nNO EVENT INTRODUCTION");
  for (const event of events) {
    const card = cardContent(event, "en");
    if (card.eventIntro.length) continue;
    console.log(`${event.date}\t${event.title.en}`);
  }

  console.log("\nEXTRA VIDEOS");
  for (const event of events) {
    const card = cardContent(event, "en");
    for (const video of card.omittedVideos) console.log(`${event.date}\t${event.title.en}\t${video.title}\t${video.src}`);
  }
}

type SanityStory = { slug?: string; participantCode?: string; published?: boolean };
type SanityBlock = { _key?: string; _type?: string; participantCode?: string; titleEn?: string };
type SanityEvent = {
  _id: string;
  date?: string;
  slug?: string;
  title?: { en?: string };
  description?: { en?: string; es?: string; zh?: string };
  blocks?: SanityBlock[];
};

function hasText(value: SanityEvent["description"]) {
  return Boolean(value?.en?.trim() || value?.es?.trim() || value?.zh?.trim());
}

async function dryRunSanity() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
  const token = process.env.SANITY_API_WRITE_TOKEN?.trim();
  if (!projectId || !token) throw new Error("SANITY_API_WRITE_TOKEN is missing. Nothing was written.");
  const client = createClient({
    projectId,
    dataset,
    apiVersion: "2024-10-01",
    token,
    useCdn: false,
    perspective: "raw",
  });

  const docs = await client.fetch<SanityEvent[]>(
    `*[_type == "timelineEvent"] | order(displayOrder asc) {
      _id, date, description, "slug": slug.current, title,
      blocks[]{ _key, _type, participantCode, "titleEn": title.en }
    }`,
  );
  const stories = await client.fetch<SanityStory[]>(
    `*[_type == "story" && defined(slug.current)]{ "slug": slug.current, participantCode, published }`,
  );
  const published: StoryRef[] = stories
    .filter((story) => story.published !== false && story.slug && story.participantCode)
    .map((story) => ({ slug: story.slug as string, participantCode: story.participantCode as string }));

  const backupDir = path.join(process.cwd(), "source-documents/backups");
  mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `timeline-before-code-cleanup-${stamp}.json`);
  writeFileSync(backupFile, JSON.stringify(docs, null, 2));
  console.log(`\nBackup written: ${path.relative(process.cwd(), backupFile)} (${docs.length} documents)`);

  const described = docs.filter((doc) => hasText(doc.description));
  console.log(`\nSANITY DESCRIPTION FIELD: ${described.length} documents have text`);
  for (const doc of described) console.log(`${doc._id}\t${doc.date}\t${doc.description?.en?.slice(0, 80) || ""}`);

  console.log("\nSANITY CODE CHANGES");
  const missing: string[] = [];
  for (const doc of docs) {
    for (const block of doc.blocks || []) {
      if (block._type !== "timelineParticipant" || !block.participantCode) continue;
      const next = normalizeParticipantCode(block.participantCode);
      if (next !== block.participantCode.trim().toUpperCase()) {
        console.log(`${doc._id}\t${doc.date}\t${block.participantCode} => ${next}\t${block.titleEn || ""}`);
      }
      const href = storyPath(published, block.participantCode, "en");
      if (!href) missing.push(`${doc.date}\t${block.participantCode}\t${next}\t${doc.title?.en || ""}`);
    }
  }

  console.log("\nNO MATCHING STORY");
  for (const line of missing) console.log(line);
  console.log("\nDry run only. No Sanity documents were changed.");
}

printLocalReport();
dryRunSanity().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Sanity dry run failed");
  process.exitCode = 1;
});
