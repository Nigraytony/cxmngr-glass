/**
 * Routes for the project-level Final Cx Report (ASHRAE G0 §7.2.15 + §8.2.5).
 *
 * One report per project, lazily created on first GET. Edits restricted to
 * CxA team members and project/global admins. Lock → 'final' snapshots an
 * immutable Release; only a global admin can unlock back to draft.
 *
 * Mounted under /api/projects/:projectId/final-report (see index.js).
 *
 * PR A — model, routes, data sources, permissions, tests.
 * PR B — frontend Report Builder UI.
 * PR C — PDF generation + Azure Blob storage of Release artifacts.
 */
const express = require('express')
const mongoose = require('mongoose')

const router = express.Router({ mergeParams: true })

const { auth } = require('../middleware/auth')
const { requireObjectIdParam } = require('../middleware/validate')

const Project = require('../models/project')
const FinalReport = require('../models/finalReport')

const { fetchDataSource } = require('../utils/finalReportDataSources')
const { generateFinalReportPdf } = require('../services/finalReportPdfService')
const { generateBlobSasUrl } = require('../utils/blobSas')

// ---------------------------------------------------------------------------
// Identity / permission helpers
//
// Final Report edit rights are intentionally broader than billing actions: any
// CxA team member can refresh data and edit prose. Only global admins can
// unlock a finalized report (rare audit action — undoing a "delivered" report).
// ---------------------------------------------------------------------------

function asString(v) {
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}

function isGlobalAdmin(user) {
  const role = asString(user && user.role).trim().toLowerCase()
  return role === 'globaladmin' || role === 'superadmin'
}

function userMatchesTeamMember(member, user) {
  const userId = asString(user && (user._id || user.id)).trim()
  const userEmail = asString(user && user.email).trim().toLowerCase()
  const memberId = asString(member && (member._id || member.id)).trim()
  const memberEmail = asString(member && member.email).trim().toLowerCase()
  return (
    (userId && memberId && userId === memberId) ||
    (userEmail && memberEmail && userEmail === memberEmail)
  )
}

function isProjectMember(project, user) {
  if (!project || !user) return false
  if (isGlobalAdmin(user)) return true
  const team = Array.isArray(project.team) ? project.team : []
  return team.some((m) => userMatchesTeamMember(m, user))
}

function isProjectAdmin(project, user) {
  if (!project || !user) return false
  if (isGlobalAdmin(user)) return true
  const team = Array.isArray(project.team) ? project.team : []
  return team.some((m) => {
    if (!userMatchesTeamMember(m, user)) return false
    const role = asString(m && m.role).trim().toLowerCase()
    return role === 'admin' || role === 'globaladmin'
  })
}

function isProjectCxA(project, user) {
  if (!project || !user) return false
  const team = Array.isArray(project.team) ? project.team : []
  return team.some((m) => {
    if (!userMatchesTeamMember(m, user)) return false
    // 'CxA' is the canonical role string per src/lists.js. Trim + case-insensitive
    // to be robust against minor input variations.
    const role = asString(m && m.role).trim().toLowerCase()
    return role === 'cxa'
  })
}

/** Edit + refresh + lock. CxA or any admin. */
function canEditFinalReport(user, project) {
  return isProjectCxA(project, user) || isProjectAdmin(project, user)
}

/** Same gate as edit. Kept as a distinct function for future divergence. */
function canLockFinalReport(user, project) {
  return canEditFinalReport(user, project)
}

/** Higher bar — only global admin can reopen a finalized report. */
function canUnlockFinalReport(user) {
  return isGlobalAdmin(user)
}

// ---------------------------------------------------------------------------
// Middleware: load project + enforce membership for any access.
// ---------------------------------------------------------------------------

async function loadProjectAndCheckAccess(req, res, next) {
  try {
    const projectId = asString(req.params.projectId).trim()
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ error: 'Invalid projectId' })
    }
    const project = await Project.findById(projectId)
      .select('team users status deleted commissioning_agent')
      .lean()
    if (!project) return res.status(404).json({ error: 'Project not found' })
    if (!isProjectMember(project, req.user)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    req.finalReportProject = project
    req.finalReportProjectId = projectId
    return next()
  } catch (e) {
    return res.status(500).json({ error: 'Failed to authorize report access' })
  }
}

