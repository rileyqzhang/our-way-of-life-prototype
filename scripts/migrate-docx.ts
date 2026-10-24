import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@sanity/client";
import { isStoryCollection } from "@/lib/content/collections";
import { verifiedCommunityFor } from "@/lib/migration/communities";
import { archiveLinks, articleDifference, buildStoryDraft, documentRole, rowIsApproved, storySlug, type DocumentRole } from "@/lib/migration/docx-document";
import { discoverDocxFiles, type DiscoveredDocx } from "@/lib/migration/docx-files";
import { africanAmericanSources, docxCommunity, type DocxCommunity } from "@/lib/migration/docx-sources";
import { extractDocx } from "@/lib/migration/docx";
import { hasWeakReference, referencedIds } from "@/lib/migration/references";
import { canonicalParticipantSlug, normalizeParticipantCode, participantCollisions } from "@/lib/migration/participant-code";
import { slugFromHref } from "@/lib/migration/catalog";
import { timelineEvents } from "@/lib/timeline/events";

loadEnvConfig(process.cwd());

const REPORT_DIR = path.join("cms", "seed", "docx");
const INVENTORY_PATH = path.join("cms", "seed", "weebly", "inventory.json");

type InventoryStory = {
  slug: string;
  participantCode: string;
  status: string;
  languages: { en?: boolean; es?: boolean; zh?: boolean };
  paragraphCounts?: { en?: number; es?: number; zh?: number };
};

type SanityStory = {
  _id: string;
  slug?: string;
  participantCode?: string;
  collection?: string | null;
  migration?: { source?: string };
};

type SourceStatus = "Read successfully" | "Not accessible" | "Missing" | "Invalid document" | "Extraction failed";
type ProposedAction = "Create" | "Supplement" | "Skip" | "Review" | "Preserve";

type ReportRow = {
  originalFilename: string | null;
  relativePath: string | null;
  bytes: number;
  originalCode: string;
  normalizedCode: string;
  verifiedCommunity: string;
  existingSanityStory: "Yes" | "No";
  existingWeeblyArticle: "Yes" | "No";
  languages: string;
  paragraphCount: number;
  storySectionCount: number;
  contentCharacters: number;
  imageCount: number;
  articleStatus: "Complete" | "Partial" | "Missing";
  proposedAction: ProposedAction;
  proposedStoryId: string | null;
  proposedDraftId: string | null;
  proposedSlug: string | null;
  existingSanityId: string | null;
  missingDependencies: string[];
  representation: string;
  editorialDifference: ReturnType<typeof articleDifference> | null;
  conflict: string;
  sourceStatus: SourceStatus;
  driveId: string;
  warnings: string[];
};

function inventoryStories() {
  if (!existsSync(INVENTORY_PATH)) return [] as InventoryStory[];
  const inventory = JSON.parse(readFileSync(INVENTORY_PATH, "utf8")) as { stories?: InventoryStory[] };
  return inventory.stories || [];
}

function timelineCodes() {
  const codes: string[] = [];
  for (const event of timelineEvents) {
    for (const block of event.blocks) {
      if (block.type === "participant") codes.push(block.code);
      if (block.type === "participant" && block.href) {
        const slug = slugFromHref(block.href);
        if (slug) codes.push(slug);
      }
    }
  }
  return codes;
}

async function sanityStories() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
  const token = process.env.SANITY_API_WRITE_TOKEN?.trim();
  if (!projectId) return [] as SanityStory[];
  const client = createClient({
    projectId,
    dataset,
    apiVersion: "2024-10-01",
    token,
    useCdn: false,
    perspective: "raw",
  });
  return client.fetch<SanityStory[]>(
    `*[_type=="story"]{_id,"slug":slug.current,participantCode,collection,migration,"bodyLength":length(body.en)}`,
  );
}

async function sanityContext() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
  const token = process.env.SANITY_API_WRITE_TOKEN?.trim();
  if (!projectId) return { stories: [] as SanityStory[], timelineIds: new Set<string>(), people: [] as { _id: string; name?: string }[] };
  const client = createClient({ projectId, dataset, apiVersion: "2024-10-01", token, useCdn: false, perspective: "raw" });
  const [stories, timeline, people] = await Promise.all([
    sanityStories(),
    client.fetch<{ _id: string }[]>(`*[_type=="timelineEvent"]{_id}`),
    client.fetch<{ _id: string; name?: string }[]>(`*[_type=="person"]{_id,name}`),
  ]);
  return { stories, timelineIds: new Set(timeline.map((event) => event._id)), people };
}

