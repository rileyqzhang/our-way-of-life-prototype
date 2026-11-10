import { defineArrayMember, defineField, defineType } from "sanity";

const languages = [
  { name: "en", title: "English" },
  { name: "es", title: "Español" },
  { name: "zh", title: "中文" },
] as const;

function localeFields(type: "string" | "text") {
  return languages.map((language) =>
    defineField({
      name: language.name,
      title: language.title,
      type,
      rows: type === "text" ? 6 : undefined,
    }),
  );
}

export const localeString = defineType({
  name: "localeString",
  title: "Localized string",
  type: "object",
  fields: localeFields("string"),
});

export const localeText = defineType({
  name: "localeText",
  title: "Localized text",
  type: "object",
  fields: localeFields("text"),
});

function portableTextBlock() {
  return defineArrayMember({
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
          title: "Link",
          type: "object",
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
  });
}

export const localeBlock = defineType({
  name: "localeBlock",
  title: "Localized rich text",
  type: "object",
  fields: languages.map((language) =>
    defineField({
      name: language.name,
      title: language.title,
      type: "array",
      of: [portableTextBlock()],
    }),
  ),
});
