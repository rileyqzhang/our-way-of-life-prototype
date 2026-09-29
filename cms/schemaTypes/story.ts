import { defineArrayMember, defineField, defineType } from "sanity";

export const story = defineType({
  name: "story",
  title: "Story",
  type: "document",
  fields: [
    defineField({ name: "participantCode", title: "Participant name or code", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "slug", title: "Slug", type: "slug", options: { source: "participantCode" }, validation: (rule) => rule.required() }),
    defineField({ name: "title", title: "Title", type: "localeString", validation: (rule) => rule.required() }),
    defineField({ name: "summary", title: "Summary", type: "localeText" }),
    defineField({ name: "body", title: "Full story", type: "localeText" }),
    defineField({
      name: "quotations",
      title: "Quotations",
      type: "array",
      of: [
        defineArrayMember({
          name: "quotation",
          title: "Quotation",
          type: "object",
          fields: [
            defineField({ name: "text", title: "Quotation", type: "localeText", validation: (rule) => rule.required() }),
            defineField({ name: "event", title: "Timeline event", type: "reference", to: [{ type: "timelineEvent" }] }),
          ],
          preview: { select: { title: "text.en" } },
        }),
      ],
    }),
    defineField({ name: "photographs", title: "Photographs", type: "array", of: [{ type: "photograph" }] }),
    defineField({ name: "themes", title: "Themes", type: "array", of: [{ type: "string" }], options: { layout: "tags" } }),
    defineField({
      name: "collection",
      title: "Collection",
      type: "string",
      options: {
        list: [
          { title: "Latine immigrant stories", value: "latine" },
          { title: "African American stories", value: "africanAmerican" },
          { title: "Chinese immigrant stories", value: "chinese" },
        ],
      },
    }),
    defineField({
      name: "relatedEvents",
      title: "Related timeline events",
      type: "array",
      of: [{ type: "reference", to: [{ type: "timelineEvent" }] }],
    }),
    defineField({ name: "externalHref", title: "Current public archive URL", type: "url" }),
    defineField({ name: "published", title: "Published", type: "boolean", initialValue: false }),
  ],
  preview: {
    select: { title: "participantCode", subtitle: "title.en", media: "photographs.0.image" },
  },
});
