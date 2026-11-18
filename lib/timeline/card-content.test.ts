import assert from "node:assert/strict";
import test from "node:test";
import { cardContent, formatQuote, type StoryRef } from "@/lib/timeline/card-content";
import type { TimelineEvent } from "@/lib/timeline/types";

const stories: StoryRef[] = [
  { slug: "mgnj", participantCode: "MGNJ" },
  { slug: "mlnj", participantCode: "MLNJ" },
  { slug: "senj", participantCode: "SENJ" },
];

const event: TimelineEvent = {
  id: "sample",
  date: "1400s",
  title: { en: "1400s Colonization of the Americas", es: "", zh: "" },
  blocks: [
    {
      type: "paragraph",
      text: { en: "A movement note that stays above the stories.", es: "", zh: "" },
    },
    {
      type: "participant",
      code: "SENJ6",
      href: "https://example.com/mgnj",
      avatar: "https://images.unsplash.com/photo-example",
      title: { en: "MGNJ", es: "", zh: "" },
    },
    {
      type: "paragraph",
      text: { en: '"When we were conquered there was cruelty."', es: "", zh: "" },
    },
    {
      type: "paragraph",
      text: { en: "The body of MGNJ's account.", es: "", zh: "" },
    },
    {
      type: "participant",
      code: "MLNJ",
      href: "https://example.com/mlnj",
      avatar: "/timeline/mlnj.jpg",
      title: { en: "MLNJ", es: "", zh: "" },
    },
    {
      type: "paragraph",
      text: { en: '"They took us out of our history."', es: "", zh: "" },
    },
    {
      type: "paragraph",
      text: { en: "[Advice from this elder mother]\nTake it easy and love your family.", es: "", zh: "" },
    },
    {
      type: "video",
      src: "https://www.youtube.com/embed/ebRxYPwVCUw",
      title: "A talk",
    },
    {
      type: "video",
      src: "https://www.youtube.com/embed/second-video",
      title: "A second talk",
    },
  ],
};

test("card content keeps the event introduction separate and links the canonical story", () => {
  const card = cardContent(event, "en", stories);
  assert.equal(card.hero, '"When we were conquered there was cruelty."');
  assert.equal(formatQuote(card.hero), "\u201cWhen we were conquered there was cruelty.\u201d");
  assert.equal(card.kicker, "1400s \u2022 Colonization of the Americas");
  assert.deepEqual(card.eventIntro, ["A movement note that stays above the stories."]);
  assert.deepEqual(
    card.stories.map((story) => [story.code, story.href]),
    [
      ["SENJ", "/en/stories/senj"],
      ["MLNJ", "/en/stories/mlnj"],
    ],
  );
  assert.equal(card.stories[0].body[0], "The body of MGNJ's account.");
  assert.equal(card.stories[0].body.includes("A movement note that stays above the stories."), false);
  assert.equal(card.elderAdvice?.title, "Advice from this elder mother");
  assert.equal(card.media.length, 1);
  assert.equal(card.media[0].kind, "video");
  assert.equal(card.omittedVideos[0]?.title, "A second talk");
});

test("a participant without a story document has no link", () => {
  const card = cardContent(event, "en", stories.filter((story) => story.participantCode !== "MLNJ"));
  assert.equal(card.stories[1].href, null);
});

test("the year label keeps the time point's own writing", () => {
  const harlem: TimelineEvent = {
    ...event,
    date: "1920s",
    title: { en: "1920s Harlem Renaissance", es: "", zh: "" },
  };
  const card = cardContent(harlem, "en", stories);
  assert.equal(card.yearLabel, "1920s");
  assert.equal(card.kicker, "1920s \u2022 Harlem Renaissance");
});

test("a participant story does not replace a missing event introduction", () => {
  const bare: TimelineEvent = {
    ...event,
    blocks: event.blocks.filter((block) => !(block.type === "paragraph" && block.text.en.startsWith("A movement"))),
  };
  const card = cardContent(bare, "en", stories);
  assert.deepEqual(card.eventIntro, []);
  assert.equal(card.stories[0]?.body[0], "The body of MGNJ's account.");
});

test("a straight quote is not wrapped twice", () => {
  assert.equal(formatQuote('"Already quoted."'), "\u201cAlready quoted.\u201d");
  assert.equal(formatQuote("\u201cAlready quoted.\u201d"), "\u201cAlready quoted.\u201d");
  assert.equal(formatQuote("Plain words"), "\u201cPlain words\u201d");
});

test("a node without a video uses the first site photo and not an unsplash stand-in", () => {
  const plain: TimelineEvent = {
    ...event,
    blocks: event.blocks.filter((block) => block.type !== "video"),
  };
  const card = cardContent(plain, "en", stories);
  assert.equal(card.media[0]?.kind, "photo");
  if (card.media[0]?.kind === "photo") assert.equal(card.media[0].src, "/timeline/mlnj.jpg");
});
