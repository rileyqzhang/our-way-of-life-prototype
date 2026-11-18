import assert from "node:assert/strict";
import test from "node:test";
import { closeTimelineCard, openTimelineCard } from "@/lib/timeline/open-cards";

test("opening a card keeps the others and does not open the same node twice", () => {
  assert.deepEqual(openTimelineCard(["event-a"], "event-b"), ["event-a", "event-b"]);
  assert.deepEqual(openTimelineCard(["event-a", "event-b"], "event-a"), ["event-a", "event-b"]);
});

test("closing one card leaves the rest in place", () => {
  assert.deepEqual(closeTimelineCard(["event-a", "event-b", "event-c"], "event-a"), ["event-b", "event-c"]);
  assert.deepEqual(closeTimelineCard(["event-b"], "event-a"), ["event-b"]);
});
