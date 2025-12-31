const express = require('express')
const router = express.Router()
const { auth } = require('../middleware/auth')
const { requireFeature, getPlan } = require('../middleware/planGuard')
const { requireActiveProject } = require('../middleware/subscription')
const Project = require('../models/project')
const { decryptString } = require('../utils/encryption')
const { rateLimit } = require('../middleware/rateLimit')
const { requireNotDisabled } = require('../middleware/killSwitch')
const { isObjectId, requireBodyField, requireObjectIdBody } = require('../middleware/validate')

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

function normalizeEntityType(v) {
  const t = asString(v).trim().toLowerCase()
  if (t === 'issues') return 'issue'
  if (t === 'activities') return 'activity'
  if (t === 'equipments') return 'equipment'
  if (t === 'tasks') return 'task'
  if (t === 'spaces') return 'space'
  if (t === 'templates') return 'template'
  return t
}

function normalizeMessages(input) {
  const list = Array.isArray(input) ? input : []
  const out = []
  for (const m of list.slice(-30)) {
    const role = asString(m && m.role).toLowerCase()
    const content = asString(m && m.content).trim()
    if (!content) continue
    if (!['user', 'assistant', 'system'].includes(role)) continue
    out.push({ role, content })
  }
  return out
}

function normalizeProvider(v) {
  const p = asString(v).trim().toLowerCase()
  if (p === 'google' || p === 'gemini') return 'gemini'
  if (p === 'anthropic' || p === 'claude') return 'claude'
  return 'openai'
}

function hasServerKeyForProvider(provider) {
  const p = normalizeProvider(provider)
  if (p === 'gemini') return Boolean(asString(process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || '').trim())
  if (p === 'claude') return Boolean(asString(process.env.ANTHROPIC_API_KEY || '').trim())
  return Boolean(asString(process.env.OPENAI_API_KEY || '').trim())
}

function normalizeTags(input) {
  const arr = Array.isArray(input) ? input : []
  const out = []
  const seen = new Set()
  for (const raw of arr) {
    const tag = asString(raw).trim()
    if (!tag) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(tag)
  }
  return out
}

function normalizeSuggestedTags(list) {
  const items = Array.isArray(list) ? list : []
  const out = []
  const seen = new Set()
  for (const it of items) {
    const tag = asString(typeof it === 'string' ? it : (it && it.tag)).trim()
    if (!tag) continue
    const cleaned = tag
      .replace(/^#+/g, '')
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-./]/g, '')
      .trim()
      .slice(0, 40)
    if (!cleaned) continue
    const key = cleaned.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const confidenceRaw = (it && typeof it === 'object') ? it.confidence : undefined
    const confidence = (typeof confidenceRaw === 'number' && Number.isFinite(confidenceRaw))
      ? Math.max(0, Math.min(1, confidenceRaw))
      : undefined
    const reason = (it && typeof it === 'object') ? asString(it.reason).trim().slice(0, 200) : ''
    out.push({ tag: cleaned, ...(confidence != null ? { confidence } : {}), ...(reason ? { reason } : {}) })
  }
  return out.slice(0, 12)
}

function tryParseJson(text) {
  const raw = asString(text).trim()
  if (!raw) return null
  try { return JSON.parse(raw) } catch (e) { /* ignore */ }
  const firstBrace = raw.indexOf('{')
  const lastBrace = raw.lastIndexOf('}')
  const firstBracket = raw.indexOf('[')
  const lastBracket = raw.lastIndexOf(']')
  const candidates = []
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) candidates.push(raw.slice(firstBracket, lastBracket + 1))
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) candidates.push(raw.slice(firstBrace, lastBrace + 1))
  for (const c of candidates) {
    try { return JSON.parse(c) } catch (e) { /* ignore */ }
  }
  return null
}

