import type { Metadata } from "next";
import { ui } from "@/lib/content/copy";
import { readLang } from "@/lib/i18n/request";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = await readLang(params);
  return { title: ui[lang].nav.research, description: ui[lang].research.transcriptsLede };
}

export default async function ResearchTranscriptsPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await readLang(params);
  const copy = ui[lang].research;

  return (
    <section className="researchPanel">
      <div className="container researchCopy">
        <h1>{copy.transcriptsTitle}</h1>
        <p>{copy.transcriptsLede}</p>
        {process.env.NEXT_PUBLIC_RESEARCH_DOC_URL ? (
          <a className="researchButton" href={process.env.NEXT_PUBLIC_RESEARCH_DOC_URL} rel="noopener noreferrer" target="_blank">
            {copy.openDoc}
          </a>
        ) : (
          <p className="researchPending">{copy.docPending}</p>
        )}
      </div>
    </section>
  );
}
