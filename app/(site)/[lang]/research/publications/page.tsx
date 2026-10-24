import { access } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { ui } from "@/lib/content/copy";
import { readLang } from "@/lib/i18n/request";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = await readLang(params);
  return { title: ui[lang].research.publications };
}

async function dissertationReady() {
  try {
    await access(path.join(process.cwd(), "public", "research", "dissertation.pdf"));
    return true;
  } catch {
    return false;
  }
}

export default async function ResearchPublicationsPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await readLang(params);
  const copy = ui[lang].research;
  const pdfReady = await dissertationReady();

  return (
    <section className="researchPanel">
      <div className="container researchCopy">
        <h1 className="researchKicker">{copy.dissertation}</h1>
        <p className="researchDissertation">{copy.dissertationTitle}</p>
        {pdfReady ? (
          <a className="researchButton" href="/research/dissertation.pdf" download>
            {copy.downloadPdf} <span aria-hidden="true">↓</span>
          </a>
        ) : (
          <p className="researchPending">{copy.pdfPending}</p>
        )}
      </div>
    </section>
  );
}
