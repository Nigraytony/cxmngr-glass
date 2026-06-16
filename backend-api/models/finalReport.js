const mongoose = require('mongoose')

/**
 * Final Cx Report — one per project, lazily created on first access.
 *
 * Models ASHRAE Guideline 0-2019 §7.2.15 (Construction Phase Cx Report) and
 * §8.2.5 (final report finalized in the Occupancy & Operations Phase).
 *
 * Lifecycle:
 *   draft → in_review → final
 *
 * `final` is the only state that snapshots a Release record (immutable copy of
 * sections + a generated PDF URL). Unlock by a global admin transitions back to
 * draft but preserves all prior releases for audit and download.
 */

const sectionSubSchema = new mongoose.Schema(
  {
    /** Stable identifier — used in URL params and to look up data providers. */
    key: { type: String, required: true },
    /** Human-readable section title (editable). */
    title: { type: String, required: true },
    /** Render order in the document; lower comes first. */
    order: { type: Number, required: true },
    /** prose = WYSIWYG-edited HTML. data = computed at render time. */
    type: { type: String, enum: ['prose', 'data'], required: true },
    /** Disabled sections render neither in the editor nor the PDF. */
    enabled: { type: Boolean, default: true },
    /** Sanitized HTML body — populated only when type === 'prose'. */
    contentHtml: { type: String, default: '' },
    /** Data-source key (e.g. 'issues', 'opr', 'tasks'). Populated only when type === 'data'. */
    dataSource: { type: String, default: null },
    /** Free-form provider config — filters, sort, column visibility, etc. */
    dataConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
    /** Force a page break before this section in the PDF. */
    pageBreakBefore: { type: Boolean, default: false },
    /** Include this section in the table of contents. */
    includeInToc: { type: Boolean, default: true },
  },
  { _id: true },
)

const releaseSubSchema = new mongoose.Schema(
  {
    /** Monotonically increasing version number, matches currentVersion at lock time. */
    version: { type: Number, required: true },
    /** When the lock transitioned to 'final'. */
    releasedAt: { type: Date, required: true },
    /** User who performed the final lock. */
    releasedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    /** Optional Azure Blob URL where the generated PDF lives. Populated in PR C. */
    pdfBlobUrl: { type: String, default: null },
    /** Frozen deep copy of `sections` at lock time. Never mutated post-release. */
    sectionsSnapshot: { type: [mongoose.Schema.Types.Mixed], default: [] },
    /** Free-text note explaining what changed in this release. */
    note: { type: String, default: '' },
  },
  { _id: true, timestamps: false },
)

const coverSubSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    ownerLogoBlobUrl: { type: String, default: null },
    showProjectImage: { type: Boolean, default: true },
  },
  { _id: false },
)

// Author-visible revision log. Distinct from `releases` (lock snapshots) —
// CxAs traditionally maintain a manual revision table at the front of the
// report ("Revision 1.0 — Prepared for LEED Online Upload — Nigel Gray —
// 2025-11-17"). Manual entries coexist with auto-entries derived from
// release events; the renderer dedupes and sorts by date.
const revisionSubSchema = new mongoose.Schema(
  {
    versionLabel: { type: String, default: '' },
    summary: { type: String, default: '' },
    reviserUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviserName: { type: String, default: '' },
    date: { type: Date, default: Date.now },
    kind: { type: String, enum: ['manual', 'release'], default: 'manual' },
  },
  { _id: true, timestamps: false },
)

// Pointer to a project document (Cx Specs, BoD, Systems Manual, OCx Plan,
// etc.) that lives in the project Documents tab. Surfaced in the report so
// the reader can navigate to the linked doc; the PDF generator (later
// phase) will merge the referenced PDFs as appendices.
const referencedDocSubSchema = new mongoose.Schema(
  {
    docFileId: { type: mongoose.Schema.Types.ObjectId, ref: 'DocFile', required: true },
    label: { type: String, default: '' },
    kind: {
      type: String,
      enum: ['systems_manual', 'bod', 'cx_specs', 'ocx_plan', 'cx_plan', 'other'],
      default: 'other',
    },
  },
  { _id: true, timestamps: false },
)

const finalReportSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      unique: true, // unique implies an index — no separate `index: true` needed
    },
    status: {
      type: String,
      enum: ['draft', 'in_review', 'final'],
      default: 'draft',
      index: true,
    },
    lockedAt: { type: Date, default: null },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    /** 0 until the first 'final' lock; increments per release. */
    currentVersion: { type: Number, default: 0 },
    sections: { type: [sectionSubSchema], default: [] },
    cover: { type: coverSubSchema, default: () => ({}) },
    releases: { type: [releaseSubSchema], default: [] },
    // Manual revision log (author-managed) — see revisionSubSchema docs.
    revisions: { type: [revisionSubSchema], default: [] },
    // Mirror of project.leedTarget at the time the report was last saved.
    // We snapshot here so a release frozen at v4 doesn't suddenly become
    // a v5 report just because the project's target changed.
    leedTarget: {
      type: String,
      enum: ['none', 'v4', 'v4.1', 'v5', 'other', null],
      default: null,
    },
    // External docs referenced from the report — see referencedDocSubSchema.
    referencedDocs: { type: [referencedDocSubSchema], default: [] },
  },
  { timestamps: true },
)

