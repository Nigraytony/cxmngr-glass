# Issues Batch Reports & Export Dialog Redesign

Source: third Claude Desktop review (October 2026), provided by Tony as
`cxma-issues-batch-reports-redesign-prompt.md` with mockups
(`issues-compact-mockup.pdf` = Issue Sheets cards; Batch-Log landscape table;
Batch-Columns export dialog). This file holds the plan + delivery status; the
original prompt text lives with Tony's attachments.

## Scope (from the prompt)

- **Step 0 — date handling** (GATED: migration plan + before/after samples for
  issues #1/#13/#20 need Tony's OK before running): `dateFound`/`dueDate`/
  `closedDate` are date-only; store as `YYYY-MM-DD` (or UTC midnight never
  shifted); ONE shared format helper everywhere (list UI, Issue Detail, all
  batch PDFs, CSV/Excel, Word); timestamps stay timestamps in a project
  timezone (new setting, default America/New_York); overdue = open AND due <
  today in project TZ; tests in UTC + US-Eastern.
- **Issues Log** (landscape): summary row (open count, red overdue tile,
  open-by-priority stacked bar, open-by-responsible with red Unassigned),
  plain-words filter line, default columns #/Equipment/Issue(+gray summary
  line)/Priority chip/Responsible short/Due/Status("Overdue Nd" red), sort
  priority→due with closed last, repeated headers, no row splits, pale-red
  tint for unassigned/no-due, same-condition grouping (checklist question id
  else normalized title), optional group-by with heading rows.
- **Issue Sheets** (portrait cards, 3–4/page, never split): priority-colored
  top border, number+title, chips (priority/status/overdue/Life safety/From
  checklist: tag PFC · Sec N · Qn), Condition:/Action: clamped ~3 lines, meta
  line, first photo ~150px thumb + "+N more", filter scope in header,
  "one file per responsible party (zip)" option, omit empty fields.
- **Full Detail**: cover (summary row + compact table w/ page numbers) + the
  single-issue renderer per issue. (Largely done in the Issue redesign Step 5;
  cover summary row + page-number column still to add.)
- **Data (Excel/CSV)**: full text, real date cells, display labels, frozen
  header + autofilter + widths.
- **Export dialog** replaces "Choose columns": report picker (4 radio cards),
  options row (group-by, closed-last, summary block, zip-per-party), column
  groups with plain labels (Number/Title always on; never internal fields),
  presets (OAC log / Punch list / Everything), width meter for the Log,
  remembered per project per report type, button label follows the choice.
- **Schema (GATED)**: checklist-sourced issues get structured source fields +
  clean titles (one-time parse of the "Equipment: … Section: … Question: …"
  dumps — show parsed results for #4–#12, #15–#19 before saving);
  Issue.summary (≤90 chars); strip activity metadata from descriptions via QA
  flag, not auto-edit.
- **Batch QA panel** (reuse, never blocks): unassigned, no due date, overdue
  no-response (+30-day count), possible duplicates, over-long/activity-name
  titles, metadata/checklist dumps in descriptions, closed w/o outcome.
- **Issues list UI**: Export… button (replaces Downloads) opening the dialog
  with scope; row checkboxes + select-all-matching; overdue chip; company
  short names; drop the "Title:" card label.

## Delivery status

- 2026-10-26: **Issue Sheets** shipped as the Compact replacement
  (definitions/issue/sheets.ts) — cards per the mockup from the light list +
  per-issue photo fetch; From-checklist chip uses origin/title heuristics
  until the structured source fields land. **Table report quick fixes**:
  display-label headers, minimum column widths (no mid-word breaks),
  date-only values formatted via the new shared core/dates.ts helper
  (read-time TZ fix). Full Issues Log redesign (summary tiles, filter line,
  grouping) still pending.
- 2026-10-26 (second slice): **Issues Log** shipped (definitions/issue/log.ts:
  summary band with open count / red overdue tile / priority stacked bar /
  responsible counts with red Unassigned, filter line, mockup columns with
  bold-title + gray summary-line Issue cell, chips, pale-red tint for
  unassigned/no-due, group-by, no row splits, repeated headers).
  **Export dialog** shipped (components/issues/IssueExportDialog.vue): report
  picker, options, grouped columns + presets + width warning, remembered per
  project; new Export N… button on the Issues list dispatches Log / Sheets /
  Full Detail / Data (CSV + Excel via the existing exporters). The legacy
  Downloads menu remains alongside until the dialog is field-validated.
  **Step 0 migration script** delivered as
  backend-api/scripts/migrate_issue_dates.js — DRY-RUN by default, prints
  before/after for every value and explicitly for issues #1/#13/#20,
  normalizes to YYYY-MM-DD (UTC-midnight → date part; real timestamps → the
  --tz calendar date, default America/New_York). GATE: Tony reviews the
  dry-run output before anyone runs --apply.
- 2026-10-27 (third slice, field feedback): **full filtered set in every
  export** — the list fetch is server-paginated, so exports used to cover
  only the visible page. fetchAllFilteredIssues (IssuesList.vue) walks every
  page with the same server filter params, then runs the same client-side
  filter pipeline (applyListFilters, extracted from the filteredIssues
  computed) over the result; every export path (dialog, legacy Downloads
  menu, CSV/Excel) and the Export button's count now use it. **Summary band
  everywhere** — the Issues Log's analytic tiles (open count, red overdue,
  priority stacked bar, by-responsible) extracted into
  definitions/issue/summaryBand.ts and drawn atop the Issue Sheets deck and
  the Full Detail cover (both on by default; the dialog's "Summary block"
  checkbox now shows for all three PDF reports).
- 2026-10-27 (fourth slice): **Data export upgrade**
  (definitions/issue/data.ts): Excel gets typed date cells (local-midnight
  Dates via core/dates — no TZ shift; m/d/yyyy formats), display-label
  headers (shared labels.ts, also used by the legacy list PDF), a frozen
  header row (SheetJS CE can't write panes, so the pane XML is injected
  into the finished zip via jszip — now a direct dependency; falls back to
  unfrozen on any surprise), an autofilter, and content-fitted widths; CSV
  gets labels + full plain text. **Full Detail cover Page column**:
  drawTable gained an onCellDrawn hook; the cover's Page cells are recorded
  while empty and stamped once every sheet's start page is known.
- Pending: run the date migration (gated on dry-run review),
  checklist-issue cleanup (gated), batch QA panel, remaining list-page UI
  (row checkboxes, overdue chip, removing the legacy Downloads menu),
  per-party zip for Sheets, Issue.summary field, project timezone setting.
