import type { Metadata } from "next";
import { ui } from "@/lib/content/copy";
import { readLang } from "@/lib/i18n/request";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = await readLang(params);
  return { title: ui[lang].research.methodology };
}

export default async function ResearchMethodologyPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await readLang(params);
  const copy = ui[lang].research;

  return (
    <section className="researchPanel">
      <div className="container researchCopy">
        <h1>{copy.methodologyTitle}</h1>
        <p>{copy.methodologyBody}</p>
      </div>
    </section>
  );
}
