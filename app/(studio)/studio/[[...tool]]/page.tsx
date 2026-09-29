import { Studio } from "@/components/studio/Studio";
import { isSanityConfigured, projectId } from "@/lib/sanity/env";

export const dynamic = "force-dynamic";

export default function StudioPage() {
  if (!isSanityConfigured()) {
    return (
      <main style={{ maxWidth: 720, margin: "48px auto", padding: "0 20px", fontFamily: "Georgia, serif", lineHeight: 1.5 }}>
        <h1>Sanity Studio is not connected yet</h1>
        <p>
          Create the Sanity project under the professor or Berkeley project account, then add{" "}
          <code>NEXT_PUBLIC_SANITY_PROJECT_ID</code> and <code>NEXT_PUBLIC_SANITY_DATASET</code>. The current value is{" "}
          {projectId ? "set but not a valid project id" : "empty"}.
        </p>
        <p>Professor Reyes edits stories, photos, and timeline events here. GitHub and Vercel stay with the developers.</p>
        <ol>
          <li>Create a Sanity project owned by the project account. Add the developer as admin, not owner.</li>
          <li>Copy <code>.env.example</code> to <code>.env.local</code> and fill in the project id, dataset, and a read token.</li>
          <li>
            Run <code>npm run sanity:seed</code>, then <code>npm run sanity:import</code> with <code>SANITY_API_WRITE_TOKEN</code>.
          </li>
          <li>Open <code>/studio</code>. Use Presentation to click from the website preview into the matching field.</li>
        </ol>
      </main>
    );
  }

  return <Studio />;
}
