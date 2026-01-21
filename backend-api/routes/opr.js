const express = require('express')
const mongoose = require('mongoose')

const router = express.Router({ mergeParams: true })

const { auth } = require('../middleware/auth')
const { requireActiveProject } = require('../middleware/subscription')
const { requireNotDisabled } = require('../middleware/killSwitch')
const { rateLimit } = require('../middleware/rateLimit')
const { requireObjectIdParam, requireObjectIdBody, isTruthy } = require('../middleware/validate')

const Project = require('../models/project')
const OprCategory = require('../models/oprCategory')
const OprQuestion = require('../models/oprQuestion')
const OprAnswer = require('../models/oprAnswer')
const OprParticipant = require('../models/oprParticipant')
const OprVote = require('../models/oprVote')
const OprItem = require('../models/oprItem')

const {
  getOprActiveWindowMinutes,
  getOprMaxAnswersPerUserPerQuestion,
  getOprDefaultAnswerWindowMinutes,
  getOprDefaultVotingWindowMinutes,
  getOprTopN,
} = require('../config/opr')

function asString(v) {
  return typeof v === 'string' ? v : (v == null ? '' : String(v))
}

function isGlobalAdmin(user) {
  const role = asString(user && user.role).trim().toLowerCase()
  return role === 'globaladmin' || role === 'superadmin'
}

function isProjectMember(project, user) {
  try {
    if (!project || !user) return false
    if (isGlobalAdmin(user)) return true
    const userId = asString(user._id || user.id).trim()
    const email = asString(user.email).trim().toLowerCase()
    const team = Array.isArray(project.team) ? project.team : []
    const users = Array.isArray(project.users) ? project.users : []
    if (userId && users.some((u) => asString(u).trim() === userId)) return true
    return team.some((m) => {
      const mid = asString(m && (m._id || m.id)).trim()
      const memail = asString(m && m.email).trim().toLowerCase()
      return (userId && mid && mid === userId) || (email && memail && memail === email)
    })
  } catch (_) {
    return false
  }
}

function isProjectAdmin(project, user) {
  try {
    if (!project || !user) return false
    if (isGlobalAdmin(user)) return true
    const userId = asString(user._id || user.id).trim()
    const email = asString(user.email).trim().toLowerCase()
    const team = Array.isArray(project.team) ? project.team : []
    return team.some((m) => {
      const role = asString(m && m.role).trim().toLowerCase()
      const mid = asString(m && (m._id || m.id)).trim()
      const memail = asString(m && m.email).trim().toLowerCase()
      const match = (userId && mid && mid === userId) || (email && memail && memail === email)
      return match && (role === 'admin' || role === 'globaladmin')
    })
  } catch (_) {
    return false
  }
}

async function requireOprProjectAccess(req, res, next) {
  try {
    const projectId = asString(req.params.projectId).trim()
    if (!mongoose.Types.ObjectId.isValid(projectId)) return res.status(400).json({ error: 'Invalid projectId' })
    const project = await Project.findById(projectId)
      .select('team users addons subscriptionTier subscriptionFeatures status deleted')
      .lean()
    if (!project) return res.status(404).json({ error: 'Project not found' })
    if (!isProjectMember(project, req.user)) return res.status(403).json({ error: 'Forbidden' })
    req.oprProject = project
    // The app does not yet have a first-class org model; scope OPR by projectId for tenant safety.
    req.oprOrgId = projectId
    return next()
  } catch (e) {
    return res.status(500).json({ error: 'Failed to authorize OPR access' })
  }
}

function requireOprEnabled(req, res, next) {
  try {
    const project = req.oprProject
    if (isGlobalAdmin(req.user)) return next()
    const enabled = Boolean(project && project.addons && project.addons.oprWorkshop && project.addons.oprWorkshop.enabled)
    if (!enabled) {
      return res.status(402).json({
        error: 'OPR Workshop add-on is required',
        code: 'OPR_ADDON_REQUIRED',
      })
    }
    return next()
  } catch (_) {
    return res.status(402).json({ error: 'OPR Workshop add-on is required', code: 'OPR_ADDON_REQUIRED' })
  }
}

function requireOprAdmin(req, res, next) {
  if (isProjectAdmin(req.oprProject, req.user)) return next()
  return res.status(403).json({ error: 'Forbidden', code: 'OPR_ADMIN_REQUIRED' })
}

function oprRateKey(req) {
  const userId = asString(req.user && (req.user._id || req.user.id)).trim()
  const projectId = asString(req.params && req.params.projectId).trim()
  return `${userId}:${projectId}`
}

function defaultCategories() {
  return [
    'Energy & Sustainability',
    'Thermal Comfort',
    'Indoor Air Quality',
    'Controls & Integration',
    'Systems Reliability',
    'Maintainability',
    'Operations & Training',
    'Resiliency / Redundancy',
    'Future Flexibility',
  ]
}

