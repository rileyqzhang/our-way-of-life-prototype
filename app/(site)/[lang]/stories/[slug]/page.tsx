import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StoryFade } from "@/components/story/StoryFade";
import { StoryPortable } from "@/components/story/StoryPortable";
import { StoryTimeline } from "@/components/story/StoryTimeline";
import { ui } from "@/lib/content/copy";
import { portraitAlt } from "@/lib/content/derive";
import { groupStorySegments, localizedBlocks, localizedPlain, portablePlain, readingFallback, storyContentLocale } from "@/lib/content/story-segments";
import { pick } from "@/lib/content/text";
import { locales, localizeHref } from "@/lib/i18n";
import { readLang } from "@/lib/i18n/request";
import { sanityImageUrl } from "@/lib/sanity/image";
import { getStoryDocument, publishedStorySlugs } from "@/lib/sanity/story-document";

export const dynamicParams = true;
export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await publishedStorySlugs();
  return locales.flatMap((lang) => slugs.map((slug) => ({ lang, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lang = await readLang(params);
  const story = await getStoryDocument(slug);
  if (!story) return { title: ui[lang].stories.title };
  const contentLang = storyContentLocale(story, lang);
  const headline = localizedPlain(story.headline, contentLang);
  const overviewLead = portablePlain(localizedBlocks(story.overview, contentLang)).split(/\n\s*\n/).find(Boolean);
  return {
    title: story.participantCode || ui[lang].stories.title,
    description: overviewLead || headline,
  };
}

export default async function StoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; slug: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const { slug } = await params;
  const fromParam = (await searchParams).from;
  const from = Array.isArray(fromParam) ? fromParam[0] : fromParam;
  const lang = await readLang(params);
  const story = await getStoryDocument(slug);
  if (!story?.participantCode) notFound();

  const copy = ui[lang];
  const code = story.participantCode;
  const contentLang = storyContentLocale(story, lang);
  const languageNote = contentLang === lang ? "" : copy.story.toldIn[contentLang];
  const location = localizedPlain(story.location, lang);
  const headline = localizedPlain(story.headline, contentLang).trim();
  const overview = localizedBlocks(story.overview, contentLang).filter((block) => (block.children || []).some((child) => child.text?.trim()));
  const stages = groupStorySegments(story.segments, contentLang);
  const hasSegments = stages.some((stage) => !stage.empty);
  const fallback = hasSegments ? null : readingFallback(story.article, story.body, contentLang);
  const photo = story.photographs?.[0];
  const photoSrc = sanityImageUrl(photo?.image, 2400) || photo?.legacySrc?.trim() || "";
  const photoAlt = localizedPlain(photo?.alt, lang) || pick(portraitAlt(code), lang);
  const initial = code.trim().charAt(0).toUpperCase();
  const badge = location ? `${code} · ${location}` : code;
  const collectionName = localizedPlain(story.collectionName, lang);
  const fromCollection = Boolean(from && story.collectionSlug && from === story.collectionSlug && collectionName);
  const backHref = fromCollection
    ? localizeHref(lang, `/stories/collections/${story.collectionSlug}`)
    : localizeHref(lang, "/stories");
  const backLabel = fromCollection
    ? `${copy.story.backTo}${lang === "zh" ? "" : " "}${collectionName}`
    : copy.story.backParticipants;

  return (
    <article className="storyPage">
      <div className="storyReturn">
        <Link href={backHref}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          {backLabel}
        </Link>
      </div>
      <section className={["storyHero", photoSrc ? "" : "isFallback", headline ? "" : "isQuiet"].filter(Boolean).join(" ")}>
        {photoSrc ? <Image className="storyHeroImage" src={photoSrc} alt={photoAlt} fill priority sizes="100vw" /> : <p className="storyHeroInitial" aria-hidden="true">{initial}</p>}
        <div className="storyHeroShade" />
        <div className="storyHeroCopy">
          <p className="storyBadge">{badge}</p>
          {headline ? <blockquote className="storyHeroQuote">{headline}</blockquote> : null}
        </div>
      </section>

      <div className="storyColumns">
        <StoryTimeline
          stages={stages.map((stage) => ({
            id: stage.id,
            title: stage.title,
            empty: stage.empty,
            segments: stage.segments.map((segment) => ({ id: segment.id, label: segment.timelineTitle })),
          }))}
        />
        <header className="storyOverview">
          <h1>{code}</h1>
          {location ? <p className="storyOverviewPlace">{location}</p> : null}
          {languageNote ? <p className="storyLanguageNote">{languageNote}</p> : null}
          {overview.length ? (
            <div className="storyOverviewText">
              <StoryPortable value={overview} />
            </div>
          ) : null}
        </header>
        <div className="storyStages">
          {stages
            .filter((stage) => !stage.empty)
            .map((stage) => (
              <StoryFade key={stage.id}>
                <section className="storyStageCard" aria-labelledby={`story-heading-${stage.id}`}>
                  <div className="storyCardHead">
                    <h2 id={`story-heading-${stage.id}`}>{stage.title}</h2>
                  </div>
                  <div className="storyCardBody">
                    {stage.segments.map((segment) => (
                      <article key={segment.id} id={segment.id} className="storySegment" data-story-segment={segment.id} data-story-stage={stage.id}>
                        {segment.title ? (
                          <h3 className={segment.isQuote ? "storyCardQuote" : "storyCardHeading"} tabIndex={-1}>
                            {segment.isQuote ? <span aria-hidden="true">“</span> : null}
                            {segment.title}
                          </h3>
                        ) : null}
                        {segment.title && segment.body.length ? <div className="storyCardRule" /> : null}
                        <StoryPortable value={segment.body} />
                      </article>
                    ))}
                  </div>
                </section>
              </StoryFade>
            ))}
          {fallback ? (
            <div className="storyFallback">
              {fallback.kind === "blocks" ? (
            <StoryPortable value={fallback.blocks} />
          ) : (
            fallback.paragraphs.map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>)
          )}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
