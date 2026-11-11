import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@sanity/client";
import { localCollectionPage } from "@/lib/content/collections";

loadEnvConfig(process.cwd());

const themes: Record<string, { from: string; to: string; accent: string; muted: string }> = {
  latine: { from: "#2E120D", to: "#1A0A07", accent: "#D9AD62", muted: "#B97D5F" },
  africanAmerican: { from: "#0E1B2E", to: "#080F1A", accent: "#D4B678", muted: "#8FA5BD" },
  chinese: { from: "#0D241B", to: "#07150F", accent: "#D4B76D", muted: "#88B29D" },
};

function rgbOf(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function color(hex: string) {
  const { r, g, b } = rgbOf(hex);
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  if (delta) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h = (h * 60 + 360) % 360;
  }
  const l = (max + min) / 2;
  const sl = delta ? delta / (1 - Math.abs(2 * l - 1)) : 0;
  const sv = max ? delta / max : 0;
  return {
    _type: "color",
    hex: hex.toLowerCase(),
    alpha: 1,
    rgb: { _type: "rgbaColor", r, g, b, a: 1 },
    hsl: { _type: "hslaColor", h, s: sl, l, a: 1 },
    hsv: { _type: "hsvaColor", h, s: sv, v: max, a: 1 },
  };
}

function words(value: { en: string; es: string; zh: string }) {
  return { _type: "localeString", ...value };
}

async function main() {
  const write = process.argv.includes("--write");
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
  const token = process.env.SANITY_API_WRITE_TOKEN?.trim();
  if (!projectId || !token) throw new Error("SANITY_API_WRITE_TOKEN is missing. Nothing was written.");
  const client = createClient({ projectId, dataset, apiVersion: "2024-10-01", token, useCdn: false, perspective: "raw" });

  const collections = await client.fetch<{ _id: string; slug?: string }[]>(
    `*[_type == "collection" && slug.current in $slugs]{ _id, "slug": slug.current }`,
    { slugs: Object.keys(themes) },
  );
  const before = await client.fetch(`*[_id in $ids || _id in ["collectionPage", "drafts.collectionPage"]]`, {
    ids: collections.map((item) => item._id),
  });

  console.log(`Collection documents found: ${collections.map((item) => `${item.slug} (${item._id})`).join(", ")}`);
  const missing = Object.keys(themes).filter((slug) => !collections.some((item) => item.slug === slug));
  if (missing.length) console.log(`Not found, skipped: ${missing.join(", ")}`);
  if (!write) {
    console.log("Dry run. Add --write to back up and import.");
    return;
  }

  const backupDir = path.join(process.cwd(), "source-documents/backups");
  mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `collections-before-theme-${new Date().toISOString().slice(0, 10)}.json`);
  writeFileSync(backupFile, JSON.stringify(before, null, 2));
  console.log(`Backup written: ${path.relative(process.cwd(), backupFile)} (${before.length} documents)`);

  for (const item of collections) {
    const theme = themes[item.slug || ""];
    if (!theme) continue;
    await client
      .patch(item._id)
      .set({
        backgroundGradient: { _type: "object", from: color(theme.from), to: color(theme.to) },
        accentColor: color(theme.accent),
        mutedColor: color(theme.muted),
      })
      .commit();
    console.log(`Theme set on ${item._id}`);
  }

  const wording = {
    backLabel: words(localCollectionPage.backLabel),
    eyebrow: words(localCollectionPage.eyebrow),
    titleSuffix: words(localCollectionPage.titleSuffix),
  };
  await client.createIfNotExists({ _id: "collectionPage", _type: "collectionPage" });
  await client.patch("collectionPage").set(wording).commit();
  if (await client.getDocument("drafts.collectionPage")) await client.patch("drafts.collectionPage").set(wording).commit();
  console.log("Collection page wording published (collectionPage).");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