async function ensureDefaultCategories({ orgId, projectId, userId }) {
  const existing = await OprCategory.find({ orgId, projectId }).select('_id').limit(1).lean()
  if (existing && existing.length) return
  const now = new Date()
  const docs = defaultCategories().map((name, idx) => ({
    orgId,
    projectId,
    name,
    sortOrder: idx,
    active: true,
    createdBy: userId,
    updatedBy: userId,
    createdAt: now,
    updatedAt: now,
  }))
  try {
    await OprCategory.insertMany(docs, { ordered: false })
  } catch (_) {
    // tolerate duplicates in parallel requests
  }
}

async function loadQuestion(req, res, next) {
  try {
    const questionId = asString(req.params.questionId).trim()
    const orgId = req.oprOrgId
    const projectId = asString(req.params.projectId).trim()
    if (!mongoose.Types.ObjectId.isValid(questionId)) return res.status(400).json({ error: 'Invalid questionId' })
    const q = await OprQuestion.findOne({ _id: questionId, orgId, projectId }).lean()
    if (!q) return res.status(404).json({ error: 'Question not found' })
    req.oprQuestion = q
    return next()
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load question' })
  }
}

async function maybeAutoExpireQuestion({ orgId, projectId, question }) {
  if (!question) return question
  const now = new Date()
  if (question.status === 'open' && question.closesAt && now > new Date(question.closesAt)) {
    const updated = await OprQuestion.findOneAndUpdate(
      { _id: question._id, orgId, projectId, status: 'open' },
      { $set: { status: 'closed', closedAt: now, updatedAt: now } },
      { new: true }
    ).lean()
    return updated || { ...question, status: 'closed', closedAt: now }
  }
  if (question.status === 'voting' && question.votingClosesAt && now > new Date(question.votingClosesAt)) {
    // Auto-close voting window by transitioning to finalized so results are visible.
    // We intentionally do NOT persist OPR items here (admin "Close Voting & Finalize" does that).
    const updated = await OprQuestion.findOneAndUpdate(
      {
        _id: question._id,
        orgId,
        projectId,
        status: 'voting',
        votingClosedAt: null,
      },
      {
        $set: {
          status: 'finalized',
          votingClosedAt: now,
          finalizedAt: now,
          updatedAt: now,
          updatedBy: question.updatedBy || question.createdBy || null,
        },
      },
      { new: true }
    ).lean()
    return updated || { ...question, status: 'finalized', votingClosedAt: now, finalizedAt: now }
  }
  return question
}

function validateDurationMinutes(value, fallback) {
  const n = Number.parseInt(String(value), 10)
  if (!Number.isFinite(n)) return fallback
  return Math.max(1, Math.min(240, n))
}

function parseDurationMinutesStrict(value) {
  const n = Number.parseInt(String(value), 10)
  if (!Number.isFinite(n)) return null
  if (n < 1 || n > 240) return null
  return n
}

function computeVoteScore(rank) {
  // rank 1..5 => 5..1 points
  const r = Number(rank)
  if (!Number.isFinite(r)) return 0
  if (r < 1 || r > 5) return 0
  return 6 - r
}

async function computeResults({ orgId, projectId, questionId }) {
  const answers = await OprAnswer.find({ orgId, projectId, questionId }).select('_id text authorUserId createdAt').lean()
  const votes = await OprVote.find({ orgId, projectId, questionId }).select('rankings').lean()

  const byAnswer = new Map()
  for (const a of answers) {
    byAnswer.set(String(a._id), {
      answerId: String(a._id),
      text: a.text,
      authorUserId: a.authorUserId ? String(a.authorUserId) : null,
      createdAt: a.createdAt || null,
      score: 0,
      rankCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      voteCount: 0,
    })
  }

  for (const v of votes) {
    const rankings = Array.isArray(v.rankings) ? v.rankings : []
    for (const r of rankings) {
      const answerId = r && r.answerId ? String(r.answerId) : null
      const rank = r && r.rank ? Number(r.rank) : null
      if (!answerId || !byAnswer.has(answerId)) continue
      const item = byAnswer.get(answerId)
      const pts = computeVoteScore(rank)
      item.score += pts
      item.voteCount += 1
      if (rank >= 1 && rank <= 5) item.rankCounts[String(rank)] = (item.rankCounts[String(rank)] || 0) + 1
    }
  }

  const results = Array.from(byAnswer.values())
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    // tie-breakers: more #1 votes, then #2, etc.
    for (const k of ['1', '2', '3', '4', '5']) {
      const diff = (b.rankCounts[k] || 0) - (a.rankCounts[k] || 0)
      if (diff !== 0) return diff
    }
    // final tie-breaker: earlier creation wins (stable ordering)
    const at = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return at - bt
  })

  return results.map((r, idx) => ({ ...r, rank: idx + 1 }))
}

// Base middleware: auth + kill switch + subscription active + project access + add-on gate
router.use(auth, requireNotDisabled('opr'), requireActiveProject, requireOprProjectAccess, requireOprEnabled)

// Stable ordering: sortOrder then name
router.get('/categories', async (req, res) => {
  try {
    const orgId = req.oprOrgId
    const projectId = asString(req.params.projectId).trim()
    await ensureDefaultCategories({ orgId, projectId, userId: req.user._id })
    const rows = await OprCategory.find({ orgId, projectId, active: true })
      .select('_id name sortOrder active')
      .sort({ sortOrder: 1, name: 1 })
      .lean()
    return res.json(rows.map((c) => ({ id: String(c._id), name: c.name, sortOrder: c.sortOrder, active: Boolean(c.active) })))
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load categories' })
  }
})

