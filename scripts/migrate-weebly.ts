import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient, type SanityClient } from "@sanity/client";
import { isStoryCollection } from "@/lib/content/collections";
import { verifiedCommunityFor } from "@/lib/migration/communities";
import { canonicalParticipantSlug, normalizeParticipantCode } from "@/lib/migration/participant-code";
import { timelineStories } from "@/lib/migration/catalog";
import { missingRecord, recordFromPost, type StoryRecord, type WeeblyPost } from "@/lib/migration/records";
import {
  hasWeakReference,
  omitUnavailableStoryReferences,
  referencedIds,
  timelineStoryBackLink,
  type DocumentReference,
  type TimelineLinkState,
} from "@/lib/migration/references";
import { sanityDocuments } from "@/lib/sanity/documents";

loadEnvConfig(process.cwd());

const ORIGIN = "https://www.ourwayoflifearchive.com";
const SITE_ID = "1f20e830-96fe-11eb-b23b-0985b2902fb7";
const OUT_DIR = path.join("cms", "seed", "weebly");
const STORIES_PATH = path.join(OUT_DIR, "stories.json");
const INVENTORY_PATH = path.join(OUT_DIR, "inventory.json");
const RAW_PATH = path.join(OUT_DIR, "raw-posts.json");
const REPORT_PATH = path.join(OUT_DIR, "import-report.json");
const COMMUNITY_REPORT_PATH = path.join(OUT_DIR, "community-review.json");
const USER_AGENT = "OurWayOfLifeArchiveMigration/1.0";

type ExistingStory = {
  _id: string;
  _updatedAt?: string;
  slug?: string;
  participantCode?: string;
  body?: { en?: string; es?: string; zh?: string };
  article?: { en?: unknown[]; es?: unknown[]; zh?: unknown[] };
  externalHref?: string | null;
  published?: boolean;
  migration?: { source?: string; contentHash?: string; importedAt?: string };
  quotations?: unknown[] | null;
  photographs?: { source?: string; legacySrc?: string; image?: { asset?: { _ref?: string } } }[] | null;
  participant?: { _ref?: string } | null;
  relatedEvents?: unknown[] | null;
};

type ExistingPerson = { _id: string; name?: string };

type ReportRow = {
  slug: string;
  action: string;
  detail: string;
};

type SourceTimeline = {
  _id: string;
  _type: string;
  date?: string;
  slug?: { current?: string };
  title?: { en?: string };
  blocks?: { _key?: string; story?: { _ref?: string } }[];
  relatedStories?: DocumentReference[];
};

type LiveTimeline = TimelineLinkState & { _id: string; slug?: string };

type TimelineNeed =
  | { id: string; state: "satisfied" }
  | { id: string; state: "missing"; source: SourceTimeline }
  | { id: string; state: "blocked"; detail: string };

function defined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

function hasText(value: { en?: string; es?: string; zh?: string } | undefined) {
  return Boolean(value?.en || value?.es || value?.zh);
}

function hasBlocks(value: { en?: unknown[]; es?: unknown[]; zh?: unknown[] } | undefined) {
  return Boolean(value?.en?.length || value?.es?.length || value?.zh?.length);
}

async function fetchJson(url: string) {
  const response = await fetch(url, { headers: { "user-agent": USER_AGENT, accept: "application/json" } });
  return response;
}

async function fetchPosts() {
  const posts: WeeblyPost[] = [];
  for (let page = 1; page <= 20; page += 1) {
    const response = await fetchJson(`${ORIGIN}/app/website/cms/api/v1/sites/${SITE_ID}/blog/posts?page=${page}`);
    if (!response.ok) throw new Error(`Weebly post list returned HTTP ${response.status} on page ${page}.`);
    const body = (await response.json()) as { data?: WeeblyPost[]; next_page_url?: string | null; total?: number };
    posts.push(...(body.data || []));
    if (!body.next_page_url) break;
  }
  return posts;
}

async function fetchPost(slug: string) {
  const response = await fetchJson(`${ORIGIN}/app/website/cms/api/v1/sites/${SITE_ID}/blog/post/slug/${encodeURIComponent(slug)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Weebly story ${slug} returned HTTP ${response.status}.`);
  return (await response.json()) as WeeblyPost;
}

