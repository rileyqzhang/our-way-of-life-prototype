import assert from "node:assert/strict";
import test from "node:test";
import type { DocxBlock } from "@/lib/migration/docx";
import { articleDifference, blocksByLanguage, buildStoryDraft, documentRole, plainTextFromBlocks, portableTextFromBlocks, rowIsApproved, storySlug } from "@/lib/migration/docx-document";

const blocks: DocxBlock[] = [
  { kind: "paragraph", text: "Story 1 The first account", marks: ["strong"] },
  { kind: "paragraph", text: "The people were there with their family.", marks: [] },
  { kind: "paragraph", text: "“A short quoted line.”", marks: ["em"] },
];

test("numbered sections stay inside one portable-text article", () => {
  const article = portableTextFromBlocks(blocks, "story-bmnj");
  assert.equal(article[0].style, "h2");
  assert.equal(article[1].style, "normal");
  assert.equal(article[2].style, "blockquote");
  assert.ok(article[0].children[0].marks.includes("strong"));
  const plain = plainTextFromBlocks(blocks);
  assert.match(plain, /Story 1 The first account\n\nThe people/);
  const draft = buildStoryDraft({
    canonical: "bmnj",
    originalCode: "BMNJ6",
    filename: "BMNJ6 Stories.docx",
    relativePath: "BMNJ6 Stories.docx",
    driveId: "drive",
    collection: "africanAmerican",
    role: "primary",
    blocks,
    images: [],
    links: { relatedEventIds: ["known", "missing"], missingTimelineIds: ["timeline-missing"], quotations: [], portraitSrc: undefined },
  });
  assert.equal(draft.storyId, "story-bmnj");
  assert.equal(draft.draftId, "drafts.story-bmnj");
  assert.equal(draft.document.collection, "africanAmerican");
  assert.equal(draft.document.published, false);
  assert.equal("es" in draft.document.body, false);
  assert.equal("es" in draft.document.article, false);
  assert.deepEqual(
    draft.document.relatedEvents?.map((event: { _ref: string }) => event._ref),
    ["timeline-known"],
  );
});

test("Chinese story text stays in zh and short English headings stay out of the public body", () => {
  const chinese: DocxBlock[] = [
    { kind: "paragraph", text: "CSSF6 Narrative", marks: [] },
    { kind: "paragraph", text: "Stories of CP from childhood (0-12)", marks: [] },
    { kind: "paragraph", text: "她和他们在社区里参加了很多活动，并且帮助了邻居。".repeat(12), marks: [] },
  ];
  const split = blocksByLanguage(chinese);
  assert.equal(split.unclassified, 0);
  assert.ok(split.groups.zh.length > 0);
  const draft = buildStoryDraft({
    canonical: "cssf",
    originalCode: "CSSF6",
    filename: "Final_CSSF6.docx",
    relativePath: "Final_CSSF6.docx",
    driveId: "",
    collection: "chinese",
    role: "primary",
    blocks: chinese,
    images: [],
    links: { relatedEventIds: [], missingTimelineIds: [], quotations: [], portraitSrc: undefined },
  });
  assert.equal("zh" in draft.document.body, true);
  assert.equal("en" in draft.document.body, false);
  assert.equal("en" in draft.document.article, true);
  assert.equal(draft.document.collection, "chinese");
});

test("two MLNJ files stay separate and FRNJ is never approved", () => {
  const files = [
    { filename: "MLNJ6 Finalized.docx", relativePath: "MLNJ/MLNJ6 Finalized.docx", storySectionCount: 23 },
    { filename: "MLNJ Elicitation Exercise- Sent to participant.docx", relativePath: "MLNJ/elicitation.docx", storySectionCount: 0 },
  ];
  assert.equal(documentRole(files[0], files), "primary");
  assert.equal(documentRole(files[1], files), "additional");
  assert.equal(storySlug("mlnj", "additional", files[1].filename), "mlnj-elicitation");
  const only = new Set(["bmnj", "etny", "hsnj", "mlnj", "rbny", "senj", "wpny"]);
  assert.equal(rowIsApproved({ proposedAction: "Create", normalizedCode: "MLNJ", slug: "mlnj" }, only), true);
  assert.equal(rowIsApproved({ proposedAction: "Review", normalizedCode: "MLNJ", slug: "mlnj-elicitation" }, only), false);
  assert.equal(rowIsApproved({ proposedAction: "Review", normalizedCode: "MLNJ", slug: "mlnj-elicitation" }, new Set(["mlnj-elicitation"])), true);
  assert.equal(rowIsApproved({ proposedAction: "Preserve", normalizedCode: "FRNJ", slug: "frnj" }, new Set(["frnj"])), false);
});

test("article difference reports counts without copying either article", () => {
  const difference = articleDifference("One paragraph.\n\nStory 1", "One paragraph.\n\nA different edited article.");
  assert.equal(difference.identicalParagraphs, 1);
  assert.equal(difference.docxOnlyParagraphs, 1);
  assert.equal(difference.sameText, false);
  assert.equal("text" in difference, false);
});
