import assert from "node:assert/strict";
import test from "node:test";
import { toVortexNodes } from "@/components/timeline/vortex-model";
import { mergeTimeline, prepareTimeline } from "@/lib/content/derive";
import { referencedIds } from "@/lib/migration/references";
import {
  documentShape,
  draftTimelineId,
  publishedStoryIdsBySlug,
  publishedTimelineId,
  sameTimelineEvent,
  sourceTimelineDocuments,
  timelineDocumentForCreate,
  timelineRowIsApproved,
  timelineShape,
} from "@/lib/migration/timeline";
import { timelineEvents } from "@/lib/timeline/events";

test("archive timeline keeps dates, order, and block content in Sanity documents", () => {
  const events = prepareTimeline(timelineEvents);
  const documents = sourceTimelineDocuments();
  assert.equal(documents.length, events.length);
  assert.equal(documents.length, 34);
  assert.equal(documents[0].date, "1400s");
  assert.equal(documents[0]._id, "timeline-01-colonization-of-the-americas");
  assert.equal(new Set(documents.map((document) => document._id)).size, documents.length);
  for (const [index, event] of events.entries()) {
    const document = documents[index];
    assert.equal(document.displayOrder, index);
    assert.deepEqual(documentShape(document), timelineShape(event));
  }
});

test("missing story references are omitted and existing events stay unpublished", () => {
  const source = sourceTimelineDocuments()[0];
  const prepared = timelineDocumentForCreate(source, new Map());
  assert.equal(prepared.draft._id, draftTimelineId(source.slug.current));
  assert.ok(prepared.omittedStoryIds.some((id) => id === "story-mgnj"));
  assert.equal([...referencedIds(prepared.draft)].some((id) => id.startsWith("story-")), false);
  assert.equal(prepared.problems.length, 0);
  assert.equal(timelineRowIsApproved({ action: "Preserve", eventId: source.slug.current }, new Set([source.slug.current])), false);
  assert.equal(timelineRowIsApproved({ action: "Create", eventId: source.slug.current }, new Set([source.slug.current])), true);
  const linked = timelineDocumentForCreate(source, new Map([["mgnj", "362fbdab-460c-421b-ba63-61add1e64c86"]]));
  assert.equal(linked.omittedStoryIds.includes("story-mgnj"), false);
  assert.equal([...referencedIds(linked.draft)].includes("362fbdab-460c-421b-ba63-61add1e64c86"), true);
});

test("a draft-only story is not treated as a published reference", () => {
  const records = [
    { _id: "drafts.story-wpny", slug: "wpny" },
    { _id: "drafts.story-senj", slug: "senj" },
    { _id: "story-senj", slug: "senj" },
    { _id: "362fbdab-460c-421b-ba63-61add1e64c86", slug: "frnj" },
  ];
  const stories = publishedStoryIdsBySlug(records);
  assert.equal(stories.published.get("wpny"), undefined);
  assert.equal(stories.draftOnly.get("wpny"), "drafts.story-wpny");
  assert.equal(stories.published.get("senj"), "story-senj");
  assert.equal(stories.draftOnly.has("senj"), false);
  assert.equal(stories.published.has("dhnj"), false);
  assert.equal(stories.published.has("emnj"), false);
  assert.equal(sameTimelineEvent("drafts.timeline-06-1920-harlem-renaissance", "06-1920-harlem-renaissance"), true);
  assert.equal(sameTimelineEvent(publishedTimelineId("06-1920-harlem-renaissance"), "06-1920-harlem-renaissance"), true);

  const harlem = sourceTimelineDocuments().find((document) => document.slug.current === "06-1920-harlem-renaissance");
  assert.ok(harlem);
  const prepared = timelineDocumentForCreate(harlem, stories.published);
  assert.equal(prepared.draft._id, draftTimelineId("06-1920-harlem-renaissance"));
  assert.equal(prepared.omittedStoryIds.includes("story-wpny"), true);
  assert.equal([...referencedIds(prepared.draft)].includes("story-wpny"), false);
  assert.equal([...referencedIds(prepared.draft)].includes("drafts.story-wpny"), false);
  assert.equal(prepared.problems.length, 0);
});

test("a partial Sanity timeline keeps the local spiral order", () => {
  const local = prepareTimeline(timelineEvents);
  const remote = [{ ...local[0], title: { ...local[0].title, en: "Edited in Sanity" }, displayOrder: 20 }];
  const merged = mergeTimeline(remote, local);
  assert.equal(merged.length, 34);
  assert.equal(merged[0].id, local[0].id);
  assert.equal(merged[0].title.en, "Edited in Sanity");
  assert.equal(merged[0].displayOrder, 0);
  assert.equal(merged.map((event) => event.id).join(), local.map((event) => event.id).join());
  const localNodes = toVortexNodes(local, "en");
  const mergedNodes = toVortexNodes(merged, "en");
  assert.deepEqual(
    mergedNodes.map((node) => [node.id, node.spiralParam, node.isCore, node.isTerminal]),
    localNodes.map((node) => [node.id, node.spiralParam, node.isCore, node.isTerminal]),
  );
});

test("a complete Sanity timeline uses the published display order", () => {
  const local = prepareTimeline(timelineEvents);
  const remote = [...local].reverse().map((event, displayOrder) => ({ ...event, displayOrder }));
  const merged = mergeTimeline(remote, local);
  assert.equal(merged[0].id, remote[0].id);
  assert.equal(merged.length, 34);
});