// List questions for this project (stable ordering by createdAt asc).
router.get('/questions', async (req, res) => {
  try {
    const orgId = req.oprOrgId
    const projectId = asString(req.params.projectId).trim()
    const rows = await OprQuestion.find({ orgId, projectId })
      .select('_id categoryId prompt answerWindowMinutes status openedAt closesAt closedAt votingOpenedAt votingClosesAt votingClosedAt finalizedAt createdAt updatedAt')
      .sort({ createdAt: 1, _id: 1 })
      .lean()
    return res.json(rows.map((q) => ({
      id: String(q._id),
      categoryId: q.categoryId ? String(q.categoryId) : null,
      prompt: q.prompt,
      answerWindowMinutes: typeof q.answerWindowMinutes === 'number' ? q.answerWindowMinutes : null,
      status: q.status,
      openedAt: q.openedAt || null,
      closesAt: q.closesAt || null,
      closedAt: q.closedAt || null,
      votingOpenedAt: q.votingOpenedAt || null,
      votingClosesAt: q.votingClosesAt || null,
      votingClosedAt: q.votingClosedAt || null,
      finalizedAt: q.finalizedAt || null,
      createdAt: q.createdAt || null,
      updatedAt: q.updatedAt || null,
    })))
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load questions' })
  }
})

router.get('/active', async (req, res) => {
  try {
    const orgId = req.oprOrgId
    const projectId = asString(req.params.projectId).trim()
    // Return the current (most recently updated) session. Closed/finalized sessions remain visible.
    const q = await OprQuestion.findOne({ orgId, projectId, status: { $in: ['open', 'closed', 'voting', 'finalized'] } })
      .sort({ updatedAt: -1 })
      .lean()
    if (!q) return res.json({ active: null })
    const maybe = await maybeAutoExpireQuestion({ orgId, projectId, question: q })
    return res.json({ active: maybe ? { ...maybe, id: String(maybe._id) } : null })
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load active session' })
  }
})

// Create a draft question for a category.
router.post('/questions', requireObjectIdBody('categoryId'), async (req, res) => {
  try {
    const orgId = req.oprOrgId
    const projectId = asString(req.params.projectId).trim()
    const categoryId = String(req.body.categoryId)
    const prompt = asString(req.body.prompt).trim()
    const answerWindowMinutesRaw = req.body.answerWindowMinutes
    if (!prompt) return res.status(400).json({ error: 'prompt is required' })
    if (prompt.length > 2000) return res.status(400).json({ error: 'prompt is too long' })
    const cat = await OprCategory.findOne({ _id: categoryId, orgId, projectId, active: true }).select('_id').lean()
    if (!cat) return res.status(404).json({ error: 'Category not found' })

    let answerWindowMinutes = getOprDefaultAnswerWindowMinutes()
    if (typeof answerWindowMinutesRaw !== 'undefined') {
      const parsed = parseDurationMinutesStrict(answerWindowMinutesRaw)
      if (parsed === null) return res.status(400).json({ error: 'Invalid answerWindowMinutes' })
      answerWindowMinutes = parsed
    }

    const doc = await OprQuestion.create({
      orgId,
      projectId,
      categoryId,
      prompt,
      answerWindowMinutes,
      status: 'draft',
      createdBy: req.user._id,
      updatedBy: req.user._id,
    })
    return res.status(201).json({ id: String(doc._id) })
  } catch (e) {
    return res.status(500).json({ error: 'Failed to create question' })
  }
})

router.patch('/questions/:questionId', requireObjectIdParam('questionId'), loadQuestion, requireOprAdmin, async (req, res) => {
  try {
    const orgId = req.oprOrgId
    const projectId = asString(req.params.projectId).trim()
    const q = req.oprQuestion
    const now = new Date()

    const updates = {}

    if (typeof req.body.prompt !== 'undefined') {
      const prompt = asString(req.body.prompt).trim()
      if (!prompt) return res.status(400).json({ error: 'prompt is required' })
      if (prompt.length > 2000) return res.status(400).json({ error: 'prompt is too long' })
      updates.prompt = prompt
    }

    if (typeof req.body.categoryId !== 'undefined') {
      const categoryId = String(req.body.categoryId || '')
      if (!mongoose.Types.ObjectId.isValid(categoryId)) return res.status(400).json({ error: 'Invalid categoryId' })
      const cat = await OprCategory.findOne({ _id: categoryId, orgId, projectId, active: true }).select('_id').lean()
      if (!cat) return res.status(404).json({ error: 'Category not found' })
      updates.categoryId = categoryId
    }

    if (typeof req.body.answerWindowMinutes !== 'undefined') {
      const parsed = parseDurationMinutesStrict(req.body.answerWindowMinutes)
      if (parsed === null) return res.status(400).json({ error: 'Invalid answerWindowMinutes' })
      updates.answerWindowMinutes = parsed
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'No changes provided' })
    }

    const updated = await OprQuestion.findOneAndUpdate(
      { _id: q._id, orgId, projectId },
      { $set: { ...updates, updatedBy: req.user._id, updatedAt: now } },
      { new: true }
    ).lean()

    if (!updated) return res.status(404).json({ error: 'Question not found' })
    return res.json({
      ok: true,
      question: {
        id: String(updated._id),
        categoryId: updated.categoryId ? String(updated.categoryId) : null,
        prompt: updated.prompt,
        answerWindowMinutes: typeof updated.answerWindowMinutes === 'number' ? updated.answerWindowMinutes : null,
        status: updated.status,
        openedAt: updated.openedAt || null,
        closesAt: updated.closesAt || null,
        closedAt: updated.closedAt || null,
        votingOpenedAt: updated.votingOpenedAt || null,
        votingClosesAt: updated.votingClosesAt || null,
        votingClosedAt: updated.votingClosedAt || null,
        finalizedAt: updated.finalizedAt || null,
        createdAt: updated.createdAt || null,
        updatedAt: updated.updatedAt || null,
      },
    })
  } catch (e) {
    return res.status(500).json({ error: 'Failed to update question' })
  }
})

