import type { StoryCollection } from "@/lib/content/collections";

export type DocxCommunityId = "africanAmerican" | "latine" | "chinese";

export type DocxCommunity = {
  id: DocxCommunityId;
  title: string;
  collection: StoryCollection;
  /** Directories scanned recursively. Files are read where they already are. */
  roots: string[];
  reportPath: string;
  imageRoot: string;
  protectedSlugs: string[];
};

export type DocxSource = {
  originalCode: string;
  driveId: string;
  filename: string | null;
  kind: "file" | "folder";
  community: "africanAmerican";
};

/** Files the editor identified inside the African American Stories Drive group. */
export const africanAmericanSources: DocxSource[] = [
  {
    originalCode: "MLNJ",
    driveId: "1K4pjBpx_TnzihxTZERJ9NcJSnv3u2ra4",
    filename: null,
    kind: "folder",
    community: "africanAmerican",
  },
  {
    originalCode: "BMNJ6",
    driveId: "1uXOF0DI01aKBk_BSPjc0nuLTzRoZMCAn",
    filename: "BMNJ6 Stories.docx",
    kind: "file",
    community: "africanAmerican",
  },
  {
    originalCode: "ETNY6",
    driveId: "1_qoQZ5yut8ujaYoTwLsUq8JiIa4vv8p8",
    filename: "ETNY6 Stories- Fnal.docx",
    kind: "file",
    community: "africanAmerican",
  },
  {
    originalCode: "FRNJ6",
    driveId: "1hHV5rNKtJpRUepNVW_ouNoDu9XDCkQX5",
    filename: "FRNJ6 Stories- Elicitation Final.docx",
    kind: "file",
    community: "africanAmerican",
  },
  {
    originalCode: "HSNJ6",
    driveId: "1gC23_1LEJfB33abOiBfl6EC-nvAEhAGw",
    filename: "HSNJ6 Stories-Final.docx",
    kind: "file",
    community: "africanAmerican",
  },
  {
    originalCode: "RBNY7",
    driveId: "1EUBvkseRBcLZT1cKjqM8zaK6Kl6ZdZ2t",
    filename: "RBNY7 stories final.docx",
    kind: "file",
    community: "africanAmerican",
  },
  {
    originalCode: "SENJ6",
    driveId: "1S5Acjq0Iw2M0KCvm_ob3Jv35ErgXlz2B",
    filename: "SENJ6 Stories- finalized.docx",
    kind: "file",
    community: "africanAmerican",
  },
  {
    originalCode: "WPNY7",
    driveId: "1k3Gg1aEOSLKx1XXCoTmhWYSQKE4swkDR",
    filename: "WPNY7 Stories-Finalized.docx",
    kind: "file",
    community: "africanAmerican",
  },
];

export const docxImportDir = "source-documents/african-american/African American Stories";

export const docxCommunities: DocxCommunity[] = [
  {
    id: "africanAmerican",
    title: "African American Stories",
    collection: "africanAmerican",
    roots: [docxImportDir],
    reportPath: "cms/seed/docx/african-american-report.json",
    imageRoot: "source-documents/african-american/extracted",
    protectedSlugs: ["frnj", "jmwe"],
  },
  {
    id: "latine",
    title: "Latine Immigrant Stories",
    collection: "latine",
    roots: ["source-documents/latine", "source-documents/african-american/Latine Immigrant Stories"],
    reportPath: "cms/seed/docx/latine-report.json",
    imageRoot: "source-documents/latine/extracted",
    protectedSlugs: ["frnj", "jmwe"],
  },
  {
    id: "chinese",
    title: "Chinese Immigrant Stories",
    collection: "chinese",
    roots: ["source-documents/chinese-immigrant", "source-documents/african-american/Chinese Immigrant Stories"],
    reportPath: "cms/seed/docx/chinese-immigrant-report.json",
    imageRoot: "source-documents/chinese-immigrant/extracted",
    protectedSlugs: ["frnj", "jmwe"],
  },
];

export function docxCommunity(id: string | undefined) {
  return docxCommunities.find((community) => community.id === id) || docxCommunities[0];
}