function writeInventory(records: StoryRecord[], errors: { slug: string; message: string }[]) {
  mkdirSync(OUT_DIR, { recursive: true });
  const extracted = records.filter((record) => record.status === "extracted");
  const inventory = {
    extractedAt: new Date().toISOString(),
    source: ORIGIN,
    stories: records.map((record) => ({
      slug: record.slug,
      participantCode: record.participantCode,
      sourceUrl: record.sourceUrl,
      status: record.status,
      languages: record.languages,
      paragraphCounts: record.paragraphCounts,
      linkCount: record.linkCount,
      images: record.images.length,
      relatedEventIds: record.relatedEventIds,
      notes: record.notes,
    })),
    errors,
    summary: {
      extracted: extracted.length,
      incomplete: records.filter((record) => record.status === "incomplete").length,
      missing: records.filter((record) => record.status === "missing").length,
      errors: errors.length,
      english: extracted.filter((record) => record.languages.en).length,
      spanish: extracted.filter((record) => record.languages.es).length,
      chinese: extracted.filter((record) => record.languages.zh).length,
      withLinks: records.filter((record) => record.linkCount > 0).length,
      readyToImport: records.filter((record) => record.status === "extracted" || record.status === "incomplete").length,
    },
  };
  writeFileSync(INVENTORY_PATH, `${JSON.stringify(inventory, null, 2)}\n`);
  writeFileSync(STORIES_PATH, `${JSON.stringify(records, null, 2)}\n`);
  return inventory.summary;
}

async function extract() {
  const timeline = timelineStories();
  const errors: { slug: string; message: string }[] = [];
  const posts = await fetchPosts();
  const bySlug = new Map<string, WeeblyPost>();
  for (const post of posts) {
    const slug = post.slug?.trim().toLowerCase();
    if (!slug || bySlug.has(slug)) continue;
    bySlug.set(slug, post);
  }

  for (const slug of timeline.keys()) {
    if (bySlug.has(slug)) continue;
    try {
      const post = await fetchPost(slug);
      if (post?.slug) bySlug.set(slug, post);
    } catch (error) {
      errors.push({ slug, message: error instanceof Error ? error.message : "Request failed." });
    }
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(RAW_PATH, `${JSON.stringify([...bySlug.values()], null, 2)}\n`);
  const records: StoryRecord[] = [];
  for (const [slug, post] of [...bySlug.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    try {
      records.push(recordFromPost(post, timeline.get(slug)));
    } catch (error) {
      errors.push({ slug, message: error instanceof Error ? error.message : "Could not parse this story." });
    }
  }
  for (const slug of [...timeline.keys()].sort()) {
    if (bySlug.has(slug)) continue;
    records.push(missingRecord(slug, timeline.get(slug), "No Weebly story was published at the timeline link."));
  }

  const summary = writeInventory(records, errors);
  console.log(`Wrote ${STORIES_PATH}`);
  console.log(`Wrote ${INVENTORY_PATH}`);
  console.log(JSON.stringify(summary));
  return records;
}

function loadRecords() {
  if (!existsSync(STORIES_PATH)) throw new Error(`Missing ${STORIES_PATH}. Run: npm run migrate:weebly -- extract`);
  return JSON.parse(readFileSync(STORIES_PATH, "utf8")) as StoryRecord[];
}

async function sanityQuery<T>(query: string): Promise<T> {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
  if (!projectId) throw new Error("NEXT_PUBLIC_SANITY_PROJECT_ID is not set.");
  const url = new URL(`https://${projectId}.api.sanity.io/v2024-10-01/data/query/${dataset}`);
  url.searchParams.set("query", query);
  const token = process.env.SANITY_API_READ_TOKEN?.trim();
  const response = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) throw new Error(`Sanity query failed with HTTP ${response.status}.`);
  const body = (await response.json()) as { result: T };
  return body.result;
}

function decide(existing: ExistingStory | undefined, record: StoryRecord) {
  if (record.status === "missing" || record.status === "error" || !record.contentHash) {
    return { action: "skip-not-extracted", detail: record.notes[0] || "No article was extracted." };
  }
  if (!existing) return { action: "create", detail: "New participant and story. Published stays off." };
  const managed = existing.migration?.source === "weebly";
  const hasArticle = hasText(existing.body) || hasBlocks(existing.article);
  if (!managed && hasArticle) {
    return { action: "skip-existing-content", detail: `Story ${existing._id} already has article text. It was not changed.` };
  }
  if (!managed) return { action: "fill-empty", detail: `Story ${existing._id} has no article text. Empty Weebly fields would be filled.` };
  if (existing.migration?.contentHash === record.contentHash) {
    return { action: "skip-unchanged", detail: "Already imported and unchanged." };
  }
  const updated = Date.parse(existing._updatedAt || "");
  const imported = Date.parse(existing.migration?.importedAt || "");
  if (Number.isFinite(updated) && Number.isFinite(imported) && updated - imported > 60_000) {
    return { action: "skip-edited", detail: "The Studio document changed after the last import." };
  }
  return { action: "update-managed", detail: "Re-applying the Weebly extract onto an unedited import." };
}

function writeClient() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
  const token = process.env.SANITY_API_WRITE_TOKEN?.trim();
  if (!projectId || !token) return null;
  return createClient({ projectId, dataset, apiVersion: "2024-10-01", token, useCdn: false });
}

