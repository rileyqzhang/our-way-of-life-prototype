import path from "node:path";
import type { UserViteConfig } from "@sanity/cli";
import { defineCliConfig } from "sanity/cli";
import { loadEnv, mergeConfig, type InlineConfig } from "vite";

const fileEnv = loadEnv("development", process.cwd(), ["NEXT_PUBLIC_SANITY_", "SANITY_STUDIO_"]);

function pick(name: string, fallback = "") {
  return (process.env[name] || fileEnv[name] || fallback).trim();
}

const projectId = pick("NEXT_PUBLIC_SANITY_PROJECT_ID") || pick("SANITY_STUDIO_PROJECT_ID");
const dataset = pick("NEXT_PUBLIC_SANITY_DATASET") || pick("SANITY_STUDIO_DATASET") || "production";

export default defineCliConfig({
  api: {
    projectId: projectId || "missingid",
    dataset,
  },
  vite: ((config: InlineConfig) =>
    mergeConfig(config, {
      envPrefix: ["SANITY_STUDIO_", "NEXT_PUBLIC_SANITY_"],
      resolve: {
        alias: [{ find: /^@\//, replacement: `${path.resolve(process.cwd())}/` }],
      },
      define: {
        "process.env.NEXT_PUBLIC_SANITY_PROJECT_ID": JSON.stringify(projectId),
        "process.env.NEXT_PUBLIC_SANITY_DATASET": JSON.stringify(dataset),
      },
    }) as InlineConfig) satisfies UserViteConfig,
});