router.delete('/questions/:questionId', requireObjectIdParam('questionId'), loadQuestion, requireOprAdmin, async (req, res) => {
  try {
    const orgId = req.oprOrgId
    const projectId = asString(req.params.projectId).trim()
    const q = req.oprQuestion
    const questionId = q._id

    // Delete dependents first to avoid orphan data.
    await Promise.all([
      OprAnswer.deleteMany({ orgId, projectId, questionId }),
      OprVote.deleteMany({ orgId, projectId, questionId }),
      OprParticipant.deleteMany({ orgId, projectId, questionId }),
      OprItem.deleteMany({ orgId, projectId, questionId }),
    ])

    await OprQuestion.deleteOne({ _id: questionId, orgId, projectId })
    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: 'Failed to delete question' })
  }
})

router.post('/questions/:questionId/open', requireObjectIdParam('questionId'), loadQuestion, requireOprAdmin, async (req, res) => {
  try {
    const orgId = req.oprOrgId
    const projectId = asString(req.params.projectId).trim()
    const q = req.oprQuestion
    if (q.status !== 'draft' && q.status !== 'closed') {
      return res.status(409).json({ error: 'Question cannot be opened from this state', code: 'OPR_INVALID_STATE' })
    }
    const defaultMinutes = typeof q.answerWindowMinutes === 'number' ? validateDurationMinutes(q.answerWindowMinutes, getOprDefaultAnswerWindowMinutes()) : getOprDefaultAnswerWindowMinutes()
    const durationMinutes = validateDurationMinutes(req.body.durationMinutes, defaultMinutes)
    const now = new Date()
    const closesAt = new Date(now.getTime() + durationMinutes * 60_000)

    await OprQuestion.updateOne(
      { _id: q._id, orgId, projectId },
      {
        $set: {
          status: 'open',
          openedAt: now,
          closesAt,
          closedAt: null,
          votingOpenedAt: null,
          votingClosesAt: null,
          votingClosedAt: null,
          finalizedAt: null,
          updatedBy: req.user._id,
          updatedAt: now,
        },
      }
    )
    return res.json({ ok: true, openedAt: now, closesAt })
  } catch (e) {
    // Unique active question constraint
    if (e && (e.code === 11000 || /E11000/.test(String(e.message || '')))) {
      return res.status(409).json({ error: 'An OPR session is already active', code: 'OPR_ALREADY_ACTIVE' })
    }
    return res.status(500).json({ error: 'Failed to open question' })
  }
})

router.post('/questions/:questionId/close', requireObjectIdParam('questionId'), loadQuestion, requireOprAdmin, async (req, res) => {
  try {
    const orgId = req.oprOrgId
    const projectId = asString(req.params.projectId).trim()
    const q = req.oprQuestion
    const now = new Date()
    await OprQuestion.updateOne(
      { _id: q._id, orgId, projectId },
      { $set: { status: 'closed', closedAt: now, updatedBy: req.user._id, updatedAt: now } }
    )
    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: 'Failed to close question' })
  }
})

router.post('/questions/:questionId/open-voting', requireObjectIdParam('questionId'), loadQuestion, requireOprAdmin, async (req, res) => {
  try {
    const orgId = req.oprOrgId
    const projectId = asString(req.params.projectId).trim()
    let q = req.oprQuestion
    q = await maybeAutoExpireQuestion({ orgId, projectId, question: q })
    if (q.status !== 'closed') return res.status(409).json({ error: 'Question must be closed before voting', code: 'OPR_NOT_CLOSED' })
    const durationMinutes = validateDurationMinutes(req.body.durationMinutes, getOprDefaultVotingWindowMinutes())
    const now = new Date()
    const votingClosesAt = new Date(now.getTime() + durationMinutes * 60_000)
    await OprQuestion.updateOne(
      { _id: q._id, orgId, projectId },
      {
        $set: {
          status: 'voting',
          votingOpenedAt: now,
          votingClosesAt,
          votingClosedAt: null,
          updatedBy: req.user._id,
          updatedAt: now,
        },
      }
    )
    return res.json({ ok: true, votingOpenedAt: now, votingClosesAt })
  } catch (e) {
    if (e && (e.code === 11000 || /E11000/.test(String(e.message || '')))) {
      return res.status(409).json({ error: 'An OPR session is already active', code: 'OPR_ALREADY_ACTIVE' })
    }
    return res.status(500).json({ error: 'Failed to open voting' })
  }
})

