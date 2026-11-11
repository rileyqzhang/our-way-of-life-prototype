export type CitationSource = {
  authors?: string[] | null;
  year?: string | null;
  title?: string | null;
  source?: string | null;
  publisher?: string | null;
  volume?: string | null;
  issue?: string | null;
  pages?: string | null;
  link?: string | null;
};

export type CitationPart =
  | { kind: "text"; text: string }
  | { kind: "em"; text: string }
  | { kind: "link"; text: string; href: string };

function clean(value: string | null | undefined) {
  return value?.trim() || "";
}

function authorsOf(source: CitationSource) {
  const names = (source.authors || []).map((name) => name.trim()).filter(Boolean);
  if (names.length < 2) return names[0] || "";
  return `${names.slice(0, -1).join(", ")}, & ${names[names.length - 1]}`;
}

function yearOf(value: string) {
  return /^in\s+press$/i.test(value) ? "in press" : value;
}

function withPeriod(value: string) {
  return /[.!?。]$/.test(value) ? value : `${value}.`;
}

export function citationLink(value: string | null | undefined) {
  const raw = clean(value);
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return { href: raw, text: raw };
  const doi = raw.replace(/^doi:\s*/i, "");
  if (/^10\.\S+$/i.test(doi)) {
    const href = `https://doi.org/${doi}`;
    return { href, text: href };
  }
  return null;
}

export function formatCitation(source: CitationSource): CitationPart[] {
  const authors = authorsOf(source);
  const year = yearOf(clean(source.year));
  const title = clean(source.title);
  const container = clean(source.source);
  const publisher = clean(source.publisher);
  const volume = clean(source.volume);
  const issue = clean(source.issue);
  const pages = clean(source.pages);
  const link = citationLink(source.link);
  if (!authors && !title && !container) return [];

  const parts: CitationPart[] = [];
  const opener = [authors, year ? `(${year})` : ""].filter(Boolean).join(" ");
  if (opener) parts.push({ kind: "text", text: title ? `${opener}. ` : `${withPeriod(opener)} ` });
  if (title) parts.push({ kind: "text", text: publisher || container ? `${withPeriod(title)} ` : withPeriod(title) });

  if (publisher && container) {
    parts.push({ kind: "text", text: "In " });
    parts.push({ kind: "em", text: container });
    parts.push({ kind: "text", text: `. ${withPeriod(publisher)}` });
  } else if (container) {
    parts.push({ kind: "em", text: container });
    if (volume || issue || pages) {
      parts.push({ kind: "text", text: ", " });
      if (volume) parts.push({ kind: "em", text: volume });
      const tail = `${issue ? `(${issue})` : ""}${pages ? `${issue || volume ? ", " : ""}${pages}` : ""}`;
      parts.push({ kind: "text", text: `${tail}.` });
    } else {
      parts.push({ kind: "text", text: "." });
    }
  }

  if (link) parts.push({ kind: "text", text: " " }, { kind: "link", text: link.text, href: link.href });
  return parts;
}
