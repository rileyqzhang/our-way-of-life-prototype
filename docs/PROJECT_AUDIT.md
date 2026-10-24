# Our Way of Life Archive — Project Audit

Audit date: 24 October 2026.  
Scope: local checkout at `main`, GitHub `origin/main`, Sanity project `b7ojtu3l` dataset `production`, and the local site at `http://127.0.0.1:3000`.

This audit did not change application code, run a write migration, publish a Sanity document, or push a commit. The only file added is this report.

Labels used below:

- **Verified:** observed in this audit from git, source, a read-only Sanity query, a test command, or the running local site.
- **Reported:** recorded in an existing migration report or prior note, and not re-executed here.
- **Unknown:** not inspected, or blocked (for example Studio login).

## 1. Executive Summary

The local site renders the homepage, three community collection pages, six published stories, and a 34-event spiral timeline. Multiple timeline cards stay open until each one is closed. Sanity Studio has a `collection` schema. Three collection documents exist as drafts only.

The archive is not ready for Professor Reyes to manage on her own.

- The two commits that add dynamic collections and multi-card timeline behavior are **not pushed**. The Collections sidebar item is an **uncommitted** local change.
- `npx next build` fails, so a Vercel deploy of this tree fails.
- Only 2 of 34 timeline events are published in Sanity. The public spiral fills the rest from `lib/timeline/events.json`. She cannot edit most events in Studio.
- Only 6 stories are published. Several of those are short Weebly imports or were published while their `published` checkbox is false. The website does not read that checkbox.
- There are no Sanity `page` or `siteSettings` documents. Navigation, About, Contact, and Research copy still live in code.
- The GitHub repository is public. Original Word research files are gitignored and were not found in git.

## 2. Verified Working Features

- Local site redirects `/` to `/en`. English, Spanish, and Chinese home pages render. Spanish Latine collection title is “Historias de inmigrantes latines.” Chinese stories title is “参与者.”
- Routes that returned 200 with the expected heading: home, timeline, participants, the three collection pages, about, contact, share-your-story, research, research methodology, research publications, and `/studio`.
- Unknown story and collection URLs return 404. Draft stories `bmnj`, `wpny`, and `cssf` return 404.
- Six published stories render: FRNJ, JMWE, MGNJ, SENJ, EBNJ, JMOK.
- Public collection membership from the legacy string: Latine shows EBNJ; African American shows FRNJ, JMWE, and SENJ; Chinese shows JMOK. MGNJ appears under the unassigned group.
- Timeline: two event cards opened together, stayed open after a wheel gesture, and closing one left the other open with an independently scrolling body. At 390px the remaining card is 280px wide in a horizontal dock. No page errors were thrown.
- `POST /api/stories/submit` returns 403 and does not store a submission.
- Share Your Story explains that the site does not accept uploads (`lib/content/copy.ts`).
- Research shows the pending state when `NEXT_PUBLIC_RESEARCH_DOC_URL` is empty. The dissertation PDF is absent, and the publications page is written to show a pending message in that case.
- Local timeline image `/timeline/food-pantry.jpg` and its `next/image` URL return 200.
- Migration unit tests: 20 passed.
- Skip link and `lang` on the document element are present. Timeline close buttons use an accessible name.

## 3. Incomplete Features

- Dynamic collections are coded and three draft documents exist, but nothing is published, so the public site still uses the built-in Latine, African American, and Chinese fallbacks.
- Collections sidebar item exists only in the uncommitted `cms/desk.ts`. A fresh browser reached the Sanity login screen, so the painted menu was not seen while signed in.
- Multi-card timeline behavior is local and unpushed.
- Timeline events 06–34 are not in Sanity. Events 03–05 are drafts. The public spiral still shows all 34 because `mergeTimeline` in `lib/content/derive.ts` keeps local events that Sanity has not published.
- DOCX articles for most participants are drafts. MLNJ’s second Word file was intentionally left as Review and is not a Sanity document.
- Pages, site settings, About team cards, and the main navigation are not CMS-managed.
- Figma’s participants view shows BMNJ as a readable story and MGNJ and EBNJ as “Coming soon.” The site does the reverse for those three.
- Figma’s header includes “Our Team” and “Rightful Participation.” The site header does not. About exists at `/about` but is not in `localSettings.navigation`.
- No `loading.tsx` or `error.tsx`. One `not-found.tsx` exists for the language segment.
- No ESLint config and no `lint` script. `npx next lint` was not run as a project lint because there is nothing configured to run.
- Arrow-key movement between timeline cards is implemented in `components/timeline/InteractiveTimeline.tsx` and was not pressed again in this audit.