async function uploadPhotograph(client: SanityClient, source: string) {
  if (source.startsWith("http://") || source.startsWith("https://")) {
    const response = await fetch(source, { headers: { "user-agent": USER_AGENT } });
    if (!response.ok) throw new Error(`Image download failed with HTTP ${response.status}.`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const filename = new URL(source).pathname.split("/").pop() || "story-image";
    return client.assets.upload("image", bytes, { filename });
  }
  if (source.startsWith("/")) {
    const file = path.join("public", source);
    if (!existsSync(file)) return null;
    return client.assets.upload("image", createReadStream(file), { filename: path.basename(file) });
  }
  return null;
}

async function photographsForImport(client: SanityClient | null, record: StoryRecord, apply: boolean) {
  const photos = record.document.photographs || [];
  if (!apply || !client) return photos;
  const next = [];
  for (const photo of photos) {
    const source = typeof photo.legacySrc === "string" ? photo.legacySrc : "";
    try {
      const asset = source ? await uploadPhotograph(client, source) : null;
      next.push(
        asset
          ? { ...photo, image: { _type: "image", asset: { _type: "reference", _ref: asset._id } } }
          : photo,
      );
    } catch (error) {
      next.push(photo);
      record.notes.push(error instanceof Error ? error.message : "Image upload failed.");
    }
  }
  return next;
}

function sourceTimelineDocuments() {
  return sanityDocuments().filter((document) => document._type === "timelineEvent") as SourceTimeline[];
}

function usableTimelineSource(document: SourceTimeline | undefined): document is SourceTimeline {
  return Boolean(document?._id && document.date?.trim() && document.title?.en?.trim() && document.slug?.current);
}

function timelineRefsFor(record: StoryRecord) {
  return [...referencedIds(record.document)].filter((id) => id.startsWith("timeline-")).sort();
}

function classifyTimelineRef(id: string, sources: Map<string, SourceTimeline>, live: Map<string, LiveTimeline>, slugIds: Map<string, string>): TimelineNeed {
  if (live.has(id)) return { id, state: "satisfied" };
  const eventId = id.slice("timeline-".length);
  const existingId = slugIds.get(eventId);
  if (existingId && existingId !== id) {
    return {
      id,
      state: "blocked",
      detail: `Timeline slug ${eventId} is already stored as ${existingId}, which does not match the archive id ${id}.`,
    };
  }
  const source = sources.get(id);
  if (!usableTimelineSource(source)) {
    return { id, state: "blocked", detail: `${id} is not in the archive timeline, so no document was created for it.` };
  }
  if (hasWeakReference(source)) {
    return { id, state: "blocked", detail: `${id} in the archive timeline uses a weak reference.` };
  }
  return { id, state: "missing", source };
}

function timelineDocumentForCreate(source: SourceTimeline, storyIds: Set<string>) {
  const document = omitUnavailableStoryReferences(source, storyIds);
  if (!Array.isArray(document.relatedStories)) document.relatedStories = [];
  return document;
}

function linkStateFor(document: SourceTimeline): TimelineLinkState {
  return {
    blocks: (document.blocks || []).map((block) => ({ _key: block._key, story: block.story })),
    relatedStories: (document.relatedStories || []).map((item) => ({ _ref: item._ref })),
  };
}

async function plan(records: StoryRecord[], only: Set<string> | undefined, apply: boolean) {
  const stories = await sanityQuery<ExistingStory[]>(
    `*[_type=="story"]{_id,_updatedAt,"slug":slug.current,participantCode,body,article,externalHref,published,migration,quotations,photographs,participant,relatedEvents}`,
  );
  const people = await sanityQuery<ExistingPerson[]>(`*[_type=="person"]{_id,name}`);
  const timelineDocs = await sanityQuery<LiveTimeline[]>(
    `*[_type=="timelineEvent"]{_id,"slug":slug.current,blocks[]{_key,story},relatedStories[]{_ref}}`,
  );
  const storyBySlug = new Map(stories.filter((story) => story.slug).map((story) => [story.slug as string, story]));
  const storyIds = new Set(stories.map((story) => story._id));
  const personByName = new Map(people.filter((person) => person.name).map((person) => [person.name as string, person._id]));
  const timelineById = new Map(timelineDocs.map((document) => [document._id, { ...document, blocks: document.blocks || [], relatedStories: document.relatedStories || [] }]));
  const timelineIdBySlug = new Map(timelineDocs.filter((document) => document.slug).map((document) => [document.slug as string, document._id]));
  const sources = new Map(sourceTimelineDocuments().map((document) => [document._id, document]));
  const selected = records.filter((record) => !only || only.has(record.slug));
  const rows: ReportRow[] = [];
  const client = apply ? writeClient() : null;
  if (apply && !client) {
    if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim()) {
      throw new Error("NEXT_PUBLIC_SANITY_PROJECT_ID is missing from .env.local. Nothing was written.");
    }
    const raw = process.env.SANITY_API_WRITE_TOKEN;
    const reason = raw == null ? "missing from .env.local" : "empty in .env.local";
    throw new Error(`SANITY_API_WRITE_TOKEN is ${reason}. Nothing was written.`);
  }

  const dependencies = { missing: new Set<string>(), unknown: new Set<string>(), satisfied: new Set<string>(), created: new Set<string>() };
  const announcedTimeline = new Set<string>();

  for (const record of selected) {
    const canonical = canonicalParticipantSlug(record.slug);
    const matches = [...storyBySlug.values()].filter(
      (story) => canonicalParticipantSlug(story.participantCode || story.slug || "") === canonical,
    );
    const existing = matches.find((story) => story.slug === canonical) || matches[0];
    if (record.slug !== canonical) {
      rows.push({
        slug: record.slug,
        action: "skip-alias",
        detail: `${record.participantCode} normalizes to ${canonical.toUpperCase()}. It matches ${existing?._id || `story-${canonical}`} and was not imported as a separate story.`,
      });
      continue;
    }
    const decision = decide(existing, record);
    const needs = timelineRefsFor(record).map((id) => classifyTimelineRef(id, sources, timelineById, timelineIdBySlug));
    if (decision.action.startsWith("skip")) {
      rows.push({ slug: record.slug, action: decision.action, detail: decision.detail });
      continue;
    }
    for (const need of needs) {
      if (need.state === "satisfied") dependencies.satisfied.add(need.id);
      if (need.state === "blocked") dependencies.unknown.add(need.id);
    }
    const blocked = needs.filter((need) => need.state === "blocked");
    if (blocked.length) {
      rows.push({
        slug: record.slug,
        action: "blocked-missing-dependency",
        detail: `${blocked.map((need) => need.detail).join(" ")} Nothing was written.`,
      });
      continue;
    }
    const missing = needs.filter((need): need is Extract<TimelineNeed, { state: "missing" }> => need.state === "missing");
    for (const need of missing) dependencies.missing.add(need.id);
    for (const need of missing) {
      if (announcedTimeline.has(need.id)) continue;
      announcedTimeline.add(need.id);
      rows.push({
        slug: need.id,
        action: "create-timeline",
        detail: apply
          ? `Missing from Sanity. The archive timeline has ${need.source.slug?.current} (${need.source.title?.en}). It is created before stories that reference it.`
          : `Missing from Sanity. The archive timeline has ${need.source.slug?.current} (${need.source.title?.en}). Dry run: it would be created before stories that reference it. Nothing was written.`,
      });
    }
    const dependencyDetail = missing.length
      ? ` Depends on ${missing.map((need) => need.id).join(", ")}, ${apply ? "created" : "which would be created"} from the archive timeline first.`
      : "";
    if (!apply) {
      rows.push({ slug: record.slug, action: decision.action, detail: `${decision.detail}${dependencyDetail}` });
      continue;
    }

    try {
      const storyDocumentId = existing?._id || `story-${canonical}`;
      const sourceStoryId = `story-${canonical}`;
      const personCode = normalizeParticipantCode(record.participantCode);
      const personMatches = [...personByName.entries()].filter(([name]) => normalizeParticipantCode(name) === personCode);
      const personId = personMatches.find(([name]) => name.toUpperCase() === personCode)?.[1] || personMatches[0]?.[1] || `person-${canonical}`;
      const preview = {
        participant: { _type: "reference", _ref: personId },
        quotations: record.document.quotations,
        relatedEvents: record.document.relatedEvents,
      };
      const known = new Set<string>([...timelineById.keys(), ...storyIds, ...personByName.values(), personId, ...missing.map((need) => need.id)]);
      const unresolved = [...referencedIds(preview)].filter((id) => !known.has(id)).sort();
      if (unresolved.length || missing.some((need) => hasWeakReference(need.source))) {
        rows.push({
          slug: record.slug,
          action: "blocked-missing-dependency",
          detail: `Missing referenced documents: ${unresolved.join(", ") || "weak timeline reference"}. Nothing was written.`,
        });
        for (const id of unresolved) dependencies.unknown.add(id);
        continue;
      }
      const preparedTimeline = missing.map((need) => timelineDocumentForCreate(need.source, storyIds));
      const timelineProblems = preparedTimeline.flatMap((document) => {
        const missingRefs = [...referencedIds(document)].filter((id) => !storyIds.has(id) && !timelineById.has(id) && !id.startsWith("image-"));
        return hasWeakReference(document) ? [`${document._id} would use a weak reference`] : missingRefs.map((id) => `${document._id} -> ${id}`);
      });
      if (timelineProblems.length) {
        rows.push({
          slug: record.slug,
          action: "blocked-missing-dependency",
          detail: `Missing referenced documents: ${timelineProblems.join(", ")}. Nothing was written.`,
        });
        continue;
      }
      if (![...personByName.values()].includes(personId)) {
        await client!.createIfNotExists({
          _id: personId,
          _type: "person",
          name: personCode,
          roleKind: "participant",
        });
        personByName.set(personCode, personId);
      }
      const photographs = await photographsForImport(client, record, true);
      for (const id of referencedIds(photographs)) {
        if (id.startsWith("image-")) known.add(id);
      }
      const migration = { ...record.document.migration, importedAt: new Date().toISOString() };
      const participant = { _type: "reference", _ref: personId };
      const storyFields = defined({
        participantCode: record.document.participantCode,
        participant,
        slug: { _type: "slug", current: record.slug },
        title: record.document.title,
        body: record.document.body,
        article: record.document.article,
        externalHref: record.document.externalHref,
        published: false,
        collection: verifiedCommunityFor(record.slug)?.collection,
        migration,
        quotations: record.document.quotations,
        relatedEvents: record.document.relatedEvents,
        photographs,
      });
      const storyProblems = [...referencedIds({ ...storyFields, _id: storyDocumentId })].filter((id) => !known.has(id));
      if (storyProblems.length) {
        rows.push({
          slug: record.slug,
          action: "blocked-missing-dependency",
          detail: `Missing referenced documents: ${storyProblems.join(", ")}. Nothing was written.`,
        });
        continue;
      }
      let transaction = client!.transaction();
      for (const document of preparedTimeline) {
        transaction = transaction.createIfNotExists(document as { _id: string; _type: string });
      }
      if (decision.action === "create") {
        transaction = transaction.create({ _id: storyDocumentId, _type: "story", ...storyFields });
      } else {
        const set: Record<string, unknown> = { migration, participant };
        if (!hasText(existing?.body) && record.document.body) set.body = record.document.body;
        if (!hasBlocks(existing?.article) && record.document.article) set.article = record.document.article;
        if (!existing?.externalHref) set.externalHref = record.document.externalHref;
        if (!existing?.quotations?.length && record.document.quotations) set.quotations = record.document.quotations;
        if (!existing?.relatedEvents?.length && record.document.relatedEvents) set.relatedEvents = record.document.relatedEvents;
        if (!existing?.photographs?.length && photographs.length) set.photographs = photographs;
        if (decision.action === "update-managed") {
          if (record.document.body) set.body = record.document.body;
          if (record.document.article) set.article = record.document.article;
          if (!existing?.photographs?.some((photo) => photo.image?.asset?._ref)) set.photographs = photographs;
        }
        const patchProblems = [...referencedIds(set)].filter((id) => !known.has(id));
        if (patchProblems.length) {
          rows.push({
            slug: record.slug,
            action: "blocked-missing-dependency",
            detail: `Missing referenced documents: ${patchProblems.join(", ")}. Nothing was written.`,
          });
          continue;
        }
        transaction = transaction.patch(existing!._id, (patch) => patch.set(set));
      }
      const links = needs.flatMap((need) => {
        if (need.state === "blocked") return [];
        const source = need.state === "missing" ? need.source : sources.get(need.id);
        if (!usableTimelineSource(source)) return [];
        const live = timelineById.get(need.id) || linkStateFor(timelineDocumentForCreate(source, storyIds));
        const link = timelineStoryBackLink(source, live, sourceStoryId, storyDocumentId);
        return link ? [{ timelineId: need.id, ...link, storyId: storyDocumentId }] : [];
      });
      for (const link of links) {
        transaction = transaction.patch(link.timelineId, (patch) => {
          let next = patch;
          if (link.blockKey) {
            next = next.set({ [`blocks[_key=="${link.blockKey}"].story`]: { _type: "reference", _ref: link.storyId } });
          }
          if (link.related) next = next.setIfMissing({ relatedStories: [] }).append("relatedStories", [link.related]);
          return next;
        });
      }
      await transaction.commit();
      storyIds.add(storyDocumentId);
      storyBySlug.set(record.slug, existing || { _id: storyDocumentId, slug: record.slug, migration });
      for (const document of preparedTimeline) {
        const state = linkStateFor(document);
        timelineById.set(document._id, { _id: document._id, slug: document.slug?.current, ...state });
        if (document.slug?.current) timelineIdBySlug.set(document.slug.current, document._id);
        dependencies.created.add(document._id);
        dependencies.satisfied.add(document._id);
      }
      for (const link of links) {
        const state = timelineById.get(link.timelineId);
        if (!state) continue;
        if (link.blockKey) {
          const block = state.blocks.find((item) => item._key === link.blockKey);
          if (block) block.story = { _ref: link.storyId };
        }
        if (link.related && !state.relatedStories.some((item) => item._ref === link.storyId)) state.relatedStories.push({ _ref: link.storyId });
      }
      rows.push({ slug: record.slug, action: decision.action, detail: `${decision.detail}${dependencyDetail}` });
    } catch (error) {
      rows.push({ slug: record.slug, action: "failed", detail: error instanceof Error ? error.message : "Import failed." });
    }
  }

  const report = {
    mode: apply ? "apply" : "dry-run",
    writtenAt: new Date().toISOString(),
    selected: selected.length,
    dependencies: {
      missing: [...dependencies.missing].sort(),
      unknown: [...dependencies.unknown].sort(),
      satisfied: [...dependencies.satisfied].sort(),
      created: [...dependencies.created].sort(),
    },
    rows,
    summary: {
      create: rows.filter((row) => row.action === "create").length,
      timeline: rows.filter((row) => row.action === "create-timeline").length,
      fillEmpty: rows.filter((row) => row.action === "fill-empty").length,
      update: rows.filter((row) => row.action === "update-managed").length,
      skipped: rows.filter((row) => row.action.startsWith("skip")).length,
      blocked: rows.filter((row) => row.action === "blocked-missing-dependency").length,
      failed: rows.filter((row) => row.action === "failed").length,
    },
  };
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote ${REPORT_PATH}`);
  console.log(JSON.stringify(report.summary));
  for (const row of rows) console.log(`${row.action}\t${row.slug}\t${row.detail}`);
  if (report.summary.failed || report.summary.blocked) process.exitCode = 1;
}

function selectedSlugs(argv: string[]) {
  const only = argv.find((arg) => arg.startsWith("--only="));
  if (!only) return undefined;
  return new Set(
    only
      .slice("--only=".length)
      .split(",")
      .map((slug) => slug.trim().toLowerCase())
      .filter(Boolean),
  );
}

function paragraphIsQuotation(text: string | undefined) {
  const first = (text || "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .find(Boolean);
  const closer = first ? ({ "“": "”", "«": "»", '"': '"' } as Record<string, string>)[first[0]] : undefined;
  return Boolean(first && closer && first.indexOf(closer, 1) > 1);
}

async function communityBackfill(apply: boolean) {
  const records = existsSync(STORIES_PATH) ? loadRecords() : [];
  const client = writeClient();
  const query = `*[_type=="story"]{_id,"slug":slug.current,collection,migration,"photoCount":count(photographs),"quoteCount":count(quotations)}`;
  const documents = client
    ? await client.withConfig({ perspective: "raw" }).fetch<
        {
          _id: string;
          slug?: string;
          collection?: string | null;
          migration?: { source?: string };
          photoCount?: number;
          quoteCount?: number;
        }[]
      >(query)
    : await sanityQuery<
        {
          _id: string;
          slug?: string;
          collection?: string | null;
          migration?: { source?: string };
          photoCount?: number;
          quoteCount?: number;
        }[]
      >(`*[_type=="story" && !(_id in path("drafts.**"))]{_id,"slug":slug.current,collection,migration,"photoCount":count(photographs),"quoteCount":count(quotations)}`);
  const published = new Map(
    documents.filter((document) => document.slug && !document._id.startsWith("drafts.")).map((document) => [document.slug as string, document]),
  );
  const drafts = new Map(
    documents.filter((document) => document.slug && document._id.startsWith("drafts.")).map((document) => [document.slug as string, document]),
  );
  const aliasGroups = new Map<string, string[]>();
  for (const slug of [...records.map((record) => record.slug), ...published.keys()]) {
    const canonical = canonicalParticipantSlug(slug);
    const aliases = aliasGroups.get(canonical) || [];
    if (!aliases.includes(slug)) aliases.push(slug);
    aliasGroups.set(canonical, aliases);
  }
  const rows: { slug: string; action: string; collection: string | null; detail: string }[] = [];
  for (const [canonical, aliases] of [...aliasGroups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const verified = verifiedCommunityFor(canonical);
    const documentsForCode = aliases.map((slug) => published.get(slug)).filter((document) => document);
    const document = published.get(canonical) || documentsForCode[0];
    const draft = drafts.get(canonical) || aliases.map((slug) => drafts.get(slug)).find(Boolean);
    const current = documentsForCode.map((item) => item?.collection).find((collection) => isStoryCollection(collection));
    const draftCollection = isStoryCollection(draft?.collection) ? draft.collection : undefined;
    const aliasNote = aliases.length > 1 ? ` Original codes ${aliases.join(", ")} match ${canonical}.` : "";
    if (current && verified && current !== verified.collection) {
      rows.push({
        slug: canonical,
        action: "conflict",
        collection: current,
        detail: `Published Community is ${current}. The verified source says ${verified.collection}. The published value was not changed.${aliasNote}`,
      });
      continue;
    }
    if (current) {
      rows.push({
        slug: canonical,
        action: "preserve",
        collection: current,
        detail: `Published Community is already set. It was not changed.${aliasNote}`,
      });
      continue;
    }
    if (!verified) {
      rows.push({
        slug: canonical,
        action: "review",
        collection: null,
        detail: draftCollection
          ? `No verified collection membership. An unpublished Studio value is ${draftCollection}; it was not published or copied.${aliasNote}`
          : `No explicit Weebly collection, repository metadata, or published editorial classification.${aliasNote}`,
      });
      continue;
    }
    if (!document) {
      rows.push({
        slug: canonical,
        action: "verified-not-imported",
        collection: verified.collection,
        detail: `${verified.source}${aliasNote}`,
      });
      continue;
    }
    if (apply && client) {
      await client.patch(document._id).set({ collection: verified.collection }).commit();
    }
    rows.push({
      slug: canonical,
      action: apply ? "assign" : "would-assign",
      collection: verified.collection,
      detail: `${verified.source} Only the Community field would change.${aliasNote}`,
    });
  }

  const missingPortraits = records.filter((record) => record.images.length === 0).map((record) => record.slug);
  const missingQuotations = records
    .filter((record) => {
      const hasStoredQuote = Boolean(record.document.quotations?.length);
      const hasOpeningQuote = ["en", "es", "zh"].some((language) =>
        paragraphIsQuotation(record.document.body?.[language as "en" | "es" | "zh"]),
      );
      return !hasStoredQuote && !hasOpeningQuote;
    })
    .map((record) => record.slug);
  const report = {
    mode: apply ? "apply" : "dry-run",
    writtenAt: new Date().toISOString(),
    sourcesChecked: [
      "Weebly navigation lists every participant under one Participants page.",
      "The Weebly Participants page has unlabeled story grids, not Latine, African American, or Chinese collections.",
      "Other Weebly pages mention those communities in prose and do not link them to story membership.",
      "Repository timeline and seed documents do not store a community field.",
      "Published Sanity Community values are preserved and are not treated as a source for other stories.",
    ],
    verified: rows.filter((row) => row.action === "assign" || row.action === "would-assign" || row.action === "verified-not-imported"),
    preserved: rows.filter((row) => row.action === "preserve"),
    unresolved: rows.filter((row) => row.action === "review"),
    missingPortraits,
    missingQuotations,
    publishedCards: [...published.values()]
      .map((document) => ({
        slug: document.slug,
        collection: isStoryCollection(document.collection) ? document.collection : null,
        portrait: Boolean(document.photoCount),
        storedQuotation: Boolean(document.quoteCount),
      }))
      .sort((a, b) => (a.slug || "").localeCompare(b.slug || "")),
    summary: {
      verified: rows.filter((row) => row.action === "assign" || row.action === "would-assign" || row.action === "verified-not-imported").length,
      wouldAssign: rows.filter((row) => row.action === "assign" || row.action === "would-assign").length,
      preserved: rows.filter((row) => row.action === "preserve").length,
      conflict: rows.filter((row) => row.action === "conflict").length,
      review: rows.filter((row) => row.action === "review").length,
      missingPortraits: missingPortraits.length,
      missingQuotations: missingQuotations.length,
      written: apply ? rows.filter((row) => row.action === "assign").length : 0,
    },
  };
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(COMMUNITY_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote ${COMMUNITY_REPORT_PATH}`);
  console.log(JSON.stringify(report.summary));
  for (const row of rows.filter((item) => item.action !== "review")) console.log(`${row.action}\t${row.slug}\t${row.collection || ""}\t${row.detail}`);
  console.log(`review\t${report.summary.review} stories have no verified community`);
}

async function main() {
  const argv = process.argv.slice(2);
  const command = argv.find((arg) => !arg.startsWith("--")) || "dry-run";
  const apply = command === "apply";
  const only = selectedSlugs(argv);
  if (apply && !only && !argv.includes("--confirm-all")) {
    throw new Error("Full import is blocked. Use --only=slug,slug for a test, or --confirm-all after review.");
  }
  if (command === "community") {
    await communityBackfill(argv.includes("--apply"));
    return;
  }
  if (command === "extract" || command === "all") await extract();
  if (command === "dry-run" || command === "apply" || command === "all") {
    const records = command === "all" ? loadRecords() : existsSync(STORIES_PATH) ? loadRecords() : await extract();
    await plan(records, only, apply);
  }
  if (!["extract", "dry-run", "apply", "all", "community"].includes(command)) {
    throw new Error("Use extract, dry-run, apply, or community.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Migration failed.");
  process.exit(1);
});
