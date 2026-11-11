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
      S.listItem()
        .title("Collection page wording")
        .id("collectionPage")
        .child(S.document().schemaType("collectionPage").documentId("collectionPage")),
      S.documentTypeListItem("story").title("Stories"),
      S.documentTypeListItem("publication").title("Publications"),
      S.listItem()
        .title("Archive overview and access")
        .id("researchAccessPage")
        .child(S.document().schemaType("researchAccessPage").documentId("researchAccessPage")),
      S.listItem()
        .title("Research methodology")
        .id("researchMethodologyPage")
        .child(S.document().schemaType("researchMethodologyPage").documentId("researchMethodologyPage")),
      S.listItem()
        .title("Research and publications")
        .id("researchPublicationsPage")
        .child(S.document().schemaType("researchPublicationsPage").documentId("researchPublicationsPage")),
      S.documentTypeListItem("timelineEvent").title("Timeline events"),
      S.documentTypeListItem("page").title("Pages"),
      S.divider(),
      S.listItem()
        .title("Share Your Story survey")
        .id("shareYourStorySurvey")
        .child(S.document().schemaType("survey").documentId("shareYourStorySurvey")),
      S.documentTypeListItem("storySubmission").title("Story submissions"),
    ]);
