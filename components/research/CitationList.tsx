import { formatCitation, type CitationSource } from "@/lib/content/citation";

export function CitationList({ items }: { items: (CitationSource & { id: string })[] }) {
  if (!items.length) return null;
  return (
    <div className="researchCitations">
      {items.map((item) => (
        <p className="researchCitation" key={item.id}>
          {formatCitation(item).map((part, index) => {
            if (part.kind === "em") return <em key={index}>{part.text}</em>;
            if (part.kind === "link") {
              return (
                <a key={index} href={part.href} rel="noopener noreferrer" target="_blank">
                  {part.text}
                </a>
              );
            }
            return <span key={index}>{part.text}</span>;
          })}
        </p>
      ))}
    </div>
  );
}
