import { defineField, defineType } from "sanity";

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
    select: { title: "name.en", subtitle: "slug.current", media: "cover" },
  },
});
