import assert from "node:assert/strict";
import test from "node:test";
import { volumeTransitionName } from "@/lib/viewTransition";

test("each archive book keeps a distinct view transition name", () => {
  assert.equal(volumeTransitionName("latine"), "archive-book-latine");
  assert.equal(volumeTransitionName("africanAmerican"), "archive-book-african-american");
  assert.equal(volumeTransitionName("chinese"), "archive-book-chinese");
  const created = volumeTransitionName("color-check");
  assert.equal(created, "archive-book-color-check");
  const names = new Set([
    volumeTransitionName("latine"),
    volumeTransitionName("africanAmerican"),
    volumeTransitionName("chinese"),
    created,
  ]);
  assert.equal(names.size, 4);
});
