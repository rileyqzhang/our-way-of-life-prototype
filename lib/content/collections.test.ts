import assert from "node:assert/strict";
import test from "node:test";
import { mergeCollections, storyCollectionSlug, type ArchiveCollection } from "@/lib/content/collections";

const blank = { en: "", es: "", zh: "" };

test("published collections are added and legacy slugs keep their addresses", () => {
  const created: ArchiveCollection = {
    slug: "caribbean",
    name: { en: "Caribbean Stories", es: "", zh: "" },
    description: { en: "A new community collection.", es: "", zh: "" },
    label: blank,
    imageAlt: blank,
    displayOrder: 3,
  };
  const merged = mergeCollections([created]);
  assert.deepEqual(merged.map((collection) => collection.slug), ["latine", "africanAmerican", "chinese", "caribbean"]);
  assert.equal(merged[0].name.en, "Latine Immigrant Stories");
  assert.equal(merged[3].description.en, "A new community collection.");
});

test("a published collection can replace the fallback wording without changing the slug", () => {
  const merged = mergeCollections([
    {
      slug: "chinese",
      name: { en: "Chinese Immigrant Stories", es: "Nuevo nombre", zh: "" },
      description: blank,
      label: blank,
      imageAlt: blank,
      displayOrder: 5,
    },
  ]);
  const chinese = merged.find((collection) => collection.slug === "chinese");
  assert.equal(chinese?.name.es, "Nuevo nombre");
  assert.match(chinese?.description.en || "", /Labor history/);
  assert.equal(chinese?.displayOrder, 5);
  assert.ok(chinese?.image);
});

test("story membership prefers an explicit reference and does not infer an unknown legacy value", () => {
  assert.equal(storyCollectionSlug("caribbean", "latine"), "caribbean");
  assert.equal(storyCollectionSlug("", "africanAmerican"), "africanAmerican");
  assert.equal(storyCollectionSlug(undefined, "not-a-community"), undefined);
  assert.equal(storyCollectionSlug(undefined, ""), undefined);
});
