import { defineField, defineType } from "sanity";

export const photograph = defineType({
  name: "photograph",
  title: "Photograph",
  type: "object",
  fields: [
    defineField({ name: "image", title: "Image", type: "image", options: { hotspot: true } }),
    defineField({
      name: "legacySrc",
      title: "Existing file path or URL",
      type: "string",
      description: "Used until the file is uploaded to the Sanity image library. Prefer the Image field.",
    }),
    defineField({ name: "alt", title: "Alt text", type: "localeString", validation: (rule) => rule.required() }),
    defineField({ name: "caption", title: "Caption", type: "localeText" }),
    defineField({ name: "source", title: "Source", type: "string" }),
    defineField({ name: "usagePermission", title: "Usage permission", type: "text", rows: 3 }),
  ],
  preview: {
    select: { title: "alt.en", media: "image" },
  },
});
