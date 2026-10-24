import assert from "node:assert/strict";
import test from "node:test";
import { buildStoryLayout } from "@/lib/content/story-layout";

test("story headings become chapters and timeline events stay in order", () => {
  const layout = buildStoryLayout({
    code: "SENJ",
    location: "Newark, NJ",
    summary: "A biography that is not the quotation.",
    body: "Story 1\n\nThe first account.\n\nStory 2\n\nThe second account.",
    lang: "en",
    quotations: [{ text: "“Stand up.”" }],
    relatedEvents: [
      { id: "timeline-a", date: "1954", title: "First event" },
      { id: "timeline-b", date: "1964", title: "Second event" },
    ],
  });

  assert.equal(layout.badge, "SENJ · Newark, NJ");
  assert.equal(layout.heroQuote, "“Stand up.”");
  assert.equal(layout.intro[0][0].text, "A biography that is not the quotation.");
  assert.deepEqual(layout.chapters.map((chapter) => chapter.tag), ["Story 1", "Story 2"]);
  assert.deepEqual(layout.chapters.map((chapter) => chapter.nodes.map((node) => node.label)), [["First event"], ["Second event"]]);
  assert.equal(layout.chapters[0].era, "1954");
  assert.equal(layout.chapters[0].sections[0].paragraphs[0].spans[0].text, "The first account.");
  assert.equal(layout.chapters.some((chapter) => /Youth and Adolescence/.test(chapter.tag)), false);
});

test("a story heading keeps its own quotation instead of the hero quotation", () => {
  const layout = buildStoryLayout({
    code: "SENJ",
    location: "",
    summary: "SENJ was born in Harlem and later moved to New Jersey, where she kept organizing with her neighbors.",
    body: "",
    lang: "en",
    article: {
      en: [
        { _type: "block", style: "h2", children: [{ text: "Story 1: “bringing whatever you can, whatever you have to offer…”" }] },
        { _type: "block", style: "normal", children: [{ text: "I think civic participation means bringing whatever you can." }] },
      ],
      es: [],
      zh: [],
    },
    quotations: [{ text: "“We call ourselves B three.”" }],
    relatedEvents: [],
  });

  assert.equal(layout.heroQuote, "“We call ourselves B three.”");
  assert.equal(layout.chapters[0].tag, "Story 1");
  assert.equal(layout.chapters[0].quote, "bringing whatever you can, whatever you have to offer…");
  assert.match(layout.intro[0][0].text, /born in Harlem/);
});

test("a short article does not replace the full story", () => {
  const story = "社区里的长故事。".repeat(40);
  const layout = buildStoryLayout({
    code: "JMOK",
    location: "",
    summary: "",
    body: story,
    lang: "zh",
    article: { en: [{ _type: "block", style: "normal", children: [{ text: "JMOK7" }] }], es: [], zh: [] },
    quotations: [],
    relatedEvents: [],
  });

  assert.match(layout.chapters[0].sections[0].paragraphs[0].spans[0].text, /社区里的长故事/);
  assert.equal(layout.chapters[0].sections[0].paragraphs[0].spans[0].text.includes("JMOK7"), false);
});

test("portable text keeps emphasis, links, and the requested language", () => {
  const layout = buildStoryLayout({
    code: "CSSF",
    location: "",
    summary: "",
    body: "",
    lang: "zh",
    article: {
      en: [{ _type: "block", style: "h2", children: [{ text: "Story 1" }] }],
      es: [],
      zh: [
        {
          _type: "block",
          style: "normal",
          children: [
            { text: "社区", marks: ["strong"] },
            { text: "里的故事".repeat(40), marks: ["link"] },
          ],
          markDefs: [{ _key: "link", _type: "link", href: "https://example.test" }],
        },
      ],
    },
    quotations: [],
    relatedEvents: [],
  });

  const spans = layout.chapters[0].sections[0].paragraphs[0].spans;
  assert.equal(spans[0].text, "社区");
  assert.equal(spans[0].strong, true);
  assert.equal(spans[1].href, "https://example.test");
  assert.equal(layout.badge, "CSSF");
});
