import type { Metadata } from "next";
import { ArchiveImage } from "@/components/media/ArchiveImage";
import { ResearchText } from "@/components/research/ResearchText";
import { getResearch } from "@/lib/content/research";
import { pick, pickRich } from "@/lib/content/text";
import { readLang } from "@/lib/i18n/request";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = await readLang(params);
  const research = await getResearch();
  return { title: pick(research.methodology?.title, lang) || pick(research.methodology?.tabLabel, lang) };
}

export default async function ResearchMethodologyPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await readLang(params);
  const page = (await getResearch()).methodology;
  const heading = pick(page?.participantsHeading, lang);
  const intro = pickRich(page?.participantsBody, lang);
  const photo = page?.photoSrc;

  return (
    <>
      {heading || intro.length || photo ? (
        <section className="researchSheet researchIntro">
          <div className={photo ? "researchParticipants" : undefined}>
            <div>
              {heading ? <h1>{heading}</h1> : null}
              <ResearchText value={intro} />
            </div>
            {photo ? (
              <figure className="researchPortrait">
                <ArchiveImage alt={pick(page?.photoAlt, lang)} className="researchPortraitPhoto" height={720} src={photo} width={960} />
              </figure>
            ) : null}
          </div>
        </section>
      ) : null}
      <section className="researchSheet">
        <header className="researchMethodHead">
          {pick(page?.eyebrow, lang) ? <p>{pick(page?.eyebrow, lang)}</p> : null}
          {pick(page?.title, lang) ? <h2>{pick(page?.title, lang)}</h2> : null}
        </header>
        {(page?.sections || []).map((section, index) => (
          <section className="researchMethod" key={`${pick(section.heading, lang)}-${index}`}>
            <h3>{pick(section.heading, lang)}</h3>
            <ResearchText value={pickRich(section.body, lang)} />
          </section>
        ))}
      </section>
    </>
  );
}
