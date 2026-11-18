import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@sanity/client";
import { codeKey, type OldSegment, type SanitySegment } from "./old-site-match";

loadEnvConfig(process.cwd());

const PLAN = "source-documents/old-site-latine-aa-plan.json";
const INVENTORY = "source-documents/old-site-inventory.json";
const ADDED = "source-documents/old-site-added-segments.json";

const ELICITATION: Record<string, string> = {
  "BMNJ:7": "Word 的 Elicitation Document",
  "EMWE:0": "Word 的 Ejercicio Creativo",
  "LAWE:8": "Word 的 Ejercicio Creativo",
  "MLNJ:9": "Word 的 Elicitation Document",
  "MVWE:0": "Word 的 Ejercicio Creativo",
  "MVWE:1": "Word 的 Ejercicio Creativo",
  "SENJ:2": "Word 的 Elicitation Documents",
  "WPNY:14": "Word 的 Elicitation Document Questions",
  "WPNY:15": "Word 的 Elicitation Document Questions",
};

type PlanRow = { key: string; oldOrder: number; stage: "youth" | "adulthood" | "olderAdulthood"; rule: string; title: string };
type PlanPerson = { code: string; _id: string; collection?: string; rows: PlanRow[]; missingOnSanity: { index: number; inSanity: number; title: string }[] };
type Story = { _id: string; participantCode: string; collection?: string; segments?: SanitySegment[] };

function key() {
  return randomBytes(6).toString("hex");
}

function languageOf(text: string) {
  return /[áéíóúñ¿¡]|\b(yo|que|para|una|los|las|del|con|en)\b/i.test(text) ? "es" : "en";
}

function blocks(text: string) {
  return text
    .split("\n")
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => ({
      _type: "block",
      _key: key(),
      style: "normal",
      markDefs: [],
      children: [{ _type: "span", _key: key(), text: paragraph, marks: [] }],
    }));
}

async function main() {
  const write = process.argv.includes("--write");
  const plan = JSON.parse(readFileSync(PLAN, "utf8")) as { people: PlanPerson[] };
  const inventory = JSON.parse(readFileSync(INVENTORY, "utf8")) as { cards: { code: string; storyUrl: string }[]; stories: Record<string, { segments: OldSegment[] }> };
  const client = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!.trim(),
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production",
    apiVersion: "2024-10-01",
    token: process.env.SANITY_API_WRITE_TOKEN!.trim(),
    useCdn: false,
    perspective: "raw",
  });
  const docs = await client.fetch<Story[]>(`*[_type=="story" && !(_id in path("drafts.**"))]{_id, participantCode, "collection": community->slug.current, segments}`);
  const byId = new Map(docs.map((doc) => [doc._id, doc]));
  const added = [];

  for (const person of plan.people) {
    if (person.collection === "chinese") throw new Error(`refusing to edit ${person.code}`);
    const doc = byId.get(person._id);
    if (!doc) throw new Error(`missing ${person._id}`);
    const byKey = new Map((doc.segments || []).map((segment) => [segment._key, segment]));
    const card = inventory.cards.find((item) => codeKey(item.code) === codeKey(person.code));
    const oldSegments = card ? inventory.stories[card.storyUrl].segments : [];
    const items: { oldOrder: number; segment: SanitySegment; created?: boolean }[] = person.rows.map((row) => {
      const segment = byKey.get(row.key);
      if (!segment) throw new Error(`${person.code} missing segment ${row.key}`);
      const next = { ...segment };
      if (!next.lifeStage) next.lifeStage = row.stage;
      return { oldOrder: row.oldOrder, segment: next };
    });
    for (const missing of person.missingOnSanity.filter((item) => item.inSanity < 0.6).sort((a, b) => a.index - b.index)) {
      const old = oldSegments[missing.index];
      const language = languageOf(`${old.title} ${old.bodyText || ""}`);
      const at = items.findIndex((item) => item.oldOrder > missing.index);
      const previous = items[at < 0 ? items.length - 1 : at - 1];
      const stage = previous?.segment.lifeStage || "youth";
      const segment: SanitySegment = {
        _key: key(),
        _type: "storySegment",
        quote: { _type: "localeText", [language]: old.title },
        isQuote: false,
        body: { _type: "localeBlock", [language]: blocks(old.bodyText || "") },
        lifeStage: stage,
      };
      items.splice(at < 0 ? items.length : at, 0, { oldOrder: missing.index, segment, created: true });
      added.push({ code: person.code, oldOrder: missing.index, stage, title: old.title, elicitation: ELICITATION[`${person.code}:${missing.index}`] || "" });
    }
    const unused = (doc.segments || []).filter((segment) => !person.rows.some((row) => row.key === segment._key));
    if (unused.length) throw new Error(`${person.code} has ${unused.length} segments not in the plan`);
    console.log(`${person.code}\t${doc.segments?.length || 0} -> ${items.length}\tnew ${items.filter((item) => item.created).length}`);
    if (write) await client.patch(person._id).set({ segments: items.map((item) => item.segment) }).commit();
  }
  writeFileSync(ADDED, `${JSON.stringify({ savedAt: new Date().toISOString(), added }, null, 2)}\n`);
  console.log(write ? `wrote ${plan.people.length} stories` : "dry run, add --write to apply");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "apply failed");
  process.exit(1);
});
