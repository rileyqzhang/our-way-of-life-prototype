export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim() || "";
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
export const apiVersion = "2024-10-01";

export function isSanityConfigured() {
  return /^[a-z0-9-]+$/.test(projectId);
}
