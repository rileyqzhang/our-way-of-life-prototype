import { createImageUrlBuilder, type SanityImageSource } from "@sanity/image-url";
import { dataset, projectId } from "@/lib/sanity/env";

const builder = projectId ? createImageUrlBuilder({ projectId, dataset }) : null;

export function sanityImageUrl(source: SanityImageSource | null | undefined, width = 1200) {
  if (!builder || !source) return "";
  try {
    return builder.image(source).width(width).auto("format").url();
  } catch {
    return "";
  }
}