router.post('/questions/:questionId/close-voting', requireObjectIdParam('questionId'), loadQuestion, requireOprAdmin, async (req, res) => {
  try {
    const orgId = req.oprOrgId
    const projectId = asString(req.params.projectId).trim()
    let q = req.oprQuestion
    q = await maybeAutoExpireQuestion({ orgId, projectId, question: q })
    if (q.status !== 'voting') return res.status(409).json({ error: 'Voting is not open', code: 'OPR_VOTING_NOT_OPEN' })

    const now = new Date()
    const results = await computeResults({ orgId, projectId, questionId: q._id })
    const topN = getOprTopN()
    const top = results.slice(0, topN)

    // Archive previous items for the category; keep history.
    await OprItem.updateMany(
      { orgId, projectId, categoryId: q.categoryId, status: 'active' },
      { $set: { status: 'archived', updatedBy: req.user._id, updatedAt: now } }
    )

    const items = top.map((r) => ({
      orgId,
      projectId,
      categoryId: q.categoryId,
      questionId: q._id,
      sourceAnswerId: r.answerId,
      text: r.text,
      score: r.score,
      rank: r.rank,
      status: 'active',
      createdBy: req.user._id,
      updatedBy: req.user._id,
      createdAt: now,
      updatedAt: now,
    }))
    if (items.length) {
      await OprItem.insertMany(items, { ordered: true })
    }

    await OprQuestion.updateOne(
      { _id: q._id, orgId, projectId },
      {
        $set: {
          status: 'finalized',
          votingClosedAt: now,
          finalizedAt: now,
          updatedBy: req.user._id,
          updatedAt: now,
        },
      }
    )

    return res.json({ ok: true, topCount: items.length })
  } catch (e) {
    return res.status(500).json({ error: 'Failed to finalize voting' })
  }
})

// Presence: join + heartbeat
router.post('/questions/:questionId/join', requireObjectIdParam('questionId'), loadQuestion, async (req, res) => {
  try {
    const orgId = req.oprOrgId
    const projectId = asString(req.params.projectId).trim()
    const questionId = req.oprQuestion._id
    const now = new Date()
    await OprParticipant.findOneAndUpdate(
      { orgId, projectId, questionId, userId: req.user._id },
      { $set: { lastSeenAt: now }, $setOnInsert: { joinedAt: now } },
      { upsert: true }
    )
    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: 'Failed to join session' })
  }
})

router.post('/questions/:questionId/heartbeat', requireObjectIdParam('questionId'), loadQuestion, async (req, res) => {
  try {
    const orgId = req.oprOrgId
    const projectId = asString(req.params.projectId).trim()
    const questionId = req.oprQuestion._id
    const now = new Date()
    await OprParticipant.updateOne(
      { orgId, projectId, questionId, userId: req.user._id },
      { $set: { lastSeenAt: now, updatedAt: now } }
    )
    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: 'Failed to update presence' })
  }
})

function isActiveParticipant({ participant, now }) {
  const mins = getOprActiveWindowMinutes()
  const cutoff = new Date(now.getTime() - mins * 60_000)
  if (!participant || !participant.lastSeenAt) return false
  return new Date(participant.lastSeenAt) >= cutoff
}

// Answers (rate limit per user/project)
router.post(
  '/questions/:questionId/answers',
  requireObjectIdParam('questionId'),
  loadQuestion,
  rateLimit({ windowMs: 60_000, max: 30, keyPrefix: 'opr:answers', keyFn: oprRateKey }),
  async (req, res) => {
    try {
      const orgId = req.oprOrgId
      const projectId = asString(req.params.projectId).trim()
      let q = req.oprQuestion
      q = await maybeAutoExpireQuestion({ orgId, projectId, question: q })
      if (q.status !== 'open') return res.status(409).json({ error: 'Question is not open for answers', code: 'OPR_NOT_OPEN' })
      const now = new Date()
      if (q.closesAt && now > new Date(q.closesAt)) return res.status(409).json({ error: 'Answer window expired', code: 'OPR_EXPIRED' })

      const text = asString(req.body.text).trim()
      if (!text) return res.status(400).json({ error: 'text is required' })
      if (text.length > 4000) return res.status(400).json({ error: 'text is too long' })

      const max = getOprMaxAnswersPerUserPerQuestion()
      const count = await OprAnswer.countDocuments({ orgId, projectId, questionId: q._id, authorUserId: req.user._id })
      if (count >= max) {
        return res.status(429).json({ error: `You have reached the max of ${max} answers for this question`, code: 'OPR_MAX_ANSWERS_REACHED' })
      }

      // Allocate a stable sequence number for this question (used for tags).
      const seqDoc = await OprQuestion.findOneAndUpdate(
        { _id: q._id, orgId, projectId },
        { $inc: { lastAnswerSeq: 1 }, $set: { updatedAt: now } },
        { new: true }
      ).select('lastAnswerSeq').lean()
      const seq = seqDoc && Number.isFinite(seqDoc.lastAnswerSeq) ? Number(seqDoc.lastAnswerSeq) : null

      const payload = { orgId, projectId, questionId: q._id, authorUserId: req.user._id, text }
      if (Number.isFinite(seq) && seq > 0) payload.seq = seq

      const doc = await OprAnswer.create(payload)
      return res.status(201).json({ id: String(doc._id) })
    } catch (e) {
      return res.status(500).json({ error: 'Failed to submit answer' })
    }
  }
)

