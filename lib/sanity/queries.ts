import { defineQuery } from "next-sanity";

export const archiveQuery = defineQuery(`{
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
  "stories": *[_type == "story" && published != false] | order(participantCode asc) {
    "slug": slug.current,
    participantCode,
    title,
    summary,
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
    quotations[] {
      _key,
      text,
      "eventId": event->slug.current,
      "eventDate": event->date,
      "eventTitle": event->title
    },
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
