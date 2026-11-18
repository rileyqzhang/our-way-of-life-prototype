import { readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import mammoth from "mammoth";
import { createClient } from "@sanity/client";
import { lifeStageForGroup } from "@/lib/migration/life-stage-groups";
import { parseStoryHtml, type PortableBlock, type StorySegmentPlan } from "@/lib/migration/story-docx";
import { bodyStartOf, coverage, dice, plain, sanityText, squash, titleOf, type SanitySegment } from "./old-site-match";

loadEnvConfig(process.cwd());

const DOC_DIR = "source-documents/african-american/Chinese Immigrant Stories/Chinese Immigrant Stories";
const REPORT = "source-documents/chinese-stage-plan.json";
const STAGES = ["youth", "adulthood", "olderAdulthood"] as const;
type Stage = (typeof STAGES)[number];

function words(text: string, count: number) {
  return text.split(/\s+/).filter(Boolean).slice(0, count).join(" ");
}

function blockText(blocks: PortableBlock[]) {
  return blocks.map((block) => (block.children || []).map((child) => child.text || "").join("")).join("\n");
}

function scorePair(word: StorySegmentPlan, segment: SanitySegment) {
  const wordTitle = squash(word.title);
  const wordBody = squash(words(blockText(word.body), 40));
  let title = 0;
  let body = 0;
  for (const language of ["zh", "en", "es"] as const) {
    title = Math.max(title, dice(wordTitle, squash(segment.quote?.[language] || "")));
    const sanityBody = squash(words(plain(segment.body?.[language]), 40));
    body = Math.max(body, wordBody && sanityBody ? dice(wordBody, sanityBody.slice(0, wordBody.length)) : 0);
  }
  const overlap = Math.max(coverage(sanityText(segment), squash(`${word.title} ${blockText(word.body)}`)), coverage(squash(blockText(word.body)), sanityText(segment)));
  const status = (title >= 0.85 && body >= 0.45) || body >= 0.9 || title >= 0.95 || overlap >= 0.55 ? "match" : title >= 0.5 || body >= 0.45 || overlap >= 0.3 ? "uncertain" : "none";
  return { title, body, overlap, total: title * 0.6 + body * 0.4, status };
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
  const docs = await client.fetch<{ _id: string; code: string; segments: SanitySegment[] }[]>(
    `*[_type=="story" && community->slug.current=="chinese" && !(_id in path("drafts.**"))]{_id, "code": participantCode, segments}`,
  );
  const files = readdirSync(DOC_DIR).filter((name) => name.endsWith(".docx"));
  const people = [];
  for (const doc of docs.sort((a, b) => a.code.localeCompare(b.code))) {
    const file = files.find((name) => name.toUpperCase().includes(doc.code));
    if (!file) throw new Error(`no docx for ${doc.code}`);
    const html = (await mammoth.convertToHtml({ path: path.join(DOC_DIR, file) }, { styleMap: ["u => u", "highlight => mark"] })).value;
    const plan = parseStoryHtml(html);
    const word = plan.segments;
    const pairs = word.flatMap((item, wordIndex) =>
      (doc.segments || []).map((segment, index) => ({ wordIndex, index, ...scorePair(item, segment) })),
    );
    pairs.sort((a, b) => Number(b.status === "match") - Number(a.status === "match") || b.total - a.total || b.overlap - a.overlap);
    const usedWord = new Set<number>();
    const usedSanity = new Set<number>();
    const chosen = [];
    for (const pair of pairs) {
      if (pair.status === "none" || usedWord.has(pair.wordIndex) || usedSanity.has(pair.index)) continue;
      usedWord.add(pair.wordIndex);
      usedSanity.add(pair.index);
      chosen.push(pair);
    }
    const matched = chosen
      .map((pair) => ({ pair, segment: doc.segments[pair.index], word: word[pair.wordIndex] }))
      .sort((a, b) => a.pair.wordIndex - b.pair.wordIndex);
    const rows: { key: string; currentIndex: number; title: string; group: string; stage: Stage | null; rule: "a" | "b"; status: string; inWord: boolean }[] = matched.map((item) => ({
      key: doc.segments[item.pair.index]._key,
      currentIndex: item.pair.index,
      title: titleOf(doc.segments[item.pair.index]),
      group: item.word.group || "(no group)",
      stage: (lifeStageForGroup(item.word.group) || null) as Stage | null,
      rule: lifeStageForGroup(item.word.group) ? "a" : "b",
      status: item.pair.status,
      inWord: true,
    }));
    for (const index of doc.segments.map((_, item) => item).filter((index) => !usedSanity.has(index))) {
      const insertAt = rows.reduce((at, row, position) => (row.currentIndex < index ? position + 1 : at), 0);
      rows.splice(insertAt, 0, {
        key: doc.segments[index]._key,
        currentIndex: index,
        title: titleOf(doc.segments[index]),
        group: "(not in Word)",
        stage: null,
        rule: "b",
        status: "not-in-word",
        inWord: false,
      });
    }
    for (const [index, row] of rows.entries()) {
      if (row.stage) continue;
      row.stage = index === 0 ? "youth" : rows[index - 1].stage;
      row.rule = "b";
    }
    const regressions = rows.flatMap((row, index) => {
      const previous = [...rows.slice(0, index)].reverse().find((item) => item.stage);
      if (!previous?.stage || !row.stage || STAGES.indexOf(row.stage) >= STAGES.indexOf(previous.stage)) return [];
      return [{ from: { title: previous.title, stage: previous.stage, rule: previous.rule }, to: { title: row.title, stage: row.stage, rule: row.rule } }];
    });
    people.push({
      code: doc.code,
      _id: doc._id,
      file,
      count: doc.segments.length,
      moved: rows.filter((row, index) => row.currentIndex !== index).length,
      notInWord: rows.filter((row) => !row.inWord).map((row) => ({ title: row.title, bodyStart: bodyStartOf(doc.segments[row.currentIndex]) })),
      missingWord: word.filter((_, index) => !usedWord.has(index)).map((item) => ({ title: item.title, group: item.group, bodyStart: words(blockText(item.body), 20) })),
      ruleB: rows.filter((row) => row.rule === "b").map((row) => ({ title: row.title, group: row.group, stage: row.stage, frontYouth: row.group.toLowerCase().includes("what is civic") && row.stage === "youth" })),
      regressions,
      unstaged: rows.filter((row) => !row.stage).length,
      rows,
    });
  }
  writeFileSync(REPORT, `${JSON.stringify({ generatedAt: new Date().toISOString(), people }, null, 2)}\n`);
  console.log(["代号", "段数", "顺序变动", "规则a", "规则b", "不在Word", "Word没有对应", "倒回", "缺阶段"].join("\t"));
  for (const person of people) {
    console.log([person.code, person.count, person.moved, person.rows.filter((row) => row.rule === "a").length, person.ruleB.length, person.notInWord.length, person.missingWord.length, person.regressions.length, person.unstaged].join("\t"));
  }
  console.log(`saved ${REPORT}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "plan failed");
  process.exit(1);
});
