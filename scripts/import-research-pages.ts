import { createReadStream, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient, type SanityClient } from "@sanity/client";
import { ui } from "@/lib/content/copy";

loadEnvConfig(process.cwd());

const TRANSCRIPT_FOLDER = "1UkzJwNYZLFRyOMzW1rgn37vUc9-GVIWm";
const FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfPRlUqLzHGMCH8yaic9tU3N0tKNsGsygCwemEtvwZH5QVIXA/viewform?usp=publish-editor";
const DOWNLOAD_URL = "https://drive.google.com/drive/folders/1XjqtXjeFt67TxoLAPQOAN3pgJcsYX_f9?usp=share_link";
const COLLECTION_DESCRIPTION = "Civic contributions across the life course.";
const DISSERTATION_NOTE = "Same citation as publication 4, Reyes (2023), Research on Aging, https://doi.org/10.1177/01640275221094288. The prototype repeats that journal article in the Dissertation block. Confirm with the professor whether this should stay or be replaced with the dissertation itself.";

type MethodologySection = { title: string; paragraphs: string[] };

const sectionTitles: Record<string, { es: string; zh: string }> = {
  "Background and Aims": { es: "Antecedentes y objetivos", zh: "背景与目的" },
  Methods: { es: "Métodos", zh: "方法" },
  Results: { es: "Resultados", zh: "结果" },
  Discussion: { es: "Discusión", zh: "讨论" },
};

function words(en: string, es = "", zh = "") {
  return { _type: "localeString", en, es, zh };
}

function prose(en: string, es = "", zh = "") {
  return { _type: "localeText", en, es, zh };
}

function blocks(paragraphs: string[], prefix: string) {
  return paragraphs.map((text, index) => ({
    _type: "block",
    _key: `${prefix}${index}`,
    style: "normal",
    markDefs: [],
    children: [{ _type: "span", _key: `${prefix}${index}s`, text, marks: [] as string[] }],
  }));
}

function rich(prefix: string, en: string[], es: string[] = [], zh: string[] = []) {
  return { _type: "localeBlock", en: blocks(en, `${prefix}e`), es: blocks(es, `${prefix}s`), zh: blocks(zh, `${prefix}z`) };
}

function publication(id: string, order: number, fields: Record<string, unknown>) {
  return { _id: id, _type: "publication", section: "publications", displayOrder: order, ...fields };
}

async function replaceBoth(client: SanityClient, doc: { _id: string; _type: string }) {
  await client.createOrReplace(doc);
  const draftId = `drafts.${doc._id}`;
  if (await client.getDocument(draftId)) await client.createOrReplace({ ...doc, _id: draftId });
}

