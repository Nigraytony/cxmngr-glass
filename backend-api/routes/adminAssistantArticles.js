const express = require('express')
const router = express.Router()

const AssistantArticle = require('../models/assistantArticle')
const { getAssistantArticleSeeds, normalizeSlug } = require('../config/assistantArticles')
const { rateLimit } = require('../middleware/rateLimit')
const { buildSafeRegex } = require('../utils/search')

function asString(v) {
  return typeof v === 'string' ? v : (v == null ? '' : String(v))
}

function normalizeShortString(value, { maxLen = 256 } = {}) {
  if (value === undefined || value === null) return null
  const s = String(value).trim()
  if (!s) return null
  if (s.length > maxLen) return null
  return s
}

function normalizeBool(value, fallback = false) {
  if (value === true || value === 'true' || value === 1 || value === '1') return true
  if (value === false || value === 'false' || value === 0 || value === '0') return false
  return fallback
}

function normalizeTags(value) {
  if (!value) return []
  const arr = Array.isArray(value) ? value : String(value).split(',')
  const out = []
  for (const raw of arr) {
    const t = normalizeShortString(raw, { maxLen: 64 })
    if (t) out.push(t)
  }
  // de-dupe
  return Array.from(new Set(out.map((t) => t.toLowerCase()))).map((t) => t)
}

function normalizeBody(value) {
  const s = asString(value).trim()
  // Prevent accidental mega-payloads
  return s.slice(0, 250_000)
}

async function ensureArticlesSeeded() {
  const count = await AssistantArticle.countDocuments({})
  if (count > 0) return
  const seeds = getAssistantArticleSeeds()
  if (!seeds.length) return
  await AssistantArticle.insertMany(seeds, { ordered: false })
}

function pickPayload(body) {
  const src = body || {}
  const title = normalizeShortString(src.title, { maxLen: 256 })
  const category = normalizeShortString(src.category, { maxLen: 128 })
  const author = normalizeShortString(src.author, { maxLen: 128 }) || ''
  const summary = normalizeShortString(src.summary, { maxLen: 2000 }) || ''
  const tags = normalizeTags(src.tags)
  const isPublished = normalizeBool(src.isPublished, true)
  const articleBody = normalizeBody(src.body)
  const slugInput = normalizeShortString(src.slug, { maxLen: 128 })
  const slug = slugInput ? normalizeSlug(slugInput) : null
  return { title, category, author, summary, tags, isPublished, body: articleBody, slug }
}

router.get(
  '/',
  rateLimit({ windowMs: 60_000, max: 120, keyPrefix: 'admin_assistant_articles' }),
  async (req, res) => {
    try {
      await ensureArticlesSeeded()
      const page = Math.max(1, parseInt(req.query.page, 10) || 1)
      const perPage = Math.min(200, Math.max(1, parseInt(req.query.perPage, 10) || 25))
      const category = normalizeShortString(req.query.category, { maxLen: 128 })
      const search = normalizeShortString(req.query.search, { maxLen: 128 })

      const filter = {}
      if (category) filter.category = category

      let query
      if (search) {
        query = AssistantArticle.find({ ...filter, $text: { $search: search } }, { score: { $meta: 'textScore' } })
          .sort({ score: { $meta: 'textScore' }, updatedAt: -1 })
      } else if (req.query.q) {
        const rx = buildSafeRegex(req.query.q, { maxLen: 128 })
        if (!rx) return res.status(400).json({ error: 'Invalid search query' })
        query = AssistantArticle.find({
          ...filter,
          $or: [
            { title: { $regex: rx } },
            { summary: { $regex: rx } },
            { category: { $regex: rx } },
            { tags: { $regex: rx } },
          ],
        }).sort({ category: 1, title: 1 })
      } else {
        query = AssistantArticle.find(filter).sort({ category: 1, title: 1 })
      }

      const total = await AssistantArticle.countDocuments(filter)
      const rows = await query
        .skip((page - 1) * perPage)
        .limit(perPage)
        .select('slug category title author summary tags isPublished updatedAt')
        .lean()

      return res.json({
        page,
        perPage,
        total,
        items: rows.map((a) => ({
          slug: a.slug,
          category: a.category,
          title: a.title,
          author: a.author || '',
          summary: a.summary,
          tags: Array.isArray(a.tags) ? a.tags : [],
          isPublished: a.isPublished !== false,
          updatedAt: (a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt)).toISOString(),
        })),
      })
    } catch (e) {
      return res.status(500).json({ error: 'Failed to load assistant articles' })
    }
  }
)

