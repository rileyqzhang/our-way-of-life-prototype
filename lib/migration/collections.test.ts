import assert from "node:assert/strict";
import test from "node:test";
import { collectionDraft, planCollections, planStoryLinks } from "@/lib/migration/collections";

test("collection migration creates missing drafts and preserves existing documents", () => {
  const plan = planCollections([
    { slug: "latine", published: true, draft: false },
    { slug: "africanAmerican", published: false, draft: true },
  ]);
  assert.deepEqual(
    plan.map((row) => [row.slug, row.action]),
    [
      ["latine", "Preserve"],
      ["africanAmerican", "Preserve"],
      ["chinese", "CreateDraft"],
    ],
  );
  assert.equal(collectionDraft("chinese")._id, "drafts.collection-chinese");
  assert.equal(collectionDraft("chinese").slug.current, "chinese");
  assert.equal(collectionDraft("latine")._type, "collection");
});

test("story links never rewrite published stories or guess an unverified community", () => {
  const rows = planStoryLinks(
    [
      { id: "story-senj", legacy: "africanAmerican" },
      { id: "drafts.story-bmnj", legacy: "africanAmerican" },
      { id: "drafts.story-new", legacy: "africanAmerican", communitySlug: "africanAmerican" },
      { id: "drafts.story-open", legacy: "" },
      { id: "drafts.story-wait", legacy: "chinese" },
    ],
    ["africanAmerican"],
  );
  assert.deepEqual(rows.map((row) => [row.id, row.action]), [
    ["story-senj", "Skip"],
    ["drafts.story-bmnj", "LinkDraft"],
    ["drafts.story-new", "Skip"],
    ["drafts.story-open", "Skip"],
    ["drafts.story-wait", "Wait"],
  ]);
  assert.equal(rows[1].referenceId, "collection-africanAmerican");
});
