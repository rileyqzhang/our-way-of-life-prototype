# Adding a story section

Open Studio at `/studio`. In the left menu, choose **Stories**, then open the person, for example **BMNJ**.

Scroll to **Story sections**. Each row shows the life stage, then the section title, such as `Youth and Adolescence (-18) — Realizing the struggle...`.

## Add, reorder, or remove a section

- Choose **Add item** at the bottom of Story sections.
- Drag the handle on the left of a row to change its order. Within one life stage, the website keeps this order.
- Open a row and use its menu to remove that section.

Publish when the list looks right. Nothing appears on the website until you publish.

## Classify the section

Open the section and choose one **Life stage**:

- **Youth and Adolescence (-18)**
- **Adulthood (20-59)**
- **Older Adulthood (60+)**

These are single-choice buttons. Leave them all unselected to place the section in **Other Stories**.

## Write the titles

**Title** is the full line shown above that section on the story page. Write the English title in English. Spanish and Chinese have their own fields. Leave a language blank when that translation is not ready. The list in Studio shows the first of those three that has text, so a Spanish-only title still appears by name.

**Short title** is optional. It is the label in the timeline. Write a few words. If you leave it blank, the website shortens the title to about eight words.

The website capitalizes the first letter and drops one period at the end of a title. You can paste the title as it was spoken.

## Paste from Word

Open **Section text** and click the English field. Copy the paragraphs in Word and paste them there. Bold stays bold. Italic stays italic. Paste Spanish and Chinese into their own fields.

## Import a whole Word document

Use this only for a document laid out like the BMNJ file: an opening quotation, an overview paragraph, yellow group headings, and numbered stories.

From the project folder, preview first:

```bash
npx tsx scripts/import-story-docx.ts "source-documents/african-american/African American Stories/BMNJ6 Stories.docx" bmnj
```

Replace the file path and the code at the end (`bmnj`) for another person. Read the preview. When it is right, run the same command with `--write` at the end.

`--write` needs an Editor token in `.env.local` named `SANITY_API_WRITE_TOKEN`. It updates only the overview, the quotation on the large photo, and the story sections. Photos, collection, and the other fields stay as they are. The previous document is saved as `source-documents/backup-bmnj.json` (the code in the name matches the person).

Group headings in the Word file decide the life stage:

- “Stories of CP from childhood” and “Stories of CP from young adulthood” become Youth and Adolescence
- “Stories of CP from adulthood” becomes Adulthood
- “Stories of CP from later life” becomes Older Adulthood
- Any other group, including the opening civic-participation section, becomes Other Stories

The yellow “Elicitation Document” section is skipped. Notes that say `FOR BM TO CLARIFY` are removed. A timestamp such as `[unintelligible 00:37:08]` becomes `[…]`.

After a successful write, publish is already done. Refresh the story page. On the development site the new text is there on refresh. On the public site, allow about a minute.
