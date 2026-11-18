import { readFileSync, writeFileSync } from "node:fs";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@sanity/client";
import { codeKey } from "./old-site-match";

loadEnvConfig(process.cwd());

const INVENTORY = "source-documents/old-site-inventory.json";
const SUMMARIES = "source-documents/backups/story-summaries.json";

type Language = "en" | "es" | "zh";
type Card = { code: string; bio: string; cardIntro?: string; cardIntroLanguage?: Language; cardQuote?: string; cardQuoteLanguage?: Language };
type Inventory = { cards: Card[] } & Record<string, unknown>;
type Summary = { _id: string; participantCode?: string; summary?: { en?: string; es?: string; zh?: string } };

function introFrom(bio: string) {
  const quote = bio.search(/\s["“]/);
  return quote >= 0 ? bio.slice(0, quote).trimEnd() : bio;
}

function languageOf(text: string): Language {
  if (/[\u4e00-\u9fff]/.test(text)) return "zh";
  return /[áéíóúñ¿¡]|\b(Nació|emigro|que|para|una|los|las|del|es|mi)\b/.test(text) ? "es" : "en";
}

async function main() {
  const write = process.argv.includes("--write");
  const inventory = JSON.parse(readFileSync(INVENTORY, "utf8")) as Inventory;
  for (const card of inventory.cards) {
    card.cardIntro = introFrom(card.bio);
    card.cardIntroLanguage = languageOf(card.cardIntro);
    const quote = card.bio.slice(card.cardIntro.length).trim();
    if (quote) {
      card.cardQuote = quote;
      card.cardQuoteLanguage = languageOf(quote);
    } else {
      delete card.cardQuote;
      delete card.cardQuoteLanguage;
    }
  }
  writeFileSync(INVENTORY, JSON.stringify(inventory, null, 2));

  const summaries = (JSON.parse(readFileSync(SUMMARIES, "utf8")) as { documents: Summary[] }).documents;
  const client = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!.trim(),
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production",
    apiVersion: "2024-10-01",
    token: process.env.SANITY_API_WRITE_TOKEN!.trim(),
    useCdn: false,
    perspective: "raw",
  });
  const stories = await client.fetch<{ _id: string; participantCode: string; collection?: string; cardIntro?: Record<string, string>; headline?: Record<string, string> | null }[]>(
    `*[_type=="story"]{_id, participantCode, "collection": community->slug.current, cardIntro, headline}`,
  );
  const cards = new Map(inventory.cards.map((card) => [codeKey(card.code), card]));

  const rows = inventory.cards.map((card) => {
    const backup = summaries.find((doc) => codeKey(doc.participantCode || "") === codeKey(card.code) && !doc._id.startsWith("drafts."));
    const backupText = backup?.summary?.[card.cardIntroLanguage!] || backup?.summary?.en || backup?.summary?.es || "";
    const same = backupText.trim() === card.cardIntro;
    const matches = stories.filter((story) => codeKey(story.participantCode) === codeKey(card.code));
    const targets = matches.map((story) => story._id);
    const headline = matches[0]?.headline;
    const headlineEmpty = !headline || !["en", "es", "zh"].some((language) => headline[language]?.trim());
    return {
      code: card.code,
      sanityCode: matches[0]?.participantCode || "",
      quote: card.cardQuote || "",
      quoteLanguage: card.cardQuoteLanguage,
      writeHeadline: Boolean(card.cardQuote && headlineEmpty && targets.length),
      headline: headlineEmpty ? "" : JSON.stringify(Object.fromEntries(Object.entries(headline!).filter(([key, value]) => key !== "_type" && value))),
      language: card.cardIntroLanguage!,
      intro: card.cardIntro!,
      source: same ? "backup" : "old site",
      backupDiffers: backupText && !same ? backupText.slice(0, 120) : "",
      targets,
    };
  });
  for (const row of rows) console.log([row.code, row.language, row.source, row.targets.join(",") || "NO SANITY STORY", row.intro, row.backupDiffers ? `backup: ${row.backupDiffers}` : ""].join("\t"));
  console.log("\n== Codes ==");
  for (const row of rows) console.log(`${row.code}\t${row.sanityCode || "(none)"}\t${row.code === row.sanityCode ? "same" : "DIFFERENT"}`);
  console.log("\n== Card quote vs headline ==");
  for (const row of rows) {
    console.log(`${row.code}\t${row.writeHeadline ? "WRITE headline" : row.quote ? "keep headline" : "no card quote"}\t${row.quoteLanguage || ""}\tcard: ${row.quote}\theadline: ${row.headline}`);
  }
  const missing = stories.filter((story) => !cards.has(codeKey(story.participantCode)) && !story._id.startsWith("drafts."));
  console.log(`\nNo card intro on the old site: ${missing.map((story) => `${story.participantCode} (${story.collection})`).join(", ")}`);
  if (!write) return console.log("Dry run. Add --write to apply.");

  for (const row of rows) {
    for (const id of row.targets) {
      let patch = client
        .patch(id)
        .setIfMissing({ cardIntro: { _type: "localeText" } })
        .set({ [`cardIntro.${row.language}`]: row.intro });
      if (row.writeHeadline) patch = patch.set({ headline: { _type: "localeText", [row.quoteLanguage!]: row.quote } });
      await patch.commit();
      console.log(`${id}: cardIntro.${row.language} written${row.writeHeadline ? `, headline.${row.quoteLanguage} written` : ""}`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "import failed");
  process.exit(1);
});
