import { readFileSync, writeFileSync } from "node:fs";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@sanity/client";
import { bodyStartOf, codeKey, coverage, sanityText, score, squash, titleOf, type OldSegment, type SanitySegment } from "./old-site-match";

loadEnvConfig(process.cwd());

const INVENTORY = "source-documents/old-site-inventory.json";
const REPORT = "source-documents/old-site-order-report.json";
const STAGES = ["youth", "adulthood", "olderAdulthood"] as const;
type Stage = (typeof STAGES)[number];
const STAGE_HEADING: [RegExp, Stage][] = [
  [/^(childhood|youth|adolescence|growing up|la niñez|niñez|infancia|juventud|adolescencia)$/i, "youth"],
  [/^(adulthood|adult life|la adultez|adultez|edad adulta|vida adulta)$/i, "adulthood"],
  [/^(later life|older adulthood|old age|la vejez|vejez|tercera edad|edad mayor)$/i, "olderAdulthood"],
];

type OutlineItem = { position: number; tag: string; text: string };
type Inventory = {
  cards: { code: string; storyUrl: string }[];
  stories: Record<string, { outline?: OutlineItem[]; segments: OldSegment[] }>;
};
type Story = { _id: string; participantCode: string; collection?: string; segments?: SanitySegment[] | null };

type Row = {
  key: string;
  currentIndex: number;
  newIndex: number;
  oldOrder: number | null;
  locateScore: number;
  title: string;
  bodyStart: string;
  wordStage: string | null;
  pageStage: Stage | null;
  stage: Stage | null;
  source: "page" | "word" | "neighbors" | "edge" | "needs-review";
  note?: string;
};

function isStage(value: unknown): value is Stage {
  return STAGES.includes(value as Stage);
}

function pageStages(outline: OutlineItem[] | undefined, segments: OldSegment[]) {
  const headings = (outline || [])
    .map((item) => ({ position: item.position, stage: STAGE_HEADING.find(([pattern]) => pattern.test(item.text.replace(/[:.]$/, "").trim()))?.[1] }))
    .filter((item): item is { position: number; stage: Stage } => Boolean(item.stage));
  return segments.map((segment) => {
    const before = headings.filter((heading) => heading.position < (segment.position ?? -1));
    return before.length ? before[before.length - 1].stage : null;
  });
}

function locate(segment: SanitySegment, oldSegments: OldSegment[]) {
  const text = sanityText(segment);
  const measures = oldSegments.map((old) => {
    const oldText = squash(`${old.title} ${old.bodyText || old.bodyStart}`);
    return Math.max(score(old, segment).total, coverage(text, oldText), coverage(squash(old.bodyText || old.bodyStart), text));
  });
  const best = Math.max(0, ...measures);
  const index = measures.findIndex((value) => value >= best - 0.05);
  return { index: best > 0 ? index : -1, score: best };
}

function neighborStage(rows: Row[], index: number, step: -1 | 1) {
  for (let i = index + step; i >= 0 && i < rows.length; i += step) {
    if ((rows[i].source === "page" || rows[i].source === "word") && rows[i].stage) return { stage: rows[i].stage, distance: Math.abs(i - index) };
  }
  return null;
}

