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
      title: "Journal or book title",
      description: "The journal name, or the book title for a chapter. The website italicizes this. Leave empty if there is none.",
      type: "string",
    }),
    defineField({
      name: "publisher",
      title: "Publisher",
      description: "For a chapter, the book publisher. Leave empty for a journal article. The book title goes in Journal or book title.",
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
      name: "section",
      title: "Section",
      description: "Publications are the article list. Dissertation is the separate block below that list.",
      type: "string",
      initialValue: "publications",
      options: {
        list: [
          { title: "Publications", value: "publications" },
          { title: "Dissertation", value: "dissertation" },
        ],
        layout: "radio",
      },
    }),
    defineField({
      name: "editorNote",
      title: "Editor note",
      description: "Shown in Studio only, not on the website. Use this to flag a citation that still needs confirmation.",
      type: "text",
      rows: 4,
    }),
    defineField({
      name: "displayOrder",
      title: "Sort order",
      description: "Lower numbers appear first inside the selected section.",
      type: "number",
      validation: (rule) => rule.integer().min(0),
    }),
  ],
  orderings: [{ title: "Sort order", name: "displayOrder", by: [{ field: "displayOrder", direction: "asc" }] }],
  preview: {
    select: { title: "title", year: "year", author: "authors.0", note: "editorNote" },
    prepare({ title, year, author, note }: { title?: string; year?: string; author?: string; note?: string }) {
      return { title: title || "Untitled publication", subtitle: note || [author, year].filter(Boolean).join(", ") };
    },
  },
});
