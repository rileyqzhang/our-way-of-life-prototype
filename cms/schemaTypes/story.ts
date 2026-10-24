import { defineArrayMember, defineField, defineType } from "sanity";

export const story = defineType({
  name: "story",
  title: "Story",
  type: "document",
  fields: [
    defineField({ name: "participantCode", title: "Participant name or code", type: "string", validation: (rule) => rule.required() }),
    defineField({
      name: "participant",
      title: "Participant",
      type: "reference",
      to: [{ type: "person" }],
      description: "The person document for this story. The participant code above stays the public identifier.",
    }),
    defineField({
      name: "collection",
      title: "Community",
      description: "Choose the collection this story appears in. Each community has its own page on the website.",
      type: "string",
      options: {
        list: [
          { title: "Latine Immigrant Stories", value: "latine" },
          { title: "African American Stories", value: "africanAmerican" },
          { title: "Chinese Immigrant Stories", value: "chinese" },
        ],
        layout: "radio",
      },
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "slug", title: "Slug", type: "slug", options: { source: "participantCode" }, validation: (rule) => rule.required() }),
    defineField({ name: "title", title: "Title", type: "localeString", validation: (rule) => rule.required() }),
    defineField({ name: "summary", title: "Summary", type: "localeText" }),
    defineField({
      name: "location",
      title: "Places",
      description: "Shown on the story card under the quotation. Example: Manhattan, NY → Newark, NJ",
      type: "localeString",
    }),
    defineField({
      name: "body",
      title: "Full story (plain text)",
      description: "Plain paragraphs used by the website. The formatted article below keeps bold text, headings, and links.",
      type: "localeText",
    }),
    defineField({
      name: "article",
      title: "Full story",
      type: "object",
      fields: (["en", "es", "zh"] as const).map((language) =>
        defineField({
          name: language,
          title: language === "en" ? "English" : language === "es" ? "Español" : "中文",
          type: "array",
          of: [
            defineArrayMember({
              type: "block",
              styles: [
                { title: "Normal", value: "normal" },
                { title: "Heading", value: "h2" },
                { title: "Subheading", value: "h3" },
                { title: "Quotation", value: "blockquote" },
              ],
              lists: [
                { title: "Bulleted", value: "bullet" },
                { title: "Numbered", value: "number" },
              ],
              marks: {
                decorators: [
                  { title: "Strong", value: "strong" },
                  { title: "Emphasis", value: "em" },
                ],
                annotations: [
                  {
                    name: "link",
                    type: "object",
                    title: "Link",
                    fields: [
                      defineField({
                        name: "href",
                        title: "URL",
                        type: "url",
                        validation: (rule) => rule.uri({ scheme: ["http", "https", "mailto"], allowRelative: true }),
                      }),
                    ],
                  },
                ],
              },
            }),
          ],
        }),
      ),
    }),
    defineField({
      name: "migration",
      title: "Migration record",
      description: "Written by the Weebly importer. Leave this in place so a later import can tell an editor's changes from the original extract.",
      type: "object",
      readOnly: true,
      fields: [
        defineField({ name: "source", title: "Source", type: "string", readOnly: true }),
        defineField({ name: "sourceUrl", title: "Source URL", type: "url", readOnly: true }),
        defineField({ name: "sourceId", title: "Source id", type: "string", readOnly: true }),
        defineField({ name: "sourceFilename", title: "Source filename", type: "string", readOnly: true }),
        defineField({ name: "originalCode", title: "Original participant code", type: "string", readOnly: true }),
        defineField({ name: "contentHash", title: "Content hash", type: "string", readOnly: true }),
        defineField({ name: "importedAt", title: "Imported at", type: "datetime", readOnly: true }),
        defineField({ name: "completeness", title: "Completeness", type: "string", readOnly: true }),
      ],
    }),
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
