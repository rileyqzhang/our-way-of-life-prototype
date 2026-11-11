import assert from "node:assert/strict";
import test from "node:test";
import { collectionTheme, mergeCollections, storyCollectionSlug, type ArchiveCollection } from "@/lib/content/collections";

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

test("collection theme uses Sanity colors and falls back to brown and gold", () => {
  assert.deepEqual(collectionTheme({ gradientFrom: "#2E120D", gradientTo: "#1A0A07", accent: "#D9AD62", muted: "#B97D5F" }), {
    background: "linear-gradient(145deg, #2E120D 0%, #1A0A07 100%)",
    accent: "#D9AD62",
    muted: "#B97D5F",
  });
  const fallback = collectionTheme(undefined);
  assert.equal(fallback.background, "linear-gradient(145deg, #5b2509 0%, #2a1004 100%)");
  assert.equal(fallback.accent, "#D9AD62");
  assert.equal(collectionTheme({ gradientFrom: "#0E1B2E", accent: "red; background: url(x)" }).accent, "#D9AD62");
  assert.equal(collectionTheme({ gradientFrom: "#0E1B2E" }).background, "linear-gradient(145deg, #0E1B2E 0%, #0E1B2E 100%)");
});

test("story membership reads the collection reference only", () => {
  assert.equal(storyCollectionSlug("caribbean"), "caribbean");
  assert.equal(storyCollectionSlug(""), undefined);
  assert.equal(storyCollectionSlug(undefined), undefined);
  assert.equal(storyCollectionSlug("  latine  "), "latine");
});
