import { defineField, defineType } from "sanity";

function accessSection(name: string, title: string) {
  return defineField({
    name,
    title,
    description: "Optional. Fill the heading and text in English, Spanish, and Chinese. Leave a language blank if that translation is not ready.",
    type: "object",
    fields: [
      defineField({
        name: "heading",
        title: "Heading",
        description: "The heading visitors see for this section.",
        type: "localeString",
      }),
      defineField({
        name: "body",
        title: "Text",
        description: "The section text. Write each language in its own field.",
        type: "localeBlock",
      }),
    ],
  });
}

export const researchAccessPage = defineType({
  name: "researchAccessPage",
  title: "Archive overview and access",
  type: "document",
  fields: [
    accessSection("whoCanUse", "Who can use the archive?"),
    accessSection("usingDataEthically", "Using Data Ethically"),
    accessSection("accessTheArchive", "Access the Archive"),
    defineField({
      name: "formUrl",
      title: "Google Form URL",
      description: "The Access the Archive button opens this form. Leave empty until the form is ready. Do not put a Google Drive folder, a transcript file, or a ZIP file here.",
      type: "url",
      validation: (rule) => rule.uri({ scheme: ["http", "https"] }),
    }),
    defineField({
      name: "buttonLabel",
      title: "Button label",
      description: "The words on the button that opens the Google Form. Fill English, Spanish, and Chinese.",
      type: "localeString",
    }),
  ],
  preview: { prepare: () => ({ title: "Archive overview and access" }) },
});