async function main() {
  if (FORM_URL.includes(TRANSCRIPT_FOLDER) || DOWNLOAD_URL.includes(TRANSCRIPT_FOLDER)) {
    throw new Error("Refusing to import the transcript download folder.");
  }
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
  const token = process.env.SANITY_API_WRITE_TOKEN?.trim();
  if (!projectId || !token) throw new Error("SANITY_API_WRITE_TOKEN is missing. Nothing was written.");
  const client = createClient({ projectId, dataset, apiVersion: "2024-10-01", token, useCdn: false, perspective: "raw" });

  const photoPath = path.join(process.cwd(), "public/timeline/2021-07-19_19-55-12_1626738877.jpg");
  const photo = existsSync(photoPath)
    ? await client.assets.upload("image", createReadStream(photoPath), { filename: "participants-introduction.jpg" })
    : null;

  const methodology = JSON.parse(readFileSync(path.join(process.cwd(), "scripts/research-methodology.json"), "utf8")) as MethodologySection[];
  const copied = ui.en.stories;

  const access = {
    _id: "researchAccessPage",
    _type: "researchAccessPage",
    tabLabel: words("Archive Overview & Access", "Descripción del archivo y acceso", "档案概览与访问"),
    navAria: words("Research resources", "Recursos de investigación", "研究资料"),
    whoCanUse: {
      _type: "object",
      heading: words("Who Can Use the Archive?", "¿Quién puede usar el archivo?", "谁可以使用这个档案？"),
      body: rich("who", [
        "The archive is available free of charge to academic researchers, community organizers, educators, artists, and practitioners affiliated with universities, community organizations, non-profits, or independent research initiatives. We welcome inquiries from individuals and groups committed to honoring the historical and contemporary contributions of African American, Latinx, and Chinese immigrant communities.",
      ]),
    },
    requestingAccess: {
      _type: "object",
      heading: words("Requesting Access", "Solicitar acceso", "申请访问"),
      body: rich("ask", ["Access to full transcripts and audio archives is granted through a short application process."]),
    },
    formUrl: FORM_URL,
    buttonLabel: words("Request Access to the Archive", "Solicitar acceso al archivo", "申请访问档案"),
    inquiry: prose(
      "For direct inquiries or collaborative proposals, please contact Dr. Reyes at",
      "Para consultas directas o propuestas de colaboración, comunícate con la Dra. Reyes en",
      "如需直接咨询或合作提议，请联系 Reyes 博士：",
    ),
    contactEmail: "laurent.re@berkeley.edu",
  };

  const methodologyPage = {
    _id: "researchMethodologyPage",
    _type: "researchMethodologyPage",
    tabLabel: words("Research Methodology", "Metodología de investigación", "研究方法"),
    participantsHeading: words("Participants", "Participantes", "参与者"),
    participantsBody: rich("part", [ui.en.stories.lede, ui.en.stories.ledeContinued], [ui.es.stories.lede, ui.es.stories.ledeContinued], [ui.zh.stories.lede, ui.zh.stories.ledeContinued]),
    participantsPhoto: photo
      ? {
          _type: "image",
          asset: { _type: "reference", _ref: photo._id },
          alt: words(ui.en.stories.heroImageAlt, ui.es.stories.heroImageAlt, ui.zh.stories.heroImageAlt),
        }
      : undefined,
    eyebrow: words("Study Overview", "Resumen del estudio", "研究概览"),
    title: words("Research Methodology", "Metodología de investigación", "研究方法"),
    sections: methodology.map((section, index) => ({
      _key: `section${index}`,
      _type: "methodologySection",
      heading: words(section.title, sectionTitles[section.title]?.es, sectionTitles[section.title]?.zh),
      body: rich(`m${index}`, section.paragraphs),
    })),
  };

  const publicationsPage = {
    _id: "researchPublicationsPage",
    _type: "researchPublicationsPage",
    tabLabel: words("Research & Publications", "Investigación y publicaciones", "研究与出版物"),
    publicationsHeading: words("Publications", "Publicaciones", "论文"),
    dissertationHeading: words("Dissertation", "Tesis", "学位论文"),
    accessHeading: words("Access to all publications", "Acceso a todas las publicaciones", "获取全部论文"),
    downloadLabel: words("Download All Publications", "Descargar todas las publicaciones", "下载全部论文"),
    downloadUrl: DOWNLOAD_URL,
  };

  const article = "Experiences of civic participation among older African American and Latinx immigrant adults in the context of an ageist and racist society";
  const publications = [
    publication("publication-reyes-in-press-multimodal", 1, {
      authors: ["Reyes, L."],
      year: "in press",
      title: "Learn about multimodal elicitation data analysis using the life course narratives of elders in Our Way of Life Project",
      source: "SAGE Research Methods: Diversifying and Decolonizing Research",
      publisher: "SAGE Publications Ltd.",
    }),
    publication("publication-reyes-serrat-2025", 2, {
      authors: ["Reyes, L.", "Serrat, R."],
      year: "2025",
      title: "Trajectories of civic participation across borders: Drawing from life course narratives of older Latine immigrants",
      source: "Journal of Gerontological Social Work",
      pages: "1–19",
      link: "10.1080/01634372.2025.2478248",
    }),
    publication("publication-reyes-2024-in-their-words", 3, {
      authors: ["Reyes, L."],
      year: "2024",
      title: "In their words: African American and Latine immigrant older adults (re)define civic participation",
      source: "The Journals of Gerontology, Series B: Psychological Sciences and Social Sciences",
      link: "10.1093/geronb/gbae143",
    }),
    publication("publication-reyes-2023-research-on-aging", 4, {
      authors: ["Reyes, L."],
      year: "2023",
      title: article,
      source: "Research on Aging",
      volume: "45",
      issue: "1",
      pages: "92–103",
      link: "10.1177/01640275221094288",
    }),
    publication("publication-reyes-versey-yeh-2022", 5, {
      authors: ["Reyes, L.", "Versey, H. S.", "Yeh, J."],
      year: "2022",
      title: "Emancipatory visions: Using visual methods to co-construct knowledge with older adults",
      source: "The Gerontologist",
      volume: "62",
      issue: "10",
      pages: "1402–1408",
      link: "10.1093/geront/gnac046",
    }),
    publication("publication-dissertation-reyes-2023", 1, {
      section: "dissertation",
      authors: ["Reyes, L."],
      year: "2023",
      title: article,
      source: "Research on Aging",
      volume: "45",
      issue: "1",
      pages: "92–103",
      link: "10.1177/01640275221094288",
      editorNote: DISSERTATION_NOTE,
    }),
  ];

  await replaceBoth(client, access);
  await replaceBoth(client, methodologyPage);
  await replaceBoth(client, publicationsPage);
  for (const item of publications) await replaceBoth(client, item);

  const collections = await client.fetch<{ _id: string; slug: string }[]>(
    `*[_type == "collection" && slug.current in ["latine", "africanAmerican", "chinese"]]{ _id, "slug": slug.current }`,
  );
  for (const collection of collections) {
    await client.patch(collection._id).set({ description: prose(COLLECTION_DESCRIPTION) }).commit();
  }

  const written = await client.fetch<{ _id: string; title?: string; section?: string; note?: string }[]>(
    `*[_type == "publication" && _id in $ids] | order(section asc, displayOrder asc){ _id, title, section, "note": editorNote }`,
    { ids: publications.map((item) => item._id) },
  );
  console.log(JSON.stringify({
    photo: Boolean(photo),
    participantsIntro: copied.lede.slice(0, 48),
    collections: collections.map((item) => item.slug),
    publications: written.map((item) => ({ id: item._id, section: item.section, title: item.title, flagged: Boolean(item.note) })),
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Import failed.");
  process.exit(1);
});