router.get(
  '/:slug',
  rateLimit({ windowMs: 60_000, max: 120, keyPrefix: 'admin_assistant_article' }),
  async (req, res) => {
    try {
      await ensureArticlesSeeded()
      const slug = normalizeSlug(asString(req.params.slug))
      if (!slug) return res.status(400).json({ error: 'Invalid slug' })
      const row = await AssistantArticle.findOne({ slug })
        .select('slug category title author summary body tags isPublished updatedAt createdAt')
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
        isPublished: row.isPublished !== false,
        createdAt: (row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt)).toISOString(),
        updatedAt: (row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt)).toISOString(),
      })
    } catch (e) {
      return res.status(500).json({ error: 'Failed to load assistant article' })
    }
  }
)

router.post(
  '/',
  rateLimit({ windowMs: 60_000, max: 30, keyPrefix: 'admin_assistant_article_create' }),
  async (req, res) => {
    try {
      const payload = pickPayload(req.body)
      if (!payload.title) return res.status(400).json({ error: 'title is required' })
      if (!payload.category) return res.status(400).json({ error: 'category is required' })

      const slug = payload.slug || normalizeSlug(payload.title)
      if (!slug) return res.status(400).json({ error: 'Unable to derive slug' })

      const exists = await AssistantArticle.findOne({ slug }).select('_id').lean()
      if (exists) return res.status(409).json({ error: 'slug already exists' })

      const rec = await AssistantArticle.create({
        slug,
        category: payload.category,
        title: payload.title,
        author: payload.author || '',
        summary: payload.summary,
        body: payload.body,
        tags: payload.tags,
        isPublished: payload.isPublished,
      })
      return res.status(201).json({ slug: rec.slug })
    } catch (e) {
      return res.status(400).json({ error: 'Failed to create article' })
    }
  }
)

router.patch(
  '/:slug',
  rateLimit({ windowMs: 60_000, max: 60, keyPrefix: 'admin_assistant_article_update' }),
  async (req, res) => {
    try {
      const currentSlug = normalizeSlug(asString(req.params.slug))
      if (!currentSlug) return res.status(400).json({ error: 'Invalid slug' })

      const payload = pickPayload(req.body)
      if (payload.title === null && payload.category === null && payload.summary === '' && payload.body === '' && !payload.tags.length && payload.slug === null && req.body?.isPublished === undefined) {
        // allow no-op, but still validate existence
      }

      const nextSlug = payload.slug || null
      if (nextSlug && nextSlug !== currentSlug) {
        const exists = await AssistantArticle.findOne({ slug: nextSlug }).select('_id').lean()
        if (exists) return res.status(409).json({ error: 'slug already exists' })
      }

      const update = {}
      if (payload.title !== null) update.title = payload.title
      if (payload.category !== null) update.category = payload.category
      if (req.body?.author !== undefined) update.author = payload.author || ''
      if (req.body?.summary !== undefined) update.summary = payload.summary
      if (req.body?.body !== undefined) update.body = payload.body
      if (req.body?.tags !== undefined) update.tags = payload.tags
      if (req.body?.isPublished !== undefined) update.isPublished = normalizeBool(req.body.isPublished, true)
      if (nextSlug) update.slug = nextSlug

      const rec = await AssistantArticle.findOneAndUpdate(
        { slug: currentSlug },
        { $set: update },
        { new: true }
      ).select('slug').lean()

      if (!rec) return res.status(404).json({ error: 'Article not found' })
      return res.json({ slug: rec.slug })
    } catch (e) {
      return res.status(400).json({ error: 'Failed to update article' })
    }
  }
)

router.delete(
  '/:slug',
  rateLimit({ windowMs: 60_000, max: 30, keyPrefix: 'admin_assistant_article_delete' }),
  async (req, res) => {
    try {
      const slug = normalizeSlug(asString(req.params.slug))
      if (!slug) return res.status(400).json({ error: 'Invalid slug' })
      const rec = await AssistantArticle.findOneAndDelete({ slug }).select('_id').lean()
      if (!rec) return res.status(404).json({ error: 'Article not found' })
      return res.json({ ok: true })
    } catch (e) {
      return res.status(400).json({ error: 'Failed to delete article' })
    }
  }
)

module.exports = router