async function loadOrCreateReport(req, res, next) {
  try {
    const projectId = req.finalReportProjectId
    let report = await FinalReport.findOne({ projectId })
    if (!report) {
      report = FinalReport.buildDefault(projectId)
      await report.save()
    } else {
      // Backfill — Final Reports created before Phase 1 ship without the
      // new default sections (project-description, OPR Coverage, etc).
      // On every GET, compare existing keys vs DEFAULT_SECTIONS and append
      // anything missing. Idempotent and preserves user-customised content.
      const existingKeys = new Set((report.sections || []).map((s) => s.key))
      const missing = (FinalReport.DEFAULT_SECTIONS || []).filter((d) => !existingKeys.has(d.key))
      let changed = false
      if (missing.length) {
        for (const d of missing) {
          report.sections.push({
            key: d.key,
            title: d.title,
            order: d.order,
            type: d.type,
            enabled: true,
            contentHtml: '',
            dataSource: d.type === 'data' ? d.dataSource || null : null,
            dataConfig: {},
            pageBreakBefore: false,
            includeInToc: true,
          })
        }
        changed = true
      }

      // Order repair: Construction Checklist Summary should precede Functional
      // Performance Test Results. Older reports were created with FPT first; flip
      // them, but only when still on that exact legacy default (fpt=130, checklist=140)
      // so an intentional custom ordering is preserved. Idempotent.
      const fpt = (report.sections || []).find((s) => s.key === 'fpt-results')
      const chk = (report.sections || []).find((s) => s.key === 'checklist-summary')
      if (fpt && chk && Number(fpt.order) === 130 && Number(chk.order) === 140) {
        chk.order = 130
        fpt.order = 140
        changed = true
      }

      if (changed) {
        // Keep the stored array in render order so the editor (array order) and the
        // PDF (sorted by `order`) agree, and backfilled sections land in the right spot.
        report.sections.sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
        try { await report.save() } catch (_) { /* best-effort */ }
      }
    }
    req.finalReport = report
    return next()
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load report' })
  }
}

function requireEditAccess(req, res, next) {
  if (!canEditFinalReport(req.user, req.finalReportProject)) {
    return res
      .status(403)
      .json({ error: 'Only CxAs and project admins may edit the Final Report' })
  }
  return next()
}

function requireUnlockedForEdit(req, res, next) {
  if (req.finalReport && req.finalReport.isLocked()) {
    return res.status(409).json({
      error: 'Report is locked — unlock before editing',
      code: 'FINAL_REPORT_LOCKED',
      status: req.finalReport.status,
    })
  }
  return next()
}

// ---------------------------------------------------------------------------
// Serialization — strip internal fields before returning to the client.
// ---------------------------------------------------------------------------

function serializeReport(report, { permissions } = {}) {
  const obj = report.toObject ? report.toObject() : report
  return {
    _id: obj._id,
    projectId: obj.projectId,
    status: obj.status,
    lockedAt: obj.lockedAt,
    lockedBy: obj.lockedBy,
    currentVersion: obj.currentVersion,
    sections: obj.sections || [],
    cover: obj.cover || {},
    releases: (obj.releases || []).map((r) => ({
      version: r.version,
      releasedAt: r.releasedAt,
      releasedBy: r.releasedBy,
      pdfBlobUrl: r.pdfBlobUrl,
      note: r.note,
      // Omit sectionsSnapshot from the list view — clients fetch it per-release.
    })),
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    permissions: permissions || null,
  }
}

