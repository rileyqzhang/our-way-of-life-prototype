import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@sanity/client";
import { prepareTimeline } from "@/lib/content/derive";
import { canonicalParticipantSlug } from "@/lib/migration/participant-code";
import { referencedIds } from "@/lib/migration/references";
import {
  documentShape,
  draftTimelineId,
  missingLocaleFields,
  participantSlugs,
  publishedStoryIdsBySlug,
  publishedTimelineId,
  sameTimelineEvent,
  sourceTimelineDocuments,
  timelineDocumentForCreate,
  timelineRowIsApproved,
  timelineShape,
  type TimelineDocument,
} from "@/lib/migration/timeline";
import { timelineEvents } from "@/lib/timeline/events";

loadEnvConfig(process.cwd());

const REPORT_PATH = path.join("cms", "seed", "timeline", "timeline-report.json");

type LiveEvent = {
  _id: string;
  slug?: string;
  date?: string;
  displayOrder?: number;
  title?: { en?: number; es?: number; zh?: number };
  blocks?: number;
  paragraphs?: number;
  participants?: number;
  videos?: number;
  links?: number;
};

type LiveRecord = { _id: string; slug?: string; name?: string };

function onlyArg(argv: string[]) {
  const match = argv.find((arg) => arg.startsWith("--only="));
  if (!match) return undefined;
  return new Set(match.slice("--only=".length).split(",").map((item) => item.trim()).filter(Boolean));
}

function imageState(src: string | undefined) {
  if (!src) return "empty";
  if (src.startsWith("http://") || src.startsWith("https://")) return "remote";
  const file = src.startsWith("/") ? path.join("public", src) : src;
  return existsSync(file) ? "local" : "missing";
}

async function sanityContext() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
  const token = process.env.SANITY_API_WRITE_TOKEN?.trim();
  if (!projectId) return null;
  const client = createClient({ projectId, dataset, apiVersion: "2024-10-01", token, useCdn: false, perspective: "raw" });
  const [events, stories, people] = await Promise.all([
    client.fetch<LiveEvent[]>(
      `*[_type=="timelineEvent"]{_id,"slug":slug.current,date,displayOrder,"title":{"en":length(title.en),"es":length(title.es),"zh":length(title.zh)},"blocks":count(blocks),"paragraphs":count(blocks[_type=="timelineParagraph"]),"participants":count(blocks[_type=="timelineParticipant"]),"videos":count(blocks[_type=="timelineVideo"]),"links":count(blocks[_type=="timelineLink"])}`,
    ),
    client.fetch<LiveRecord[]>(`*[_type=="story"]{_id,"slug":slug.current}`),
    client.fetch<LiveRecord[]>(`*[_type=="person"]{_id,name}`),
  ]);
  return { events, stories, people };
}

function storiesBySlug(records: LiveRecord[]) {
  return publishedStoryIdsBySlug(records);
}

function personReady(slug: string, people: LiveRecord[]) {
  const id = `person-${slug}`;
  return people.some((person) => person._id.replace(/^drafts\./, "") === id || (person.name && canonicalParticipantSlug(person.name) === slug));
}

function counts(document: TimelineDocument) {
  return {
    blocks: document.blocks.length,
    paragraphs: document.blocks.filter((block) => block._type === "timelineParagraph").length,
    participants: document.blocks.filter((block) => block._type === "timelineParticipant").length,
    videos: document.blocks.filter((block) => block._type === "timelineVideo").length,
    links: document.blocks.filter((block) => block._type === "timelineLink").length,
    title: { en: document.title.en?.length || 0, es: document.title.es?.length || 0, zh: document.title.zh?.length || 0 },
  };
}

