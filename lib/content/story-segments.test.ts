import assert from "node:assert/strict";
import test from "node:test";
import { groupStorySegments, localizedPlain, readingFallback, segmentAnchorId, storyContentLocale } from "@/lib/content/story-segments";

test("segments stay in life-stage order and unstaged stories come last", () => {
  const stages = groupStorySegments(
    [
      { _key: "late", quote: { en: "A later adulthood memory" }, lifeStage: "olderAdulthood", body: { en: [{ children: [{ text: "Later." }] }] } },
      { _key: "open", quote: { en: "A story without a stage" }, body: { en: [{ children: [{ text: "Open." }] }] } },
      { _key: "young", quote: { en: "Growing up in Harlem" }, shortTitle: { en: "Harlem" }, lifeStage: "youth", body: { en: [{ children: [{ text: "Youth." }] }] } },
      { _key: "adult", quote: { en: "Moving to New Jersey" }, lifeStage: "adulthood" },
      { _key: "blank", quote: { en: "   " }, lifeStage: "youth" },
    ],
    "en",
  );

  assert.deepEqual(
    stages.map((stage) => [stage.title, stage.empty, stage.segments.map((segment) => segment.timelineTitle)]),
    [
      ["Youth and Adolescence (-18)", false, ["Harlem"]],
      ["Adulthood (20-59)", false, ["Moving to New Jersey"]],
      ["Older Adulthood (60+)", false, ["A later adulthood memory"]],
      ["Other Stories", false, ["A story without a stage"]],
    ],
  );
  assert.equal(stages[0].segments[0].id, segmentAnchorId("Growing up in Harlem", "young"));
});

test("a story with one section still keeps the empty stages and omits Other Stories", () => {
  const stages = groupStorySegments([{ _key: "only", quote: { en: "One memory" }, lifeStage: "adulthood" }], "en");
  assert.deepEqual(
    stages.map((stage) => [stage.id, stage.empty]),
    [
      ["youth", true],
      ["adulthood", false],
      ["olderAdulthood", true],
    ],
  );
});

test("a story page uses the language that actually has the story", () => {
  const spanish = { body: { es: "La historia completa." }, headline: { es: "Una cita." } };
  assert.equal(storyContentLocale(spanish, "en"), "es");
  assert.equal(storyContentLocale(spanish, "es"), "es");
  assert.equal(storyContentLocale({ body: { en: "English.", zh: "中文故事更长一些。" } }, "es"), "zh");
});

test("missing translations fall back to English and anchors stay on the English title", () => {
  assert.equal(localizedPlain({ en: "English title", es: "" }, "es"), "English title");
  assert.equal(localizedPlain({ en: "", zh: "中文" }, "en"), "");
  const stages = groupStorySegments(
    [
      {
        _key: "zh",
        quote: { en: "Stand up for your rights and for your community today", zh: "" },
        lifeStage: "youth",
      },
    ],
    "zh",
  );
  assert.equal(stages[0].segments[0].title, "Stand up for your rights and for your community today");
  assert.equal(stages[0].segments[0].timelineTitle, "Stand up for your rights and for your…");
  assert.equal(stages[0].segments[0].id, "segment-stand-up-for-your-rights-and-for-your-community-today");
});

test("duplicate English titles get distinct anchors", () => {
  const stages = groupStorySegments(
    [
      { _key: "a", quote: { en: "Same title" }, lifeStage: "youth" },
      { _key: "b", quote: { en: "Same title" }, lifeStage: "youth" },
    ],
    "en",
  );
  assert.deepEqual(
    stages[0].segments.map((segment) => segment.id),
    ["segment-same-title", "segment-same-title-b"],
  );
});

test("an existing article stays available when no segments have been written", () => {
  const fallback = readingFallback(
    { en: [{ children: [{ text: "Short." }] }] },
    { en: "The full story from the original archive." },
    "en",
  );
  assert.equal(fallback?.kind, "plain");
  assert.match(fallback?.paragraphs[0] || "", /full story/);
});

test("an elicitation section in the old full story is not shown", () => {
  const fallback = readingFallback(
    {
      en: [
        { style: "normal", children: [{ text: "Before." }] },
        { style: "normal", children: [{ text: "Elicitation Document" }] },
        { style: "normal", children: [{ text: "There was two occasions I was down at the Supreme Court." }] },
        { style: "normal", children: [{ text: "What is civic participation (CP)?" }] },
        { style: "h2", children: [{ text: "Story 1: A title" }] },
        { style: "normal", children: [{ text: "The story itself." }] },
      ],
    },
    {
      en: "Before.\n\nElicitation Document\n\nThere was two occasions I was down at the Supreme Court.\n\nWhat is civic participation (CP)?\n\nStory 1: A title\n\nThe story itself.",
    },
    "en",
  );
  const text = (fallback?.blocks || []).map((block) => (block.children || []).map((child) => child.text || "").join("")).join("\n");
  assert.equal(text.includes("Elicitation"), false);
  assert.equal(text.includes("Supreme Court"), false);
  assert.match(text, /Before/);
  assert.match(text, /What is civic participation/);
  assert.match(text, /The story itself/);
});
