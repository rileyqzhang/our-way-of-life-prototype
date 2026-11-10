import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient, type SanityClient } from "@sanity/client";
import mammoth from "mammoth";
import { codeFromFilename, originalCodeFromFilename } from "@/lib/migration/participant-code";
import { applyParticipantCode, parseStoryHtml } from "@/lib/migration/story-docx";

loadEnvConfig(process.cwd());

const ALLOWED = new Set([
  "participantCode",
  "community",
  "photographs",
  "location",
  "headline",
  "overview",
  "segments",
  "body",
  "article",
  "migration",
  "participant",
  "collection",
  "slug",
  "title",
  "themes",
  "relatedEvents",
  "externalHref",
  "published",
]);

type LocaleText = { _type?: string; en?: string | null; es?: string | null; zh?: string | null };
type Segment = {
  _key?: string;
  _type?: string;
  quote?: LocaleText;
  isQuote?: boolean;
  shortTitle?: LocaleText;
  body?: unknown;
  lifeStage?: string;
};
type Story = {
  _id: string;
  _rev?: string;
  participantCode?: string;
  quotations?: { text?: LocaleText }[] | null;
  headline?: LocaleText | null;
  segments?: Segment[] | null;
  photographs?: { image?: { asset?: { _ref?: string } }; legacySrc?: string }[] | null;
  [key: string]: unknown;
};

function plain(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return "";
  if (Array.isArray(value)) return value.map(plain).join("\n");
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.text === "string") return record.text;
    return Object.entries(record)
      .filter(([key]) => key !== "_type" && key !== "_key")
      .map(([, item]) => plain(item))
      .join("\n");
  }
  return "";
}

function hasText(value: LocaleText | null | undefined) {
  return Boolean(value?.en?.trim() || value?.es?.trim() || value?.zh?.trim());
}

function normalizeTitle(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
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

async function quoteFlags() {
  const flags = new Map<string, boolean[]>();
  const titles = new Map<string, string[]>();
  for (const file of walkDocx(join(process.cwd(), "source-documents"))) {
    if (/MLNJ Elicitation Exercise/i.test(file)) continue;
    const code = codeFromFilename(file) || originalCodeFromFilename(file);
    if (!code || flags.has(code)) continue;
    const html = (await mammoth.convertToHtml({ path: file }, { styleMap: ["u => u", "highlight => mark"] })).value;
    const plan = applyParticipantCode(parseStoryHtml(html), code);
    flags.set(code, plan.segments.map((segment) => segment.isQuote === true));
    titles.set(code, plan.segments.map((segment) => segment.title));
  }
  return { flags, titles };
}

function segmentTitle(segment: Segment) {
  return segment.quote?.en?.trim() || segment.quote?.es?.trim() || segment.quote?.zh?.trim() || "";
}

function flagsFor(code: string, segments: Segment[], parsedFlags: boolean[], parsedTitles: string[]) {
  if (!parsedFlags.length) return { flags: segments.map(() => false), note: "Word 里没有分段" };
  if (parsedFlags.length === segments.length) {
    const mismatches = segments.filter((segment, index) => {
      const stored = normalizeTitle(segmentTitle(segment));
      const parsed = normalizeTitle(parsedTitles[index] || "");
      return stored && parsed && stored !== parsed;
    }).length;
    return { flags: parsedFlags, note: mismatches ? `${mismatches} 个标题和 Word 顺序不完全一致，仍按顺序回填` : "" };
  }
  const used = new Set<number>();
  const flags = segments.map((segment) => {
    const stored = normalizeTitle(segmentTitle(segment));
    const index = parsedTitles.findIndex((title, item) => !used.has(item) && stored && normalizeTitle(title) === stored);
    if (index < 0) return false;
    used.add(index);
    return parsedFlags[index] === true;
  });
  return { flags, note: `Word ${parsedFlags.length} 段，文档 ${segments.length} 段，只回填标题对得上的` };
}

function photoIds(photos: Story["photographs"]) {
  return new Set((photos || []).flatMap((photo) => [photo.image?.asset?._ref, photo.legacySrc].filter(Boolean) as string[]));
}

function clientOrThrow() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
  const token = process.env.SANITY_API_WRITE_TOKEN?.trim();
  if (!projectId || !token) throw new Error("SANITY_API_WRITE_TOKEN is missing. Nothing was written.");
  return createClient({ projectId, dataset, apiVersion: "2024-10-01", token, useCdn: false, perspective: "raw" });
}