function difference(document: TimelineDocument, live: LiveEvent) {
  const source = counts(document);
  return {
    date: document.date === (live.date || ""),
    displayOrder: document.displayOrder === live.displayOrder,
    title: source.title.en === (live.title?.en || 0) && source.title.es === (live.title?.es || 0) && source.title.zh === (live.title?.zh || 0),
    blocks: source.blocks === (live.blocks || 0),
    paragraphs: source.paragraphs === (live.paragraphs || 0),
    participants: source.participants === (live.participants || 0),
    videos: source.videos === (live.videos || 0),
    links: source.links === (live.links || 0),
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const only = onlyArg(process.argv);
  if (apply && (!only || !only.size)) {
    throw new Error("Refusing to import every timeline event. Pass --only with the approved event ids. Nothing was written.");
  }
  const events = prepareTimeline(timelineEvents);
  const documents = sourceTimelineDocuments();
  const duplicateIds = documents.map((document) => document.slug.current).filter((id, index, all) => all.indexOf(id) !== index);
  let remote: Awaited<ReturnType<typeof sanityContext>> = null;
  let sanityNote = "";
  try {
    remote = await sanityContext();
    if (!remote) sanityNote = "Sanity is not configured. Existing events were not checked.";
  } catch {
    sanityNote = "Sanity could not be queried. Existing events were not checked.";
  }
  const live = remote?.events || [];
  const storyReferences = storiesBySlug(remote?.stories || []);
  const availableStories = storyReferences.published;
  const people = remote?.people || [];
  const prepared = new Map<string, ReturnType<typeof timelineDocumentForCreate>>();
  const rows = documents.map((document, index) => {
    const event = events[index];
    const eventId = document.slug.current;
    const plan = timelineDocumentForCreate(document, availableStories);
    prepared.set(eventId, plan);
    const matches = live.filter((item) => sameTimelineEvent(item._id, eventId) || item.slug === eventId);
    const unexpected = matches.filter((item) => !sameTimelineEvent(item._id, eventId));
    const fidelity = JSON.stringify(timelineShape(event)) === JSON.stringify(documentShape(document));
    const missingTitle = missingLocaleFields(document.title);
    const missingParagraphs = document.blocks.filter((block) => block._type === "timelineParagraph" && missingLocaleFields(block.text).length).length;
    const images = document.blocks
      .filter((block) => block._type === "timelineParticipant" || block._type === "timelineLink")
      .map((block) => ({ block: block._type, state: imageState(block.legacySrc) }));
    const missingPeople = participantSlugs(document).filter((slug) => !personReady(slug, people));
    let action: "Create" | "Preserve" | "Review" = "Create";
    if (!fidelity || plan.problems.length || unexpected.length || sanityNote) action = "Review";
    else if (matches.length) action = "Preserve";
    const compared = matches.find((item) => item._id === document._id) || matches[0];
    return {
      eventId,
      date: document.date,
      displayOrder: document.displayOrder,
      proposedDocumentId: plan.draft._id,
      publishedId: document._id,
      existingSanityId: matches.map((item) => item._id),
      action,
      languages: (["en", "es", "zh"] as const).filter((language) => document.title[language]?.trim()),
      missingTitleLanguages: missingTitle,
      paragraphsMissingALanguage: missingParagraphs,
      counts: counts(document),
      omittedStoryIds: plan.omittedStoryIds,
      draftOnlyStoryIds: plan.omittedStoryIds.filter((id) => storyReferences.draftOnly.has(id.replace(/^story-/, ""))),
      absentStoryIds: plan.omittedStoryIds.filter((id) => !storyReferences.draftOnly.has(id.replace(/^story-/, ""))),
      linkedStoryIds: [...referencedIds(plan.draft)].sort(),
      missingParticipants: missingPeople.map((slug) => `person-${slug}`),
      images,
      videos: document.blocks.filter((block) => block._type === "timelineVideo").length,
      externalLinks: document.blocks.filter((block) => block._type === "timelineLink").length,
      contentMatchesArchive: fidelity,
      existingDifference: compared ? difference(document, compared) : null,
      notes: [
        ...plan.problems,
        unexpected.length ? `This slug is already stored as ${unexpected.map((item) => item._id).join(", ")}.` : "",
        sanityNote,
        !fidelity ? "The Sanity document shape does not match the archive event." : "",
        plan.omittedStoryIds.length
          ? `Story references omitted because the published story does not exist: ${plan.omittedStoryIds.join(", ")}. No placeholder was created.`
          : "",
      ].filter(Boolean),
    };
  });
  const ready = rows.filter((row) => row.action === "Create").map((row) => row.eventId);
  const report = {
    writtenAt: new Date().toISOString(),
    source: "lib/timeline/events.json",
    sanityWrites: 0,
    summary: {
      total: rows.length,
      existing: rows.filter((row) => row.action === "Preserve").length,
      readyToCreate: ready.length,
      review: rows.filter((row) => row.action === "Review").length,
      duplicateIds: [...new Set(duplicateIds)],
      missingTranslations: rows.filter((row) => row.missingTitleLanguages.length || row.paragraphsMissingALanguage).map((row) => row.eventId),
      missingStoryReferences: [...new Set(rows.flatMap((row) => row.absentStoryIds))].sort(),
      draftOnlyStoryReferences: [...new Set(rows.flatMap((row) => row.draftOnlyStoryIds))].sort(),
      missingEventIds: ready,
      missingParticipants: [...new Set(rows.flatMap((row) => row.missingParticipants))].sort(),
      missingImages: rows.flatMap((row) => row.images.filter((image) => image.state === "missing" || image.state === "empty").map((image) => `${row.eventId}:${image.state}`)),
    },
    importCommand: ready.length ? `npx tsx scripts/migrate-timeline.ts --apply --only=${ready.join(",")}` : "",
    events: rows,
  };
  mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote ${REPORT_PATH}`);
  console.log(JSON.stringify({ ...report.summary, sanityWrites: 0 }));
  for (const row of rows) {
    console.log(`${row.action}\t${row.date}\t${row.proposedDocumentId}\texisting:${row.existingSanityId.join(",") || "-"}\tstories omitted:${row.omittedStoryIds.length}`);
  }
  if (!apply || !only) return;
  await applyApproved(rows, prepared, only);
}

async function applyApproved(
  rows: { eventId: string; action: string; proposedDocumentId: string }[],
  prepared: Map<string, ReturnType<typeof timelineDocumentForCreate>>,
  only: Set<string>,
) {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
  const token = process.env.SANITY_API_WRITE_TOKEN?.trim();
  if (!projectId || !token) throw new Error("SANITY_API_WRITE_TOKEN is missing or empty. Nothing was written.");
  const client = createClient({ projectId, dataset, apiVersion: "2024-10-01", token, useCdn: false, perspective: "raw" });
  const selected = rows.filter((row) => timelineRowIsApproved(row, only));
  if (!selected.length) throw new Error("No approved timeline events matched --only. Nothing was written.");
  for (const row of selected) {
    const plan = prepared.get(row.eventId);
    if (!plan || plan.problems.length || !plan.draft._id.startsWith("drafts.")) {
      console.log(`skip\t${row.eventId}\tThe draft was not valid.`);
      continue;
    }
    const existingId = await client.fetch<string | null>(`*[_type=="timelineEvent" && _id in $ids][0]._id`, {
      ids: [publishedTimelineId(row.eventId), plan.draft._id],
    });
    if (existingId) {
      console.log(`skip\t${row.eventId}\t${existingId} already exists. It was not changed.`);
      continue;
    }
    await client.createIfNotExists(plan.draft as { _id: string; _type: string });
    console.log(`create\t${plan.draft._id}`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Timeline migration failed.";
  console.error(message);
  process.exitCode = 1;
});
