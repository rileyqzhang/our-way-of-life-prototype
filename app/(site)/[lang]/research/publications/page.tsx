import type { Metadata } from "next";
import { CitationList } from "@/components/research/CitationList";
import { getResearch } from "@/lib/content/research";
import { pick } from "@/lib/content/text";
import { readLang } from "@/lib/i18n/request";

function httpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = await readLang(params);
  const research = await getResearch();
  return { title: pick(research.publicationsPage?.tabLabel, lang) };
}

export default async function ResearchPublicationsPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await readLang(params);
  const research = await getResearch();
  const page = research.publicationsPage;
  const articles = research.publications.filter((item) => item.section !== "dissertation");
  const dissertations = research.publications.filter((item) => item.section === "dissertation");
  const downloadUrl = httpUrl(page?.downloadUrl || "");
  const downloadLabel = pick(page?.downloadLabel, lang);

  return (
    <section className="researchSheet">
      <h1>{pick(page?.publicationsHeading, lang)}</h1>
      <CitationList items={articles} />
      {dissertations.length ? (
        <section className="researchBlock">
          <h2>{pick(page?.dissertationHeading, lang)}</h2>
          <CitationList items={dissertations} />
        </section>
      ) : null}
      {pick(page?.accessHeading, lang) || (downloadUrl && downloadLabel) ? (
        <section className="researchBlock">
          <h2>{pick(page?.accessHeading, lang)}</h2>
          {downloadUrl && downloadLabel ? (
            <a className="researchButton" href={downloadUrl} rel="noopener noreferrer" target="_blank">
              {downloadLabel} <span aria-hidden="true">↓</span>
            </a>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