function computePermissions(req) {
  return {
    canEdit: canEditFinalReport(req.user, req.finalReportProject),
    canLock: canLockFinalReport(req.user, req.finalReportProject),
    canUnlock: canUnlockFinalReport(req.user),
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

router.use(auth)
router.use(loadProjectAndCheckAccess)

/**
 * GET /api/projects/:projectId/final-report
 * Lazy-creates the report on first access (returns the seeded 11 sections).
 */
router.get('/', loadOrCreateReport, async (req, res) => {
  return res.json(serializeReport(req.finalReport, { permissions: computePermissions(req) }))
})

/**
 * PUT /api/projects/:projectId/final-report
 * Replace the editable fields (sections, cover). Locked reports reject edits.
 * Releases and currentVersion are managed exclusively by lock/unlock.
 */
router.put('/', loadOrCreateReport, requireEditAccess, requireUnlockedForEdit, async (req, res) => {
  try {
    const body = req.body || {}
    const report = req.finalReport

    if (Array.isArray(body.sections)) {
      // Replace wholesale, but validate shape. Sections without a key are dropped.
      const seen = new Set()
      const next = []
      for (const s of body.sections) {
        if (!s || typeof s !== 'object') continue
        const key = asString(s.key).trim()
        if (!key || seen.has(key)) continue
        seen.add(key)
        next.push({
          key,
          title: asString(s.title || key).trim(),
          order: Number.isFinite(s.order) ? Number(s.order) : 999,
          type: s.type === 'data' ? 'data' : 'prose',
          enabled: s.enabled !== false,
          contentHtml: s.type === 'data' ? '' : asString(s.contentHtml || ''),
          dataSource: s.type === 'data' ? asString(s.dataSource || '').trim() || null : null,
          dataConfig: s.dataConfig && typeof s.dataConfig === 'object' ? s.dataConfig : {},
          pageBreakBefore: Boolean(s.pageBreakBefore),
          includeInToc: s.includeInToc !== false,
        })
      }
      report.sections = next
    }

    if (body.cover && typeof body.cover === 'object') {
      const sources = ['commissioning_agent', 'client', 'custom', 'none']
      const logoSource = sources.includes(body.cover.logoSource) ? body.cover.logoSource : 'commissioning_agent'
      report.cover = {
        title: asString(body.cover.title || '').trim(),
        subtitle: asString(body.cover.subtitle || '').trim(),
        logoSource,
        customLogoUrl: body.cover.customLogoUrl || null,
        ownerLogoBlobUrl: body.cover.ownerLogoBlobUrl || null,
        showProjectImage: body.cover.showProjectImage !== false,
      }
    }

    await report.save()
    return res.json(serializeReport(report, { permissions: computePermissions(req) }))
  } catch (e) {
    return res.status(500).json({ error: 'Failed to save report' })
  }
})

/**
 * Manual revision log (FinalReport.revisions[], kind='manual'). The Revisions data
 * section merges these with release-derived rows at render time. Editing is blocked
 * on locked reports, same as section edits.
 *
 * POST   /revisions             — add a manual entry
 * DELETE /revisions/:revisionId — remove a manual entry
 */
router.post('/revisions', loadOrCreateReport, requireEditAccess, requireUnlockedForEdit, async (req, res) => {
  try {
    const report = req.finalReport
    const b = req.body || {}
    const versionLabel = asString(b.versionLabel || '').trim()
    const summary = asString(b.summary || '').trim()
    if (!versionLabel && !summary) return res.status(400).json({ error: 'A version label or summary is required' })
    const d = b.date ? new Date(b.date) : new Date()
    report.revisions.push({
      versionLabel,
      summary,
      reviserName: asString(b.reviserName || '').trim(),
      reviserUserId: req.user._id || req.user.id || null,
      date: Number.isNaN(d.getTime()) ? new Date() : d,
      kind: 'manual',
    })
    await report.save()
    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: 'Failed to add revision' })
  }
})

router.delete('/revisions/:revisionId', loadOrCreateReport, requireEditAccess, requireUnlockedForEdit, async (req, res) => {
  try {
    const report = req.finalReport
    const rid = asString(req.params.revisionId).trim()
    const sub = report.revisions && typeof report.revisions.id === 'function' ? report.revisions.id(rid) : null
    if (!sub) return res.status(404).json({ error: 'Revision not found' })
    report.revisions.pull(rid)
    await report.save()
    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: 'Failed to delete revision' })
  }
})

/**
 * POST /api/projects/:projectId/final-report/sections/:key/refresh
 * Re-pull live data for a single data section. Returns the fresh dataset.
 * Does not persist anything — the data is computed on render.
 */
