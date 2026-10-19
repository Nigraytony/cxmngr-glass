# Shared Report Module — Design

Status: agreed (2026-10-18; proposed 2026-10-15). Companion to the "Field Feedback — October
2026" section in `CXMA_IMPLEMENTATION_CHECKLIST.md` (shared Report module, Equipment report,
list-page reporting, OPR reporting, Final Report build-out, custom reports).

Decisions locked 2026-10-18 (with Tony):

1. **`ReportDoc` frame class** (`core/frame.ts`) owns the jsPDF doc, margins, branded
   header/footer, page numbering, and `ensureSpace(h)`. Report definitions draw inside the frame
   and never call `doc.addPage()` directly.
2. **Branding becomes universal in Phase 1.** All jsPDF reports adopt the branded header/footer
   when they move onto the frame — an accepted visual change (consistency over strict
   no-visual-change migration).
3. **Report definitions are plain TS modules**, not renderless Vue components. Vue components are
   reserved for UI (settings dialog, column chooser). `IssuePdfReport.vue` becomes
   `definitions/issue.ts` over Phases 1–2.
4. **Tables use `jspdf-autotable`** (new dependency) behind a thin adapter in `core/table.ts`
   (brand styling, frame integration) instead of a hand-rolled table renderer.
5. **Custom reports** (user-built, saved for reuse) are in scope — see "Custom reports" below.
   Staged: saved list-report presets land with Phase 4; a block-based composer is Phase 7.

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
    table.ts       # jspdf-autotable adapter: brand styles, frame margins, repeating header
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

## Custom reports (user-built, saved for reuse)

A saved custom report is **data, not code**: a declarative `ReportDefinition` the engine renders
with the same `core/*` kit. Stored server-side on the project (new backend model + routes), so
definitions sync across devices, are shared with the whole project team, and can be cached by the
offline Electron shell like any other entity.

```
ReportDefinition {
  name, description
  source: module + filters + sort/grouping        // Stage 1: one module per report
  blocks: [cover, summary tiles, entity table (picked columns),
           per-entity detail cards (picked fields), photos, heading/text, TOC]
  branding + page options (orientation, page breaks)
}
```

Staged delivery:

- **Stage 1 — saved presets (lands with Phase 4):** the column picks, filters, sort, and include
  toggles on any list export can be saved under a name and re-run later. Rendered as a
  single-table definition; the builder UI is a save/load control on the existing export dialog.
- **Stage 2 — block composer (Phase 7):** a builder page assembling blocks, including across
  modules. Built-in list reports become pre-made definitions where practical.

Output: PDF always; table blocks also export CSV/XLSX via `data/csv.ts` / `data/xlsx.ts`.
DOCX is out of scope for custom reports (PDF/CSV/XLSX only).

### Section selection, ordering, and inline attachments (added 2026-10-19)

Three requirements that apply to the **built-in entity reports as well as** the custom composer:

1. **Section selection per entity.** Every entity report (Issue, Equipment, Activity, Task, OPR,
   …) lets the user pick which parts are included. Equipment/Activity already have include
   toggles; this becomes a standard capability of `ReportSettingsDialog` (Phase 3) with one
   settings shape across entities.
2. **Section ordering.** The included sections can be reordered, and the report renders in that
   order. Settings therefore store an **ordered list of section keys**, not a bag of booleans —
   `sections: [{ key, enabled }]` supersedes `include: Record<key, boolean>` (with a migration
   that reads the old shape). The dialog gets drag-reorder. This is the same model the composer's
   `blocks` array uses, so entity reports and custom reports share one renderer contract.
3. **Attachments in stated order.** Associated attachments/documents/files are picked up and
   included **at their position in the section order**, not only appended at the end: image
   attachments render as pages at that position; PDF attachments are merged **into** the document
   at that position (`core/merge.ts` grows insert-at-page-index alongside append); other file
   types are listed by name. The same applies to an attachments block in the composer.

Phasing: the ordered-sections settings shape and dialog land in **Phase 3** (it defines the
settings standard anyway); ordered inline attachment merging lands with it in `core/merge.ts`.
The composer (Phase 7) inherits all three for free via its `blocks` array.

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
  each helper; point `equipmentReport.ts`, `IssuePdfReport.vue`, `oprWorkshopReport.ts` at them
  and move them onto the `ReportDoc` frame. Branded header/footer applies to all three (the one
  accepted visual change); layout otherwise unchanged. (Done 2026-10-18 — OPR keeps its own
  cover/TOC page orchestration until Phase 3; issue definitions moved to
  `src/reports/definitions/issue.ts` and `IssuePdfReport.vue` was deleted.)
- **Phase 2 — kill duplicate reports:** `EquipmentEdit.vue` calls the shared equipment
  definition (delete ~840 local lines; equipment PDFs become consistent everywhere);
  `IssueEdit.vue` calls shared `renderIssuePage` (delete ~355 lines); dedupe the 3× issue payload
  mapping in `IssuesList.vue`. Adds `jspdf-autotable` behind `core/table.ts` and converts the
  consolidated table rendering onto it. (Done 2026-10-18 — EquipmentEdit and IssueEdit call the
  shared definitions; `core/table.ts` exists and the Issues List PDF renders on autotable; the
  equipment report's internal tables stay hand-drawn until its Phase 3/4 touch.)
- **Phase 3 — shared cover/TOC/settings:** one `CoverSettings` shape + `ReportSettingsDialog`
  with per-section include toggles **and drag-reorder** (ordered `sections` list replaces the
  `include` boolean bag; old shape migrated); attachments render inline at their position in the
  section order (`core/merge.ts` insert-at-index); migrate Activity, OPR Workshop; re-implement
  the Tasks PDF text-based on the kit; unify filenames/delivery via `deliver.ts`.
- **Phase 4 — list reporting everywhere** (delivers feedback items #1 and #4): `ColumnChooser` +
  CSV/XLSX/List-PDF on Equipment, Activities (currently has no export at all), Tasks, Spaces,
  Systems, OPR Items lists. Equipment List gets its printable report here. Includes **custom
  report Stage 1**: save/load named presets backed by the `ReportDefinition` model.
- **Phase 5 — Final Report build-out:** brand the Puppeteer CSS with IBM Plex + tokens; honor
  `pageBreakBefore`, `dataConfig`, `showProjectImage`; section drag-reorder UI; TOC page numbers;
  merge `referencedDocs`; optional DOCX export reusing the activity DOCX path.
- **Phase 6 — OPR report** (feedback item): OPR item lifecycle report as a new definition on the
  kit, plus an OPR data section upgrade in the Final Report.
- **Phase 7 — custom report composer** (custom reports Stage 2): block-based builder page over
  `ReportDefinition`; cross-module blocks; CSV/XLSX export of table blocks.

## Out of scope (for now)

- Replacing SheetJS or jsPDF.
- Server-side rendering of module reports.
- Scheduled/emailed reports (future; the kit's definitions would be the input to that).
