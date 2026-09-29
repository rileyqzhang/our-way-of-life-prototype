import { defineArrayMember, defineField, defineType } from "sanity";

export const timelineEvent = defineType({
  name: "timelineEvent",
  title: "Timeline event",
  type: "document",
  fields: [
    defineField({ name: "date", title: "Year or date", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "slug", title: "Slug", type: "slug", validation: (rule) => rule.required() }),
    defineField({ name: "title", title: "Title", type: "localeString", validation: (rule) => rule.required() }),
    defineField({ name: "description", title: "Description", type: "localeText" }),
    defineField({ name: "displayOrder", title: "Display order", type: "number", validation: (rule) => rule.required().integer().min(0) }),
    defineField({
      name: "blocks",
      title: "Timeline content",
      type: "array",
      of: [
        defineArrayMember({
          name: "timelineParagraph",
          title: "Paragraph",
          type: "object",
          fields: [
            defineField({ name: "text", title: "Text", type: "localeText", validation: (rule) => rule.required() }),
            defineField({
              name: "emphasis",
              title: "Emphasis",
              type: "string",
              options: { list: [{ title: "Caption", value: "caption" }] },
            }),
          ],
          preview: { select: { title: "text.en" } },
        }),
        defineArrayMember({
          name: "timelineParticipant",
          title: "Participant",
          type: "object",
          fields: [
            defineField({ name: "participantCode", title: "Participant code", type: "string" }),
            defineField({ name: "story", title: "Related story", type: "reference", to: [{ type: "story" }] }),
            defineField({ name: "title", title: "Label", type: "localeString" }),
            defineField({ name: "image", title: "Photo", type: "image", options: { hotspot: true } }),
            defineField({ name: "legacySrc", title: "Existing photo path", type: "string" }),
            defineField({ name: "imageAlt", title: "Photo alt text", type: "localeString" }),
            defineField({ name: "caption", title: "Caption", type: "localeText" }),
            defineField({ name: "externalHref", title: "Current public archive URL", type: "url" }),
          ],
          preview: { select: { title: "participantCode", subtitle: "title.en", media: "image" } },
        }),
        defineArrayMember({
          name: "timelineVideo",
          title: "Video",
          type: "object",
          fields: [
            defineField({ name: "src", title: "Embed URL", type: "url", validation: (rule) => rule.required() }),
            defineField({ name: "videoTitle", title: "Video title", type: "string", validation: (rule) => rule.required() }),
          ],
          preview: { select: { title: "videoTitle", subtitle: "src" } },
        }),
        defineArrayMember({
          name: "timelineLink",
          title: "External link",
          type: "object",
          fields: [
            defineField({ name: "externalHref", title: "URL", type: "url", validation: (rule) => rule.required() }),
            defineField({ name: "title", title: "Title", type: "localeString" }),
            defineField({ name: "description", title: "Description", type: "localeText" }),
            defineField({ name: "domain", title: "Domain", type: "string" }),
            defineField({ name: "linkImage", title: "Preview image", type: "image", options: { hotspot: true } }),
            defineField({ name: "legacySrc", title: "Existing preview image", type: "string" }),
            defineField({ name: "imageAlt", title: "Image alt text", type: "localeString" }),
          ],
          preview: { select: { title: "title.en", subtitle: "domain" } },
        }),
      ],
    }),
    defineField({
      name: "relatedStories",
      title: "Related stories",
      type: "array",
      of: [{ type: "reference", to: [{ type: "story" }] }],
    }),
  ],
  orderings: [{ title: "Display order", name: "displayOrder", by: [{ field: "displayOrder", direction: "asc" }] }],
  preview: { select: { title: "title.en", subtitle: "date" } },
});
