import { mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient, type SanityClient } from "@sanity/client";
import mammoth from "mammoth";
import { codeFromFilename, originalCodeFromFilename } from "../lib/migration/participant-code";
import { applyParticipantCode, parseStoryHtml, storyOutline, type PortableBlock, type StorySegmentPlan } from "../lib/migration/story-docx";

loadEnvConfig(process.cwd());

type LocaleCode = "en" | "es" | "zh";
type StoryRow = {
  _id: string;
  slug: string;
  participantCode: string;
  legacy: string | null;
  community: string | null;
};

function args(argv: string[]) {
  const positional = argv.filter((arg) => !arg.startsWith("--"));
  return {
    file: positional[0],
    slug: positional[1],
    write: argv.includes("--write"),
    all: argv.includes("--all"),
    batch1: argv.includes("--batch1"),
    batch2: argv.includes("--batch2"),
    outline: argv.includes("--outline"),
  };
}

function localeText(lang: LocaleCode, value: string) {
  return { _type: "localeText", [lang]: value };
}

function localeBlock(lang: LocaleCode, blocks: PortableBlock[]) {
  return { _type: "localeBlock", [lang]: blocks };
}

function segmentDocument(segment: StorySegmentPlan, lang: LocaleCode) {
  const document: {
    _type: "storySegment";
    _key: string;
    quote: ReturnType<typeof localeText>;
    isQuote: boolean;
    body: ReturnType<typeof localeBlock>;
    lifeStage?: string;
  } = {
    _type: "storySegment",
    _key: `segment-${segment.index}`,
    quote: localeText(lang, segment.title),
    isQuote: segment.isQuote === true,
    body: localeBlock(lang, segment.body),
  };
  if (segment.lifeStage) document.lifeStage = segment.lifeStage;
  return document;
}

function collectionFromPath(file: string) {
  if (file.includes("Latine Immigrant Stories")) return "latine";
  if (file.includes("Chinese Immigrant Stories")) return "chinese";
  if (file.includes("African American Stories")) return "africanAmerican";
  return "";
}

function detectLanguage(text: string): LocaleCode {
  const han = (text.match(/\p{Script=Han}/gu) || []).length;
  const letters = (text.match(/\p{L}/gu) || []).length || 1;
  if (han / letters > 0.2) return "zh";
  const words = text.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").match(/[a-z]+/g) || [];
  const spanish = new Set(["que", "del", "los", "las", "una", "para", "con", "por", "como", "pero", "porque", "cuando", "esta", "este", "historia", "desde", "entre", "sobre", "fue", "era", "tengo", "nosotros"]);
  const english = new Set(["the", "and", "of", "to", "that", "was", "for", "with", "this", "from", "they", "were", "have", "had", "story", "about", "when", "which", "their"]);
  let es = 0;
  let en = 0;
  for (const word of words) {
    if (spanish.has(word)) es += 1;
    if (english.has(word)) en += 1;
  }
  return es > 40 && es > en * 1.4 ? "es" : "en";
}

function firstWords(text: string, count: number, lang: LocaleCode) {
  const segmenter = new Intl.Segmenter(lang === "zh" ? "zh" : lang === "es" ? "es" : "en", { granularity: "word" });
  const parts = [...segmenter.segment(text)].filter((part) => part.isWordLike).slice(0, count);
  let result = "";
  for (const part of parts) {
    const han = /^\p{Script=Han}+$/u.test(part.segment);
    result += result && !han ? ` ${part.segment}` : part.segment;
  }
  return result;
}

const BATCH1 = ["ETNY", "HSNJ", "MLNJ", "RBNY", "SENJ", "WPNY", "LRNJ", "CSSF", "GJSF", "JMOK", "JZOK", "LLSF", "SHOK", "SLOK", "WLOK", "EBNJ", "MGNJ", "NCNJ"];
const BATCH2 = ["FRNJ", "AAWE", "ALWE", "AMWE", "CRWE", "EMWE", "ERWE", "EROWE", "JMWE", "LAWE", "MMWE", "MVWE", "NRWE", "RHWE"];

function planForFile(html: string, file: string) {
  const code = codeFromFilename(file) || originalCodeFromFilename(file);
  return applyParticipantCode(parseStoryHtml(html), code);
}

