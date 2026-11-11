import { defineField, defineType } from "sanity";

export const collectionPage = defineType({
  name: "collectionPage",
  title: "Collection page wording",
  type: "document",
  description: "Shared wording for every collection page (Latine, African American, Chinese, and any added later).",
  fields: [
    defineField({
      name: "backLabel",
      title: "Back link",
      type: "localeString",
      description: "Link at the top left that returns to the archive shelf on the Participants page. The arrow is added automatically.",
    }),
    defineField({
      name: "eyebrow",
      title: "Small label above the title",
      type: "localeString",
      description: "Shown in capitals above the collection name, for example “Digital Archive”.",
    }),
    defineField({
      name: "titleSuffix",
      title: "Title ending",
      type: "localeString",
      description: "Shown after the collection name in the accent color, for example “Their Words. Their Lives.” The dash is added automatically.",
    }),
  ],
  preview: { prepare: () => ({ title: "Collection page wording" }) },
});
