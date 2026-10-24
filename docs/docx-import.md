# Word document import

Original participant articles live in Google Drive, grouped by community. The importer reads local `.docx` copies. It does not download from Drive and it does not write to Sanity unless you explicitly enable that later.

Put unpublished documents here:

```text
source-documents/latine/
source-documents/african-american/
source-documents/chinese/
```

`source-documents/` is gitignored. Do not commit the Word files or their extracted text.

## African American Stories

Download each file from the Drive link already recorded in `lib/migration/docx-sources.ts` and save it anywhere under `source-documents/african-american/`. Subfolders are included. The importer matches the participant code in the filename, so the name does not have to match the Drive listing exactly. `BMNJ6 Stories.docx` matches BMNJ. A file with no code of its own can sit in a folder named with that code, such as `MLNJ/`.

| Save as | Canonical code |
|---|---|
| `BMNJ6 Stories.docx` | BMNJ |
| `ETNY6 Stories- Fnal.docx` | ETNY |
| `FRNJ6 Stories- Elicitation Final.docx` | FRNJ |
| `HSNJ6 Stories-Final.docx` | HSNJ |
| `RBNY7 stories final.docx` | RBNY |
| `SENJ6 Stories- finalized.docx` | SENJ |
| `WPNY7 Stories-Finalized.docx` | WPNY |
| Every `.docx` from the MLNJ Drive folder | MLNJ |

Trailing numbers are ignored: `FRNJ6` matches the existing `FRNJ` story and does not create a second participant. The published FRNJ article is never replaced by the Word document.

Each Word file becomes one draft Story. Numbered sections stay inside that article. A second file for the same participant, such as the MLNJ elicitation document, stays a separate draft and is left out of the default import.

After reviewing `cms/seed/docx/african-american-report.json`, create only the approved drafts with:

```bash
npx tsx scripts/migrate-docx.ts --apply --only=bmnj,etny,hsnj,mlnj,rbny,senj,wpny
```

That command does not publish the drafts and does not change FRNJ. It refuses to run without `--only`.

## Latine and Chinese stories

The same importer reads these folders:

- `source-documents/latine/`
- `source-documents/chinese-immigrant/`

If a download lands inside `source-documents/african-american/Latine Immigrant Stories/` or `Chinese Immigrant Stories/`, that copy is read too. Community comes from the folder. Codes such as `JMWE23` and `Final_SHOK7.docx` normalize to `JMWE` and `SHOK`. An existing Sanity story, including JMWE and FRNJ, is preserved.

```bash
npm run migrate:docx:latine
npm run migrate:docx:chinese
```

The reports are `cms/seed/docx/latine-report.json` and `cms/seed/docx/chinese-immigrant-report.json`. Import only the codes listed as Create, with `--community=latine` or `--community=chinese` before `--apply`.

## Add another community

1. Create `source-documents/latine/` or `source-documents/chinese/`.
2. Add the Drive file id, original filename, and original participant code to a source list beside `africanAmericanSources` in `lib/migration/docx-sources.ts`.
3. Map only those canonical codes in `lib/migration/communities.ts`, with `collection` set to `latine` or `chinese`.
4. Do not assign anyone who is not in that folder. Do not infer a community from a name, language, photo, or the article text.
5. Run the dry run:

```bash
npm run migrate:docx
npm run migrate:community
```

`cms/seed/docx/african-american-report.json` lists what would happen. `--apply` on the DOCX importer is disabled until that report is approved. Community backfill, when you later run it with `--apply`, changes only an empty `collection` field.

## What a document may contain

The extractor keeps paragraph order, headings, bold, italic, and links. Language labels such as English, Español, and 中文 switch language. They are not translated. Extra headings are reported as separate sections instead of being merged into one story. Embedded images are written under `source-documents/.../extracted/`, which is also gitignored.