function stageCounts(plan: ReturnType<typeof parseStoryHtml>) {
  return {
    youth: plan.segments.filter((segment) => segment.lifeStage === "youth").length,
    adulthood: plan.segments.filter((segment) => segment.lifeStage === "adulthood").length,
    olderAdulthood: plan.segments.filter((segment) => segment.lifeStage === "olderAdulthood").length,
    other: plan.segments.filter((segment) => !segment.lifeStage).length,
  };
}

function printPlan(plan: ReturnType<typeof parseStoryHtml>, target: string, lang: LocaleCode, collection: string) {
  const stages = stageCounts(plan);
  console.log(`target\t${target}`);
  console.log(`language\t${lang}`);
  console.log(`collection\t${collection}`);
  console.log(`headline\t${plan.headline}`);
  console.log(`overview\t${firstWords(plan.overviewText, 15, lang)}`);
  console.log(`stages\t${stages.youth}\t${stages.adulthood}\t${stages.olderAdulthood}\t${stages.other}`);
  console.log(`unsplit\t${plan.unsplit ? "yes" : "no"}`);
  console.log(`outside\t${plan.outside.length}`);
  console.log(`unmatched\t${plan.unmatchedGroups.join(" | ") || "none"}`);
  if (plan.warnings.length) {
    console.log("\nwarnings");
    for (const warning of plan.warnings) console.log(warning);
  }
  console.log("\nbefore\tafter\twhere");
  for (const edit of plan.noteEdits) console.log(`${edit.before}\t${edit.after || "(deleted)"}\t${edit.where}`);
  console.log("\nwhere\thighlight");
  for (const phrase of plan.highlights) console.log(`${phrase.where}\t${phrase.text}`);
  console.log(`\nsegments\t${plan.segments.length}`);
  console.log(`highlights\t${plan.highlights.length}`);
  console.log(`noteEdits\t${plan.noteEdits.length}`);
}

async function storyClient(): Promise<SanityClient | null> {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
  try {
    const { getCliClient } = await import("sanity/cli");
    if (projectId && getCliClient.__internal__getToken?.()) {
      return getCliClient({ apiVersion: "2024-10-01" }).withConfig({
        projectId,
        dataset,
        useCdn: false,
        perspective: "raw",
      }) as unknown as SanityClient;
    }
  } catch {
    // The env token below is used when the Sanity CLI is not logged in.
  }
  const token = process.env.SANITY_API_WRITE_TOKEN?.trim();
  if (!projectId || !token) return null;
  return createClient({ projectId, dataset, apiVersion: "2024-10-01", token, useCdn: false, perspective: "raw" });
}

function draftIdFor(publishedId: string) {
  return publishedId.startsWith("drafts.") ? publishedId : `drafts.${publishedId}`;
}

function walkDocx(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith("~$") || entry === ".DS_Store") continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) files.push(...walkDocx(path));
    else if (/\.docx$/i.test(entry) && !path.includes("/extracted/")) files.push(path);
  }
  return files;
}

