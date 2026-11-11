import assert from "node:assert/strict";
import test from "node:test";
import { formatCitation, type CitationSource } from "@/lib/content/citation";

function text(source: CitationSource) {
  return formatCitation(source).map((part) => part.text).join("");
}

function emphasis(source: CitationSource) {
  return formatCitation(source).filter((part) => part.kind === "em").map((part) => part.text);
}

const papers: CitationSource[] = [
  {
    authors: ["Reyes, L."],
    year: "in press",
    title: "Learn about multimodal elicitation data analysis using the life course narratives of elders in Our Way of Life Project",
    source: "SAGE Research Methods: Diversifying and Decolonizing Research",
    publisher: "SAGE Publications Ltd.",
  },
  {
    authors: ["Reyes, L.", "Serrat, R."],
    year: "2025",
    title: "Trajectories of civic participation across borders: Drawing from life course narratives of older Latine immigrants",
    source: "Journal of Gerontological Social Work",
    pages: "1–19",
    link: "10.1080/01634372.2025.2478248",
  },
  {
    authors: ["Reyes, L."],
    year: "2024",
    title: "In their words: African American and Latine immigrant older adults (re)define civic participation",
    source: "The Journals of Gerontology, Series B: Psychological Sciences and Social Sciences",
    link: "10.1093/geronb/gbae143",
  },
  {
    authors: ["Reyes, L."],
    year: "2023",
    title: "Experiences of civic participation among older African American and Latinx immigrant adults in the context of an ageist and racist society",
    source: "Research on Aging",
    volume: "45",
    issue: "1",
    pages: "92–103",
    link: "10.1177/01640275221094288",
  },
  {
    authors: ["Reyes, L.", "Versey, H. S.", "Yeh, J."],
    year: "2022",
    title: "Emancipatory visions: Using visual methods to co-construct knowledge with older adults",
    source: "The Gerontologist",
    volume: "62",
    issue: "10",
    pages: "1402–1408",
    link: "https://doi.org/10.1093/geront/gnac046",
  },
];

test("journal and chapter citations follow the research page punctuation", () => {
  assert.equal(
    text(papers[0]),
    "Reyes, L. (in press). Learn about multimodal elicitation data analysis using the life course narratives of elders in Our Way of Life Project. In SAGE Research Methods: Diversifying and Decolonizing Research. SAGE Publications Ltd.",
  );
  assert.deepEqual(emphasis(papers[0]), ["SAGE Research Methods: Diversifying and Decolonizing Research"]);
  assert.equal(
    text(papers[1]),
    "Reyes, L., & Serrat, R. (2025). Trajectories of civic participation across borders: Drawing from life course narratives of older Latine immigrants. Journal of Gerontological Social Work, 1–19. https://doi.org/10.1080/01634372.2025.2478248",
  );
  assert.equal(
    text(papers[2]),
    "Reyes, L. (2024). In their words: African American and Latine immigrant older adults (re)define civic participation. The Journals of Gerontology, Series B: Psychological Sciences and Social Sciences. https://doi.org/10.1093/geronb/gbae143",
  );
  assert.equal(
    text(papers[3]),
    "Reyes, L. (2023). Experiences of civic participation among older African American and Latinx immigrant adults in the context of an ageist and racist society. Research on Aging, 45(1), 92–103. https://doi.org/10.1177/01640275221094288",
  );
  assert.deepEqual(emphasis(papers[3]), ["Research on Aging", "45"]);
  assert.equal(
    text(papers[4]),
    "Reyes, L., Versey, H. S., & Yeh, J. (2022). Emancipatory visions: Using visual methods to co-construct knowledge with older adults. The Gerontologist, 62(10), 1402–1408. https://doi.org/10.1093/geront/gnac046",
  );
  const doi = formatCitation(papers[1]).find((part) => part.kind === "link");
  assert.equal(doi && doi.kind === "link" ? doi.href : "", "https://doi.org/10.1080/01634372.2025.2478248");
});
