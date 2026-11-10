import assert from "node:assert/strict";
import test from "node:test";
import { formatSegmentTitle, segmentTimelineTitle, titleHasQuotationMarks, truncateAtWordBoundary } from "@/lib/content/segment-title";

test("a short title is formatted for the timeline", () => {
  assert.equal(segmentTimelineTitle("stand up for your rights.", "A much longer quotation that should not appear"), "Stand up for your rights");
  assert.equal(formatSegmentTitle("… it gives me hope that maybe I will see resolution to this."), "… It gives me hope that maybe I will see resolution to this");
});

test("a missing short title is cut to eight words on a word boundary", () => {
  assert.equal(
    segmentTimelineTitle("", "Stand up for your rights and for your community today"),
    "Stand up for your rights and for your…",
  );
  assert.equal(truncateAtWordBoundary("Only five words are here"), "Only five words are here");
});

test("a decorative quotation mark is only for a title that already quotes", () => {
  assert.equal(titleHasQuotationMarks("Familia"), false);
  assert.equal(titleHasQuotationMarks("Su participación con la Cruz Roja"), false);
  assert.equal(titleHasQuotationMarks("You couldn’t be there and not soak it up"), false);
  assert.equal(titleHasQuotationMarks("“Esto que hacemos, no es individual”"), true);
  assert.equal(titleHasQuotationMarks('She said "we stayed together."'), true);
});

test("Chinese text is also cut on word boundaries", () => {
  const title = segmentTimelineTitle(undefined, "我在哈莱姆长大后来参加了更多社区服务工作并且一直坚持下去");
  assert.match(title, /…$/);
  assert.ok(!title.includes("并且"));
});