router.get('/questions/:questionId/answers', requireObjectIdParam('questionId'), loadQuestion, async (req, res) => {
  try {
    const orgId = req.oprOrgId
    const projectId = asString(req.params.projectId).trim()
    let q = req.oprQuestion
    q = await maybeAutoExpireQuestion({ orgId, projectId, question: q })

    const admin = isProjectAdmin(req.oprProject, req.user)
    if (q.status === 'open' && !admin) {
      return res.status(403).json({ error: 'Answers are not visible yet', code: 'OPR_ANSWERS_HIDDEN' })
    }

    const includeMerged = admin && isTruthy(req.query.includeMerged)

    // Backfill missing seq values (older data) using createdAt ordering, then ensure question counter stays at max seq.
    // Note: after introducing seq, older docs may have seq missing (no field) rather than seq:null.
    const anyMissingSeq = await OprAnswer.exists({
      orgId,
      projectId,
      questionId: q._id,
      $or: [{ seq: { $exists: false } }, { seq: null }],
    })
    if (anyMissingSeq) {
      const all = await OprAnswer.find({ orgId, projectId, questionId: q._id })
        .select('_id seq createdAt')
        .sort({ createdAt: 1, _id: 1 })
        .lean()
      const used = new Set()
      let next = 1
      const ops = []
      let maxSeq = 0
      for (const a of all) {
        const has = Number.isFinite(a.seq) && a.seq > 0 && !used.has(String(a.seq))
        let seq = has ? Number(a.seq) : null
        if (!seq) {
          while (used.has(String(next))) next += 1
          seq = next
          next += 1
          ops.push({
            updateOne: {
              filter: {
                _id: a._id,
                orgId,
                projectId,
                questionId: q._id,
                $or: [{ seq: { $exists: false } }, { seq: null }],
              },
              update: { $set: { seq } },
            },
          })
        }
        used.add(String(seq))
        if (seq > maxSeq) maxSeq = seq
      }
      if (ops.length) {
        try {
          await OprAnswer.bulkWrite(ops, { ordered: false })
        } catch (_) {
          // tolerate parallel backfills
        }
      }
      if (maxSeq > 0) {
        await OprQuestion.updateOne(
          { _id: q._id, orgId, projectId, lastAnswerSeq: { $lt: maxSeq } },
          { $set: { lastAnswerSeq: maxSeq } }
        )
      }
    }

    const query = { orgId, projectId, questionId: q._id }
    if (!includeMerged) query.mergedIntoAnswerId = null

    const rows = await OprAnswer.find(query)
      .select('_id text authorUserId seq mergedIntoAnswerId mergedFromAnswerIds createdAt updatedAt')
      .sort({ seq: 1, createdAt: 1, _id: 1 })
      .lean()
    return res.json(rows.map((a) => ({
      id: String(a._id),
      text: a.text,
      authorUserId: a.authorUserId ? String(a.authorUserId) : null,
      seq: Number.isFinite(a.seq) ? Number(a.seq) : null,
      mergedIntoAnswerId: a.mergedIntoAnswerId ? String(a.mergedIntoAnswerId) : null,
      mergedFromAnswerIds: Array.isArray(a.mergedFromAnswerIds) ? a.mergedFromAnswerIds.map((x) => String(x)) : [],
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    })))
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load answers' })
  }
})

