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
      S.documentTypeListItem("story").title("Stories"),
      S.documentTypeListItem("timelineEvent").title("Timeline events"),
      S.documentTypeListItem("person").title("People"),
      S.documentTypeListItem("page").title("Pages"),
    ]);