## 4. Actual Sanity Content Inventory

Read-only query, perspective `raw`, 24 October 2026. 74 documents. No duplicate slugs. No unresolved references among the references that are actually stored. Required fields checked: story code, slug, and English title; timeline date, slug, English title, and display order; person name and role; page slug and English title; collection English name, slug, and display order; site name. None of those were missing on documents that exist.

The website uses the published perspective. Drafts below are invisible on the public site.

### Collections

| State | Count | Ids |
|---|---|---|
| Published | 0 | — |
| Draft only | 3 | `collection-latine`, `collection-africanAmerican`, `collection-chinese` |
| Both | 0 | — |

Each draft has an English, Spanish, and Chinese name, the existing URL slug, and display order 0, 1, or 2. No story `community` reference is set.

The collection migration report at `cms/seed/collections/collection-report.json` (written 21:53 UTC, `sanityWrites: 0`) still says all three should be created. That report is stale. The drafts exist now. This audit did not create them.

### Stories

| State | Count | Ids |
|---|---|---|
| Published | 6 | `story-senj`, `story-ebnj`, `story-jmok`, `story-jmwe`, `story-mgnj`, plus FRNJ at id `362fbdab-460c-421b-ba63-61add1e64c86` |
| Draft only | 27 | AAWE, ALWE, AMWE, BMNJ, CRWE, CSSF, EMWE, EROWE, ERWE, ETNY, GJSF, HSNJ, JZOK, LAWE, LLSF, LRNJ, MLNJ, MMWE, MVWE, NCNJ, NRWE, RBNY, RHWE, SHOK, SLOK, WLOK, WPNY |
| Both | 0 | — |

Every listed story has `published: false` on the document, including the six Sanity-published documents. The participants page does not filter on that boolean (`app/(site)/[lang]/stories/page.tsx`). Publishing the Sanity document is what makes it public.

Published body sizes are character lengths of the plain `body` field, plus portable-text block counts:

| Code | Legacy community | Languages with body text | Plain-text length | Source field | Public page |
|---|---|---|---|---|---|
| SENJ | africanAmerican | English | 60,210; 177 article blocks | docx | 200, large page |
| EBNJ | latine | Spanish | 49,003; 144 article blocks | docx | 200 |
| JMOK | chinese | Chinese | 8,427; 58 article blocks | docx | 200 |
| FRNJ | africanAmerican | English | 25,987; no article blocks | none | 200 |
| JMWE | africanAmerican | English and Spanish | 1,709 and 1,850; 4 blocks each | weebly | 200, much smaller HTML than SENJ |
| MGNJ | empty | Spanish | 978; 3 article blocks | weebly | 200, much smaller HTML than SENJ |

Titles in Spanish and Chinese are missing on most stories. `pick()` falls back to English, then Spanish, then Chinese (`lib/content/text.ts`).

### People

| State | Count | Notes |
|---|---|---|
| Published | 32 | One `person-{code}` per imported participant code, `roleKind: participant` |
| Draft only | 1 | `FRNJ`, id `drafts.4d859805-b2ea-47d3-a9ea-c0064e2b2b33` |
| Both | 0 | — |

No team members were found. Biographies were not measured. DHNJ and EMNJ have no person documents.

### Timeline events

Source file `lib/timeline/events.json` has 34 events, ids `01` through `34`.

| State | Count | Ids |
|---|---|---|
| Published | 2 | `timeline-01-colonization-of-the-americas`, `timeline-02-1790-naturalization-act` |
| Draft only | 3 | events 03, 04, and 05 |
| Missing from Sanity | 29 | events 06–34 |
| Both | 0 | — |

