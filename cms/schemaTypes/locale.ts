import { defineField, defineType } from "sanity";

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
