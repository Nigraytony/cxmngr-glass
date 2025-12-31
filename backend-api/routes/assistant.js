const express = require('express')
const mongoose = require('mongoose')
const router = express.Router()

const { auth } = require('../middleware/auth')
const { requireFeature } = require('../middleware/planGuard')
const { requireActiveProject } = require('../middleware/subscription')
const { requireNotDisabled } = require('../middleware/killSwitch')
const { rateLimit } = require('../middleware/rateLimit')
const { requireObjectIdQuery, requireObjectIdParam } = require('../middleware/validate')
const Project = require('../models/project')
const AssistantChecklist = require('../models/assistantChecklist')
const AssistantChatMessage = require('../models/assistantChatMessage')
const AssistantArticle = require('../models/assistantArticle')
const { getAssistantChecklistTemplateForProjectType } = require('../config/assistantChecklists')
const { getAssistantDocsForProjectType } = require('../config/assistantDocs')
const { getAssistantArticleSeeds, normalizeSlug } = require('../config/assistantArticles')

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

function computeProgress(items) {
  const list = Array.isArray(items) ? items : []
  const total = list.length
  const completed = list.filter((i) => i && i.completed === true).length
  const percent = total ? Math.round((completed / total) * 100) : 0
  return { total, completed, percent }
}

function isSubscriptionActive(project) {
  if (!project) return false
  if (project.isActive === true) return true
  const allowed = ['active', 'trialing', 'past_due']
  const status = asString(project.stripeSubscriptionStatus).trim().toLowerCase()
  return status ? allowed.includes(status) : false
}

function getProjectType(project) {
  if (!project) return ''
  return asString(project.project_type || project.type || '').trim()
}

async function ensureAssistantArticlesSeeded() {
  const count = await AssistantArticle.countDocuments({})
  if (count > 0) return
  const seeds = getAssistantArticleSeeds()
  if (!seeds.length) return
  await AssistantArticle.insertMany(seeds, { ordered: false })
}

async function requireAssistantProjectAccess(req, res, next) {
  try {
    const projectId = asString(req.query.projectId).trim()
    if (!mongoose.Types.ObjectId.isValid(projectId)) return res.status(400).json({ error: 'Invalid projectId' })
    const project = await Project.findById(projectId).select('team users project_type type isActive stripeSubscriptionStatus').lean()
    if (!project) return res.status(404).json({ error: 'Project not found' })
    if (!isProjectMember(project, req.user)) return res.status(403).json({ error: 'Forbidden' })
    req.assistantProject = project
    return next()
  } catch (e) {
    return res.status(500).json({ error: 'Failed to authorize assistant access' })
  }
}

// Public (auth'd) Assistant articles, scoped by project access.
router.get(
  '/articles',
  auth,
  requireNotDisabled('assistant'),
  requireObjectIdQuery('projectId'),
  requireActiveProject,
  requireAssistantProjectAccess,
  rateLimit({ windowMs: 60_000, max: 120, keyPrefix: 'assistant-articles' }),
  async (req, res) => {
    try {
      await ensureAssistantArticlesSeeded()
      const q = asString(req.query.q).trim()
      const category = asString(req.query.category).trim()
      const limitRaw = Number(req.query.limit)
      const limit = Number.isFinite(limitRaw) ? Math.min(200, Math.max(1, Math.floor(limitRaw))) : 50

      const find = { isPublished: true }
      if (category) find.category = category

      let cursor
      if (q) {
        cursor = AssistantArticle.find({ ...find, $text: { $search: q } }, { score: { $meta: 'textScore' } })
          .sort({ score: { $meta: 'textScore' }, updatedAt: -1 })
      } else {
        cursor = AssistantArticle.find(find).sort({ category: 1, title: 1 })
      }

      const rows = await cursor
        .limit(limit)
        .select('slug category title author summary updatedAt')
        .lean()

      const articles = rows.map((a) => ({
        slug: a.slug,
        category: a.category,
        title: a.title,
        author: a.author || '',
        summary: a.summary,
        updatedAt: (a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt)).toISOString(),
      }))

      return res.json({ articles })
    } catch (e) {
      return res.status(500).json({ error: 'Failed to load assistant articles' })
    }
  }
)

