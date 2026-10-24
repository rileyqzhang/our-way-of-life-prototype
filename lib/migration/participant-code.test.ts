import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { participantSlug } from "@/lib/content/derive";
import { blocksFromHtml, describeBlocks, extractDocx } from "@/lib/migration/docx";
import { discoverDocxFiles } from "@/lib/migration/docx-files";
import { codeFromFilename, normalizeParticipantCode, participantCollisions, preferCanonicalStory } from "@/lib/migration/participant-code";

test("normalizeParticipantCode strips trailing numbers only", () => {
  assert.equal(normalizeParticipantCode(" BMNJ6 "), "BMNJ");
  assert.equal(normalizeParticipantCode("etny6"), "ETNY");
  assert.equal(normalizeParticipantCode("FRNJ6"), "FRNJ");
  assert.equal(normalizeParticipantCode("HSNJ6"), "HSNJ");
  assert.equal(normalizeParticipantCode("RBNY7"), "RBNY");
  assert.equal(normalizeParticipantCode("SENJ6"), "SENJ");
  assert.equal(normalizeParticipantCode("WPNY7"), "WPNY");
  assert.equal(normalizeParticipantCode("JMWE23"), "JMWE");
  assert.equal(normalizeParticipantCode("AAWE23"), "AAWE");
  assert.equal(normalizeParticipantCode("MLNJ"), "MLNJ");
});

test("filename and collision detection keep numbered codes on one participant", () => {
  assert.equal(codeFromFilename("BMNJ6 Stories.docx"), "BMNJ");
  assert.equal(codeFromFilename("FRNJ6 Stories-Elicitation Final.docx"), "FRNJ");
  assert.equal(codeFromFilename("RBNY7 stories final.docx"), "RBNY");
  assert.equal(codeFromFilename("MLNJ Elicitation Exercise- Sent to participant.docx"), "MLNJ");
  assert.equal(codeFromFilename("ETNY6 Stories- FInal.docx"), "ETNY");
  assert.equal(codeFromFilename("ERoWE23 Stories.docx"), "EROWE");
  assert.equal(codeFromFilename("JMWE23-FINAL Edited stories (Published).docx"), "JMWE");
  assert.equal(codeFromFilename("Final_SHOK7.docx"), "SHOK");
  assert.equal(codeFromFilename("AAWE23 Stories_V1(EDITED FINAL) edit (Published).docx"), "AAWE");
  const collisions = participantCollisions(["FRNJ", "frnj6", "BMNJ", "BMNJ6"]);
  assert.deepEqual(
    collisions.map((collision) => collision.canonical),
    ["BMNJ", "FRNJ"],
  );
  const stories = preferCanonicalStory([
    { slug: "frnj6", participantCode: "FRNJ6" },
    { slug: "frnj", participantCode: "FRNJ" },
  ]);
  assert.deepEqual(stories.map((story) => story.slug), ["frnj"]);
  assert.equal(
    participantSlug({
      type: "participant",
      code: "FRNJ6",
      href: "https://www.ourwayoflifearchive.com/s/stories/frnj6",
      avatar: "",
      title: { en: "FRNJ6 | The Groveland Four", es: "", zh: "" },
    }),
    "frnj",
  );
});

test("docx html keeps headings, emphasis, links, and language sections", () => {
  const blocks = blocksFromHtml(
    "<h1>English</h1><p>The people were there with <strong>their</strong> <em>family</em> and a <a href=\"https://example.com\">link</a>.</p><h1>Second interview</h1><p>Ella está en la comunidad porque su familia también está allí.</p>",
  );
  const described = describeBlocks(blocks);
  assert.equal(blocks[1].marks.join(","), "strong,em,link");
  assert.equal(blocks[1].href, "https://example.com");
  assert.deepEqual(described.storyBoundaries, ["Second interview"]);
  assert.ok(described.languages.includes("en"));
  assert.ok(described.languages.includes("es"));
});

test("discoverDocxFiles scans subfolders and separates invalid files", () => {
  const root = mkdtempSync(path.join(tmpdir(), "owol-discover-"));
  const nested = path.join(root, "African American Stories", "MLNJ");
  mkdirSync(nested, { recursive: true });
  const python = spawnSync("python3", ["-c", PYTHON, root, path.join(nested, "MLNJ6 Finalized.docx")], { encoding: "utf8" });
  assert.equal(python.status, 0, python.stderr);
  writeFileSync(path.join(root, "African American Stories", "BMNJ6 Stories.docx"), "https://drive.google.com/open?id=abc");
  const found = discoverDocxFiles(root);
  const byName = new Map(found.map((file) => [file.filename, file]));
  assert.equal(byName.get("MLNJ6 Finalized.docx")?.status, "valid");
  assert.equal(byName.get("MLNJ6 Finalized.docx")?.normalizedCode, "MLNJ");
  assert.equal(byName.get("BMNJ6 Stories.docx")?.status, "invalid");
  assert.match(byName.get("BMNJ6 Stories.docx")?.detail || "", /Google Drive shortcut/);
  rmSync(root, { recursive: true, force: true });
});

test("extractDocx reads a generated document", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "owol-docx-"));
  const docx = path.join(root, "SENJ6 Stories-finalized.docx");
  const python = spawnSync("python3", ["-c", PYTHON, root, docx], { encoding: "utf8" });
  assert.equal(python.status, 0, python.stderr);
  const extracted = await extractDocx(docx);
  assert.ok(extracted.paragraphCount >= 1);
  assert.ok(extracted.blocks.some((block) => block.text.includes("Hello archive")));
  assert.ok(extracted.blocks.some((block) => block.marks.includes("strong")));
  rmSync(root, { recursive: true, force: true });
});

const PYTHON = `
import sys, zipfile
from pathlib import Path
root, dest = sys.argv[1], sys.argv[2]
content_types = """<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>"""
rels = """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""
document = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>English</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Hello archive</w:t></w:r></w:p>
  </w:body>
</w:document>"""
Path(root).mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(dest, "w") as archive:
    archive.writestr("[Content_Types].xml", content_types)
    archive.writestr("_rels/.rels", rels)
    archive.writestr("word/document.xml", document)
`;