router.post(
  '/questions/:questionId/answers/merge',
  requireObjectIdParam('questionId'),
  loadQuestion,
  requireOprAdmin,
  async (req, res) => {
    try {
      const orgId = req.oprOrgId
      const projectId = asString(req.params.projectId).trim()
      const q = req.oprQuestion
      if (q.status !== 'closed') {
        return res.status(409).json({ error: 'Answers can only be merged after responses are closed', code: 'OPR_INVALID_STATE' })
      }

      const hasVotes = await OprVote.exists({ orgId, projectId, questionId: q._id })
      if (hasVotes) {
        return res.status(409).json({ error: 'Cannot merge answers after voting has started', code: 'OPR_VOTES_EXIST' })
      }

      const answerIds = Array.isArray(req.body.answerIds) ? req.body.answerIds.map((x) => String(x)) : []
      const mergedText = asString(req.body.mergedText).trim()
      if (answerIds.length < 2) return res.status(400).json({ error: 'Must select at least 2 answers to merge' })
      const uniqueIds = Array.from(new Set(answerIds)).filter((id) => mongoose.Types.ObjectId.isValid(id))
      if (uniqueIds.length < 2) return res.status(400).json({ error: 'Invalid answerIds' })
      if (!mergedText) return res.status(400).json({ error: 'mergedText is required' })
      if (mergedText.length > 8000) return res.status(400).json({ error: 'mergedText is too long' })

      const answers = await OprAnswer.find({
        orgId,
        projectId,
        questionId: q._id,
        _id: { $in: uniqueIds },
        mergedIntoAnswerId: null,
      })
        .select('_id seq createdAt text mergeOriginalText mergedFromAnswerIds')
        .sort({ seq: 1, createdAt: 1, _id: 1 })
        .lean()
      if (!answers || answers.length !== uniqueIds.length) {
        return res.status(400).json({ error: 'All answers must belong to this question and not already be merged', code: 'OPR_MERGE_INVALID' })
      }

      // Canonical answer is the earliest by seq (stable tag order).
      const canonical = answers[0]
      const canonicalId = String(canonical._id)
      const mergedIds = answers.slice(1).map((a) => String(a._id))
      const now = new Date()

      const nextMergedFrom = Array.from(
        new Set([...(canonical.mergedFromAnswerIds || []).map((x) => String(x)), ...mergedIds])
      ).filter((id) => id !== canonicalId)

      const canonicalUpdate = {
        text: mergedText,
        mergedFromAnswerIds: nextMergedFrom,
        mergedAt: now,
        mergedBy: req.user._id,
        updatedAt: now,
      }
      if (!canonical.mergeOriginalText) canonicalUpdate.mergeOriginalText = canonical.text

      await OprAnswer.updateOne({ _id: canonical._id, orgId, projectId, questionId: q._id }, { $set: canonicalUpdate })
      await OprAnswer.updateMany(
        { orgId, projectId, questionId: q._id, _id: { $in: mergedIds } },
        { $set: { mergedIntoAnswerId: canonical._id, mergedAt: now, mergedBy: req.user._id, updatedAt: now } }
      )

      return res.json({ ok: true, canonicalId })
    } catch (e) {
      return res.status(500).json({ error: 'Failed to merge answers' })
    }
  }
)

router.post(
  '/questions/:questionId/answers/:answerId/unmerge',
  requireObjectIdParam('questionId'),
  requireObjectIdParam('answerId'),
  loadQuestion,
  requireOprAdmin,
  async (req, res) => {
    try {
      const orgId = req.oprOrgId
      const projectId = asString(req.params.projectId).trim()
      const q = req.oprQuestion
      if (q.status !== 'closed') {
        return res.status(409).json({ error: 'Answers can only be unmerged while responses are closed', code: 'OPR_INVALID_STATE' })
      }

      const hasVotes = await OprVote.exists({ orgId, projectId, questionId: q._id })
      if (hasVotes) {
        return res.status(409).json({ error: 'Cannot unmerge answers after voting has started', code: 'OPR_VOTES_EXIST' })
      }

      const canonicalId = asString(req.params.answerId).trim()
      const canonical = await OprAnswer.findOne({ _id: canonicalId, orgId, projectId, questionId: q._id, mergedIntoAnswerId: null })
        .select('_id mergeOriginalText mergedFromAnswerIds')
        .lean()
      if (!canonical) return res.status(404).json({ error: 'Answer not found' })
      const mergedFrom = Array.isArray(canonical.mergedFromAnswerIds) ? canonical.mergedFromAnswerIds.map((x) => String(x)) : []
      if (!mergedFrom.length) return res.status(409).json({ error: 'Answer is not merged', code: 'OPR_NOT_MERGED' })
      if (!canonical.mergeOriginalText) return res.status(409).json({ error: 'Cannot unmerge: original text is missing', code: 'OPR_UNMERGE_FAILED' })

      const now = new Date()
      await OprAnswer.updateOne(
        { _id: canonical._id, orgId, projectId, questionId: q._id },
        { $set: { text: canonical.mergeOriginalText, mergedFromAnswerIds: [], updatedAt: now }, $unset: { mergeOriginalText: 1, mergedAt: 1, mergedBy: 1 } }
      )

      await OprAnswer.updateMany(
        { orgId, projectId, questionId: q._id, _id: { $in: mergedFrom }, mergedIntoAnswerId: canonical._id },
        { $set: { mergedIntoAnswerId: null, updatedAt: now }, $unset: { mergedAt: 1, mergedBy: 1 } }
      )

      return res.json({ ok: true })
    } catch (e) {
      return res.status(500).json({ error: 'Failed to unmerge answers' })
    }
  }
)

