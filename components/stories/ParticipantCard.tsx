import Link from "next/link";
import { ArchiveImage } from "@/components/media/ArchiveImage";
import { PortraitPlaceholder } from "@/components/PortraitPlaceholder";
import type { ArchiveStory } from "@/lib/content/derive";
import { openingQuotation, pick } from "@/lib/content/text";
import { omitElicitationPlain } from "@/lib/content/story-segments";
import { localizeHref, type Locale } from "@/lib/i18n";

function stripQuotes(text: string) {
  return text.trim().replace(/^["“«]+|["”»]+$/g, "").trim();
}

export function ParticipantCard({
  story,
  lang,
  readStory,
  comingSoon,
  fromCollection,
  variant = "default",
}: {
  story: ArchiveStory;
  lang: Locale;
  readStory: string;
  comingSoon: string;
  fromCollection?: string;
  variant?: "default" | "collection";
}) {
  const photo = story.photographs[0];
  const headline = stripQuotes(pick(story.headline, lang));
  const overviewLead = pick(story.overview, lang)
    .split(/(?<=[.!?。！？])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");
  const legacyQuote = openingQuotation(
    story.body
      ? {
          en: omitElicitationPlain(story.body.en || ""),
          es: omitElicitationPlain(story.body.es || ""),
          zh: omitElicitationPlain(story.body.zh || ""),
        }
      : undefined,
    lang,
  );
  const quote = headline || overviewLead || stripQuotes(legacyQuote);
  const location = pick(story.location, lang);
  const hasStory = story.hasSegments === true;
  const href = localizeHref(lang, fromCollection ? `/stories/${story.slug}?from=${fromCollection}` : `/stories/${story.slug}`);

  if (variant === "collection") {
    const archiveBody = (
      <>
        <div className="archiveCardMedia">
          {photo ? (
            <ArchiveImage alt={pick(photo.alt, lang)} className="archiveCardPhoto" height={640} src={photo.src} width={640} />
          ) : (
            <PortraitPlaceholder code={story.participantCode} />
          )}
        </div>
        <div className="archiveCardBody">
          <p className="archiveCardCode">{story.participantCode}</p>
          {quote ? (
            <>
              <span className="archiveCardMark" aria-hidden="true">
                “
              </span>
              <blockquote className="archiveCardQuote" lang={lang}>
                {quote}
              </blockquote>
            </>
          ) : null}
          <div className="archiveCardFoot">
            {location ? <p className="archiveCardLocation">{location}</p> : null}
            {hasStory ? (
              <span className="archiveCardRead">
                {readStory} <span aria-hidden="true">→</span>
              </span>
            ) : (
              <span className="archiveCardSoon">{comingSoon}</span>
            )}
          </div>
        </div>
      </>
    );
    if (!hasStory) return <article className="archiveCard">{archiveBody}</article>;
    return (
      <Link className="archiveCard" href={href}>
        {archiveBody}
      </Link>
    );
  }

  const body = (
    <>
      <div className="participantCardMedia">
        {photo ? (
          <ArchiveImage alt={pick(photo.alt, lang)} className="participantCardPhoto" height={448} src={photo.src} width={640} />
        ) : (
          <PortraitPlaceholder code={story.participantCode} />
        )}
        <div className="participantCardShade" />
        <span className="participantCardCode">{story.participantCode}</span>
      </div>
      <div className="participantCardBody">
        <div>
          {quote ? (
            <span className="participantCardMark" aria-hidden="true">
              "
            </span>
          ) : null}
          {quote ? (
            <p className="participantCardQuote" lang={lang}>
              {quote}
            </p>
          ) : null}
        </div>
        <div className="participantCardFoot">
          <span className="participantCardLocation">{location}</span>
          {hasStory ? (
            <span className="participantCardRead">
              {readStory} <span aria-hidden="true">→</span>
            </span>
          ) : (
            <span className="participantCardSoon">{comingSoon}</span>
          )}
        </div>
      </div>
    </>
  );

  if (!hasStory) return <article className="participantCard">{body}</article>;

  return (
    <Link className="participantCard" href={href}>
      {body}
    </Link>
  );
}
