import { defineField, defineType } from "sanity";
import { firstFilled } from "./localePreview";

export const researchMethodologyPage = defineType({
  name: "researchMethodologyPage",
  title: "Research methodology",
  type: "document",
  fields: [
    defineField({
      name: "tabLabel",
      title: "Tab label",
      description: "The research tab for this page.",
      type: "localeString",
    }),
    defineField({
      name: "participantsHeading",
      title: "Participants heading",
      type: "localeString",
    }),
    defineField({
      name: "participantsBody",
      title: "Participants introduction",
      description: "The introduction that used to sit at the top of the participants page.",
      type: "localeBlock",
    }),
    defineField({
      name: "participantsPhoto",
      title: "Participants photo",
      type: "image",
      options: { hotspot: true },
      fields: [defineField({ name: "alt", title: "Alt text", type: "localeString" })],
    }),
    defineField({
      name: "eyebrow",
      title: "Eyebrow",
      description: "The small label above the methodology title, such as Study Overview.",
      type: "localeString",
    }),
    defineField({
      name: "title",
      title: "Title",
      type: "localeString",
    }),
    defineField({
      name: "sections",
      title: "Sections",
      type: "array",
      of: [
        {
          name: "methodologySection",
          title: "Section",
          type: "object",
          fields: [
            defineField({ name: "heading", title: "Heading", type: "localeString" }),
            defineField({ name: "body", title: "Text", type: "localeBlock" }),
          ],
          preview: {
            select: { en: "heading.en", es: "heading.es", zh: "heading.zh" },
            prepare({ en, es, zh }: { en?: string; es?: string; zh?: string }) {
              return { title: firstFilled(en, es, zh) || "Section" };
            },
          },
        },
      ],
    }),
  ],
  preview: { prepare: () => ({ title: "Research methodology" }) },
});

export const researchPublicationsPage = defineType({
  name: "researchPublicationsPage",
  title: "Research and publications",
  type: "document",
  fields: [
    defineField({
      name: "tabLabel",
      title: "Tab label",
      type: "localeString",
    }),
    defineField({
      name: "publicationsHeading",
      title: "Publications heading",
      type: "localeString",
    }),
    defineField({
      name: "dissertationHeading",
      title: "Dissertation heading",
      type: "localeString",
    }),
    defineField({
      name: "accessHeading",
      title: "Download heading",
      type: "localeString",
    }),
    defineField({
      name: "downloadLabel",
      title: "Download button label",
      type: "localeString",
    }),
    defineField({
      name: "downloadUrl",
      title: "Download all publications URL",
      description: "The button opens this address. Leave it empty to hide the button.",
      type: "url",
      validation: (rule) => rule.uri({ scheme: ["http", "https"] }),
    }),
  ],
  preview: { prepare: () => ({ title: "Research and publications" }) },
});