function writeClient() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
  const token = process.env.SANITY_API_WRITE_TOKEN?.trim();
  if (!projectId || !token) return null;
  return createClient({ projectId, dataset, apiVersion: "2024-10-01", token, useCdn: false });
}

function onlyArg(argv: string[]) {
  const match = argv.find((arg) => arg.startsWith("--only="));
  if (!match) return null;
  return new Set(match.slice("--only=".length).split(",").map((item) => item.trim().toLowerCase()).filter(Boolean));
}

function filesFor(canonical: string, files: DiscoveredDocx[]) {
  return files.filter((file) => file.normalizedCode.toLowerCase() === canonical);
}

function weeblyFor(canonical: string, stories: InventoryStory[]) {
  return stories.filter((story) => canonicalParticipantSlug(story.participantCode || story.slug) === canonical);
}

function propose(input: {
  canonical: string;
  read: boolean;
  unavailable: boolean;
  invalid: boolean;
  failed: boolean;
  role: DocumentRole;
  sanityUnavailable: boolean;
  protectedParticipant: boolean;
  storySections: number;
  paragraphCount: number;
  sanity?: SanityStory;
}): Pick<ReportRow, "articleStatus" | "proposedAction" | "conflict" | "representation"> {
  const representation =
    input.role === "additional"
      ? "Separate Story document for the same Participant. It is not merged into the primary story."
      : "One Story document. Numbered sections stay in that article as headings and are not separate Sanity documents.";
  if (input.failed) return { articleStatus: "Missing", proposedAction: "Review", representation, conflict: "The DOCX archive was valid, but text extraction failed." };
  if (input.invalid) return { articleStatus: "Missing", proposedAction: "Review", representation, conflict: "The file is not a Word document." };
  if (input.unavailable) return { articleStatus: "Missing", proposedAction: "Review", representation, conflict: "The file could not be read." };
  if (!input.read || !input.paragraphCount) {
    return { articleStatus: "Missing", proposedAction: "Review", representation, conflict: "No readable Word document matched this participant." };
  }
  if (input.protectedParticipant || input.sanity) {
    return {
      articleStatus: "Complete",
      proposedAction: "Preserve",
      representation,
      conflict: input.protectedParticipant
        ? `${input.canonical.toUpperCase()} already has a Sanity story. Its article was not changed.`
        : "An existing Sanity story already has this participant. Its article was not changed.",
    };
  }
  if (input.sanityUnavailable) {
    return { articleStatus: "Complete", proposedAction: "Review", representation, conflict: "Sanity could not be checked, so this story was not queued for creation." };
  }
  if (input.role === "additional") {
    return {
      articleStatus: "Complete",
      proposedAction: "Review",
      representation,
      conflict: "This second Word document was kept separate. It is not part of the default import.",
    };
  }
  const sectionNote =
    input.storySections > 1
      ? `${input.storySections} numbered sections are stored as headings inside this one story.`
      : "No numbered story labels were found. The paragraphs stay in their original order inside this one story.";
  return { articleStatus: "Complete", proposedAction: "Create", representation, conflict: sectionNote };
}

function statusFor(file: DiscoveredDocx | undefined, extracted: boolean): SourceStatus {
  if (!file) return "Missing";
  if (file.status === "unreadable") return "Not accessible";
  if (file.status === "invalid") return "Invalid document";
  if (!extracted) return "Extraction failed";
  return "Read successfully";
}

function driveIdFor(canonical: string) {
  return africanAmericanSources.find((source) => canonicalParticipantSlug(source.originalCode) === canonical)?.driveId || "";
}

function communityArg(argv: string[]) {
  const match = argv.find((arg) => arg.startsWith("--community="));
  return docxCommunity(match?.slice("--community=".length));
}

