import { spawnSync } from "node:child_process";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const output = process.argv[2];
if (!output) throw new Error("Usage: npx tsx scripts/export-dataset.ts source-documents/backups/<name>.tar.gz");
const token = process.env.SANITY_API_WRITE_TOKEN?.trim();
if (!token) throw new Error("SANITY_API_WRITE_TOKEN is missing. Nothing was exported.");
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";

const result = spawnSync("npx", ["sanity", "dataset", "export", dataset, output, "--overwrite"], {
  stdio: "inherit",
  env: { ...process.env, SANITY_AUTH_TOKEN: token },
});
process.exit(result.status ?? 1);
