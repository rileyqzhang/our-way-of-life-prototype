import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveImage } from "@/components/media/ArchiveImage";
import { ui } from "@/lib/content/copy";
import { getArchive, getStory } from "@/lib/content/get-content";
import { pick } from "@/lib/content/text";
import { locales, localizeHref } from "@/lib/i18n";
import { readLang } from "@/lib/i18n/request";

export async function generateStaticParams() {
  const archive = await getArchive();
  return locales.flatMap((lang) => archive.stories.map((story) => ({ lang, slug: story.slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lang = await readLang(params);
  const story = await getStory(slug);
  if (!story) return { title: ui[lang].stories.title };
  return { title: pick(story.title, lang), description: pick(story.summary, lang) };
}

export default async function StoryPage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { slug } = await params;
  const lang = await readLang(params);
  const story = await getStory(slug);
  if (!story) notFound();
  const copy = ui[lang];
  const photo = story.photographs[0];

  return (
    <>
      <section className="archiveHero">
        <div className="container archiveHeroSplit">
          <div className="archiveHeroCopy">
            <p className="eyebrow">
              <Link href={localizeHref(lang, "/stories")}>{copy.story.back}</Link>
            </p>
            <h1 className="archiveTitle">{pick(story.title, lang)}</h1>
            <p className="archiveLede">{pick(story.summary, lang)}</p>
          </div>
          {photo ? (
            <figure className="archivePhotoFrame">
              <ArchiveImage alt={pick(photo.alt, lang)} className="storyPortrait" height={900} priority src={photo.src} width={900} />
              {photo.caption ? <figcaption>{pick(photo.caption, lang)}</figcaption> : null}
              {photo.source ? <p className="photoMeta">{photo.source}</p> : null}
              {photo.usagePermission ? <p className="photoMeta">{photo.usagePermission}</p> : null}
            </figure>
          ) : null}
        </div>
      </section>
      <div className="goldBar" aria-hidden="true" />

      <section className="paperBand">
        <div className="container storyDetail">
          <h2>{copy.story.quotations}</h2>
          <div className="quotationList">
            {story.quotations.map((quotation, index) => (
              <blockquote key={`${quotation.eventId}-${index}`}>
                <p>{pick(quotation.text, lang)}</p>
                <footer>
                  <Link href={`${localizeHref(lang, "/timeline")}#${quotation.eventId}`}>
                    {quotation.eventDate} · {pick(quotation.eventTitle, lang)}
                  </Link>
                </footer>
              </blockquote>
            ))}
          </div>

          {story.relatedEvents.length ? (
            <>
              <h2>{copy.story.related}</h2>
              <ul className="relatedEvents">
                {story.relatedEvents.map((event) => (
                  <li key={event.id}>
                    <Link href={`${localizeHref(lang, "/timeline")}#${event.id}`}>
                      {event.date} · {pick(event.title, lang)}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {story.externalHref ? (
            <p>
              <a href={story.externalHref} rel="noopener noreferrer" target="_blank">
                {copy.story.archiveLink}
              </a>
            </p>
          ) : null}
        </div>
      </section>
    </>
  );
}
