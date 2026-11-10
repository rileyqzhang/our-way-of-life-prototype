import { defineArrayMember, defineField, defineType } from "sanity";
import { StoryCodeTitleInput } from "../inputs/StoryCodeTitleInput";
import { lifeStageTitle, lifeStages } from "./lifeStage";
import { firstFilled } from "./localePreview";

const legacyStoryText =
  "旧版全文，导入分段后会隐藏，请在 Story sections 里编辑";

function hasStorySections(document: unknown) {
  if (!document || typeof document !== "object") return false;
  const segments = (document as { segments?: unknown }).segments;
  return Array.isArray(segments) && segments.length > 0;
}

export const story = defineType({
  name: "story",
  title: "Story",
  type: "document",
  components: { input: StoryCodeTitleInput },
  fields: [
    defineField({ name: "participantCode", title: "Participant name or code", type: "string", validation: (rule) => rule.required() }),
    defineField({
      name: "community",
      title: "Collection",
      description: "Assign this story to a collection. Create new communities under Collection. Leave this empty when membership has not been verified. Publish the collection before publishing a story that points to it.",
      type: "reference",
      to: [{ type: "collection" }],
    }),
    defineField({ name: "photographs", title: "Photographs", type: "array", of: [{ type: "photograph" }] }),
    defineField({
      name: "location",
      title: "Places",
      description: "Shown on the story card under the quotation. Example: Manhattan, NY → Newark, NJ",
      type: "localeString",
    }),
    defineField({
      name: "headline",
      title: "Headline",
      description: "The quotation shown across the portrait. Write English, Spanish, and Chinese in their own fields. Leave a language blank when it is not ready.",
      type: "localeText",
    }),
    defineField({
      name: "overview",
      title: "Overview",
      description: "Optional. The personal overview at the top of the story page, above the life-stage groups. Write English, Spanish, and Chinese in their own fields. Leave empty when this person does not have an overview yet.",
      type: "localeBlock",
    }),
    defineField({
      name: "segments",
      title: "Story sections",
      description: "Optional. On the story page, sections are grouped by life stage. Sections without a stage appear last, under Other Stories. Within a stage, this list order is kept.",
      type: "array",
      of: [
        defineArrayMember({
          name: "storySegment",
          title: "Story section",
          type: "object",
          fields: [
            defineField({
              name: "quote",
              title: "Title",
              description: "The full title shown with this section in the story. Write it in English, Spanish, and Chinese. Leave a language blank if that translation is not ready. Do not type quotation marks; use the checkbox below.",
              type: "localeText",
            }),
            defineField({
              name: "isQuote",
              title: "This title is the participant's own words",
              description: "Checked titles are shown in quotation style. The title text itself does not include quotation marks.",
              type: "boolean",
              initialValue: false,
            }),
            defineField({
              name: "shortTitle",
              title: "Short title",
              description: "Optional. The short label on the timeline. Write English, Spanish, and Chinese. Leave empty and the website shortens the title to about eight words.",
              type: "localeString",
            }),
            defineField({
              name: "body",
              title: "Section text",
              description: "The paragraphs for this section. Write each language in its own field. Leave empty if the section is not ready.",
              type: "localeBlock",
            }),
            defineField({
              name: "lifeStage",
              title: "Life stage",
              description: "Choose the life stage this section belongs to. Leave it empty to place the section in Other Stories.",
              type: "string",
              options: { list: [...lifeStages], layout: "radio" },
            }),
          ],
          preview: {
            select: {
              quoteEn: "quote.en",
              quoteEs: "quote.es",
              quoteZh: "quote.zh",
              shortEn: "shortTitle.en",
              shortEs: "shortTitle.es",
              shortZh: "shortTitle.zh",
              stage: "lifeStage",
            },
            prepare({
              quoteEn,
              quoteEs,
              quoteZh,
              shortEn,
              shortEs,
              shortZh,
              stage,
            }: {
              quoteEn?: string;
              quoteEs?: string;
              quoteZh?: string;
              shortEn?: string;
              shortEs?: string;
              shortZh?: string;
              stage?: string;
            }) {
              const name = firstFilled(quoteEn, quoteEs, quoteZh, shortEn, shortEs, shortZh) || "Untitled section";
              return { title: `${lifeStageTitle(stage) || "Other Stories"} — ${name}` };
            },
          },
        }),
      ],
    }),
    defineField({
      name: "body",
      title: "Full story (plain text)",
      description: legacyStoryText,
      type: "localeText",
      hidden: ({ document }) => hasStorySections(document),
      readOnly: true,
    }),
    defineField({
      name: "article",
      title: "Full story",
      description: legacyStoryText,
      type: "object",
      hidden: ({ document }) => hasStorySections(document),
      readOnly: true,
      fields: (["en", "es", "zh"] as const).map((language) =>
        defineField({
          name: language,
          title: language === "en" ? "English" : language === "es" ? "Español" : "中文",
          type: "array",
          of: [
            defineArrayMember({
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
                    type: "object",
                    title: "Link",
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
            }),
          ],
        }),
      ),
    }),
    defineField({
      name: "migration",
      title: "Migration record",
      description: "Written by the Weebly importer. Leave this in place so a later import can tell an editor's changes from the original extract.",
      type: "object",
      readOnly: true,
      options: { collapsible: true, collapsed: true },
      fields: [
        defineField({ name: "source", title: "Source", type: "string", readOnly: true }),
        defineField({ name: "sourceUrl", title: "Source URL", type: "url", readOnly: true }),
        defineField({ name: "sourceId", title: "Source id", type: "string", readOnly: true }),
        defineField({ name: "sourceFilename", title: "Source filename", type: "string", readOnly: true }),
        defineField({ name: "originalCode", title: "Original participant code", type: "string", readOnly: true }),
        defineField({ name: "contentHash", title: "Content hash", type: "string", readOnly: true }),
        defineField({ name: "importedAt", title: "Imported at", type: "datetime", readOnly: true }),
        defineField({ name: "completeness", title: "Completeness", type: "string", readOnly: true }),
      ],
    }),
    defineField({
      name: "participant",
      title: "Participant",
      type: "reference",
      to: [{ type: "person" }],
      hidden: true,
      description: "Hidden. The website does not read this reference. The participant code above is the public identifier.",
    }),
    defineField({
      name: "collection",
      title: "Legacy community",
      description: "Hidden. The original classification is still stored. The website reads the Collection reference above. Delete this field only after the cleanup checklist confirms every story has that reference.",
      type: "string",
      hidden: true,
      options: {
        list: [
          { title: "Latine Immigrant Stories", value: "latine" },
          { title: "African American Stories", value: "africanAmerican" },
          { title: "Chinese Immigrant Stories", value: "chinese" },
        ],
        layout: "radio",
      },
    }),
    defineField({ name: "slug", title: "Slug", type: "slug", options: { source: "participantCode" }, validation: (rule) => rule.required() }),
    defineField({
      name: "title",
      title: "Title",
      type: "localeString",
      hidden: true,
      description: "Hidden. English, Spanish, and Chinese are kept equal to the participant code. Change the code above; this field updates with it.",
    }),
    defineField({ name: "themes", title: "Themes", type: "array", of: [{ type: "string" }], options: { layout: "tags" } }),
    defineField({
      name: "relatedEvents",
      title: "Related timeline events",
      type: "array",
      of: [{ type: "reference", to: [{ type: "timelineEvent" }] }],
    }),
    defineField({ name: "externalHref", title: "Current public archive URL", type: "url" }),
    defineField({ name: "published", title: "Published", type: "boolean", initialValue: false }),
  ],
  preview: {
    select: { title: "participantCode", media: "photographs.0.image" },
  },
});
