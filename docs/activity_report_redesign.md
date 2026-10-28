# Activity Report Redesign

Source: Claude Desktop review of the GDC Pulaski Site Visit #3 report (October 2026),
provided by Tony as a redesign prompt. The original spec is reproduced verbatim below,
followed by the implementation plan agreed in Claude Code.

---

# Redesign the Activity Report (cxma reporting module)

## Context

cxma is a commissioning (Cx) management app. Each **Activity** (e.g. "Cx Meeting/Site Visit - 3") has tabs: Info (name, type, status, dates, location, rich-text description), Actions (sub-records of work, e.g. "Review of Chillers"), Photos, Issues, OPR, Comments, Attachments, Equipment, and Logs. The Activity page has "Download PDF" / "Download Word" buttons that generate a report.

I'm attaching two files:

1. **`current-report.pdf`** — what the app generates today for GDC Pulaski State Prison, Site Visit #3 (55 pages, ~20 MB).
2. **`mockup.pdf`** — a 6-page redesign of the same report. This is the target. Match its structure, hierarchy and content rules. Exact pixel styling is secondary, but keep the overall look: white page, near-black text, one green accent (EMCx), amber/red only for issue severity, IBM Plex Sans + IBM Plex Mono for equipment tags.

The report's readers are the owner (GDC), the design team, and contractors. They need to know in two minutes: what was found, what was decided, who owes what, and by when. The current report buries that under equipment boilerplate.

## Before you write code

1. Find the code that generates the Activity report (PDF and Word). Map out: how data is fetched, how sections are assembled, what rendering library is used, and how equipment sub-reports are included.
2. Find the data models for Activity, Action, Issue, Photo, Equipment, checklists (PFC), functional tests (FPT), Attachments and Logs.
3. Give me a short written plan: what changes in the data model, what changes in the report generator, what new UI fields are needed, and in what order you'll do it. **Wait for my OK before making schema changes or migrations.**

## Problems in the current report to fix

