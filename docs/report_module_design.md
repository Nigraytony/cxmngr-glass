# Shared Report Module — Design

Status: proposed (2026-10-15). Companion to the "Field Feedback — October 2026" section in
`CXMA_IMPLEMENTATION_CHECKLIST.md` (shared Report module, Equipment report, list-page reporting,
OPR reporting, Final Report build-out).

## Why

A survey of the codebase (Oct 2026) found **16 report/export implementations across 4 rendering
stacks**, with heavy duplication and drift:

- **Four stacks:** hand-drawn jsPDF, html2canvas page screenshots (Tasks — output is images, not
  searchable text), HTML→DOCX (`@turbodocx/html-to-docx`), and server-side Puppeteer HTML→PDF
  (Final Report).
- **Whole reports duplicated:** the Equipment PDF exists twice (`src/utils/equipmentReport.ts`
  ~783 lines, used only by ActivityEdit; and a ~840-line page-local copy in `EquipmentEdit.vue`
  that skips `pdfBranding`, so the same equipment renders differently depending on where you
  export it). The single-Issue PDF exists twice (`IssuePdfReport.vue` and a ~355-line copy in
  `IssueEdit.vue`).
- **Helpers copy-pasted:** `loadImage`/`mimeToFormat`/`convertDataUrlToJpeg` in 6 files,
  `htmlToText` in 8, `splitText` in 5; pdf-lib attachment merging copied ~10 times (8 of them in
  `ActivityEdit.vue`).
- **Branding utilities exist but are barely used:** `reportTypography.ts` exports a full type
  scale (`SIZES`, `COLORS`, setters) that no report uses beyond `ensureReportFonts` and
  `setColor('text')`; `pdfBranding.ts` header/footer is used by only 3 of 7 jsPDF reports. The
  flagship server-rendered Final Report uses the system font stack and its own colors — the least
  on-brand output in the app.
- **Cover pages and TOCs re-implemented 4×** with 4 different settings shapes; settings persist
  4 different ways (global sessionStorage, per-project localStorage, on the record, server model).
- **Filenames/slugs/delivery differ everywhere** (6+ slug sanitizers, 3 date formats, 4 download
  mechanisms; CSV escaping differs between Issues and Tasks).
- **Column selection** exists only for Issues exports and the Tasks PDF — two unrelated
  implementations. No other list export lets the user pick fields.

### Bugs found during the survey (fix first)

1. **Compact & List issue PDFs render in Times, not IBM Plex.** They call
   `ensureReportFonts(new jsPDF())` — fonts are embedded into a throwaway doc; the doc actually
   drawn never registers the fonts, and jsPDF silently falls back to Times. Fix: embed into the
   real doc. (`IssuePdfReport.vue`)
2. **Final Report options stored but ignored:** `pageBreakBefore` (renderer page-breaks every
   section unconditionally), `dataConfig` (no provider reads it), `cover.showProjectImage`
   (unused in `renderCover`).
3. **Dead code:** `GET /api/activities/:id/report` (legacy pdfkit) + `store.downloadReport` +
   `ActivityEdit.download()`; `IssuePdfReport.generateIssuePdf` exposed but unused.

## Key decision: rendering stack

**Keep client-side jsPDF generation for module reports; keep server-side Puppeteer for the Final
Report.** Rationale:

- The app is moving to an offline-capable Electron shell (`feat/electron-offline-shell`) — client
  generation works offline; moving everything server-side would break that.
- A full HTML→Puppeteer migration of 7 reports is a rewrite; consolidating the jsPDF reports onto
  shared primitives is incremental and each step ships value.
- The Final Report is already server-side, versioned, and blob-stored — it stays, but its CSS
  adopts the shared brand tokens (IBM Plex + `COLORS`/`SIZES`).
- The Tasks PDF migrates from html2canvas screenshots to the shared jsPDF kit so output becomes
  searchable/selectable text.

## Proposed structure