function plan(story: Story, oldSegments: OldSegment[] | null, outline: OutlineItem[] | undefined) {
  const segments = story.segments || [];
  const fromPage = oldSegments ? pageStages(outline, oldSegments) : [];
  const located = segments.map((segment, currentIndex) => {
    const found = oldSegments ? locate(segment, oldSegments) : { index: -1, score: 0 };
    return { segment, currentIndex, oldOrder: found.index >= 0 ? found.index : null, locateScore: found.score };
  });
  let carry = -1;
  const sortKey = located.map((item) => {
    if (item.oldOrder !== null && item.locateScore >= 0.3) carry = item.oldOrder;
    return oldSegments ? (item.oldOrder !== null && item.locateScore >= 0.3 ? item.oldOrder : carry + 0.5) : item.currentIndex;
  });
  const ordered = located.map((item, i) => ({ ...item, sortKey: sortKey[i] })).sort((a, b) => a.sortKey - b.sortKey || a.currentIndex - b.currentIndex);

  const rows: Row[] = ordered.map((item, newIndex) => {
    const pageStage = item.oldOrder !== null && item.locateScore >= 0.3 ? fromPage[item.oldOrder] ?? null : null;
    const wordStage = item.segment.lifeStage || null;
    const stage = pageStage || (isStage(wordStage) ? wordStage : null);
    return {
      key: item.segment._key,
      currentIndex: item.currentIndex,
      newIndex,
      oldOrder: item.oldOrder,
      locateScore: Number(item.locateScore.toFixed(2)),
      title: titleOf(item.segment),
      bodyStart: bodyStartOf(item.segment),
      wordStage,
      pageStage,
      stage,
      source: pageStage ? "page" : stage ? "word" : "needs-review",
      note: oldSegments && item.locateScore < 0.3 ? "没在旧站页面上定位到，放在原来前一段的后面" : undefined,
    };
  });

  for (const [index, row] of rows.entries()) {
    if (row.stage) continue;
    const before = neighborStage(rows, index, -1);
    const after = neighborStage(rows, index, 1);
    if (before && after && before.stage === after.stage) {
      row.stage = before.stage;
      row.source = "neighbors";
      row.note = before.distance > 1 || after.distance > 1 ? "前后最近的有阶段段落相同（中间隔着其他没阶段的段落）" : undefined;
    } else if (!after && before?.stage === "olderAdulthood") {
      row.stage = "olderAdulthood";
      row.source = "edge";
      row.note = "后面没有段落，前一段已是 Older Adulthood，不能倒回，只能是 Older Adulthood";
    } else if (!before && after?.stage === "youth") {
      row.stage = "youth";
      row.source = "edge";
      row.note = "前面没有段落，后一段是 Youth，只能是 Youth";
    } else {
      row.stage = before?.stage || after?.stage || null;
      row.source = "needs-review";
      row.note = !before ? `前面没有段落，暂按后一段归入 ${after?.stage}` : !after ? `后面没有段落，暂按前一段归入 ${before.stage}` : `前一段 ${before.stage}，后一段 ${after.stage}，暂按前一段归入`;
    }
  }

  const regressions = rows.flatMap((row, index) => {
    const previous = rows.slice(0, index).reverse().find((item) => item.stage);
    if (!previous || !row.stage || STAGES.indexOf(row.stage) >= STAGES.indexOf(previous.stage!)) return [];
    return [{ at: index, from: { index: previous.newIndex, stage: previous.stage, source: previous.source, title: previous.title }, to: { index: row.newIndex, stage: row.stage, source: row.source, title: row.title } }];
  });
  const shared = Object.entries(
    rows.reduce<Record<string, number>>((map, row) => {
      if (row.oldOrder !== null && row.locateScore >= 0.3) map[row.oldOrder] = (map[row.oldOrder] || 0) + 1;
      return map;
    }, {}),
  ).filter(([, count]) => count > 1);
  return { rows, regressions, sharedOldPositions: shared.map(([order, count]) => ({ oldOrder: Number(order), count })) };
}

async function main() {
  const client = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!.trim(),
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production",
    apiVersion: "2024-10-01",
    token: process.env.SANITY_API_WRITE_TOKEN!.trim(),
    useCdn: false,
    perspective: "raw",
  });
  const inventory = JSON.parse(readFileSync(INVENTORY, "utf8")) as Inventory;
  const stories = await client.fetch<Story[]>(`*[_type=="story" && !(_id in path("drafts.**"))]{_id, participantCode, "collection": community->slug.current, segments} | order(participantCode asc)`);
  const cards = new Map(inventory.cards.map((card) => [codeKey(card.code), card]));

  const people = stories.map((story) => {
    const card = cards.get(codeKey(story.participantCode));
    const page = card ? inventory.stories[card.storyUrl] : undefined;
    const result = plan(story, page?.segments || null, page?.outline);
    const moved = result.rows.filter((row) => row.currentIndex !== row.newIndex).length;
    return { code: story.participantCode, _id: story._id, onOldSite: Boolean(page), moved, ...result };
  });
  writeFileSync(REPORT, `${JSON.stringify({ generatedAt: new Date().toISOString(), people }, null, 2)}\n`);

  console.log(["代号", "段数", "顺序变动", "页面", "Word", "前后推断", "顺序推断", "需要判断", "倒回"].join("\t"));
  for (const person of people) {
    const count = (source: Row["source"]) => person.rows.filter((row) => row.source === source).length;
    console.log(
      [person.code + (person.onOldSite ? "" : "*"), person.rows.length, person.moved, count("page"), count("word"), count("neighbors"), count("edge"), count("needs-review"), person.regressions.length].join("\t"),
    );
  }
  console.log(`Saved ${REPORT}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "order plan failed");
  process.exit(1);
});
