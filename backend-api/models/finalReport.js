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
  },
  { timestamps: true },
)

/**
 * Canonical default section blueprint, lifecycle-ordered.
 *
 * Pre-design / Design / Construction (ASHRAE G0 §5–§7) → Closeout / Occupancy (§8).
 * Adding a new section here will surface for new projects only — existing reports
 * keep whatever the user already has. Seeded migrations can backfill if needed.
 */
finalReportSchema.statics.DEFAULT_SECTIONS = [
  { key: 'project-charter', title: 'Project Charter & OPR Development', type: 'prose', order: 10 },
  { key: 'opr', title: "Owner's Project Requirements (OPR)", type: 'data', dataSource: 'opr', order: 20 },
  { key: 'basis-of-design', title: 'Basis of Design Summary', type: 'prose', order: 30 },
  { key: 'schedule-milestones', title: 'Cx Schedule & Milestones', type: 'data', dataSource: 'tasks', order: 40 },
  { key: 'activities-performed', title: 'Cx Activities Performed', type: 'data', dataSource: 'activities', order: 50 },
  { key: 'systems-not-meeting-opr', title: 'Systems/Assemblies Not Meeting OPR', type: 'prose', order: 60 },
  { key: 'operating-condition', title: 'Operating Condition of Systems', type: 'data', dataSource: 'equipment', order: 70 },
  { key: 'issues-log', title: 'Issues & Resolution Log', type: 'data', dataSource: 'issues', order: 80 },
  { key: 'lessons-learned', title: 'Lessons Learned', type: 'prose', order: 90 },
  { key: 'cx-team-roster', title: 'Cx Team Roster', type: 'data', dataSource: 'team', order: 100 },
  { key: 'sign-offs', title: 'Sign-offs', type: 'prose', order: 110 },
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