router.get(
  '/articles/:slug',
  auth,
  requireNotDisabled('assistant'),
  requireObjectIdQuery('projectId'),
  requireActiveProject,
  requireAssistantProjectAccess,
  rateLimit({ windowMs: 60_000, max: 120, keyPrefix: 'assistant-article' }),
  async (req, res) => {
    try {
      await ensureAssistantArticlesSeeded()
      const slug = normalizeSlug(asString(req.params.slug))
      if (!slug) return res.status(400).json({ error: 'Invalid article slug' })

      const row = await AssistantArticle.findOne({ slug, isPublished: true })
        .select('slug category title author summary body tags updatedAt')
        .lean()
      if (!row) return res.status(404).json({ error: 'Article not found' })

      return res.json({
        slug: row.slug,
        category: row.category,
        title: row.title,
        author: row.author || '',
        summary: row.summary,
        body: row.body,
        tags: Array.isArray(row.tags) ? row.tags : [],
        updatedAt: (row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt)).toISOString(),
      })
    } catch (e) {
      return res.status(500).json({ error: 'Failed to load assistant article' })
    }
  }
)

function normalizeTemplateItem(raw) {
  const it = raw || {}
  const rawLinks = Array.isArray(it.platformLinks) ? it.platformLinks : []
  const platformLinks = rawLinks
    .map((l) => ({
      title: asString(l && l.title).trim(),
      to: asString(l && l.to).trim(),
      note: asString(l && l.note).trim(),
    }))
    .filter((l) => l.title && l.to)
  return {
    id: asString(it.id).trim(),
    category: asString(it.category).trim(),
    title: asString(it.title).trim(),
    description: asString(it.description).trim(),
    guidance: asString(it.guidance).trim(),
    platformGuidance: asString(it.platformGuidance).trim(),
    platformLinks,
    sourceTitle: asString(it.sourceTitle).trim(),
    sourceUrl: asString(it.sourceUrl).trim(),
  }
}

function mergeChecklistItems(existingItems, templateItems) {
  const current = Array.isArray(existingItems) ? existingItems : []
  const template = (Array.isArray(templateItems) ? templateItems : []).map(normalizeTemplateItem).filter((t) => t.id)
  const existingById = new Map(current.map((it) => [asString(it && it.id).trim(), it]))

  const merged = template.map((t) => {
    const ex = existingById.get(t.id)
    if (!ex) {
      return {
        ...t,
        completed: false,
        completedAt: null,
        completedBy: null,
      }
    }
    return {
      ...t,
      completed: ex.completed === true,
      completedAt: ex.completedAt || null,
      completedBy: ex.completedBy || null,
    }
  })

  const templateIds = new Set(template.map((t) => t.id))
  for (const ex of current) {
    const exId = asString(ex && ex.id).trim()
    if (exId && !templateIds.has(exId)) merged.push(ex)
  }

  return merged
}

function normalizeChatRole(v) {
  const role = asString(v).trim().toLowerCase()
  if (role === 'assistant' || role === 'user' || role === 'system') return role
  return ''
}

function normalizeChatContent(v) {
  // Keep payload sizes bounded to avoid request-too-large and DB bloat.
  return asString(v).trim().slice(0, 8000)
}

async function pruneChatHistory(projectId, keepCount) {
  const keep = Number.isFinite(keepCount) ? Math.max(1, Math.floor(keepCount)) : 300
  const count = await AssistantChatMessage.countDocuments({ projectId })
  if (count <= keep) return
  const overflow = count - keep
  const old = await AssistantChatMessage.find({ projectId })
    .sort({ createdAt: 1 })
    .limit(overflow)
    .select('_id')
    .lean()
  const ids = old.map((d) => d && d._id).filter(Boolean)
  if (!ids.length) return
  await AssistantChatMessage.deleteMany({ _id: { $in: ids } })
}