// Voting: must be an active participant (lastSeenAt within ACTIVE_WINDOW_MINUTES).
router.post(
  '/questions/:questionId/votes',
  requireObjectIdParam('questionId'),
  loadQuestion,
  rateLimit({ windowMs: 60_000, max: 30, keyPrefix: 'opr:votes', keyFn: oprRateKey }),
  async (req, res) => {
    try {
      const orgId = req.oprOrgId
      const projectId = asString(req.params.projectId).trim()
      let q = req.oprQuestion
      q = await maybeAutoExpireQuestion({ orgId, projectId, question: q })
      if (q.status !== 'voting') return res.status(409).json({ error: 'Voting is not open', code: 'OPR_VOTING_NOT_OPEN' })
      const now = new Date()
      if (q.votingClosesAt && now > new Date(q.votingClosesAt)) return res.status(409).json({ error: 'Voting window expired', code: 'OPR_EXPIRED' })

      const participant = await OprParticipant.findOne({ orgId, projectId, questionId: q._id, userId: req.user._id }).select('lastSeenAt').lean()
      if (!isActiveParticipant({ participant, now })) {
        return res.status(403).json({ error: 'You must be actively in the session to vote', code: 'OPR_NOT_IN_SESSION' })
      }

      const rankings = Array.isArray(req.body.rankings) ? req.body.rankings : []
      if (rankings.length !== 5) return res.status(400).json({ error: 'Must submit exactly 5 ranked answers', code: 'OPR_VOTE_INVALID' })

      const seenAnswerIds = new Set()
      const seenRanks = new Set()
      const normalized = []
      for (const r of rankings) {
        const answerId = r && r.answerId ? String(r.answerId) : null
        const rank = r && r.rank ? Number(r.rank) : null
        if (!answerId || !mongoose.Types.ObjectId.isValid(answerId)) {
          return res.status(400).json({ error: 'Invalid answerId', code: 'OPR_VOTE_INVALID' })
        }
        if (!Number.isFinite(rank) || rank < 1 || rank > 5) {
          return res.status(400).json({ error: 'Invalid rank', code: 'OPR_VOTE_INVALID' })
        }
        if (seenAnswerIds.has(answerId) || seenRanks.has(String(rank))) {
          return res.status(400).json({ error: 'Answers and ranks must be unique', code: 'OPR_VOTE_INVALID' })
        }
        seenAnswerIds.add(answerId)
        seenRanks.add(String(rank))
        normalized.push({ answerId, rank })
      }

      // Ensure all answers belong to this question and are not merged away.
      const answerDocs = await OprAnswer.find({
        orgId,
        projectId,
        questionId: q._id,
        _id: { $in: Array.from(seenAnswerIds) },
        mergedIntoAnswerId: null,
      })
        .select('_id')
        .lean()
      if (!answerDocs || answerDocs.length !== 5) {
        return res.status(400).json({ error: 'All ranked answers must belong to this question', code: 'OPR_VOTE_INVALID' })
      }

      await OprVote.findOneAndUpdate(
        { orgId, projectId, questionId: q._id, voterUserId: req.user._id },
        { $set: { rankings: normalized, updatedAt: now }, $setOnInsert: { createdAt: now } },
        { upsert: true, new: true }
      )
      return res.json({ ok: true })
    } catch (e) {
      return res.status(500).json({ error: 'Failed to submit vote' })
    }
  }
)

router.get('/questions/:questionId/results', requireObjectIdParam('questionId'), loadQuestion, async (req, res) => {
  try {
    const orgId = req.oprOrgId
    const projectId = asString(req.params.projectId).trim()
    let q = req.oprQuestion
    q = await maybeAutoExpireQuestion({ orgId, projectId, question: q })
    const admin = isProjectAdmin(req.oprProject, req.user)
    if (q.status !== 'finalized' && !admin) {
      return res.status(403).json({ error: 'Results are not available yet', code: 'OPR_RESULTS_HIDDEN' })
    }
    const results = await computeResults({ orgId, projectId, questionId: q._id })
    return res.json({ results })
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load results' })
  }
})

router.get('/items', async (req, res) => {
  try {
    const orgId = req.oprOrgId
    const projectId = asString(req.params.projectId).trim()
    const categoryId = req.query.categoryId ? String(req.query.categoryId) : null
    if (categoryId && !mongoose.Types.ObjectId.isValid(categoryId)) return res.status(400).json({ error: 'Invalid categoryId' })
    const idsRaw = req.query.ids
    const idsList = idsRaw
      ? String(idsRaw)
        .split(',')
        .map((s) => String(s || '').trim())
        .filter(Boolean)
      : []
    if (idsList.length && idsList.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ error: 'Invalid ids' })
    }
    const includeArchived = isTruthy(req.query.includeArchived)
    const filter = { orgId, projectId }
    if (idsList.length) filter._id = { $in: idsList }
    if (categoryId) filter.categoryId = categoryId
    if (!includeArchived) filter.status = 'active'
    const rows = await OprItem.find(filter)
      .select('_id categoryId questionId sourceAnswerId text score rank status createdAt updatedAt')
      .sort({ categoryId: 1, rank: 1 })
      .lean()
    return res.json(rows.map((i) => ({
      id: String(i._id),
      categoryId: i.categoryId ? String(i.categoryId) : null,
      questionId: i.questionId ? String(i.questionId) : null,
      sourceAnswerId: i.sourceAnswerId ? String(i.sourceAnswerId) : null,
      text: i.text,
      score: i.score,
      rank: i.rank,
      status: i.status,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    })))
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load OPR items' })
  }
})

module.exports = router