// GET /api/ai/status?projectId=...
// Returns non-sensitive configuration state for UI purposes (no secrets).
router.get(
  '/status',
  auth,
  requireNotDisabled('ai'),
  requireActiveProject,
  rateLimit({ windowMs: 60_000, max: 120, keyPrefix: 'ai-status' }),
  async (req, res) => {
    try {
      const projectId = asString(req.query && req.query.projectId).trim()
      if (!projectId) return res.status(400).json({ error: 'projectId is required' })
      if (!isObjectId(projectId)) return res.status(400).json({ error: 'Invalid projectId' })

      const project = await Project.findById(projectId)
        .select('team users subscriptionTier stripePriceId priceId subscriptionFeatures ai.enabled ai.provider ai.model ai.hasKey')
        .lean()
      if (!project) return res.status(404).json({ error: 'Project not found' })
      if (!isProjectMember(project, req.user)) return res.status(403).json({ error: 'Forbidden' })

      const plan = getPlan(project)
      const planAllowsAi = Boolean(plan && plan.features && plan.features.ai === true)

      const ai = project.ai || {}
      const provider = normalizeProvider(ai.provider)
      const model =
        provider === 'gemini'
          ? (asString(ai.model || process.env.GEMINI_MODEL || 'gemini-1.5-flash').trim() || 'gemini-1.5-flash')
          : provider === 'claude'
            ? (asString(ai.model || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest').trim() || 'claude-3-5-sonnet-latest')
            : (asString(ai.model || process.env.OPENAI_MODEL || 'gpt-4o-mini').trim() || 'gpt-4o-mini')
      const enabled = ai.enabled === true
      const hasProjectKey = ai.hasKey === true
      const hasServerKey = hasServerKeyForProvider(provider)

      const keySource = hasProjectKey ? 'project' : (hasServerKey ? 'server' : null)
      const canChat = planAllowsAi && enabled && (hasProjectKey || hasServerKey)
      const reason =
        !planAllowsAi ? 'FEATURE_NOT_IN_PLAN' :
        !enabled ? 'AI_DISABLED' :
        (!hasProjectKey && !hasServerKey) ? 'AI_NOT_CONFIGURED' :
        null

      return res.json({
        projectId,
        plan: { key: plan?.key || null, allowsAi: planAllowsAi },
        ai: {
          enabled,
          provider,
          model,
          hasProjectKey,
          hasServerKey,
          keySource,
          canChat,
          ...(reason ? { reason } : {}),
        },
      })
    } catch (err) {
      console.error('[ai] status error', { reqId: req.id, error: err && (err.stack || err.message || err) })
      return res.status(500).json({ error: 'Failed to load AI status', reqId: req.id || null })
    }
  }
)

async function callOpenAiChat({ apiKey, model, messages }) {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
    }),
  })

  const data = await r.json().catch(() => null)
  if (!r.ok) {
    const msg = (data && (data.error && data.error.message)) ? data.error.message : `OpenAI error (${r.status})`
    const err = new Error(msg)
    err.status = 502
    throw err
  }

  const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
  return asString(content).trim()
}

function splitSystemMessages(messages) {
  const systemParts = []
  const rest = []
  for (const m of messages) {
    if (m && m.role === 'system') systemParts.push(asString(m.content).trim())
    else rest.push(m)
  }
  return { system: systemParts.filter(Boolean).join('\n\n').trim(), rest }
}

function toGeminiContents(messages) {
  const out = []
  for (const m of messages) {
    if (!m || !m.content) continue
    const role = m.role === 'assistant' ? 'model' : 'user'
    out.push({ role, parts: [{ text: asString(m.content) }] })
  }
  return out
}

async function callGeminiChat({ apiKey, model, messages }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
  const { system, rest } = splitSystemMessages(messages)
  const body = {
    contents: toGeminiContents(rest),
    generationConfig: { temperature: 0.2 },
  }
  if (system) {
    body.systemInstruction = { parts: [{ text: system }] }
  }
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await r.json().catch(() => null)
  if (!r.ok) {
    const msg =
      (data && data.error && data.error.message) ? data.error.message :
      (data && data.message) ? data.message :
      `Gemini error (${r.status})`
    const err = new Error(msg)
    err.status = 502
    throw err
  }
  const text =
    data &&
    data.candidates &&
    data.candidates[0] &&
    data.candidates[0].content &&
    Array.isArray(data.candidates[0].content.parts) &&
    data.candidates[0].content.parts[0] &&
    data.candidates[0].content.parts[0].text
  return asString(text).trim()
}

function toAnthropicMessages(messages) {
  const out = []
  for (const m of messages) {
    if (!m || !m.content) continue
    const role = m.role === 'assistant' ? 'assistant' : 'user'
    out.push({ role, content: [{ type: 'text', text: asString(m.content) }] })
  }
  return out
}

async function callClaudeChat({ apiKey, model, messages }) {
  const { system, rest } = splitSystemMessages(messages)
  const body = {
    model,
    max_tokens: 800,
    messages: toAnthropicMessages(rest),
  }
  if (system) body.system = system

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })
  const data = await r.json().catch(() => null)
  if (!r.ok) {
    const msg =
      (data && data.error && data.error.message) ? data.error.message :
      (data && data.message) ? data.message :
      `Anthropic error (${r.status})`
    const err = new Error(msg)
    err.status = 502
    throw err
  }
  // content is an array of blocks: [{type:'text', text:'...'}]
  const blocks = data && data.content
  const text = Array.isArray(blocks)
    ? blocks.filter(b => b && b.type === 'text').map(b => asString(b.text)).join('\n').trim()
    : ''
  return text
}