The two published and three draft events have English, Spanish, and Chinese titles. Stored story references on those five resolve. DHNJ and EMNJ are not among them because those events were never created in Sanity.

### Pages and site settings

No `page` documents. No `siteSettings` document. `mapPages` and `mapSettings` fall back to `lib/content/copy.ts`. Editors cannot change the homepage, About, Contact, or the header links in Studio until those documents exist.

## 5. Migration Status by Community

DOCX reports are dry runs with `sanityWrites: 0`, dated 24 October 2026 around 07:23–07:43 UTC. The live dataset shows those planned drafts were created later. This audit did not re-read the Word files.

### African American

Report: 9 Word files read, 7 would be created, FRNJ preserved, MLNJ elicitation held for review.

Live: BMNJ, ETNY, HSNJ, MLNJ, RBNY, and WPNY are drafts. SENJ is published and its length matches the report (60,210). FRNJ is published and was not replaced; the Word file is 52,893 characters and the Sanity body is 25,987. `story-mlnj-elicitation` does not exist.

### Latine

Report: 17 files, 15 would be created, JMWE and MGNJ preserved. JMWE’s report conflict says the published community is African American while the file is in the Latine folder. MGNJ’s report says the existing story has no community and the folder is Latine.

Live: 14 of the create list are drafts. EBNJ is published. JMWE and MGNJ match the preserve decision and are the short Weebly documents, not the Word articles (report lengths 30,184 and 50,138).

### Chinese

Report: 8 files, all would be created, none previously in Sanity.

Live: CSSF, GJSF, JZOK, LLSF, SHOK, SLOK, and WLOK are drafts. JMOK is published. Report language note: Chinese story text is in `zh`, with short English headings kept in the article field.

### Collections

Report planned three drafts and zero story links, with 32 stories waiting and MGNJ skipped because it has no legacy community. Live drafts now exist and are unpublished. No story points at a collection document. Public grouping uses the legacy string, or the built-in fallback when no published collection exists (`lib/content/collections.ts`, `lib/content/get-content.ts`).

### Timeline

Report at 08:08 UTC: 34 source events, 1 already in Sanity (event 01), 33 ready to create, 0 writes. Missing story ids `story-dhnj` and `story-emnj`. Missing people `person-dhnj` and `person-emnj`. Empty images on events 13, 27, and 31.

Live state is a partial apply that this audit did not re-run: event 02 is published, events 03–05 are drafts, events 06–34 are absent. `scripts/migrate-timeline.ts` maps a draft story to the published id by stripping `drafts.` (`storiesBySlug`). WPNY exists only as `drafts.story-wpny`. A reference to `story-wpny` cannot resolve. That matches the stopped import. Re-running `--apply` without a code change can hit the same failure. The current script uses `createIfNotExists` and skips ids that already exist, so events 01–05 would not be overwritten.

### Weebly

`cms/seed/weebly/import-report.json` is an apply report: JMWE skipped as unchanged, MGNJ created unpublished, and timeline event 01 created. That report is older than the current published state of those stories.

## 6. Data Integrity Risks

1. The `published` checkbox does not control the website. EBNJ and JMOK are public even though the flag is false. Figma shows both as coming soon.
2. JMWE is filed as African American in Sanity and on the African American collection page. The Word-import report says that conflicts with the Latine folder. Do not change it without the professor’s confirmation.
3. MGNJ has no community, so it is public and unassigned. Its Weebly body is a small fraction of the Word file.
4. FRNJ’s published text is not the preserved Word article.
5. The public timeline is a hybrid. Editing `events.json` changes events that are not published in Sanity. Editing a draft timeline document does not change the site.
6. `npm run sanity:import` uses `createIfNotExists` (`scripts/sanity-seed.ts`). It will not overwrite existing ids. It can still create empty stub stories from `cms/seed/content.ndjson`, including `story-bmnj6` and `story-dhnj`, because those ids are not in the dataset. Story bodies in that file are empty. Timeline documents in that file are not.
7. People exist for draft stories, so a person can be published while the story is not. FRNJ’s person document is still a draft while the story is published.
8. Collection report on disk does not match the three live drafts.

