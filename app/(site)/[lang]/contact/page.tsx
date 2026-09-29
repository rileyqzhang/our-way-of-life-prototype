import type { Metadata } from "next";
import { ui } from "@/lib/content/copy";
import { getArchive } from "@/lib/content/get-content";
import { pick } from "@/lib/content/text";
import { readLang } from "@/lib/i18n/request";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = await readLang(params);
  return { title: ui[lang].contact.title };
}

export default async function ContactPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await readLang(params);
  const copy = ui[lang];
  const archive = await getArchive();
  const page = archive.pages.find((item) => item.slug === "contact");
  const email = archive.settings.contactEmail;

  return (
    <>
      <section className="pageHero">
        <div className="container">
          <p className="eyebrow">{copy.contact.eyebrow}</p>
          <h1 className="display">{pick(page?.title, lang) || copy.contact.title}</h1>
          <p className="lede">{pick(page?.summary, lang) || copy.contact.lede}</p>
        </div>
      </section>
      <section className="section">
        <div className="container callout">
          <h2>{copy.contact.heading}</h2>
          <p>{pick(page?.body, lang) || copy.contact.body}</p>
          {email ? (
            <p>
              <a href={`mailto:${email}`}>{email}</a>
            </p>
          ) : null}
        </div>
      </section>
    </>
  );
}