async function dryRunAll(client: SanityClient | null) {
  const stories = client
    ? await client.fetch<StoryRow[]>(`*[_type == "story"]{_id, "slug": slug.current, participantCode, "legacy": collection, "community": community->slug.current}`)
    : [];
  const collections = client
    ? await client.fetch<{ _id: string; slug: string }[]>(`*[_type == "collection"]{_id, "slug": slug.current}`)
    : [];
  const bySlug = new Map(stories.map((story) => [story.slug, story]));
  const collectionId = new Map(collections.map((collection) => [collection.slug, collection._id]));
  const lines = [
    "# Story import review",
    "",
    "Parse review. Unmatched group headings are listed with each person. This file does not publish anything.",
    "",
    "MLNJ uses `MLNJ6 Finalized.docx`. `MLNJ Elicitation Exercise- Sent to participant.docx` is not imported.",
    "",
    "A later `--write` creates or updates `drafts.<id>` only. Published documents stay as they are. Each document is backed up to `source-documents/backups/` first.",
    "",
    "Life-stage phrases live in `lib/migration/life-stage-groups.ts`.",
    "",
  ];
  const mismatches: string[] = [];
  const summaries: string[] = [];
  for (const file of walkDocx(join(process.cwd(), "source-documents"))) {
    if (/MLNJ Elicitation Exercise/i.test(file)) continue;
    const code = codeFromFilename(file) || originalCodeFromFilename(file);
    const slug = code.toLowerCase();
    const html = (await mammoth.convertToHtml({ path: file }, { styleMap: ["u => u", "highlight => mark"] })).value;
    const text = html.replace(/<[^>]+>/g, " ");
    const lang = detectLanguage(text);
    const plan = planForFile(html, file);
    const stages = stageCounts(plan);
    const folder = collectionFromPath(file);
    const story = bySlug.get(slug);
    const legacy = story?.legacy || "";
    if (story && legacy !== folder) mismatches.push(`- ${code}: folder \`${folder}\`, legacy collection \`${legacy || "(empty)"}\`, community reference \`${story.community || "(empty)"}\``);
    const target = story ? draftIdFor(story._id.replace(/^drafts\./, "")) : "(no story document)";
    lines.push(`## ${code} — ${relative(process.cwd(), file)}`);
    lines.push("");
    lines.push(`Language \`${lang}\`. Folder collection \`${folder}\`. Draft target \`${target}\`. Collection document \`${collectionId.get(folder) || "(not found)"}\`.`);
    lines.push("");
    lines.push(`Headline: ${plan.headline || "(none)"}`);
    lines.push("");
    lines.push(`Overview: ${firstWords(plan.overviewText, 15, lang) || "(none)"}`);
    lines.push("");
    lines.push(`Stages: youth ${stages.youth}, adulthood ${stages.adulthood}, olderAdulthood ${stages.olderAdulthood}, Other Stories ${stages.other}.`);
    lines.push("");
    lines.push(plan.unsplit ? "The whole story is one segment." : `Segments: ${plan.segments.length}.`);
    lines.push("");
    lines.push("### Titles generated from the first sentence");
    lines.push("");
    const generated = plan.edits.filter((edit) => edit.kind === "generated-title");
    if (!generated.length) lines.push("None.");
    else lines.push("标题由脚本生成，需人工检查");
    if (generated.length) lines.push("");
    for (const edit of generated) lines.push(`- ${edit.where}: \`${edit.before}\` → \`${edit.after}\``);
    lines.push("");
    lines.push("### Unmatched group headings");
    lines.push("");
    if (!plan.unmatchedGroups.length) lines.push("None.");
    for (const heading of plan.unmatchedGroups) lines.push(`- ${heading}`);
    lines.push("");
    lines.push("### Kept paragraphs that were outside a numbered story");
    lines.push("");
    if (!plan.outside.length) lines.push("None.");
    for (const paragraph of plan.outside) lines.push(`- ${paragraph.text}`);
    lines.push("");
    lines.push("### Notes");
    lines.push("");
    if (!plan.noteEdits.length) lines.push("None.");
    for (const edit of plan.noteEdits) lines.push(`- ${edit.where}: \`${edit.before}\` → ${edit.after ? `\`${edit.after}\`` : "(deleted)"}`);
    lines.push("");
    lines.push("### Yellow highlights inside paragraphs");
    lines.push("");
    if (!plan.highlights.length) lines.push("None.");
    plan.highlights.forEach((phrase, index) => lines.push(`${index + 1}. ${phrase.where}: ${phrase.text}`));
    lines.push("");
    if (plan.warnings.length) {
      lines.push("### Warnings");
      lines.push("");
      for (const warning of plan.warnings) lines.push(`- ${warning}`);
      lines.push("");
    }
    summaries.push([code, lang, plan.headline ? "yes" : "no", stages.youth, stages.adulthood, stages.olderAdulthood, stages.other, plan.unsplit ? "yes" : "no", plan.outside.length, firstWords(plan.overviewText, 15, lang)].join("\t"));
  }
  lines.splice(9, 0, "## Collection field differs from the Word folder", "", ...(mismatches.length ? mismatches : ["None."]), "");
  writeFileSync(join(process.cwd(), "source-documents/import-review.md"), `${lines.join("\n")}\n`);
  console.log("code\tlanguage\theadline\toverview\tyouth\tadulthood\tolder\tother\tunsplit\toutside");
  for (const row of summaries) {
    const [code, lang, headline, youth, adulthood, older, other, unsplit, outside, overview] = row.split("\t");
    console.log([code, lang, headline, overview, youth, adulthood, older, other, unsplit, outside].join("\t"));
  }
  if (mismatches.length) {
    console.log("\ncollection mismatches");
    for (const row of mismatches) console.log(row);
  }
  console.log("\nDry run. No documents were written.");
}

function storyFiles() {
  return walkDocx(join(process.cwd(), "source-documents")).filter((file) => !/MLNJ Elicitation Exercise/i.test(file));
}

function filesForCodes(codes: string[]) {
  const wanted = new Set(codes);
  const found = new Map<string, string>();
  for (const file of storyFiles()) {
    const code = codeFromFilename(file) || originalCodeFromFilename(file);
    if (!wanted.has(code)) continue;
    if (found.has(code)) throw new Error(`${code} matches more than one Word file. Nothing was written.`);
    found.set(code, file);
  }
  const missing = codes.filter((code) => !found.has(code));
  if (missing.length) throw new Error(`Missing Word files: ${missing.join(", ")}`);
  return codes.map((code) => found.get(code) || "");
}

async function writeDraft(client: SanityClient, file: string, allowed: string[]) {
  const code = codeFromFilename(file) || originalCodeFromFilename(file);
  const slug = code.toLowerCase();
  if (slug === "bmnj" || !allowed.includes(code)) throw new Error(`${code} is not in this batch. Nothing was written.`);
  const html = (await mammoth.convertToHtml({ path: file }, { styleMap: ["u => u", "highlight => mark"] })).value;
  const lang = detectLanguage(html.replace(/<[^>]+>/g, " "));
  const plan = planForFile(html, file);
  const folder = collectionFromPath(file);
  const matches = await client.fetch<StoryRow[]>(`*[_type == "story" && slug.current == $slug]{_id, "slug": slug.current, participantCode, "legacy": collection, "community": community->slug.current}`, { slug });
  const published = matches.find((row) => !row._id.startsWith("drafts."));
  const draft = matches.find((row) => row._id.startsWith("drafts."));
  if (!published && !draft) throw new Error(`No story with slug ${slug} was found. Nothing was written.`);
  const sourceId = draft?._id || published?._id || "";
  const current = await client.getDocument(sourceId);
  if (!current) throw new Error(`Story ${sourceId} could not be read. Nothing was written.`);
  const publishedBefore = published ? await client.getDocument(published._id) : null;
  const writeId = draft?._id || draftIdFor(published?._id || sourceId);
  if (!writeId.startsWith("drafts.") || writeId === published?._id) throw new Error(`Refusing to write ${writeId}.`);
  mkdirSync(join(process.cwd(), "source-documents/backups"), { recursive: true });
  const backupPath = join("source-documents/backups", `${slug}.json`);
  writeFileSync(backupPath, `${JSON.stringify(current, null, 2)}\n`);
  const collections = await client.fetch<{ _id: string }[]>(`*[_type == "collection" && slug.current == $slug]{_id}`, { slug: folder });
  if (collections.length !== 1) throw new Error(`Collection ${folder || "(none)"} was not found for ${code}. Nothing further was written.`);
  const set: Record<string, unknown> = {
    overview: { ...((current.overview as object) || {}), ...localeBlock(lang, plan.overview) },
    headline: { ...((current.headline as object) || {}), ...localeText(lang, plan.headline) },
    segments: plan.segments.map((segment) => segmentDocument(segment, lang)),
    community: { _type: "reference", _ref: collections[0]._id },
  };
  if (writeId === sourceId) {
    await client.patch(writeId).set(set).commit();
  } else {
    const { _rev, _createdAt, _updatedAt, ...rest } = current;
    await client.transaction().createIfNotExists({ ...rest, _id: writeId, _type: "story" }).patch(writeId, (patch) => patch.set(set)).commit();
  }
  if (publishedBefore) {
    const publishedAfter = await client.getDocument(publishedBefore._id);
    if (!publishedAfter) throw new Error(`Published document ${publishedBefore._id} disappeared. Stopping.`);
    if (publishedAfter._rev !== publishedBefore._rev) throw new Error(`Published document ${publishedBefore._id} changed. Stopping.`);
  }
  if (slug === "mgnj") console.log(`mgnj-location\t${JSON.stringify(current.location ?? null)}`);
  console.log([code, lang, folder, writeId, backupPath, plan.headline ? "headline" : "no-headline", plan.segments.length].join("\t"));
}

async function writeOutline() {
  const lines = ["# Batch 2 structure outline", "", "Diagnosis only. Nothing was written to Sanity.", ""];
  for (const file of filesForCodes(BATCH2)) {
    const code = codeFromFilename(file) || originalCodeFromFilename(file);
    const html = (await mammoth.convertToHtml({ path: file }, { styleMap: ["u => u", "highlight => mark"] })).value;
    const text = html.replace(/<[^>]+>/g, " ");
    const lang = detectLanguage(text);
    const plan = planForFile(html, file);
    lines.push(`## ${code}`);
    lines.push("");
    lines.push(`Language \`${lang}\`. Opening: ${firstWords(plan.overviewText, 40, lang) || "(none)"}`);
    lines.push("");
    for (const entry of storyOutline(html)) {
      const label = entry.kind === "group" ? `group${entry.stage ? `/${entry.stage}` : ""}${entry.unmatched ? "/unmatched" : ""}` : entry.kind;
      lines.push(`- **${label}** ${entry.title}`);
      lines.push(`  - ${firstWords(entry.following, 15, lang) || "(no following paragraph)"}`);
    }
    lines.push("");
  }
  const path = join(process.cwd(), "source-documents/import-outline-batch2.md");
  writeFileSync(path, `${lines.join("\n")}\n`);
  console.log(path);
}