## 7. Website and UX Issues

Verified on the local server unless noted.

- Participants lists only Sanity-published stories. Draft participants disappear instead of showing Figma’s “Coming soon” state. `PublishedStoryCard` has that state and is not used by the stories pages.
- BMNJ is the readable example on the Figma participants view. Local `/en/stories/bmnj` is 404.
- Header links are Home, Interactive Timeline, Share Your Story, Participants, For Research, and Contact. Figma also shows Our Team and Rightful Participation. “Rightful Participation” appears as a form option in `lib/stories/form-options.ts`, not as a page.
- About, Contact, and Research copy are hardcoded fallbacks. A Studio edit cannot change them today.
- Research transcript button is hidden. Dissertation file `public/research/dissertation.pdf` is missing.
- Share Your Story has no mailto button unless site settings or `NEXT_PUBLIC_CONTACT_EMAIL` is set. Neither published settings nor a non-empty public email were verified in the rendered page.
- New public content waits up to 60 seconds (`revalidate = 60` in `app/(site)/[lang]/layout.tsx`).
- Timeline cards work, and the spiral is still the 3D canvas. On a 390px screen the dock is 370px tall over a 679px canvas. The spiral remains visible above it. This audit did not remeasure the story-detail page against Figma at 1440 and 390.
- Direct requests from this environment to `cdn.sanity.io` failed before an HTTP status. That is not evidence of a broken image. Local timeline images returned 200.
- A full WCAG review was not done. Keyboard card switching was not re-tested in the browser this time.

## 8. Security and Deployment Risks

- **Verified:** `origin` is `https://github.com/rileyqzhang/our-way-of-life-prototype`. The GitHub repo is public. `HEAD` is `81de9a8`, two commits ahead of `origin/main` at `9c95c13`.
- **Verified unpushed:** `9d1b406` dynamic collections, `81de9a8` multi-card timeline.
- **Verified uncommitted:** `cms/desk.ts` (Collections menu), `cms/seed/collections/collection-report.json`, `tsconfig.tsbuildinfo`.
- **Verified:** `.env.local`, `source-documents/`, and the extracted Weebly story JSON files are gitignored. The only tracked env file is `.env.example`, which has the public project id `b7ojtu3l` and empty token fields. No Word documents are tracked. A secret-pattern search did not find a live token; the only match was the placeholder in `README.md`.
- **Verified:** `cms/seed/content.ndjson` (349 KB) and `lib/timeline/events.json` are tracked and contain the timeline text, including quotations. Story records in the ndjson file have empty bodies. Because the repo is public, that timeline text is public. Whether every quotation is already on the Weebly site was not compared event by event.
- **Verified:** production build fails:

```text
./sanity.cli.ts:19:10
Type error: Parameter 'config' implicitly has an 'any' type.
```

`npx tsc --noEmit` reports that same error and no others. Next.js compiles, then stops at typecheck. A Vercel deploy of this project will fail until that parameter is typed.

- **Verified:** write token is not used by the public client (`lib/sanity/client.ts` uses the published perspective and no token). Draft preview needs `SANITY_API_READ_TOKEN`. This audit did not enable draft mode.
- **Reported in README, not re-checked:** Sanity, GitHub, Vercel, and the `.com` domain should be owned by Professor Reyes or a Berkeley account before launch. INC2010471 and ISO confirmation are still named as launch gates. Sanity project members were not listed.

## 9. Prioritized Backlog

### P0 — Build cannot deploy

- Severity: P0
- Evidence: `npx next build` on 24 October 2026; `sanity.cli.ts` line 19
- Current state: typecheck fails, so production build fails
- Expected state: `npx next build` completes
- Recommended action: type the `vite` `config` argument. Do not change dataset or content
- Acceptance criteria: `npx next build` exits 0. The only previous type error is gone

### P0 — Professor cannot edit the spiral in Studio