async function ensureChecklistForProject(projectId, projectType) {
  const existing = await AssistantChecklist.findOne({ projectId })
  if (existing) {
    const template = getAssistantChecklistTemplateForProjectType(projectType)
    if (!template) return existing.toObject()

    const nextProjectType = asString(template.projectType || projectType).trim()
    const nextTemplateKey = asString(template.templateKey || existing.templateKey).trim()
    const nextItems = mergeChecklistItems(existing.items, template.items)

    const templateList = (Array.isArray(template.items) ? template.items : []).map(normalizeTemplateItem).filter((t) => t.id)
    const existingById = new Map((Array.isArray(existing.items) ? existing.items : []).map((it) => [asString(it && it.id).trim(), it]))
    let needsMetadataUpdate = false
    for (const t of templateList) {
      const ex = existingById.get(t.id)
      if (!ex) {
        needsMetadataUpdate = true
        break
      }
      const fields = ['category', 'title', 'description', 'guidance', 'platformGuidance', 'sourceTitle', 'sourceUrl']
      if (fields.some((f) => asString(ex && ex[f]).trim() !== asString(t && t[f]).trim())) {
        needsMetadataUpdate = true
        break
      }
      const exLinks = Array.isArray(ex.platformLinks) ? ex.platformLinks : []
      const tLinks = Array.isArray(t.platformLinks) ? t.platformLinks : []
      const norm = (arr) => arr.map((l) => `${asString(l && l.title).trim()}|${asString(l && l.to).trim()}|${asString(l && l.note).trim()}`).join(';;')
      if (norm(exLinks) !== norm(tLinks)) {
        needsMetadataUpdate = true
        break
      }
    }

    const needsSave = (
      asString(existing.projectType).trim() !== nextProjectType ||
      asString(existing.templateKey).trim() !== nextTemplateKey ||
      (Array.isArray(existing.items) ? existing.items.length : 0) !== nextItems.length ||
      needsMetadataUpdate
    )

    if (needsSave) {
      existing.projectType = nextProjectType
      existing.templateKey = nextTemplateKey
      existing.items = nextItems
      await existing.save()
    }
    return existing.toObject()
  }

  const template = getAssistantChecklistTemplateForProjectType(projectType)
  if (!template) return null

  const doc = await AssistantChecklist.create({
    projectId,
    projectType: template.projectType || asString(projectType).trim(),
    templateKey: template.templateKey,
    items: (Array.isArray(template.items) ? template.items : []).map((it) => ({
      id: asString(it.id).trim(),
      category: asString(it.category).trim(),
      title: asString(it.title).trim(),
      description: asString(it.description).trim(),
      guidance: asString(it.guidance).trim(),
      platformGuidance: asString(it.platformGuidance).trim(),
      platformLinks: (Array.isArray(it.platformLinks) ? it.platformLinks : [])
        .map((l) => ({
          title: asString(l && l.title).trim(),
          to: asString(l && l.to).trim(),
          note: asString(l && l.note).trim(),
        }))
        .filter((l) => l.title && l.to),
      sourceTitle: asString(it.sourceTitle).trim(),
      sourceUrl: asString(it.sourceUrl).trim(),
      completed: false,
      completedAt: null,
      completedBy: null,
    })),
  })
  return doc.toObject()
}