async function main() {
  const { file, slug, write, all, batch1, batch2, outline } = args(process.argv.slice(2));
  const client = await storyClient();
  if (batch1 || batch2) {
    const codes = batch1 ? BATCH1 : BATCH2;
    if (write || batch1) {
      if (!client) throw new Error("SANITY_API_WRITE_TOKEN is missing or empty. Nothing was written.");
      for (const storyFile of filesForCodes(codes)) await writeDraft(client, storyFile, codes);
      console.log("Drafts written. Published documents were left unchanged.");
      return;
    }
    console.log("code\tlanguage\theadline\toverview\tyouth\tadulthood\tolder\tother\tunsplit\toutside");
    for (const storyFile of filesForCodes(codes)) {
      const code = codeFromFilename(storyFile) || originalCodeFromFilename(storyFile);
      const html = (await mammoth.convertToHtml({ path: storyFile }, { styleMap: ["u => u", "highlight => mark"] })).value;
      const lang = detectLanguage(html.replace(/<[^>]+>/g, " "));
      const plan = planForFile(html, storyFile);
      const stages = stageCounts(plan);
      console.log([code, lang, plan.headline ? "yes" : "no", firstWords(plan.overviewText, 15, lang), stages.youth, stages.adulthood, stages.olderAdulthood, stages.other, plan.unsplit ? "yes" : "no", plan.outside.length].join("\t"));
    }
    console.log("Dry run. No documents were written.");
    return;
  }
  if (outline) {
    await writeOutline();
    return;
  }
  if (all) {
    if (write) throw new Error("The batch dry run does not write. Run one file with --write after the draft rules are confirmed.");
    await dryRunAll(client);
    return;
  }
  if (!file || !slug) {
    console.error("Usage: tsx scripts/import-story-docx.ts <file.docx> <slug> [--write]");
    console.error("       tsx scripts/import-story-docx.ts --all");
    process.exitCode = 1;
    return;
  }
  const html = (await mammoth.convertToHtml({ path: file }, { styleMap: ["u => u", "highlight => mark"] })).value;
  const lang = detectLanguage(html.replace(/<[^>]+>/g, " "));
  const plan = planForFile(html, file);
  const folder = collectionFromPath(file);
  const matches = client
    ? await client.fetch<StoryRow[]>(`*[_type == "story" && slug.current == $slug]{_id, "slug": slug.current, participantCode, "legacy": collection, "community": community->slug.current}`, { slug })
    : [];
  const published = matches.find((row) => !row._id.startsWith("drafts."));
  const draft = matches.find((row) => row._id.startsWith("drafts."));
  const target = draft?._id || (published ? draftIdFor(published._id) : "(not loaded)");
  printPlan(plan, target, lang, folder);
  if (!write) {
    console.log("Dry run. A later --write updates the draft only and saves a backup in source-documents/backups/.");
    return;
  }
  if (!client) throw new Error("SANITY_API_WRITE_TOKEN is missing or empty. Nothing was written.");
  await writeDraft(client, file, BATCH1);
  console.log("Published document was left unchanged.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Story import failed.";
  console.error(message);
  process.exitCode = 1;
});