- Severity: P0
- Evidence: raw query; `lib/content/derive.ts` `mergeTimeline`; `scripts/migrate-timeline.ts` `storiesBySlug`
- Current state: 2 published events, 3 drafts, 29 missing. The website shows local JSON for the missing ones. Draft story ids are rewritten to published ids that may not exist
- Expected state: each of the 34 events exists in Sanity as a draft or published document she can open, without deleting event 01 or rewriting its published body
- Recommended action: change the importer so a draft-only story reference is omitted or points at an id that exists, then dry-run again. Apply only with an explicit `--only` list. Do not publish the new events automatically
- Acceptance criteria: a dry run lists creates only for missing ids. After an approved apply, events 06–34 exist as drafts. The public spiral still shows 34 events in the same order. DHNJ and EMNJ links stay omitted until those stories exist

### P0 — Public stories do not match editorial intent

- Severity: P0
- Evidence: raw query; live URLs; Figma participants text collected in this audit
- Current state: EBNJ and JMOK are public with `published: false`. MGNJ is a short unassigned Weebly story. FRNJ is public and shorter than the preserved Word file. BMNJ, the Figma example, is a draft and 404s
- Expected state: the professor decides which of these six are public. The website hides anything she has not published. The checkbox and the Sanity publish state are not in conflict, or the checkbox is removed so it cannot mislead her
- Recommended action: review the six published documents with her before any unpublish or article replace. Do not paste Word text over FRNJ, JMWE, or MGNJ in this step
- Acceptance criteria: every story visible at `/en/stories` is one she intends to be public. Drafts stay off that list. A written note records the JMWE and MGNJ community decision

### P1 — Collections are drafts, and the sidebar change is not saved in git

- Severity: P1
- Evidence: `cms/desk.ts` uncommitted; raw query; `lib/content/get-content.ts`
- Current state: Studio code can list collections locally. GitHub does not have that menu. The three communities are unpublished drafts. The site uses fallbacks
- Expected state: Collections is in the committed sidebar. The three drafts are published by an editor. New collections can be created and published in Studio and appear within 60 seconds
- Recommended action: commit the sidebar change with the feature commits. She, or someone she has made an editor, publishes the three existing drafts. Do not run `migrate:collections --link-drafts` until the JMWE and MGNJ decisions are made
- Acceptance criteria: signed-in Studio shows Collections, Stories, Timeline events, People, Pages, and Site settings. A new published collection with no stories shows the empty state at `/{lang}/stories/collections/{slug}`

### P1 — No CMS pages or site settings

- Severity: P1
- Evidence: raw query returned no `page` or `siteSettings` documents; `lib/sanity/map.ts` `mapPages` and `mapSettings`
- Current state: header, About, and Contact come from `lib/content/copy.ts`
- Expected state: she can edit site name, navigation, and contact email in Studio, or the README tells her those items are still code
- Recommended action: create `siteSettings` and the page documents only when she wants to edit that copy. Seed them from the current copy. Do not publish over a document she has already edited
- Acceptance criteria: changing the contact email in published Site settings changes the contact and share pages after revalidation, without a code deploy

### P1 — Editor-facing instructions and access

- Severity: P1
- Evidence: `README.md` is a developer setup guide. Sanity members were not listed
- Current state: a nontechnical editor has no click-path for collection, story, timeline, and image publishing. Project ownership transfer is described and not verified
- Expected state: she can log in, publish, and see the result. The Sanity project is not only on a personal developer account
- Recommended action: confirm her role in the Sanity project. Write a one-page Studio guide. Complete the ownership handoff in the README before the `.com` launch
- Acceptance criteria: she creates a draft collection, publishes it, assigns one test story, and sees it on a preview or the local site. The test story is not one of the six public stories unless she chooses it

### P1 — Public repository contains the timeline corpus

- Severity: P1
- Evidence: `gh repo view` visibility public; `lib/timeline/events.json`; `cms/seed/content.ndjson`
- Current state: timeline quotations are in a public repo. Word oral histories are not
- Expected state: the professor agrees that this text is public, or the repo is private until launch
- Recommended action: ask her. Do not delete history in this task
- Acceptance criteria: a written decision to keep the repo public or make it private

