import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { presentationTool } from "sanity/presentation";
import { structureTool } from "sanity/structure";
import { structure } from "./cms/desk";
import { schemaTypes } from "./cms/schemaTypes";

function defined(value: string | undefined) {
  return value?.trim() || "";
}

function meta(name: string) {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  return defined(env?.[name]);
}

const projectId =
  (typeof process !== "undefined" && defined(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID)) ||
  (typeof process !== "undefined" && defined(process.env.SANITY_STUDIO_PROJECT_ID)) ||
  meta("NEXT_PUBLIC_SANITY_PROJECT_ID") ||
  meta("SANITY_STUDIO_PROJECT_ID") ||
  "missingid";
const dataset =
  (typeof process !== "undefined" && defined(process.env.NEXT_PUBLIC_SANITY_DATASET)) ||
  (typeof process !== "undefined" && defined(process.env.SANITY_STUDIO_DATASET)) ||
  meta("NEXT_PUBLIC_SANITY_DATASET") ||
  meta("SANITY_STUDIO_DATASET") ||
  "production";
const previewUrl =
  (typeof process !== "undefined" && defined(process.env.SANITY_STUDIO_PREVIEW_URL)) ||
  meta("SANITY_STUDIO_PREVIEW_URL") ||
  "http://localhost:3000";

export default defineConfig({
  name: "our-way-of-life",
  title: "Our Way of Life Archive",
  projectId,
  dataset,
  basePath: "/studio",
  plugins: [
    structureTool({ structure }),
    presentationTool({
      previewUrl: {
        initial: previewUrl,
        previewMode: { enable: "/api/draft-mode/enable" },
      },
      resolve: {
        locations: {
          story: {
            select: { title: "title.en", slug: "slug.current" },
            resolve: (doc) => ({
              locations: [
                { title: `${doc?.title || "Story"} · English`, href: `/en/stories/${doc?.slug || ""}` },
                { title: `${doc?.title || "Story"} · Español`, href: `/es/stories/${doc?.slug || ""}` },
                { title: `${doc?.title || "Story"} · 中文`, href: `/zh/stories/${doc?.slug || ""}` },
              ],
            }),
          },
          timelineEvent: {
            select: { title: "title.en", slug: "slug.current" },
            resolve: (doc) => ({
              locations: [
                { title: doc?.title || "Timeline", href: `/en/timeline#${doc?.slug || ""}` },
                { title: "Español", href: `/es/timeline#${doc?.slug || ""}` },
                { title: "中文", href: `/zh/timeline#${doc?.slug || ""}` },
              ],
            }),
          },
          page: {
            select: { title: "title.en", slug: "slug.current" },
            resolve: (doc) => {
              const slug = doc?.slug || "";
              const path = slug === "home" ? "" : slug === "share-your-story" ? "/share-your-story" : `/${slug}`;
              return {
                locations: [
                  { title: `${doc?.title || "Page"} · English`, href: `/en${path}` },
                  { title: "Español", href: `/es${path}` },
                  { title: "中文", href: `/zh${path}` },
                ],
              };
            },
          },
        },
      },
    }),
    visionTool(),
  ],
  schema: { types: schemaTypes },
});