/**
 * Canonical default section blueprint, lifecycle-ordered to track ASHRAE
 * Guideline 0 phases (Predesign §5 → Design §6 → Construction §7 →
 * Occupancy §8) and LEED v4/v4.1/v5 Cx deliverables.
 *
 * Most sections are `data` views over project data already captured
 * elsewhere in the app — the Final Report is a structured render of the
 * commissioning evidence, not a separate data store. The handful of prose
 * sections cover genuinely narrative content (Purpose, Roles, Lessons
 * Learned, Sign-offs) and each ships with a LEED-aware boilerplate
 * template (see src/utils/finalReportTemplates.ts).
 *
 * Adding a new section here will surface for newly-created reports only —
 * existing reports keep whatever the user already has. If migration is
 * needed, run a one-off script that compares saved section keys against
 * this list and inserts missing entries.
 */
finalReportSchema.statics.DEFAULT_SECTIONS = [
  // ---- Front matter -------------------------------------------------------
  { key: 'revisions', title: 'Revisions', type: 'data', dataSource: 'revisions', order: 10 },
  { key: 'purpose', title: 'Purpose', type: 'prose', order: 20 },
  // Renders project.description directly — no editing in the report itself.
  { key: 'project-description', title: 'Project Description', type: 'data', dataSource: 'project-description', order: 30 },
  { key: 'cx-scope-of-work', title: 'Cx Scope of Work', type: 'prose', order: 40 },
  { key: 'commissioned-systems', title: 'Commissioned Systems / Sampling Methodology', type: 'data', dataSource: 'commissioned-systems', order: 50 },
  { key: 'schedule-milestones', title: 'Project Cx Milestones', type: 'data', dataSource: 'tasks', order: 60 },
  { key: 'roles-responsibilities', title: 'Roles and Responsibilities', type: 'prose', order: 70 },
  // ---- Activities (grouped by ASHRAE phase) ------------------------------
  { key: 'activities-by-phase', title: 'Cx Activities Overviews by Phase', type: 'data', dataSource: 'activities-by-phase', order: 80 },
  // ---- OPR verification --------------------------------------------------
  // The single most LEED-auditable section: shows how each OPR item was
  // verified (linked issue / checklist question / FPT step + pass/fail/na
  // status), derived from OprLinkEvaluation records the team built during
  // the project.
  { key: 'opr-coverage', title: 'OPR Coverage', type: 'data', dataSource: 'opr-coverage', order: 90 },
  // ---- Construction execution evidence -----------------------------------
  { key: 'scoped-systems', title: 'Scoped Systems', type: 'data', dataSource: 'scoped-systems', order: 100 },
  { key: 'operating-condition', title: 'Operating Condition of Systems', type: 'data', dataSource: 'equipment', order: 110 },
  { key: 'systems-not-meeting-opr', title: 'Systems/Assemblies Not Meeting OPR', type: 'data', dataSource: 'opr-deviations', order: 120 },
  { key: 'checklist-summary', title: 'Construction Checklist Summary', type: 'data', dataSource: 'checklist-summary', order: 130 },
  { key: 'fpt-results', title: 'Functional Performance Test Results', type: 'data', dataSource: 'fpt-results', order: 140 },
  { key: 'issues-log', title: 'Issues & Resolution Log', type: 'data', dataSource: 'issues', order: 150 },
  { key: 'training-verification', title: 'Training Verification', type: 'data', dataSource: 'training-sessions', order: 160 },
  { key: 'recommendations', title: 'Recommendations for Optimization', type: 'data', dataSource: 'recommendations', order: 170 },
  // ---- Occupancy / closeout ---------------------------------------------
  { key: 'warranty-review', title: '10-Month Warranty Review', type: 'data', dataSource: 'warranty-review', order: 180 },
  { key: 'lessons-learned', title: 'Lessons Learned', type: 'prose', order: 190 },
  { key: 'cx-team-roster', title: 'Cx Team Roster', type: 'data', dataSource: 'team', order: 200 },
  { key: 'transition-ongoing-cx', title: 'Transition to Ongoing Cx Plan', type: 'prose', order: 210 },
  { key: 'sign-offs', title: 'Sign-offs', type: 'prose', order: 220 },
]

/**
 * Build a fresh document populated with the default section list.
 * The caller must save it.
 */
finalReportSchema.statics.buildDefault = function buildDefault(projectId) {
  return new this({
    projectId,
    status: 'draft',
    sections: this.DEFAULT_SECTIONS.map((s) => ({
      key: s.key,
      title: s.title,
      order: s.order,
      type: s.type,
      enabled: true,
      contentHtml: s.type === 'prose' ? '' : '',
      dataSource: s.type === 'data' ? s.dataSource : null,
      dataConfig: {},
      pageBreakBefore: false,
      includeInToc: true,
    })),
  })
}

/** Convenience: is the report currently locked for editing? */
finalReportSchema.methods.isLocked = function isLocked() {
  return this.status === 'in_review' || this.status === 'final'
}

module.exports = mongoose.model('FinalReport', finalReportSchema)
