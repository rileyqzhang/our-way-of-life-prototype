import { ArchiveImage } from "@/components/media/ArchiveImage";
import type { ArchiveCollection } from "@/lib/content/collections";
import { pick } from "@/lib/content/text";
import type { Locale } from "@/lib/i18n";

export function volumeTone(slug: string) {
  if (slug === "latine" || slug === "africanAmerican" || slug === "chinese") return slug;
  return "latine";
}

export function volumeTransitionName(slug: string) {
  const names = { latine: "archive-book-latine", africanAmerican: "archive-book-african-american", chinese: "archive-book-chinese" };
  return names[volumeTone(slug)];
}

export function ArchiveVolumeBook({
  collection,
  lang,
  cta,
  priority = false,
}: {
  collection: ArchiveCollection;
  lang: Locale;
  cta?: string;
  priority?: boolean;
}) {
  const description = pick(collection.description, lang);
  return (
    <>
      <span className="volumeShadow" aria-hidden="true" />
      <span className="volumeBody">
        <span className="volumeSpine" aria-hidden="true">
          <span className="volumeSpineLight" />
        </span>
        <span className="volumeCover">
          <span className="volumeCoverShade" aria-hidden="true" />
          <span className="volumeTitle">{pick(collection.name, lang)}</span>
          <span className="volumePhotoFrame">
            {collection.image ? (
              <ArchiveImage alt={pick(collection.imageAlt, lang)} className="volumePhoto" height={540} priority={priority} src={collection.image} width={350} />
            ) : (
              <span className="volumePhoto volumePhoto--empty" />
            )}
            <span className="volumePhotoRule" aria-hidden="true" />
          </span>
          {description ? <span className="volumeBlurb">{description}</span> : null}
          {cta ? (
            <span className="volumeCta">
              {cta} <span aria-hidden="true">→</span>
            </span>
          ) : null}
        </span>
      </span>
    </>
  );
}