### P2 — Research and contact destinations are empty

- Severity: P2
- Evidence: research page has `researchPending` and no research button; `public/research/dissertation.pdf` is missing; contact email is unset in code defaults
- Current state: For Research and the dissertation show pending copy. Share Your Story may have no email button
- Expected state: either the Google Doc, PDF, and email are configured, or the pending copy is the intended launch state
- Recommended action: set `NEXT_PUBLIC_RESEARCH_DOC_URL` and `NEXT_PUBLIC_CONTACT_EMAIL`, or published site settings, when she supplies them. Add the PDF only if it is cleared for the web
- Acceptance criteria: the research page shows the doc button only when the URL is set. The PDF link appears only when the file exists

### P2 — Figma navigation and coming-soon cards differ

- Severity: P2
- Evidence: rendered text from `https://erupt-matte-76008616.figma.site/` in this audit; `components/SiteHeader.tsx`; `components/share-your-story/PublishedStoryCard.tsx` unused by the stories list
- Current state: site header lacks Our Team and Rightful Participation. Unpublished participants are hidden rather than marked coming soon
- Expected state: she chooses whether the launch site follows that Figma frame
- Recommended action: do not restyle during the content handoff. After the public-story list is settled, decide whether draft participants appear as coming soon
- Acceptance criteria: a written decision. If coming soon is required, BMNJ can appear as a card without making the draft article public

### P2 — Seed file can create duplicate participant stubs

- Severity: P2
- Evidence: `cms/seed/content.ndjson` contains `story-bmnj` and `story-bmnj6`; `scripts/sanity-seed.ts` uses `createIfNotExists`
- Current state: running `npm run sanity:import` will not overwrite live stories. It can add empty numbered duplicates and DHNJ/EMNJ stubs
- Expected state: the import command refuses, or the seed matches the canonical codes only
- Recommended action: do not run `sanity:import` against production. Later, point the seed at the current canonical ids
- Acceptance criteria: a dry run of the seed lists no new `story-*6` documents

### P3 — Cache, lint, and loading states

- Severity: P3
- Evidence: `revalidate = 60`; no ESLint config; no `error.tsx` or `loading.tsx`
- Current state: publishes can take a minute. Lint is not part of the workflow. Runtime errors have no designed boundary
- Expected state: she knows about the one-minute delay. Lint exists before the next large UI change
- Recommended action: say the delay in the editor guide. Add ESLint when the build is already green
- Acceptance criteria: the guide states the delay. `next build` still passes after any lint setup

## 10. Recommended Next Five Tasks

1. Make `npx next build` pass by typing `config` in `sanity.cli.ts`. Commit the Collections sidebar. Push `9d1b406`, `81de9a8`, and that sidebar commit after review. Do not force-push.
2. With the professor, publish the three existing collection drafts. Confirm `/en/stories/collections/latine`, `africanAmerican`, and `chinese` still resolve. Leave story references unset until task 3.
3. Review the six public stories with her. Decide the fate of EBNJ, JMOK, MGNJ, JMWE, FRNJ, and SENJ, and the community labels for JMWE and MGNJ. Do not replace article text in that meeting.
4. Fix timeline draft references, dry-run the remaining events, and import only the missing events as drafts. Leave DHNJ and EMNJ unlinked. Do not publish those drafts for her.
5. Confirm her Sanity login can publish. Add a one-page Studio guide for a new collection, a story assignment, a timeline edit, and an image upload, including the 60-second wait. Then decide whether Site settings should be created so contact and navigation are editable without code.

## What to do next

The five highest-value tasks, in order:

1. Fix the production build, commit the Collections menu, and push the unpushed collection and timeline commits.
2. Publish the three collection drafts so the communities she sees in Studio are the ones on the site.
3. Decide which of the six public stories should stay public, and resolve the JMWE and MGNJ classification conflict without overwriting their text.
4. Bring the missing timeline events into Sanity as drafts she can edit, without publishing them and without inventing DHNJ or EMNJ.
5. Give her a Sanity login that can publish, plus a one-page guide, and only then move navigation and contact email into Site settings.