- **Bloat.** ~48 of 55 pages are per-equipment spec sheets, component lists and *blank* FPT tables. By default these do not belong in a site visit report. Replace them with one equipment status matrix. Move full equipment detail to an optional appendix, controlled by a report setting. Never print FPT forms that have no recorded results.
- **No executive summary, no action items, no attendee list.**
- **Inconsistent issue scope.** The Issues tab shows 2 issues, but the report prints 6, because it also pulls in checklist-sourced issues on linked equipment. Define one rule: the report includes all open issues on equipment in this activity's scope, plus issues linked directly to the activity. State that rule in a one-line note under the section heading, and make the tab and report agree (or label both clearly).
- **Issues lack severity, responsible party and due date.** Checklist-generated issues (#15–17) have no recommendation.
- **Photos have no captions** and are not linked to equipment or issues. The photo grid leaves an empty first cell.
- **The cover photo prints sideways.** Apply EXIF orientation before placing any image. Also downscale and compress photos (about 1600 px long edge, JPEG ~80%). A 20 MB report is too heavy to email.
- **Pagination.** Page numbers restart in every section ("Actions 1", "Equipment 1", "CH-1 Report 1"). Use one continuous "Page X of Y" across the whole document. The table of contents needs page numbers or should be dropped.
- **Header/footer.** Every page needs a running header (project, activity, visit date) and a footer (report ID, revision, issue date, page X of Y). Today the footer shows only the generation date.
- **Typos and formatting** pass straight through from data ("onconcrete", "Serial No::"). Don't try to auto-correct, but fix the double colon (label rendering adds a colon to a label that already has one).

## Target report structure (see mockup)

Each section should be its own renderer/component so other modules can reuse them later.

1. **Cover + summary (page 1)**
   - Owner logo/name (left), CxA logo/name (right).
   - Eyebrow: "Commissioning Site Visit Report · SV-03" (report type + a short report ID derived from the activity).
   - Title: project name. Subtitle: visit number, full date, time range, location.
   - One hero photo, correctly oriented, with a caption. The user picks it with a "cover photo" flag on a photo, falling back to the first photo.
   - Metadata strip: project no., prepared by, Cx phase, revision + issue date.
   - KPI tiles: equipment reviewed, open issues (with high-severity count), reviews completed (x/y), action items.
   - "Summary of findings": 3–5 numbered points. This is a new editable rich-text field on the Activity, separate from the meeting notes. If it's empty, leave the section out. Don't auto-generate it.
2. **Meeting minutes + action items**
   - Minutes grouped by session. Each session is a two-column row: left = session name, time, location/participants; right = bullet points. Today these sessions are H3 headings inside the free-text description. Either parse that structure or, better, add an optional structured "sessions" list to the activity. Propose which in your plan.
   - Decisions are bolded ("**Decision:**"). Cross-references to issues/actions ("→ Issues #2, #3", "→ A-3") appear in the accent color.
   - **Action items table**: ID (A-1…), action, owner, due, reference (issue # or "Obs."). This is a new entity. See the data model section.
3. **Issues log**
   - Summary line: counts by severity and by source.
   - Sort by severity (High → Medium → Low), then by number.
   - Each issue is one row: number + severity chip + status | tag · title, description, "Fix:" recommendation, meta line (source, date raised, responsible party, due) | linked photo thumbnail if one exists.
   - Collapse duplicates: when several issues have identical descriptions (e.g. the same missing gauge on three pumps), print the full text once and "Same condition as #15" for the rest.
   - Observations (non-deficiencies) appear in a shaded box after the issues.
4. **Equipment status matrix**
   - One table: tag, equipment + key rating, make/model, PFC progress bar (completed/total items), FPT progress (completed/total, or "—" if none defined), open issue count (colored by highest severity).
   - "Remaining PFC items by trade": group unchecked checklist items by checklist section/trade (Mechanical, Controls, Electrical) with counts.
5. **Photo log**
   - Two-column grid. Each photo gets a figure number (continuing from the cover photo), an equipment tag chip, an issue chip if linked, and a one-line caption.
   - Show photos flagged "include in report" (default: those linked to issues first, then others), up to a page. The full set goes in an appendix.
6. **Attendance, appendices, revision, sign-off**
   - Attendees in two columns: ● present / ○ distribution only, with name, company and role.
   - Appendix list: A sign-in sheet, B equipment PFCs (optional), C full photo set, each with page counts.
   - Revision table (rev, date, description, by) and two signature lines (prepared by / reviewed by).

## Data model additions (propose; confirm with me before migrating)

- **Issue:** `severity` (high/medium/low), `responsibleParty`, `dueDate` or `dueCondition` (free text such as "Before startup"), and require a recommendation when an issue is generated from a checklist answer.
- **ActionItem** (new, child of Activity): id/sequence (A-1…), description, owner (company or person), due date or condition, status, optional links to issues.
- **Photo:** `caption`, `equipmentTags[]`, `issueIds[]`, `includeInReport` (bool), `isCover` (bool). Captions should be editable from the Photos tab.
- **Activity:** `summary` (rich text), `attendees[]` (name, company, role, present: bool — allow import from a previous activity's list), `revision` (number + history entries), `reportId` (e.g. SV-03), `nextVisitDate`.
- **Report settings** (per activity or per template): include equipment appendix (default off), include blank FPT forms (default off), include full photo appendix (default on), max photos in photo log.

## Pre-issue QA panel (app UI only, never printed)

When the user clicks Download, show a QA panel listing data conflicts before generating. The mockup shows these as a dashed box on page 4 for illustration only. In the real app they belong in the UI, not the PDF. Start with these checks:

- A checklist item is answered "Yes/done" but an open issue exists on the same equipment for the same topic (e.g. "Insulation intact" ✓ while an insulation-damage issue is open).
- FPT expected values that don't match the equipment's own attributes (capacity, RLA/FLA, efficiency). The current chiller FPT expects 500/625 tons and 520/650 A, but the nameplate is 700 tons, 608 RLA.
- Equipment attributes that disagree with component values on the same unit (e.g. CT-1 fan motor 15 hp vs 30/40 hp, basin heater 12 kW vs 36 kW, 480 V vs 460 V).
- Identical serial numbers, shop orders or job numbers on different equipment.
- Issues missing a recommendation, severity, or responsible party.
- Photos with no caption, or photos missing from the report because no tag or issue is linked.

The user can dismiss a warning or jump to the record to fix it. Generating the report is never blocked.

## Rendering rules

- US Letter, portrait, ~0.6–0.75 in margins. Body text 13–14 px equivalent, tables ≥12 px, nothing smaller than 11.5 px.
- Repeating table header rows when a table crosses a page break. Don't split an issue row or photo + caption across pages.
- Equipment tags in monospace. Severity chips: High = red text on pale red, Medium = amber on pale amber, Low = gray. Every color pair must stay readable in grayscale print.
- Generate PDF and Word from the same section model so they never drift.
- Target size for a report like this one: under ~4 MB.

## Acceptance criteria

Regenerate the Pulaski Site Visit #3 report and check:

- [ ] Core report is ~6 pages; equipment detail appears only when the appendix setting is on.
- [ ] Cover photo is upright; all photos have captions and tags.
- [ ] Continuous "Page X of Y" and a running header/footer on every page.
- [ ] Issue count is identical between the Issues tab and the report, and the scope rule is stated in the report.
- [ ] Action items table renders with owners and due conditions.
- [ ] Equipment matrix shows correct PFC counts (e.g. CH-1 19/27, CH-2 23/27, CT-1 24/46, HWP-1 25/28, SCHWP-1 26/28).
- [ ] QA panel surfaces at least the conflicts listed above for this activity.
- [ ] Existing activities without the new fields still generate a sensible report: missing sections are omitted, never printed empty.
- [ ] PDF file size is under ~4 MB.

Work in small, reviewable steps. After each step, regenerate the sample report and tell me what changed.

---

# Implementation plan (agreed with Tony, 2026-10-22)

## Reconnaissance findings

- Generator: `downloadActivityPdf()` in `src/pages/activities/ActivityEdit.vue` (~1,100 lines)
  builds separate jsPDF docs per section (main, issues, actions, attachments, equipment list,
  one full equipment PDF per unit via `generateEquipmentPdf`) and merges with pdf-lib — which
  is why page numbers restart per section. Word export (`src/utils/activityReportDocx.ts`) is a
  parallel hand-maintained implementation.
- Already in the data model (the spec assumed these were missing):
  `Issue.severity` (Comment/Critical/Low/Medium/High), `Issue.dueDate` (free string — can hold
  "Before startup"), `Issue.assignedTo` (responsible party), `Issue.recommendation` (optional);
  `Activity.attendees[]` (name/company/email/role/signedIn); `Activity.settings` bucket (report
  settings live at `settings.report`); photo subdocs already carry `caption` (unused by UI/report).
- The existing `Action` entity means "work performed", not "work owed" — ActionItem is new.

## Locked decisions (2026-10-22)

1. **ActionItem = new collection** (projectId + activityId scoped, like Action): sequence (A-1…),
   description, owner, due date/condition, status, issue links. Queryable project-wide later.
2. **Sessions = structured list + fallback parser**: optional `sessions[]` on Activity with its own
   editor; legacy activities fall back to parsing H3 blocks out of `descriptionHtml`.
3. **US Letter everywhere**: the kit (`ReportDoc`) and all raw jsPDF call sites switched from A4.
4. Severity mapping for chips: Critical+High → High (red), Medium → amber, Low → gray,
   Comment → Observation (shaded box, not a deficiency).

## Stages

- **Stage 0 — no-schema quick wins (DONE 2026-10-22)**: `loadPhoto()` in `core/images.ts`
  (EXIF orientation via browser decode + downscale to 1600px + JPEG 0.8) used by the shared
  cover, equipment photos and image attachments; US Letter everywhere; "Serial No::" double-colon
  fix (`cleanLabel` strips trailing colons from user-entered attribute keys); blank FPT forms
  skipped by default (`fptHasResults` filter + `includeBlankFpt` option, default false).
- **Stage 1 — section model**: `src/reports/definitions/activity/` — one module per section
  (cover+summary, minutes+action items, issues log, equipment matrix, photo log,
  attendance/appendices/sign-off). Each section builds a view-model consumed by BOTH the jsPDF
  renderer and the docx renderer so PDF and Word can't drift. `downloadActivityPdf`/`Docx`
  replaced; continuous "Page X of Y" stamped post-merge via pdf-lib (same technique as the
  Final Report). Equipment detail → optional Appendix B (default off). Issue scope rule:
  open issues on equipment in the activity's scope + issues linked directly to the activity,
  stated in a note under the section heading; the Issues tab filters by the same rule.
  Needs the mockup.pdf for layout fidelity.
- **Stage 2 — schema additions** (approved direction; implement with Stage 1/3 as needed):
  Activity `summary`, `reportId`, `revision[]`, `nextVisitDate`, `sessions[]`; ActionItem
  collection; photo subdoc `equipmentTags[]`, `issueIds[]`, `includeInReport`, `isCover`;
  require recommendation when a checklist answer generates an issue. All optional — old
  activities render sensibly with sections omitted.
- **Stage 3 — UI**: Photos tab caption/tag/cover/include editing; Summary field; Action Items
  editor; revision block; attendees present/distribution toggle; new report settings
  (equipment appendix off, blank FPT off, photo appendix on, max photos in log).
- **Stage 4 — QA panel**: pre-download modal with the six conflict checks; dismissable,
  never blocking, never printed.
- **2026-10-28 — QA panel decoupled from generation** (Tony field feedback: the
  pre-download modal read as a gate blocking the report). It is now its own
  workflow: a "Pre-issue QA" button beside Report Settings on the Activity page
  runs the checks on demand (review-only modal, `show-proceed=false`; a toast
  when nothing is found); Download PDF/Word never run QA and never wait on it.
  Also fixed the check-#1 topic matcher to whole words (plural-tolerant) — the
  substring test made "discharge" match charge and "voltage" match tag,
  producing 33 findings on a 20-issue project (tests/unit/activityQa.test.ts).