async function patchStory(client: SanityClient, id: string, set: Record<string, unknown>, unset: string[]) {
  if (!id.startsWith("drafts.") && unset.some((field) => field === "_id")) throw new Error(`Refusing to delete ${id}.`);
  let patch = client.patch(id);
  if (Object.keys(set).length) patch = patch.set(set);
  if (unset.length) patch = patch.unset(unset);
  if (!Object.keys(set).length && !unset.length) return;
  await patch.commit();
}

async function main() {
  const backup = join(process.cwd(), "source-documents/backups/full-backup-2026-11-09.tar.gz");
  const size = statSync(backup).size;
  if (size < 1000) throw new Error("Dataset backup is missing. Nothing was written.");
  const client = clientOrThrow();
  const stories = await client.fetch<Story[]>(`*[_type=="story"]`);
  mkdirSync(join(process.cwd(), "source-documents/backups"), { recursive: true });
  writeFileSync(join("source-documents/backups", "stories-before-finish.json"), `${JSON.stringify(stories, null, 2)}\n`);
  const parsed = await quoteFlags();
  const byCode = new Map<string, Story[]>();
  for (const story of stories) {
    const code = story.participantCode || "";
    byCode.set(code, [...(byCode.get(code) || []), story]);
  }
  const senj = (byCode.get("SENJ") || []).find((story) => story._id.startsWith("drafts."));
  const report: string[] = [];

  for (const story of stories) {
    const code = story.participantCode || "";
    const draft = story._id.startsWith("drafts.");
    try {
      const set: Record<string, unknown> = {
        title: { _type: "localeString", en: code, es: code, zh: code },
      };
      const unset = Object.keys(story).filter((key) => !key.startsWith("_") && !ALLOWED.has(key));
      if (draft) {
        const removed: string[] = [];
        if (code === "JMWE" && senj) {
          for (const field of ["overview", "body", "article", "location", "headline"] as const) {
            const own = plain(story[field]).trim();
            const other = plain(senj[field]).trim();
            if (!own) continue;
            if ((other && own === other) || /SENJ was born/i.test(own) || /\bSENJ\b/.test(own)) {
              unset.push(field);
              removed.push(`${field}: ${own.slice(0, 90)}`);
            }
          }
          const senjPhotos = photoIds(senj.photographs);
          const kept = (story.photographs || []).filter((photo) => {
            const ids = [photo.image?.asset?._ref, photo.legacySrc].filter(Boolean) as string[];
            return !ids.some((id) => senjPhotos.has(id));
          });
          if ((story.photographs || []).length !== kept.length) {
            set.photographs = kept;
            removed.push(`photographs: removed ${(story.photographs || []).length - kept.length}`);
          }
        }
        const quote = (story.quotations || []).find((item) => hasText(item.text) && !(code === "JMWE" && /\bSENJ\b/.test(plain(item.text))));
        if (quote?.text && !hasText(story.headline) && !unset.includes("headline")) {
          set.headline = { _type: "localeText", en: quote.text.en || "", es: quote.text.es || "", zh: quote.text.zh || "" };
        }
        const segments = story.segments || [];
        if (segments.length) {
          const matched = flagsFor(code, segments, parsed.flags.get(code) || [], parsed.titles.get(code) || []);
          set.segments = segments.map((segment, index) => ({ ...segment, isQuote: matched.flags[index] === true }));
          if (matched.note) report.push(`${code}\tisQuote\t${matched.note}`);
        }
        if (removed.length) report.push(`${code}\tremoved\t${removed.join(" | ")}`);
      } else if (!hasText(story.headline)) {
        const quote = (story.quotations || []).find((item) => hasText(item.text));
        if (quote?.text) set.headline = { _type: "localeText", en: quote.text.en || "", es: quote.text.es || "", zh: quote.text.zh || "" };
      }
      if (!draft && !story._id) throw new Error("missing id");
      await patchStory(client, story._id, set, [...new Set(unset)]);
      const after = await client.getDocument(story._id);
      if (!after) throw new Error(`${story._id} disappeared`);
      report.push(`${draft ? "draft" : "published"}\t${code}\t${story._id}\tok`);
    } catch (error) {
      report.push(`skip\t${code}\t${story._id}\t${error instanceof Error ? error.message : "failed"}`);
    }
  }
  console.log(report.join("\n"));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Finish failed.");
  process.exit(1);
});