router.post(
  '/sections/:key/refresh',
  loadOrCreateReport,
  requireEditAccess,
  async (req, res) => {
    try {
      const key = asString(req.params.key).trim()
      const section = (req.finalReport.sections || []).find((s) => s.key === key)
      if (!section) return res.status(404).json({ error: 'Section not found' })
      if (section.type !== 'data' || !section.dataSource) {
        return res.status(400).json({ error: 'Section is not a data section' })
      }
      const data = await fetchDataSource(section.dataSource, {
        projectId: req.finalReportProjectId,
        config: section.dataConfig || {},
      })
      return res.json({ key, dataSource: section.dataSource, data })
    } catch (e) {
      return res.status(500).json({ error: 'Failed to refresh section' })
    }
  },
)

/**
 * POST /api/projects/:projectId/final-report/lock
 * Body: { status: 'in_review' | 'final', note?: string }
 * Transitions status; on 'final' snapshots a Release and bumps currentVersion.
 */
router.post('/lock', loadOrCreateReport, requireEditAccess, async (req, res) => {
  try {
    const next = asString(req.body && req.body.status).trim().toLowerCase()
    if (next !== 'in_review' && next !== 'final') {
      return res.status(400).json({ error: "status must be 'in_review' or 'final'" })
    }

    const report = req.finalReport
    const note = asString((req.body && req.body.note) || '')
    const userId = req.user._id || req.user.id

    if (next === 'final') {
      report.currentVersion = (report.currentVersion || 0) + 1
      report.releases.push({
        version: report.currentVersion,
        releasedAt: new Date(),
        releasedBy: userId,
        pdfBlobUrl: null, // populated by PR C when PDF rendering ships
        sectionsSnapshot: (report.sections || []).map((s) => ({
          key: s.key,
          title: s.title,
          order: s.order,
          type: s.type,
          enabled: s.enabled,
          contentHtml: s.contentHtml,
          dataSource: s.dataSource,
          dataConfig: s.dataConfig,
          pageBreakBefore: s.pageBreakBefore,
          includeInToc: s.includeInToc,
        })),
        note,
      })
    }

    report.status = next
    report.lockedAt = new Date()
    report.lockedBy = userId

    await report.save()

    // Lock-final auto-generates the immutable PDF and persists its blob URL
    // on the just-pushed Release. We do this AFTER the save so the release
    // record exists for the PDF service to find via persistOnReport=true.
    // Failures here don't roll back the lock — the report is still locked,
    // and the user can re-trigger PDF generation via the /pdf endpoint.
    if (next === 'final') {
      try {
        await generateFinalReportPdf(String(report.projectId), { persistOnReport: true })
      } catch (pdfErr) {
        console.error('[final-report] auto-PDF on lock-final failed', pdfErr)
        // Surface a warning in the response so the UI can prompt for manual retry,
        // but still treat the lock itself as successful.
        const refreshed = await req.finalReport.constructor.findOne({ projectId: report.projectId })
        return res.json({
          ...serializeReport(refreshed || report, { permissions: computePermissions(req) }),
          warning: {
            code: pdfErr.code || 'PDF_AUTO_GENERATION_FAILED',
            message: pdfErr.message || 'Locked, but PDF generation failed — retry via Download PDF.',
          },
        })
      }
      // Reload to pick up the pdfBlobUrl the service wrote onto the release.
      const refreshed = await req.finalReport.constructor.findOne({ projectId: report.projectId })
      return res.json(serializeReport(refreshed || report, { permissions: computePermissions(req) }))
    }
    return res.json(serializeReport(report, { permissions: computePermissions(req) }))
  } catch (e) {
    return res.status(500).json({ error: 'Failed to lock report' })
  }
})

/**
 * POST /api/projects/:projectId/final-report/pdf
 * Synchronous PDF generation. Caller waits up to ~90s while we:
 *   1. refresh every enabled data section
 *   2. build the HTML report
 *   3. render via Puppeteer
 *   4. upload to Azure Blob
 *   5. return a short-lived read-SAS URL the browser can download from
 *
 * Anyone with project membership can request a "preview" PDF (the report
 * UI exposes this via the Download PDF toolbar button). The immutable
 * "released" PDF is generated automatically as part of the lock-final
 * transition and stored on the corresponding Release.pdfBlobUrl.
 */
