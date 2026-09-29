import { createClient, type SanityClient } from "next-sanity";
import { apiVersion, dataset, isSanityConfigured, projectId } from "@/lib/sanity/env";

export const client: SanityClient | null = isSanityConfigured()
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: true,
      perspective: "published",
    })
  : null;

export function previewClient() {
  if (!client) return null;
  return client.withConfig({
    useCdn: false,
    token: process.env.SANITY_API_READ_TOKEN,
    perspective: "previewDrafts",
    stega: { studioUrl: "/studio" },
  });
}
