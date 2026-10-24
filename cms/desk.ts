import type { StructureResolver } from "sanity/structure";

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Archive")
    .items([
      S.listItem()
        .title("Site settings")
        .id("siteSettings")
        .child(S.document().schemaType("siteSettings").documentId("siteSettings")),
      S.divider(),
      S.documentTypeListItem("collection").title("Collections"),
      S.documentTypeListItem("story").title("Stories"),
      S.documentTypeListItem("timelineEvent").title("Timeline events"),
      S.documentTypeListItem("person").title("People"),
      S.documentTypeListItem("page").title("Pages"),
      S.divider(),
      S.listItem()
        .title("Share Your Story survey")
        .id("shareYourStorySurvey")
        .child(S.document().schemaType("survey").documentId("shareYourStorySurvey")),
      S.documentTypeListItem("storySubmission").title("Story submissions"),
    ]);