router.post('/pdf', loadOrCreateReport, async (req, res) => {
  // Bump per-request timeout — Puppeteer + a large project can take ~30-60s.
  req.setTimeout(120_000)
  res.setTimeout(120_000)
  try {
    const result = await generateFinalReportPdf(req.finalReportProjectId, { persistOnReport: false })
    // Generate a short-lived read SAS URL the browser can hit directly.
    const sas = await generateBlobSasUrl({
      blobName: result.blobName,
      permissions: 'r',
      expiresInSec: 600,
    })
    return res.json({
      url: sas.url,
      blobUrl: result.blobUrl,
      sizeBytes: result.sizeBytes,
      generatedAt: result.generatedAt,
      expiresAt: sas.expiresAt,
    })
  } catch (e) {
    // Always log the full error (including the underlying Chromium cause) so prod
    // failures are diagnosable from the App Service log stream.
    console.error('[final-report] PDF generation error', e && (e.stack || e), '| cause:', e && e.cause && (e.cause.stack || e.cause.message || e.cause))
    const detail = (e && e.cause && (e.cause.message || String(e.cause))) || (e && e.message) || ''
    if (e && e.status) {
      const body = { error: e.message || 'Failed to generate PDF' }
      if (e.code) body.code = e.code
      if (e.hint) body.hint = e.hint
      if (detail) body.detail = detail
      return res.status(e.status).json(body)
    }
    return res.status(500).json({ error: 'Failed to generate PDF', detail })
  }
})

/**
 * GET /api/projects/:projectId/final-report/releases/:version/pdf
 * Returns a short-lived read SAS URL for an immutable released PDF.
 * The blob URL itself is stored on Release.pdfBlobUrl (set by the
 * lock-final flow) — this endpoint just signs it for download.
 */
router.get('/releases/:version/pdf', loadOrCreateReport, async (req, res) => {
  try {
    const version = Number(req.params.version)
    const release = (req.finalReport.releases || []).find((r) => Number(r.version) === version)
    if (!release) return res.status(404).json({ error: 'Release not found' })
    if (!release.pdfBlobUrl) {
      return res.status(404).json({ error: 'Release has no PDF on file', code: 'RELEASE_PDF_MISSING' })
    }
    // The stored blobUrl is the base form: https://acct.blob.../container/blobName
    // Extract the blobName (everything after the container path) and re-sign.
    const url = new URL(release.pdfBlobUrl)
    const segments = url.pathname.split('/').filter(Boolean)
    // First segment is the container; the rest is the blob name.
    const blobName = segments.slice(1).join('/')
    const sas = await generateBlobSasUrl({ blobName, permissions: 'r', expiresInSec: 600 })
    return res.json({ url: sas.url, expiresAt: sas.expiresAt, version })
  } catch (e) {
    console.error('[final-report] release PDF link error', e)
    return res.status(500).json({ error: 'Failed to sign release PDF' })
  }
})

/**
 * POST /api/projects/:projectId/final-report/unlock
 * Global admin only. Returns the report to draft so editing can resume.
 * Existing releases are preserved (immutable audit trail).
 */
router.post('/unlock', loadOrCreateReport, async (req, res) => {
  try {
    if (!canUnlockFinalReport(req.user)) {
      return res.status(403).json({
        error: 'Only a global administrator may unlock a Final Report',
      })
    }
    const report = req.finalReport
    report.status = 'draft'
    report.lockedAt = null
    report.lockedBy = null
    await report.save()
    return res.json(serializeReport(report, { permissions: computePermissions(req) }))
  } catch (e) {
    return res.status(500).json({ error: 'Failed to unlock report' })
  }
})

// Exported for tests
module.exports = router
module.exports._private = {
  canEditFinalReport,
  canLockFinalReport,
  canUnlockFinalReport,
  isProjectCxA,
  isProjectAdmin,
}