function discoverCommunityFiles(profile: DocxCommunity) {
  const seen = new Set<string>();
  const files = [];
  for (const root of profile.roots) {
    for (const file of discoverDocxFiles(root)) {
      if (seen.has(file.absolutePath)) continue;
      seen.add(file.absolutePath);
      files.push({ ...file, relativePath: path.relative(process.cwd(), file.absolutePath) });
    }
  }
  return files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

function blankPlan(): Pick<ReportRow, "contentCharacters" | "proposedStoryId" | "proposedDraftId" | "proposedSlug" | "existingSanityId" | "missingDependencies" | "representation" | "editorialDifference"> {
  return {
    contentCharacters: 0,
    proposedStoryId: null,
    proposedDraftId: null,
    proposedSlug: null,
    existingSanityId: null,
    missingDependencies: [],
    representation: "One Story document. Numbered sections stay in that article as headings and are not separate Sanity documents.",
    editorialDifference: null,
  };
}

async function storyBodies(slugs: string[]) {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
  const token = process.env.SANITY_API_WRITE_TOKEN?.trim();
  if (!projectId || !slugs.length) return new Map<string, string>();
  const client = createClient({ projectId, dataset, apiVersion: "2024-10-01", token, useCdn: false, perspective: "published" });
  const rows = await client.fetch<{ slug?: string; body?: string }[]>(
    `*[_type=="story" && slug.current in $slugs && !(_id in path("drafts.**"))]{"slug": slug.current, "body": coalesce(body.en, "") + "\\n\\n" + coalesce(body.es, "") + "\\n\\n" + coalesce(body.zh, "")}`,
    { slugs },
  );
  return new Map(rows.filter((row) => row.slug).map((row) => [row.slug as string, (row.body || "").trim()]));
}

async function main() {
  const profile = communityArg(process.argv);
  const apply = process.argv.includes("--apply");
  const only = onlyArg(process.argv);
  if (apply && (!only || !only.size)) {
    throw new Error("Refusing to import every story. Pass --only with the approved participant codes. Nothing was written.");
  }
  const files = discoverCommunityFiles(profile);
  console.log(`Local DOCX inventory for ${profile.title}`);
  for (const root of profile.roots) {
    const found = existsSync(root) ? discoverDocxFiles(root).length : 0;
    console.log(`scanned\t${root}\t${existsSync(root) ? `${found} docx` : "absent"}`);
  }
  if (!files.length) console.log("(no .docx files found)");
  for (const file of files) {
    console.log(`${file.status}\t${file.bytes}\t${file.originalCode || "-"}\t${file.normalizedCode || "-"}\t${file.relativePath}\t${file.detail}`);
  }
  const stories = inventoryStories();
  let remote: SanityStory[] = [];
  let timelineIds = new Set<string>();
  let people: { _id: string; name?: string }[] = [];
  let sanityNote = "";
  try {
    const context = await sanityContext();
    remote = context.stories;
    timelineIds = context.timelineIds;
    people = context.people;
  } catch {
    sanityNote = "Sanity could not be queried. Existing-story checks were skipped.";
  }
  const sanityBySlug = new Map(remote.filter((story) => story.slug).map((story) => [story.slug as string, story]));
  const prepared = new Map<string, ReturnType<typeof buildStoryDraft>>();
  const discoveredCodes = [...new Set(files.map((file) => file.normalizedCode.toLowerCase()).filter(Boolean))];
  const manifestCodes = profile.id === "africanAmerican" ? africanAmericanSources.map((source) => canonicalParticipantSlug(source.originalCode)) : [];
  const expected = [...new Set([...manifestCodes, ...discoveredCodes])].sort();
  let existingBodies = new Map<string, string>();
  try {
    existingBodies = await storyBodies(expected);
  } catch {
    sanityNote = sanityNote || "Existing Sanity articles could not be compared.";
  }
  const rows: ReportRow[] = [];
  const matched = new Set<string>();

  for (const canonical of expected) {
    const matches = filesFor(canonical, files);
    for (const file of matches) matched.add(file.relativePath);
    const weebly = weeblyFor(canonical, stories);
    const verified = verifiedCommunityFor(canonical);
    if (!matches.length) {
      const sanity = sanityBySlug.get(canonical);
      const decision = propose({
        canonical,
        read: false,
        unavailable: false,
        invalid: false,
        failed: false,
        role: "primary",
        sanityUnavailable: Boolean(sanityNote),
        protectedParticipant: profile.protectedSlugs.includes(canonical),
        storySections: 0,
        paragraphCount: 0,
        sanity,
      });
      rows.push({
        originalFilename: null,
        relativePath: null,
        bytes: 0,
        originalCode: normalizeParticipantCode(canonical),
        normalizedCode: normalizeParticipantCode(canonical),
        verifiedCommunity: profile.title,
        existingSanityStory: sanity ? "Yes" : "No",
        existingWeeblyArticle: weebly.some((story) => story.status === "extracted") ? "Yes" : "No",
        languages: "",
        paragraphCount: 0,
        storySectionCount: 0,
        imageCount: 0,
        ...blankPlan(),
        existingSanityId: sanity?._id || null,
        articleStatus: decision.articleStatus,
        proposedAction: decision.proposedAction,
        representation: decision.representation,
        conflict: decision.conflict,
        sourceStatus: "Missing",
        driveId: driveIdFor(canonical),
        warnings: [],
      });
      continue;
    }
    const extracted: { file: DiscoveredDocx; extract: Awaited<ReturnType<typeof extractDocx>> | null; sourceStatus: SourceStatus }[] = [];
    for (const file of matches) {
      let extract: Awaited<ReturnType<typeof extractDocx>> | null = null;
      let failed = false;
      if (file.status === "valid") {
        try {
          const safeName = file.relativePath.replace(/\.docx$/i, "").replace(/[^A-Za-z0-9]+/g, "-");
          extract = await extractDocx(file.absolutePath, path.join(profile.imageRoot, safeName, "images"));
        } catch {
          failed = true;
        }
      }
      extracted.push({ file, extract, sourceStatus: statusFor(file, Boolean(extract) && !failed) });
    }
    const roleInput = extracted.map((item) => ({
      filename: item.file.filename,
      relativePath: item.file.relativePath,
      storySectionCount: item.extract?.storySectionCount || 0,
    }));
    for (const item of extracted) {
      const role = documentRole(roleInput.find((candidate) => candidate.relativePath === item.file.relativePath) as (typeof roleInput)[number], roleInput);
      const slug = storySlug(canonical, role, item.file.filename);
      const sanity = sanityBySlug.get(slug) || (role === "primary" ? sanityBySlug.get(canonical) : undefined);
      const links = archiveLinks(canonical, timelineIds);
      const decision = propose({
        canonical,
        read: item.sourceStatus === "Read successfully",
        unavailable: item.sourceStatus === "Not accessible",
        invalid: item.sourceStatus === "Invalid document",
        failed: item.sourceStatus === "Extraction failed",
        role,
        sanityUnavailable: Boolean(sanityNote),
        protectedParticipant: profile.protectedSlugs.includes(canonical),
        storySections: item.extract?.storySectionCount || 0,
        paragraphCount: item.extract?.paragraphCount || 0,
        sanity,
      });
      let draft: ReturnType<typeof buildStoryDraft> | null = null;
      if (item.extract && item.sourceStatus === "Read successfully") {
        draft = buildStoryDraft({
          canonical,
          originalCode: item.file.originalCode,
          filename: item.file.filename,
          relativePath: item.file.relativePath,
          driveId: driveIdFor(canonical),
          collection: profile.collection,
          role,
          blocks: item.extract.blocks,
          images: item.extract.images,
          links,
        });
        prepared.set(draft.slug, draft);
      }
      const existingBody = existingBodies.get(canonical) || "";
      const difference = draft && existingBody ? articleDifference(draft.plain, existingBody) : null;
      const action = decision.proposedAction === "Create" && draft?.unclassified ? "Review" : decision.proposedAction;
      rows.push({
        originalFilename: item.file.filename,
        relativePath: item.file.relativePath,
        bytes: item.file.bytes,
        originalCode: item.file.originalCode,
        normalizedCode: item.file.normalizedCode,
        verifiedCommunity: profile.title,
        existingSanityStory: sanity ? "Yes" : "No",
        existingWeeblyArticle: weebly.some((story) => story.status === "extracted") ? "Yes" : "No",
        languages: draft
          ? [...draft.bodyLanguages, ...draft.headingLanguages.map((language) => `${language} headings`)].join(", ") || "None detected"
          : (item.extract?.languages || []).join(", ") || (item.sourceStatus === "Read successfully" ? "None detected" : ""),
        paragraphCount: item.extract?.paragraphCount || 0,
        storySectionCount: item.extract?.storySectionCount || 0,
        contentCharacters: draft?.plain.length || 0,
        imageCount: item.extract?.images.length || 0,
        articleStatus: decision.articleStatus,
        proposedAction: action,
        proposedStoryId: draft?.storyId || null,
        proposedDraftId: draft?.draftId || null,
        proposedSlug: draft?.slug || slug,
        existingSanityId: sanity?._id || null,
        missingDependencies: links.missingTimelineIds,
        representation: decision.representation,
        editorialDifference: difference,
        conflict: [
          decision.conflict,
          item.file.status !== "valid" ? item.file.detail : "",
          links.missingTimelineIds.length ? `${links.missingTimelineIds.length} timeline documents are not in Sanity. Those references were left off.` : "",
          draft?.unclassified ? `${draft.unclassified} paragraphs had no clear language and were kept with the largest language group.` : "",
          draft?.headingLanguages.length
            ? `${draft.headingLanguages.join(", ")} has only short headings, so those stay in the article field. The story text is in ${draft.bodyLanguages.join(", ")}.`
            : "",
          sanity && isStoryCollection(sanity.collection) && sanity.collection !== profile.collection
            ? `Published Community is ${sanity.collection}, which conflicts with ${profile.title}. The article was not changed.`
            : "",
          sanity && !isStoryCollection(sanity.collection)
            ? `The existing story has no Community. The source folder is ${profile.title}. The article was not changed.`
            : "",
          difference ? `DOCX and the Sanity article differ: ${difference.identicalParagraphs} identical paragraphs, ${difference.docxOnlyParagraphs} paragraphs only in the Word document, ${difference.sanityCharacters} characters in Sanity and ${difference.docxCharacters} in the Word document.` : "",
        ]
          .filter(Boolean)
          .join(" "),
        sourceStatus: item.sourceStatus,
        driveId: driveIdFor(canonical),
        warnings: (item.extract?.warnings || []).map((warning) => warning.slice(0, 180)),
      });
    }
  }

  const unmatched = files.filter((file) => !matched.has(file.relativePath));
  const duplicateCodes = expected
    .map((canonical) => ({
      canonical: canonical.toUpperCase(),
      files: filesFor(canonical, files).map((file) => file.relativePath),
    }))
    .filter((group) => group.files.length > 1);
  const codes = [
    ...africanAmericanSources.map((source) => source.originalCode),
    ...stories.map((story) => story.participantCode || story.slug),
    ...timelineCodes(),
    ...remote.map((story) => story.participantCode || story.slug || ""),
    ...files.map((file) => file.originalCode).filter(Boolean),
  ];
  const collisions = participantCollisions(codes).filter((collision) =>
    expected.includes(collision.canonical.toLowerCase()),
  );
  const summary = {
    discovered: files.length,
    read: rows.filter((row) => row.sourceStatus === "Read successfully").length,
    missing: rows.filter((row) => row.sourceStatus === "Missing").length,
    invalid: rows.filter((row) => row.sourceStatus === "Invalid document").length,
    extractionFailed: rows.filter((row) => row.sourceStatus === "Extraction failed").length,
    notAccessible: rows.filter((row) => row.sourceStatus === "Not accessible").length,
    duplicateCodes: duplicateCodes.length,
    unmatched: unmatched.length,
    review: rows.filter((row) => row.proposedAction === "Review").length,
    preserve: rows.filter((row) => row.proposedAction === "Preserve").length,
    wouldCreate: rows.filter((row) => row.proposedAction === "Create").length,
    wouldSupplement: rows.filter((row) => row.proposedAction === "Supplement").length,
    sanityWrites: 0,
  };
  const ready = rows.filter((row) => row.proposedAction === "Create").map((row) => row.proposedSlug).filter(Boolean);
  const report = {
    mode: "dry-run",
    writtenAt: new Date().toISOString(),
    community: profile.id,
    importDirectories: profile.roots,
    discovery: "Recursive filename match on the normalized participant code. Exact Drive filenames are not required.",
    sanityNote,
    localInventory: files.map((file) => ({
      relativePath: file.relativePath,
      bytes: file.bytes,
      originalCode: file.originalCode,
      normalizedCode: file.normalizedCode,
      status: file.status,
      detail: file.detail,
    })),
    documentsDiscovered: files.length,
    documentsRead: summary.read,
    unmatchedLocalFiles: unmatched.map((file) => file.relativePath),
    duplicateCodes,
    rows,
    collisions,
    summary,
    readyToCreate: ready,
    importCommand: ready.length ? `npx tsx scripts/migrate-docx.ts --community=${profile.id} --apply --only=${ready.join(",")}` : "",
  };
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(profile.reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote ${profile.reportPath}`);
  console.log(JSON.stringify(summary));
  for (const row of rows) {
    console.log(`${row.proposedAction}\t${row.normalizedCode}\t${row.contentCharacters} chars\t${row.storySectionCount} sections\t${row.proposedDraftId || "-"}\t${row.existingSanityStory}\t${row.relativePath || "-"}`);
  }
  if (!apply) return;
  await applyApproved(rows, prepared, only as Set<string>, timelineIds, people, profile.imageRoot);
}

async function applyApproved(
  rows: ReportRow[],
  prepared: Map<string, ReturnType<typeof buildStoryDraft>>,
  only: Set<string>,
  timelineIds: Set<string>,
  people: { _id: string; name?: string }[],
  imageRoot: string,
) {
  const client = writeClient();
  if (!client) throw new Error("SANITY_API_WRITE_TOKEN is missing or empty. Nothing was written.");
  const selected = rows.filter((row) => row.proposedSlug && rowIsApproved({ proposedAction: row.proposedAction, normalizedCode: row.normalizedCode, slug: row.proposedSlug }, only));
  if (!selected.length) throw new Error("No approved stories matched --only. Nothing was written.");
  for (const row of selected) {
    const draft = prepared.get(row.proposedSlug || "");
    if (!draft || !draft.draftId.startsWith("drafts.")) {
      console.log(`skip\t${row.proposedSlug}\tNo draft document was prepared.`);
      continue;
    }
    const existingId = await client.fetch<string | null>(
      `*[_type=="story" && (_id in $ids || slug.current == $slug)][0]._id`,
      { ids: [draft.storyId, draft.draftId], slug: draft.slug },
    );
    if (existingId) {
      console.log(`skip\t${row.proposedSlug}\t${existingId} already exists. It was not changed.`);
      continue;
    }
    const person = people.find((item) => item.name && normalizeParticipantCode(item.name) === row.normalizedCode);
    const photographs: Record<string, unknown>[] = [...(draft.document.photographs || [])];
    let imageFailed = false;
    for (const image of draft.embeddedImages) {
      const safeName = (row.relativePath || "").replace(/\.docx$/i, "").replace(/[^A-Za-z0-9]+/g, "-");
      const imagePath = path.join(imageRoot, safeName, "images", image.filename);
      if (!existsSync(imagePath)) {
        console.log(`skip\t${row.proposedSlug}\tExtracted image ${image.filename} is missing. Nothing was written for this story.`);
        imageFailed = true;
        break;
      }
      const asset = await client.assets.upload("image", createReadStream(imagePath), { filename: image.filename });
      photographs.push({
        _key: image._key,
        _type: "photograph",
        image: { _type: "image", asset: { _type: "reference", _ref: asset._id } },
        alt: { _type: "localeString", en: image.alt },
        source: image.source,
      });
    }
    if (imageFailed) continue;
    const document = {
      ...draft.document,
      participant: { _type: "reference", _ref: person?._id || draft.personId },
      photographs: photographs.length ? photographs : undefined,
      migration: { ...draft.document.migration, importedAt: new Date().toISOString() },
    };
    const known = new Set<string>([person?._id || draft.personId, ...timelineIds, ...photographs.flatMap((photo) => [...referencedIds(photo)])]);
    const missing = [...referencedIds(document)].filter((id) => !known.has(id));
    if (missing.length || hasWeakReference(document)) {
      console.log(`skip\t${row.proposedSlug}\tMissing referenced documents: ${missing.join(", ") || "weak reference"}. Nothing was written for this story.`);
      continue;
    }
    let transaction = client.transaction();
    if (!person) {
      transaction = transaction.createIfNotExists({
        _id: draft.personId,
        _type: "person",
        name: row.normalizedCode,
        roleKind: "participant",
      });
    }
    transaction = transaction.createIfNotExists(document as { _id: string; _type: string });
    await transaction.commit();
    console.log(`draft\t${draft.draftId}\tcreated`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "DOCX dry run failed.");
  process.exit(1);
});
