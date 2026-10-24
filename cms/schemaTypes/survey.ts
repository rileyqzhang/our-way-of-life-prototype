import { defineArrayMember, defineField, defineType } from "sanity";

const questionTypes = [
  { title: "Short text", value: "text" },
  { title: "Email", value: "email" },
  { title: "Long answer", value: "textarea" },
  { title: "Dropdown", value: "select" },
  { title: "Yes / no or other choice", value: "radio" },
  { title: "Image upload", value: "file" },
  { title: "Section heading", value: "section" },
];

const question = defineField({
  name: "questions",
  title: "Questions",
  type: "array",
  of: [
    defineArrayMember({
      type: "object",
      name: "surveyQuestion",
      fields: [
        defineField({ name: "key", title: "Key", type: "string", description: "Stable field name. Do not rename a key after people have submitted it.", validation: (rule) => rule.required().regex(/^[a-z0-9-]+$/) }),
        defineField({ name: "type", title: "Answer type", type: "string", options: { list: questionTypes }, validation: (rule) => rule.required() }),
        defineField({
          name: "group",
          title: "Step",
          type: "string",
          options: {
            list: [
              { title: "Basic information (one step, required together)", value: "basic" },
              { title: "Creative work (skippable)", value: "creative" },
              { title: "Story prompt (its own skippable step)", value: "prompt" },
            ],
          },
          initialValue: "prompt",
          validation: (rule) => rule.required(),
        }),
        defineField({ name: "required", title: "Required", type: "boolean", initialValue: false }),
        defineField({ name: "label", title: "Label", type: "localeString" }),
        defineField({ name: "description", title: "Description", type: "localeText" }),
        defineField({ name: "placeholder", title: "Placeholder", type: "localeString" }),
        defineField({ name: "accept", title: "File accept", type: "string", description: "Use image/* for the creative-work upload." }),
        defineField({
          name: "options",
          title: "Choices",
          type: "array",
          of: [
            defineArrayMember({
              type: "object",
              fields: [
                defineField({ name: "value", title: "Stored value", type: "string", validation: (rule) => rule.required() }),
                defineField({ name: "label", title: "Label", type: "localeString" }),
              ],
              preview: { select: { title: "value" } },
            }),
          ],
        }),
      ],
      preview: {
        select: { title: "label.en", subtitle: "type" },
        prepare({ title, subtitle }) {
          return { title: title || "Untitled question", subtitle };
        },
      },
    }),
  ],
});

export const survey = defineType({
  name: "survey",
  title: "Share Your Story survey",
  type: "document",
  fields: [
    defineField({ name: "version", title: "Version", type: "number", initialValue: 1, validation: (rule) => rule.required().integer().positive() }),
    defineField({ name: "title", title: "Title", type: "localeString" }),
    defineField({ name: "introduction", title: "Introduction", type: "localeText" }),
    defineField({ name: "submitNote", title: "Review and anonymity note", type: "localeText" }),
    defineField({ name: "confirmationTitle", title: "Confirmation title", type: "localeString" }),
    defineField({ name: "confirmationBody", title: "Confirmation text", type: "localeText" }),
    question,
  ],
  preview: { prepare: () => ({ title: "Share Your Story survey" }) },
});

const answer = defineArrayMember({
  type: "object",
  name: "surveyAnswer",
  readOnly: true,
  fields: [
    defineField({ name: "key", title: "Key", type: "string", readOnly: true }),
    defineField({ name: "label", title: "Question", type: "string", readOnly: true }),
    defineField({ name: "value", title: "Answer", type: "text", readOnly: true }),
    defineField({ name: "includeInStory", title: "Can be copied into a story draft", type: "boolean", readOnly: true }),
  ],
  preview: { select: { title: "label", subtitle: "value" } },
});

export const storySubmission = defineType({
  name: "storySubmission",
  title: "Story submission",
  type: "document",
  description: "Private review record. Leave this unpublished. The public website does not query it, and the publish action is removed.",
  fields: [
    defineField({ name: "submittedAt", title: "Submitted", type: "datetime", readOnly: true }),
    defineField({ name: "surveyId", title: "Survey", type: "string", readOnly: true }),
    defineField({ name: "surveyVersion", title: "Survey version", type: "number", readOnly: true }),
    defineField({ name: "language", title: "Language", type: "string", readOnly: true }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "Pending", value: "pending" },
          { title: "Reviewed", value: "reviewed" },
          { title: "Approved", value: "approved" },
          { title: "Rejected", value: "rejected" },
        ],
        layout: "radio",
      },
      initialValue: "pending",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "publicationAuthorized",
      title: "Publication authorized by the participant",
      type: "boolean",
      description: "Turn this on only after the participant has approved publication. Creating a story draft also requires the status Approved.",
      initialValue: false,
    }),
    defineField({
      name: "participantCode",
      title: "Participant code for a story draft",
      type: "string",
      description: "Entered by a reviewer. This is not the participant's email address.",
    }),
    defineField({ name: "reviewNotes", title: "Review notes", type: "text" }),
    defineField({ name: "answers", title: "Answers", type: "array", readOnly: true, of: [answer] }),
    defineField({
      name: "files",
      title: "File notes",
      type: "array",
      readOnly: true,
      description: "File names only. Image and audio bytes are not stored in Sanity.",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({ name: "key", type: "string", readOnly: true }),
            defineField({ name: "filename", type: "string", readOnly: true }),
            defineField({ name: "contentType", type: "string", readOnly: true }),
            defineField({ name: "byteLength", type: "number", readOnly: true }),
          ],
        }),
      ],
    }),
  ],
  preview: {
    select: { status: "status", submittedAt: "submittedAt" },
    prepare({ status, submittedAt }) {
      return { title: submittedAt || "Story submission", subtitle: status || "pending" };
    },
  },
});