```
src/reports/
  core/
    tokens.ts      # re-export COLORS/SIZES/type-scale from reportTypography; single source
    fonts.ts       # ensureReportFonts / ensureWebReportFontLoaded re-exports
    images.ts      # loadImage, mimeToFormat, convertDataUrlToJpeg, fitImageToHeight
    text.ts        # htmlToText, normalizePdfText, splitText, setZeroCharSpace
    frame.ts       # ReportDoc: owns margins, branded header/footer (pdfBranding), pageNo,
                   # ensureSpace(h), addPage; every report draws inside this frame
    table.ts       # column-table renderer: weighted widths, zebra rows, repeating header
    cover.ts       # shared cover renderer + one CoverSettings shape
    toc.ts         # TOC builder (reserve pages, backfill page numbers)
    merge.ts       # pdf-lib: merge PDF attachments / child reports
    deliver.ts     # one slugger, one date format (YYYY-MM-DD), one download helper
    settings.ts    # ReportSettings types + persistence helpers (see below)
  data/
    columns.ts     # per-entity column definitions (key, label, accessor, width hint)
    csv.ts         # one CSV serializer (BOM, proper escaping)
    xlsx.ts        # one SheetJS serializer
  components/
    ColumnChooser.vue        # extracted from IssuesList, reusable on all lists
    ReportSettingsDialog.vue # shared include-toggles + cover tab (Activity-style)
  definitions/
    issue.ts       # renderIssuePage + detailed/compact/list builders
    equipment.ts   # moves/absorbs src/utils/equipmentReport.ts
    activity.ts    # PDF + DOCX aggregation (single data-aggregation pass)
    oprWorkshop.ts # moves src/utils/oprWorkshopReport.ts
    oprItems.ts    # NEW: OPR item lifecycle report (feedback item)
    tasks.ts       # re-implemented text-based
```

Settings persistence standard:
- **Entity reports** (Activity, Equipment, OPR Workshop): stored on the record (Activity already
  does this via `settings.report`; Equipment has `reportSettings` on the model — use it).
- **List exports** (column picks, include toggles): per-project localStorage key
  `report:{entity}:{projectId}` (the Issues/Tasks pattern).
- Global sessionStorage keys are retired.

## Migration phases

Each phase ships independently; nothing breaks in between.

- **Phase 0 — bugs & dead code** (small): fix the Times-font bug; delete the pdfkit route +
  `downloadReport` + `download()`; remove unused `generateIssuePdf`.
- **Phase 1 — extract core:** create `src/reports/core/*` by lifting the best existing copy of
  each helper; point `equipmentReport.ts`, `IssuePdfReport.vue`, `oprWorkshopReport.ts` at them.
  No visual changes.
- **Phase 2 — kill duplicate reports:** `EquipmentEdit.vue` calls the shared equipment
  definition (delete ~840 local lines; equipment PDFs become consistent everywhere);
  `IssueEdit.vue` calls shared `renderIssuePage` (delete ~355 lines); dedupe the 3× issue payload
  mapping in `IssuesList.vue`.
- **Phase 3 — shared cover/TOC/settings:** one `CoverSettings` shape + `ReportSettingsDialog`;
  migrate Activity, OPR Workshop; re-implement the Tasks PDF text-based on the kit; unify
  filenames/delivery via `deliver.ts`.
- **Phase 4 — list reporting everywhere** (delivers feedback items #1 and #4): `ColumnChooser` +
  CSV/XLSX/List-PDF on Equipment, Activities (currently has no export at all), Tasks, Spaces,
  Systems, OPR Items lists. Equipment List gets its printable report here.
- **Phase 5 — Final Report build-out:** brand the Puppeteer CSS with IBM Plex + tokens; honor
  `pageBreakBefore`, `dataConfig`, `showProjectImage`; section drag-reorder UI; TOC page numbers;
  merge `referencedDocs`; optional DOCX export reusing the activity DOCX path.
- **Phase 6 — OPR report** (feedback item): OPR item lifecycle report as a new definition on the
  kit, plus an OPR data section upgrade in the Final Report.

## Out of scope (for now)

- Replacing SheetJS or jsPDF.
- Server-side rendering of module reports.
- Scheduled/emailed reports (future; the kit's definitions would be the input to that).
