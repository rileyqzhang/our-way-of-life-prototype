import { defineField, defineType } from "sanity";

export const publication = defineType({
  name: "publication",
  title: "Publication",
  type: "document",
  fields: [
    defineField({
      name: "authors",
      title: "Authors",
      description: "Add one name per row, in the order they should appear. Example: García, M. The website formats the APA citation. Do not type the whole citation here.",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "year",
      title: "Year",
      description: "The publication year, such as 2024. Leave empty if the year is not known yet.",
      type: "string",
    }),
    defineField({
      name: "title",
      title: "Title",
      description: "The article or book title, in the language of the publication. This same citation is shown on the English, Spanish, and Chinese pages.",
      type: "string",
    }),
    defineField({
      name: "source",
      title: "Journal or publisher",
      description: "The journal name, or the book publisher. Leave empty if there is none.",
      type: "string",
    }),
    defineField({
      name: "volume",
      title: "Volume",
      description: "The volume number. Leave empty if the publication has no volume.",
      type: "string",
    }),
    defineField({
      name: "issue",
      title: "Issue",
      description: "The issue number. Leave empty if the publication has no issue.",
      type: "string",
    }),
    defineField({
      name: "pages",
      title: "Pages",
      description: "The page range, such as 12–34. Leave empty if there are no pages.",
      type: "string",
    }),
    defineField({
      name: "link",
      title: "DOI or link",
      description: "A DOI such as 10.1234/example, or a full https address. Leave empty if there is no link.",
      type: "string",
    }),
    defineField({
      name: "displayOrder",
      title: "Sort order",
      description: "Lower numbers appear first on Research & Publications. Leave empty to place this item after the numbered ones.",
      type: "number",
      validation: (rule) => rule.integer().min(0),
    }),
  ],
  orderings: [{ title: "Sort order", name: "displayOrder", by: [{ field: "displayOrder", direction: "asc" }] }],
  preview: {
    select: { title: "title", year: "year", author: "authors.0" },
    prepare({ title, year, author }) {
      return { title: title || "Untitled publication", subtitle: [author, year].filter(Boolean).join(", ") };
    },
  },
});