// POST /api/ai/chat
// Body: { projectId, messages: [{role, content}], context?: {...} }
router.post('/chat', auth, requireNotDisabled('ai'), requireBodyField('projectId'), requireObjectIdBody('projectId'), requireActiveProject, requireFeature('ai'), rateLimit({ windowMs: 60_000, max: 60, keyPrefix: 'ai-chat' }), async (req, res) => {
  try {
    const projectId = asString(req.body && req.body.projectId).trim()
    if (!projectId) return res.status(400).json({ error: 'projectId is required' })
    if (!isObjectId(projectId)) return res.status(400).json({ error: 'Invalid projectId' })

    const project = await Project.findById(projectId)
      // Avoid projection path collisions by selecting specific ai fields instead of `ai` plus nested encrypted fields.
      .select('team users ai.enabled ai.provider ai.model ai.hasKey +ai.apiKey.enc +ai.apiKey.iv +ai.apiKey.tag')
      .lean()
    if (!project) return res.status(404).json({ error: 'Project not found' })
    if (!isProjectMember(project, req.user)) return res.status(403).json({ error: 'Forbidden' })
    const ai = project.ai || {}
    if (!ai.enabled) return res.status(403).json({ error: 'AI is disabled for this project' })

    // Prefer project key; fallback to server key if present
    let apiKey = ''
    if (ai.hasKey) {
      try {
        apiKey = decryptString(ai.apiKey || {})
      } catch (e) {
        return res.status(500).json({ error: 'AI key decryption failed (check AI_ENCRYPTION_KEY)' })
      }
    }
    const provider = normalizeProvider(ai.provider)
    if (!apiKey) {
      if (provider === 'gemini') apiKey = asString(process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || '').trim()
      else if (provider === 'claude') apiKey = asString(process.env.ANTHROPIC_API_KEY || '').trim()
      else apiKey = asString(process.env.OPENAI_API_KEY || '').trim()
    }
    if (!apiKey) return res.status(501).json({ error: 'AI is not configured (no project key or server key)' })

    const model =
      provider === 'gemini'
        ? (asString(ai.model || process.env.GEMINI_MODEL || 'gemini-1.5-flash').trim() || 'gemini-1.5-flash')
        : provider === 'claude'
          ? (asString(ai.model || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest').trim() || 'claude-3-5-sonnet-latest')
        : (asString(ai.model || process.env.OPENAI_MODEL || 'gpt-4o-mini').trim() || 'gpt-4o-mini')
    const userMessages = normalizeMessages(req.body && req.body.messages)
    const context = (req.body && typeof req.body.context === 'object' && req.body.context) ? req.body.context : null

    const system = [
      'You are CXMA, an assistant inside a commissioning management web app.',
      'Be concise and practical. Prefer checklists, next steps, and clear recommendations.',
      'If the user asks for actions that require app data you do not have, ask what you need.',
      'Never fabricate IDs, database values, or project-specific facts.',
    ].join(' ')

    let ctxLine = ''
    if (context) {
      try {
        ctxLine = `Context (may help): ${JSON.stringify(context).slice(0, 2000)}`
      } catch (e) {
        ctxLine = 'Context (may help): [unserializable context object]'
      }
    }
    const messages = [
      { role: 'system', content: system },
      ...(ctxLine ? [{ role: 'system', content: ctxLine }] : []),
      ...userMessages,
    ]

    let text = ''
    try {
      text = provider === 'gemini'
        ? await callGeminiChat({ apiKey, model, messages })
        : provider === 'claude'
          ? await callClaudeChat({ apiKey, model, messages })
          : await callOpenAiChat({ apiKey, model, messages })
    } catch (e) {
      const msg = e && e.message ? e.message : 'AI provider error'
      return res.status(502).json({ error: msg })
    }
    return res.status(200).json({ message: text || '' })
  } catch (err) {
    const msg = err && err.message ? String(err.message) : ''
    console.error('[ai] chat error', { reqId: req.id, error: err && (err.stack || err.message || err) })
    return res.status(500).json({ error: msg || 'AI request failed', reqId: req.id || null })
  }
})

// POST /api/ai/suggest-tags
// Body: { projectId, entityType, entity: { ... }, allowedTags?: string[], existingTags?: string[] }
router.post('/suggest-tags', auth, requireNotDisabled('ai'), requireBodyField('projectId'), requireObjectIdBody('projectId'), requireActiveProject, requireFeature('ai'), rateLimit({ windowMs: 60_000, max: 60, keyPrefix: 'ai-tags' }), async (req, res) => {
  try {
    const projectId = asString(req.body && req.body.projectId).trim()
    if (!projectId) return res.status(400).json({ error: 'projectId is required' })
    if (!isObjectId(projectId)) return res.status(400).json({ error: 'Invalid projectId' })

    const entityType = normalizeEntityType(req.body && req.body.entityType)
    if (!entityType) return res.status(400).json({ error: 'entityType is required' })

    const project = await Project.findById(projectId)
      // Avoid projection path collisions by selecting specific ai fields instead of `ai` plus nested encrypted fields.
      .select('team users tags ai.enabled ai.provider ai.model ai.hasKey +ai.apiKey.enc +ai.apiKey.iv +ai.apiKey.tag')
      .lean()
    if (!project) return res.status(404).json({ error: 'Project not found' })
    if (!isProjectMember(project, req.user)) return res.status(403).json({ error: 'Forbidden' })
    const ai = project.ai || {}
    if (!ai.enabled) return res.status(403).json({ error: 'AI is disabled for this project' })

    // Prefer project key; fallback to server key if present
    let apiKey = ''
    if (ai.hasKey) {
      try {
        apiKey = decryptString(ai.apiKey || {})
      } catch (e) {
        return res.status(500).json({ error: 'AI key decryption failed (check AI_ENCRYPTION_KEY)' })
      }
    }
    const provider = normalizeProvider(ai.provider)
    if (!apiKey) {
      if (provider === 'gemini') apiKey = asString(process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || '').trim()
      else if (provider === 'claude') apiKey = asString(process.env.ANTHROPIC_API_KEY || '').trim()
      else apiKey = asString(process.env.OPENAI_API_KEY || '').trim()
    }
    if (!apiKey) return res.status(501).json({ error: 'AI is not configured (no project key or server key)' })

    const model =
      provider === 'gemini'
        ? (asString(ai.model || process.env.GEMINI_MODEL || 'gemini-1.5-flash').trim() || 'gemini-1.5-flash')
        : provider === 'claude'
          ? (asString(ai.model || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest').trim() || 'claude-3-5-sonnet-latest')
          : (asString(ai.model || process.env.OPENAI_MODEL || 'gpt-4o-mini').trim() || 'gpt-4o-mini')

    const entity = (req.body && typeof req.body.entity === 'object' && req.body.entity) ? req.body.entity : {}
    const existingTags = normalizeTags(req.body && req.body.existingTags)
    const allowedTags = normalizeTags((req.body && req.body.allowedTags) || project.tags || [])

    const system = [
      'You are a tagging assistant inside a commissioning management web app.',
      'Your job is to propose short, useful, reusable tags for the given entity.',
      'Return only valid JSON.',
      'Schema: { "tags": [{ "tag": string, "confidence": number, "reason": string }] }',
      'Rules:',
      '- Provide 3 to 8 tags.',
      '- Tags are short (1-4 words), no emojis, no leading "#".',
      '- Prefer tags from allowedTags when relevant; you may suggest up to 2 new tags if needed.',
      '- confidence is between 0 and 1.',
      '- reason is short (<= 12 words).',
    ].join('\n')

    const user = [
      `entityType: ${entityType}`,
      `allowedTags: ${JSON.stringify(allowedTags).slice(0, 2000)}`,
      `existingTags: ${JSON.stringify(existingTags).slice(0, 1000)}`,
      `entity: ${JSON.stringify(entity).slice(0, 6000)}`,
    ].join('\n')

    const messages = [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]

    let text = ''
    try {
      text = provider === 'gemini'
        ? await callGeminiChat({ apiKey, model, messages })
        : provider === 'claude'
          ? await callClaudeChat({ apiKey, model, messages })
          : await callOpenAiChat({ apiKey, model, messages })
    } catch (e) {
      const msg = e && e.message ? e.message : 'AI provider error'
      return res.status(502).json({ error: msg })
    }

    const parsed = tryParseJson(text)
    let list = []
    if (Array.isArray(parsed)) list = parsed
    else if (parsed && typeof parsed === 'object') list = parsed.tags || parsed.suggestedTags || parsed.labels || []
    const tags = normalizeSuggestedTags(list)

    return res.status(200).json({ tags })
  } catch (err) {
    const msg = err && err.message ? String(err.message) : ''
    console.error('[ai] suggest-tags error', { reqId: req.id, error: err && (err.stack || err.message || err) })
    return res.status(500).json({ error: msg || 'AI request failed', reqId: req.id || null })
  }
})

module.exports = router
