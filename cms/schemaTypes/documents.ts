import { defineField, defineType } from "sanity";
import { firstFilled } from "./localePreview";

export const person = defineType({
  name: "person",
  title: "Person",
  type: "document",
  fields: [
    defineField({ name: "name", title: "Name", type: "string", validation: (rule) => rule.required() }),
    defineField({
      name: "roleKind",
      title: "Role",
      type: "string",
      options: {
        list: [
          { title: "Participant", value: "participant" },
          { title: "Team member", value: "team" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "role", title: "Role label", type: "localeString" }),
    defineField({ name: "bio", title: "Biography", type: "localeText" }),
    defineField({ name: "photograph", title: "Photograph", type: "photograph" }),
  ],
  preview: {
    select: { title: "name", en: "role.en", es: "role.es", zh: "role.zh", media: "photograph.image" },
    prepare({ title, en, es, zh, media }: { title?: string; en?: string; es?: string; zh?: string; media?: any }) {
      return { title, subtitle: firstFilled(en, es, zh), media };
    },
  },
});

export const page = defineType({
  name: "page",
  title: "Page",
  type: "document",
  fields: [
    defineField({ name: "slug", title: "Slug", type: "slug", validation: (rule) => rule.required() }),
    defineField({ name: "title", title: "Title", type: "localeString", validation: (rule) => rule.required() }),
    defineField({ name: "summary", title: "Summary", type: "localeText" }),
    defineField({ name: "body", title: "Body", type: "localeText" }),
  ],
  preview: {
    select: { en: "title.en", es: "title.es", zh: "title.zh", subtitle: "slug.current" },
    prepare({ en, es, zh, subtitle }: { en?: string; es?: string; zh?: string; subtitle?: string }) {
      return { title: firstFilled(en, es, zh) || "Untitled", subtitle };
    },
  },
});

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site settings",
  type: "document",
  fields: [
    defineField({ name: "siteName", title: "Site name", type: "localeString", validation: (rule) => rule.required() }),
    defineField({
      name: "navigation",
      title: "Navigation",
      type: "array",
      of: [
        {
          name: "navigationItem",
          title: "Navigation item",
          type: "object",
          fields: [
            defineField({ name: "label", title: "Label", type: "localeString", validation: (rule) => rule.required() }),
            defineField({ name: "path", title: "Path", type: "string", description: "Without a language prefix, for example /stories.", validation: (rule) => rule.required() }),
          ],
          preview: {
            select: { en: "label.en", es: "label.es", zh: "label.zh", subtitle: "path" },
            prepare({ en, es, zh, subtitle }: { en?: string; es?: string; zh?: string; subtitle?: string }) {
              return { title: firstFilled(en, es, zh) || "Untitled", subtitle };
            },
          },
        },
      ],
    }),
    defineField({ name: "contactEmail", title: "Contact email", type: "string" }),
    defineField({ name: "accessibilityUrl", title: "Accessibility statement URL", type: "url" }),
  ],
  preview: { prepare: () => ({ title: "Site settings" }) },
});
