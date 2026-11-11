import { ResearchNav } from "@/components/research/ResearchNav";
import { getResearch } from "@/lib/content/research";
import { pick } from "@/lib/content/text";
import { readLang } from "@/lib/i18n/request";

export default async function ResearchLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const lang = await readLang(params);
  const research = await getResearch();

  return (
    <div className="researchPage">
      <ResearchNav
        label={pick(research.access?.navAria, lang)}
        lang={lang}
        labels={{
          overview: pick(research.access?.tabLabel, lang),
          methodology: pick(research.methodology?.tabLabel, lang),
          publications: pick(research.publicationsPage?.tabLabel, lang),
        }}
      />
      {children}
    </div>
  );
}
