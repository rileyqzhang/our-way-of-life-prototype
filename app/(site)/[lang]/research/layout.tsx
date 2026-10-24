import { ResearchNav } from "@/components/research/ResearchNav";

export default function ResearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="researchPage">
      <ResearchNav />
      {children}
    </div>
  );
}
