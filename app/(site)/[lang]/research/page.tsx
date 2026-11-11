import type { Metadata } from "next";
import { ResearchText } from "@/components/research/ResearchText";
import { ui } from "@/lib/content/copy";
import { getResearch } from "@/lib/content/research";
import { pick, pickRich } from "@/lib/content/text";
import { readLang } from "@/lib/i18n/request";

const transcriptFolder = "1UkzJwNYZLFRyOMzW1rgn37vUc9-GVIWm";

function httpUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    if (url.toString().includes(transcriptFolder)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = await readLang(params);
  const research = await getResearch();
  return { title: pick(research.access?.tabLabel, lang) || ui[lang].nav.research };
}

export default async function ResearchAccessPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await readLang(params);
  const research = await getResearch();
  const access = research.access;
  const formUrl = httpUrl(access?.formUrl || "");
  const button = pick(access?.buttonLabel, lang);
  const inquiry = pick(access?.inquiry, lang);
  const email = access?.contactEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(access.contactEmail) ? access.contactEmail : "";

  return (
    <section className="researchSheet">
      <h1>{pick(access?.whoCanUse.heading, lang)}</h1>
      <ResearchText value={pickRich(access?.whoCanUse.body, lang)} />
      <h2>{pick(access?.requestingAccess.heading, lang)}</h2>
      <ResearchText value={pickRich(access?.requestingAccess.body, lang)} />
      {formUrl && button ? (
        <a className="researchButton" href={formUrl} rel="noopener noreferrer" target="_blank">
          {button}
        </a>
      ) : null}
      {inquiry || email ? (
        <p className="researchInquiry">
          {inquiry ? <span>{inquiry} </span> : null}
          {email ? <a href={`mailto:${email}`}>{email}</a> : null}
        </p>
      ) : null}
    </section>
  );
}
