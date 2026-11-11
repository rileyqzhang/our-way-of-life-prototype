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
    defineField({
      name: "tabLabel",
      title: "Tab label",
      description: "The first research tab. English: Archive Overview & Access.",
      type: "localeString",
    }),
    defineField({
      name: "navAria",
      title: "Tab list label",
      description: "The accessible name for the row of research tabs.",
      type: "localeString",
    }),
    accessSection("whoCanUse", "Who Can Use the Archive?"),
    accessSection("requestingAccess", "Requesting Access"),
    defineField({
      name: "formUrl",
      title: "Google Form URL",
      description: "The access button opens this form. Leave empty to hide the button. Do not put a transcript file, a ZIP file, or a Google Drive folder of transcripts here.",
      type: "url",
      validation: (rule) => rule.uri({ scheme: ["http", "https"] }),
    }),
    defineField({
      name: "buttonLabel",
      title: "Button label",
      description: "The words on the button that opens the Google Form.",
      type: "localeString",
    }),
    defineField({
      name: "inquiry",
      title: "Contact sentence",
      description: "The sentence before the email address. The email itself is the next field.",
      type: "localeText",
    }),
    defineField({
      name: "contactEmail",
      title: "Contact email",
      description: "Shown as a mailto link after the contact sentence. Leave empty to hide the address.",
      type: "string",
      validation: (rule) => rule.email(),
    }),
  ],
  preview: { prepare: () => ({ title: "Archive overview and access" }) },
});
