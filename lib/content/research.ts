import { cache } from "react";
import { draftMode } from "next/headers";
import type { CitationSource } from "@/lib/content/citation";
import type { LocalizedText } from "@/lib/timeline/types";
import { client, previewClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import { sanityImageUrl } from "@/lib/sanity/image";
import { researchQuery } from "@/lib/sanity/queries";

type LocaleValue = Partial<LocalizedText> | null | undefined;
type RichValue = { en?: unknown[] | null; es?: unknown[] | null; zh?: unknown[] | null } | null;

export type ResearchSection = {
  heading: LocalizedText;
  body: RichValue;
};

export type ResearchPublication = CitationSource & {
  id: string;
  section: "publications" | "dissertation";
  displayOrder: number;
};

export type ResearchContent = {
  access: {
    tabLabel: LocalizedText;
    navAria: LocalizedText;
    whoCanUse: ResearchSection;
    requestingAccess: ResearchSection;
    formUrl: string;
    buttonLabel: LocalizedText;
    inquiry: LocalizedText;
    contactEmail: string;
  } | null;
  methodology: {
    tabLabel: LocalizedText;
    participantsHeading: LocalizedText;
    participantsBody: RichValue;
    photoSrc: string;
    photoAlt: LocalizedText;
    eyebrow: LocalizedText;
    title: LocalizedText;
    sections: ResearchSection[];
  } | null;
  publicationsPage: {
    tabLabel: LocalizedText;
    publicationsHeading: LocalizedText;
    dissertationHeading: LocalizedText;
    accessHeading: LocalizedText;
    downloadLabel: LocalizedText;
    downloadUrl: string;
  } | null;
  publications: ResearchPublication[];
};

type SanityImage = { asset?: { _ref?: string }; alt?: LocaleValue } | null;

type SanityResearch = {
  access?: {
    tabLabel?: LocaleValue;
    navAria?: LocaleValue;
    whoCanUse?: { heading?: LocaleValue; body?: RichValue } | null;
    requestingAccess?: { heading?: LocaleValue; body?: RichValue } | null;
    formUrl?: string | null;
    buttonLabel?: LocaleValue;
    inquiry?: LocaleValue;
    contactEmail?: string | null;
  } | null;
  methodology?: {
    tabLabel?: LocaleValue;
    participantsHeading?: LocaleValue;
    participantsBody?: RichValue;
    participantsPhoto?: SanityImage;
    eyebrow?: LocaleValue;
    title?: LocaleValue;
    sections?: { heading?: LocaleValue; body?: RichValue }[] | null;
  } | null;
  publicationsPage?: {
    tabLabel?: LocaleValue;
    publicationsHeading?: LocaleValue;
    dissertationHeading?: LocaleValue;
    accessHeading?: LocaleValue;
    downloadLabel?: LocaleValue;
    downloadUrl?: string | null;
  } | null;
  publications?: {
    id?: string;
    authors?: string[] | null;
    year?: string | null;
    title?: string | null;
    source?: string | null;
    publisher?: string | null;
    volume?: string | null;
    issue?: string | null;
    pages?: string | null;
    link?: string | null;
    section?: string | null;
    displayOrder?: number | null;
  }[] | null;
};

function locale(value: LocaleValue): LocalizedText {
  return { en: value?.en || "", es: value?.es || "", zh: value?.zh || "" };
}

function section(value: { heading?: LocaleValue; body?: RichValue } | null | undefined): ResearchSection {
  return { heading: locale(value?.heading), body: value?.body || null };
}

async function previewEnabled() {
  try {
    const draft = await draftMode();
    return draft.isEnabled;
  } catch {
    return false;
  }
}

function mapResearch(data: SanityResearch | null): ResearchContent {
  const access = data?.access;
  const methodology = data?.methodology;
  const publicationsPage = data?.publicationsPage;
  return {
    access: access
      ? {
          tabLabel: locale(access.tabLabel),
          navAria: locale(access.navAria),
          whoCanUse: section(access.whoCanUse),
          requestingAccess: section(access.requestingAccess),
          formUrl: access.formUrl || "",
          buttonLabel: locale(access.buttonLabel),
          inquiry: locale(access.inquiry),
          contactEmail: access.contactEmail || "",
        }
      : null,
    methodology: methodology
      ? {
          tabLabel: locale(methodology.tabLabel),
          participantsHeading: locale(methodology.participantsHeading),
          participantsBody: methodology.participantsBody || null,
          photoSrc: sanityImageUrl(methodology.participantsPhoto, 1400),
          photoAlt: locale(methodology.participantsPhoto?.alt),
          eyebrow: locale(methodology.eyebrow),
          title: locale(methodology.title),
          sections: (methodology.sections || []).map(section),
        }
      : null,
    publicationsPage: publicationsPage
      ? {
          tabLabel: locale(publicationsPage.tabLabel),
          publicationsHeading: locale(publicationsPage.publicationsHeading),
          dissertationHeading: locale(publicationsPage.dissertationHeading),
          accessHeading: locale(publicationsPage.accessHeading),
          downloadLabel: locale(publicationsPage.downloadLabel),
          downloadUrl: publicationsPage.downloadUrl || "",
        }
      : null,
    publications: (data?.publications || [])
      .filter((item) => item.title || item.authors?.length)
      .map((item): ResearchPublication => ({
        id: item.id || item.title || "",
        authors: item.authors || [],
        year: item.year || "",
        title: item.title || "",
        source: item.source || "",
        publisher: item.publisher || "",
        volume: item.volume || "",
        issue: item.issue || "",
        pages: item.pages || "",
        link: item.link || "",
        section: item.section === "dissertation" ? "dissertation" : "publications",
        displayOrder: item.displayOrder ?? 999,
      }))
      .sort((a, b) => a.displayOrder - b.displayOrder || (a.title || "").localeCompare(b.title || "")),
  };
}

export const getResearch = cache(async (): Promise<ResearchContent> => {
  const empty = mapResearch(null);
  if (!client || !isSanityConfigured()) return empty;
  try {
    const active = (await previewEnabled()) ? previewClient() : client;
    if (!active) return empty;
    return mapResearch(await active.fetch<SanityResearch>(researchQuery));
  } catch (error) {
    console.error("Research pages could not be loaded from Sanity.", error);
    return empty;
  }
});
