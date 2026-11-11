import { defineQuery } from "next-sanity";

export const archiveQuery = defineQuery(`{
  "collections": *[_type == "collection" && defined(slug.current)] | order(displayOrder asc) {
    "slug": slug.current,
    name,
    description,
    displayOrder,
    cover {
      asset,
      alt
    },
    "theme": {
      "gradientFrom": backgroundGradient.from.hex,
      "gradientTo": backgroundGradient.to.hex,
      "accent": accentColor.hex,
      "muted": mutedColor.hex
    }
  },
  "collectionPage": *[_id == "collectionPage"][0] {
    backLabel,
    eyebrow,
    titleSuffix
  },
  "timeline": *[_type == "timelineEvent"] | order(displayOrder asc) {
    "id": slug.current,
    date,
    title,
    displayOrder,
    blocks[] {
      _type,
      _key,
      text,
      emphasis,
      participantCode,
      externalHref,
      legacySrc,
      image,
      imageAlt,
      caption,
      title,
      "storySlug": story->slug.current,
      description,
      domain,
      linkImage,
      src,
      videoTitle
    }
  },
  "stories": *[_type == "story"] | order(participantCode asc) {
    "slug": slug.current,
    participantCode,
    "communitySlug": community->slug.current,
    title,
    overview,
    body,
    article,
    location,
    externalHref,
    published,
    photographs[] {
      _key,
      image,
      legacySrc,
      alt,
      caption,
      source,
      usagePermission
    },
    headline,
    "hasSegments": count(segments) > 0,
    relatedEvents[]->{
      "id": slug.current,
      date,
      title
    }
  },
  "pages": *[_type == "page"] {
    "slug": slug.current,
    title,
    summary,
    body
  },
  "settings": *[_id == "siteSettings"][0] {
    siteName,
    contactEmail,
    accessibilityUrl,
    navigation[] {
      _key,
      label,
      path
    }
  }
}`);

export const storyBySlugQuery = defineQuery(`*[_type == "story" && slug.current == $slug][0]{
  "slug": slug.current,
  participantCode,
  title,
  location,
  body,
  article,
  overview,
  "collectionSlug": community->slug.current,
  "collectionName": community->name,
  photographs[] {
    _key,
    image,
    legacySrc,
    alt
  },
  headline,
  segments[] {
    _key,
    quote,
    isQuote,
    shortTitle,
    body,
    lifeStage
  }
}`);

export const storySlugQuery = defineQuery(`*[_type == "story" && defined(slug.current)].slug.current`);

export const researchQuery = defineQuery(`{
  "access": *[_id == "researchAccessPage"][0]{
    tabLabel,
    navAria,
    whoCanUse{ heading, body },
    requestingAccess{ heading, body },
    formUrl,
    buttonLabel,
    inquiry,
    contactEmail
  },
  "methodology": *[_id == "researchMethodologyPage"][0]{
    tabLabel,
    participantsHeading,
    participantsBody,
    participantsPhoto{ asset, alt },
    eyebrow,
    title,
    sections[]{ heading, body }
  },
  "publicationsPage": *[_id == "researchPublicationsPage"][0]{
    tabLabel,
    publicationsHeading,
    dissertationHeading,
    accessHeading,
    downloadLabel,
    downloadUrl
  },
  "publications": *[_type == "publication"] | order(displayOrder asc){
    "id": _id,
    authors,
    year,
    title,
    source,
    publisher,
    volume,
    issue,
    pages,
    link,
    section,
    displayOrder
  }
}`);
