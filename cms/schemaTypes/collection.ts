import { defineField, defineType } from "sanity";
import { firstFilled } from "./localePreview";

export const collection = defineType({
  name: "collection",
  title: "Collection",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "localeString",
      description: "The collection name in English, Spanish, and Chinese.",
      validation: (rule) =>
        rule.required().custom((value) => {
          const name = value as { en?: string } | undefined;
          return name?.en?.trim() ? true : "Add the English name.";
        }),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      description: "Used in the public collection address. The existing communities use latine, africanAmerican, and chinese.",
      options: { source: "name.en", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "localeText",
    }),
    defineField({
      name: "cover",
      title: "Cover image",
      type: "image",
      options: { hotspot: true },
      fields: [defineField({ name: "alt", title: "Alt text", type: "localeString" })],
    }),
    defineField({
      name: "backgroundGradient",
      title: "Page background gradient",
      type: "object",
      description:
        "Background of this collection's page, drawn as a 145° gradient from the start color (top left) to the end color (bottom right). Use dark colors so the cream title stays readable. Leave both empty to use the site's dark brown.",
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({ name: "from", title: "Start color", type: "color", options: { disableAlpha: true } }),
        defineField({ name: "to", title: "End color", type: "color", options: { disableAlpha: true } }),
      ],
    }),
    defineField({
      name: "accentColor",
      title: "Accent color",
      type: "color",
      description:
        "Used for the Back to Archive Shelf link, the “— Their Words. Their Lives.” part of the title, and the large quotation marks on the cards. Pick a light gold or similar so it reads on the dark background. Leave empty to use gold.",
      options: { disableAlpha: true },
    }),
    defineField({
      name: "mutedColor",
      title: "Secondary color",
      type: "color",
      description: "Used for the small “Digital Archive” label above the title. Pick a softer tone than the accent. Leave empty to use a muted gold.",
      options: { disableAlpha: true },
    }),
    defineField({
      name: "displayOrder",
      title: "Display order",
      type: "number",
      description: "Lower numbers appear first.",
      initialValue: 0,
      validation: (rule) => rule.required().integer().min(0),
    }),
  ],
  orderings: [
    { title: "Display order", name: "displayOrder", by: [{ field: "displayOrder", direction: "asc" }] },
  ],
  preview: {
    select: { en: "name.en", es: "name.es", zh: "name.zh", subtitle: "slug.current", media: "cover" },
    prepare({ en, es, zh, subtitle, media }: { en?: string; es?: string; zh?: string; subtitle?: string; media?: any }) {
      return { title: firstFilled(en, es, zh) || "Untitled", subtitle, media };
    },
  },
});