// Premium AI chat history (per-project). Retained ~90 days (TTL) and capped for size.
router.get(
  '/chat',
  auth,
  requireNotDisabled('ai'),
  requireObjectIdQuery('projectId'),
  requireActiveProject,
  requireFeature('ai'),
  requireAssistantProjectAccess,
  rateLimit({ windowMs: 60_000, max: 120, keyPrefix: 'assistant-chat' }),
  async (req, res) => {
    try {
      const projectId = asString(req.query.projectId).trim()
      const limitRaw = Number(req.query.limit)
      const limit = Number.isFinite(limitRaw) ? Math.min(200, Math.max(1, Math.floor(limitRaw))) : 50

      const rows = await AssistantChatMessage.find({ projectId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('role content createdAt userId')
        .lean()

      const messages = rows
        .reverse()
        .map((m) => ({
          role: m.role,
          content: m.content,
          ts: (m.createdAt instanceof Date ? m.createdAt : new Date(m.createdAt)).toISOString(),
          userId: m.userId || null,
        }))

      return res.json({ projectId, messages })
    } catch (e) {
      return res.status(500).json({ error: 'Failed to load assistant chat history' })
    }
  }
)

router.post(
  '/chat',
  auth,
  requireNotDisabled('ai'),
  requireObjectIdQuery('projectId'),
  requireActiveProject,
  requireFeature('ai'),
  requireAssistantProjectAccess,
  rateLimit({ windowMs: 60_000, max: 120, keyPrefix: 'assistant-chat' }),
  async (req, res) => {
    try {
      const projectId = asString(req.query.projectId).trim()
      const role = normalizeChatRole(req.body && req.body.role)
      const content = normalizeChatContent(req.body && req.body.content)
      if (!role) return res.status(400).json({ error: 'role is required' })
      if (!content) return res.status(400).json({ error: 'content is required' })

      const userId = req.user && (req.user._id || req.user.id) ? (req.user._id || req.user.id) : null
      const doc = await AssistantChatMessage.create({
        projectId,
        userId: role === 'user' ? userId : null,
        role,
        content,
      })

      await pruneChatHistory(projectId, 300)

      return res.status(201).json({
        id: doc._id,
        projectId,
        role: doc.role,
        content: doc.content,
        ts: doc.createdAt.toISOString(),
      })
    } catch (e) {
      return res.status(500).json({ error: 'Failed to save assistant chat message' })
    }
  }
)

// Get (and auto-seed) the compliance checklist for the current project
router.get(
  '/checklist',
  auth,
  requireObjectIdQuery('projectId'),
  requireActiveProject,
  requireAssistantProjectAccess,
	  async (req, res) => {
	    try {
	      const projectId = asString(req.query.projectId).trim()
	      const project = req.assistantProject
	      const projectType = getProjectType(project)

      const checklist = await ensureChecklistForProject(projectId, projectType)
      if (!checklist) {
        return res.status(422).json({
          error: 'No checklist template available for this project type yet',
          code: 'CHECKLIST_TEMPLATE_NOT_AVAILABLE',
          projectType: asString(projectType).trim(),
        })
      }

      return res.json({
        id: checklist._id,
        projectId: checklist.projectId,
        projectType: checklist.projectType,
        templateKey: checklist.templateKey,
        progress: computeProgress(checklist.items),
        items: checklist.items,
      })
    } catch (e) {
      return res.status(500).json({ error: 'Failed to load checklist' })
    }
  }
)

// Update a single checklist item's completion state
router.patch(
  '/checklist/:id/items/:itemId',
  auth,
  requireObjectIdParam('id'),
  async (req, res) => {
    try {
      const id = asString(req.params.id).trim()
      const itemId = asString(req.params.itemId).trim().slice(0, 64)
      const completed = req.body && typeof req.body.completed === 'boolean'
        ? req.body.completed
        : null
      if (completed === null) return res.status(400).json({ error: 'completed is required' })
      if (!itemId) return res.status(400).json({ error: 'Invalid itemId' })

      const doc = await AssistantChecklist.findById(id).select('projectId items').lean()
      if (!doc) return res.status(404).json({ error: 'Checklist not found' })

      const project = await Project.findById(doc.projectId).select('team users isActive stripeSubscriptionStatus').lean()
      if (!project) return res.status(404).json({ error: 'Project not found' })
      if (!isSubscriptionActive(project)) return res.status(402).json({ error: 'Project subscription inactive or payment required' })
      if (!isProjectMember(project, req.user)) return res.status(403).json({ error: 'Forbidden' })

      const set = {
        'items.$.completed': completed,
        'items.$.completedAt': completed ? new Date() : null,
        'items.$.completedBy': completed ? (req.user && (req.user._id || req.user.id) ? (req.user._id || req.user.id) : null) : null,
      }

      const result = await AssistantChecklist.updateOne(
        { _id: id, 'items.id': itemId },
        { $set: set }
      )
      if (!result || result.matchedCount === 0) return res.status(404).json({ error: 'Checklist item not found' })

      const updated = await AssistantChecklist.findById(id).lean()
      return res.json({
        id: updated._id,
        projectId: updated.projectId,
        projectType: updated.projectType,
        templateKey: updated.templateKey,
        progress: computeProgress(updated.items),
        items: updated.items,
      })
    } catch (e) {
      return res.status(500).json({ error: 'Failed to update checklist item' })
    }
  }
)

// Get documentation pointers for a project type and (optional) checklist item
router.get(
  '/docs',
  auth,
  requireObjectIdQuery('projectId'),
  requireActiveProject,
  requireAssistantProjectAccess,
	  async (req, res) => {
	    try {
	      const project = req.assistantProject
	      const projectType = getProjectType(project)
	      const itemId = asString(req.query.itemId).trim().slice(0, 64)

      const payload = getAssistantDocsForProjectType(projectType, itemId)
      if (!payload) {
        return res.json({
          projectType: asString(projectType).trim(),
          itemId: itemId || null,
          docsAvailable: false,
          docs: [],
          general: [],
          message: 'No documentation set available for this project type yet',
          code: 'DOCS_NOT_AVAILABLE',
        })
      }

      const docs = Array.isArray(payload.docs) ? payload.docs : []
      const general = Array.isArray(payload.general) ? payload.general : []

      return res.json({
        projectType: asString(projectType).trim(),
        itemId: itemId || null,
        docsAvailable: true,
        docs,
        general,
      })
    } catch (e) {
      return res.status(500).json({ error: 'Failed to load documentation' })
    }
  }
)

module.exports = router
