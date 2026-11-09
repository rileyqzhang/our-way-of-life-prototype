# For Researchers — Tab Restructure + PI Profile Removal

## Context

The "For Researchers" page currently has two sections:
1. **PI Profile** — Dr. Reyes portrait, bio, and profile button (screenshot shows this in full)
2. **Methodology + Downloads** — centered dissertation title, 2-column layout with Background & Aims text on the left and download buttons on the right

The user wants to:
- **Remove** the PI Profile section entirely (Section 1 in `ResearchersPage`)
- **Restructure** the remaining content into two sub-tabs inside the page, accessible via a tab bar:
  - **Tab 1 "Research & Publications"**: Show only the "Research Methodology & Dissertation Framework" heading + dissertation title (italic, centered, large). Below that, show the dissertation download button **centered** on the page. Remove Background and Aims text and the 2-column layout.
  - **Tab 2 "Story Transcripts"**: Show the Open-Access Story Repository section — its heading, subtitle, and the "Download All Transcripts (.ZIP)" button.

## Files to modify

- `src/App.tsx` — all changes are within `ResearchersPage` (lines 1002–1154)

## Implementation

### 1. Add tab state inside `ResearchersPage`

```ts
const [tab, setTab] = useState<"research" | "transcripts">("research");
```

### 2. Remove PI Profile section

Delete the entire `{/* ── Section 1: PI Profile ── */}` section (lines 1015–1069).

### 3. Add tab bar UI

Render a tab bar immediately after `<SiteHeader>`, styled on the amber background:

```tsx
{/* Tab bar */}
<div style={{ borderBottom: "1px solid rgba(35,31,32,0.2)", padding: "0 48px" }}>
  <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", gap: "0" }}>
    {[
      { key: "research", label: "Research & Publications" },
      { key: "transcripts", label: "Story Transcripts" },
    ].map(({ key, label }) => (
      <button
        key={key}
        onClick={() => setTab(key as "research" | "transcripts")}
        style={{
          fontFamily: CGR, fontSize: "17px", fontWeight: tab === key ? 700 : 400,
          color: textDark, background: "none", border: "none", cursor: "pointer",
          padding: "20px 32px 18px",
          borderBottom: tab === key ? `3px solid ${textDark}` : "3px solid transparent",
          marginBottom: "-1px",
          opacity: tab === key ? 1 : 0.6,
        }}
      >
        {label}
      </button>
    ))}
  </div>
</div>
```

### 4. Tab 1 — Research & Publications

Replace the full 2-column section with:
- Centered heading "Research Methodology & Dissertation Framework" (existing style)
- Centered dissertation title (italic, bold, large — existing style)
- A centered download button for the Full Dissertation PDF, with no other surrounding content

```tsx
{tab === "research" && (
  <section style={{ backgroundColor: amber, padding: "80px 48px", minHeight: "60vh", display: "flex", alignItems: "center" }}>
    <div style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
      <h2 ...>Research Methodology & Dissertation Framework</h2>
      <p ... {/* dissertation title, large italic bold */}>
        A phenomenological study...
      </p>
      {/* Centered download button */}
      <a href="#" style={{ display: "inline-flex", ... backgroundColor: darkBtn, color: "#E7D8B7" }}>
        Download Full Dissertation (PDF) ↓
      </a>
    </div>
  </section>
)}
```

### 5. Tab 2 — Story Transcripts

Move the current Open-Access Story Repository block here:
- Heading "Open-Access Story Repository & Direct Download Hub"
- Subtitle paragraph
- "Download All Transcripts (.ZIP) ↓" button

```tsx
{tab === "transcripts" && (
  <section style={{ backgroundColor: amber, padding: "80px 48px", minHeight: "60vh", display: "flex", alignItems: "center" }}>
    <div style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
      <h2 ...>Open-Access Story Repository & Direct Download Hub</h2>
      <p ...>Download complete, de-identified transcripts...</p>
      <a href="#" style={{ ... }}>Download All Transcripts (.ZIP) ↓</a>
    </div>
  </section>
)}
```

## Verification

1. Click "For Researchers" in the nav → page loads on Tab 1
2. PI profile (portrait, bio, profile button) is gone
3. Tab 1 shows only the heading, dissertation title, and a single centered download button
4. Click "Story Transcripts" tab → Tab 2 shows the repository heading + subtitle + ZIP download button
5. Tab indicator (bold text + bottom border) tracks the active tab correctly
