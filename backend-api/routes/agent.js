/**
 * CXMA Agent route — /api/agent
 *
 * POST /chat   — agentic loop (tool use): receives user message, calls AI with
 *               tool definitions, executes any tool calls, returns final reply
 *               plus structured tool results for the frontend to render as cards.
 *
 * GET  /history — load per-project chat history (most recent N messages).
 *
 * Provider support: Claude (native tool use), OpenAI (function calling),
 * Gemini (functionDeclarations). Falls back gracefully if tool use fails.
 *
 * Security:
 *  - auth + requireFeature('ai') + requireActiveProject (premium-only)
 *  - All DB operations in the executor are scoped to the authenticated projectId
 *  - Max 5 tool-call iterations per request to prevent runaway loops
 */

const express = require('express')
const router = express.Router()
const { auth } = require('../middleware/auth')
const { requireFeature, getPlan } = require('../middleware/planGuard')
const { requireActiveProject } = require('../middleware/subscription')
const { rateLimit } = require('../middleware/rateLimit')
const { requireNotDisabled } = require('../middleware/killSwitch')
const { isObjectId, requireBodyField, requireObjectIdBody } = require('../middleware/validate')
const { decryptString } = require('../utils/encryption')
const Project = require('../models/project')
const AssistantChatMessage = require('../models/assistantChatMessage')
const {
  getClaudeTools,
  getOpenAiTools,
  getGeminiTools,
  executeTool,
  getRecordLink,
  getRecordName,
  getToolLabel,
} = require('../utils/agentTools')

const MAX_TOOL_ITERATIONS = 8
const MAX_HISTORY_MESSAGES = 20 // how many prior turns to include in context
const MAX_TOKENS = 8192

// ---------------------------------------------------------------------------
// Helpers (shared with ai.js pattern)
// ---------------------------------------------------------------------------

function asString(v) {
  return typeof v === 'string' ? v : (v == null ? '' : String(v))
}

function isProjectMember(project, user) {
  try {
    if (!project || !user) return false
    const role = asString(user.role).toLowerCase()
    if (role === 'globaladmin' || role === 'superadmin') return true
    const userId = asString(user._id || user.id)
    const email = asString(user.email).toLowerCase()
    const team = Array.isArray(project.team) ? project.team : []
    const users = Array.isArray(project.users) ? project.users : []
    if (userId && users.some((u) => asString(u) === userId)) return true
    return team.some((m) => {
      const mid = asString(m && (m._id || m.id))
      const memail = asString(m && m.email).toLowerCase()
      return (userId && mid && mid === userId) || (email && memail && memail === email)
    })
  } catch (_) {
    return false
  }
}

function normalizeProvider(v) {
  const p = asString(v).trim().toLowerCase()
  if (p === 'google' || p === 'gemini') return 'gemini'
  if (p === 'anthropic' || p === 'claude') return 'claude'
  return 'openai'
}

function hasServerKeyForProvider(provider) {
  if (provider === 'gemini') return Boolean(asString(process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || '').trim())
  if (provider === 'claude') return Boolean(asString(process.env.ANTHROPIC_API_KEY || '').trim())
  return Boolean(asString(process.env.OPENAI_API_KEY || '').trim())
}

function resolveModel(provider, projectAi) {
  if (provider === 'gemini') return asString(projectAi.model || process.env.GEMINI_MODEL || 'gemini-1.5-pro').trim() || 'gemini-1.5-pro'
  if (provider === 'claude') return asString(projectAi.model || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest').trim() || 'claude-3-5-sonnet-latest'
  return asString(projectAi.model || process.env.OPENAI_MODEL || 'gpt-4o').trim() || 'gpt-4o'
}

function buildSystemPrompt(project) {
  const name = asString(project && project.name).trim() || 'this project'
  return [
    `You are the CXMA Agent — an AI assistant embedded in a commissioning management platform for the project "${name}".`,
    'You can help users manage their commissioning work by creating, reading, updating, and deleting records.',
    '',
    'Capabilities (use the provided tools):',
    '  • Tasks — project task list with WBS hierarchy',
    '  • Activities — meetings, site visits, workshops, OPR sessions',
    '  • Equipment — physical equipment items with checklists and functional tests',
    '  • Issues — deficiencies, observations, and action items',
    '  • Spaces — building locations (building → floor → room → area)',
    '  • Templates — reusable equipment templates with full commissioning content',
    '  • Systems — mechanical, electrical, and other building systems',
    '',
    'Template creation guidance:',
    '  When asked to create an equipment template, use your commissioning knowledge to populate it fully:',
    '  • attributes: nameplate and design parameters (e.g., Airflow CFM, Motor HP, Coil Entering/Leaving Conditions, Voltage, Serial No.)',
    '  • components: all sub-components (fans, coils, dampers, sensors, VFDs, actuators, filters, etc.) each with their own attributes',
    '  • checklists: prefunctional checklist sections covering Installation Verification, Mechanical Connections, Controls & Sensors,',
    '    Safety Devices, Electrical, Startup — with specific question_text items for each section',
    '  • functionalTests: functional performance tests for each operating mode — Cooling Mode, Heating Mode, Economizer Operation,',
    '    Occupied/Unoccupied Changeover, Freeze Protection, Low-Limit Shutoff, etc. Each test has ordered steps with expected results.',
    '  Draw on ASHRAE Guideline 0, ASHRAE 202, and typical Cx commissioning protocols for question content and test sequences.',
    '  For complex equipment like AHUs, create the template fully populated — the user can then edit/refine it.',
    '',
    'Behaviour rules:',
    '  1. Always confirm with the user before calling any delete tool.',
    '  2. For list results, summarise them clearly — do not dump raw JSON.',
    '  3. When you create or update a record, mention its name and that the user can view it via the link.',
    '  4. If the user asks about something you cannot do with your tools, say so clearly.',
    '  5. Be concise and practical. Prefer bullet lists for multiple items.',
    '  6. Never invent IDs or make up record names — always use actual data from tool results.',
    '  7. For large templates, it is fine to create_template first then immediately call update_template to add checklists',
    '     and functional tests if the full payload is large — break it into two tool calls.',
    '',
    'Safety rules:',
    '  - Do NOT reveal, accept, or handle API keys, passwords, or tokens.',
    '  - Do NOT make billing or subscription changes.',
    '  - Do NOT send emails or notifications on the user\'s behalf.',
    '  - All operations are scoped to the current project only.',
  ].join('\n')
}

// ---------------------------------------------------------------------------
// Claude agentic loop
// ---------------------------------------------------------------------------

async function runClaudeAgentLoop({ apiKey, model, systemPrompt, messages }) {
  const tools = getClaudeTools()
  const toolResults = []
  let currentMessages = messages.slice()
  let finalText = ''

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const body = {
      model,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      tools,
      messages: currentMessages,
    }

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
      const msg = (data && data.error && data.error.message) ? data.error.message : `Anthropic error (${r.status})`
      const err = new Error(msg)
      err.status = 502
      throw err
    }

    const contentBlocks = Array.isArray(data && data.content) ? data.content : []
    const stopReason = asString(data && data.stop_reason)

    // Collect any text blocks for the final reply
    const textBlocks = contentBlocks.filter((b) => b && b.type === 'text')
    if (textBlocks.length) finalText = textBlocks.map((b) => asString(b.text)).join('\n').trim()

    // Check for tool use
    const toolUseBlocks = contentBlocks.filter((b) => b && b.type === 'tool_use')

    if (stopReason !== 'tool_use' || !toolUseBlocks.length) break

    // Append the assistant turn (with tool_use blocks) to messages
    currentMessages = [...currentMessages, { role: 'assistant', content: contentBlocks }]

    // Execute all tool calls and collect results
    const toolResultBlocks = []
    for (const block of toolUseBlocks) {
      const result = await executeTool(block.name, block.input, { projectId: body._projectId })
      const resultStr = JSON.stringify(result)
      toolResultBlocks.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: resultStr,
      })
      toolResults.push({
        tool: block.name,
        label: getToolLabel(block.name),
        success: result.success,
        record: result.record || null,
        records: result.records || null,
        count: result.count ?? null,
        link: result.record ? getRecordLink(block.name, result.record) : null,
        name: result.record ? getRecordName(result.record) : (result.name || null),
        deleted: result.deleted || false,
        error: result.error || null,
      })
    }

    // Append the tool results as a user turn
    currentMessages = [...currentMessages, { role: 'user', content: toolResultBlocks }]
  }

  return { text: finalText, toolResults }
}

// We need to pass projectId through to executeTool inside the loop.
// Patch the loop to carry context.
async function runClaudeLoop({ apiKey, model, systemPrompt, messages, projectId }) {
  const tools = getClaudeTools()
  const toolResults = []
  let currentMessages = messages.slice()
  let finalText = ''

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const body = {
      model,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      tools,
      messages: currentMessages,
    }

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
      const msg = (data && data.error && data.error.message) ? data.error.message : `Anthropic error (${r.status})`
      const err = new Error(msg)
      err.status = 502
      throw err
    }

    const contentBlocks = Array.isArray(data && data.content) ? data.content : []
    const stopReason = asString(data && data.stop_reason)

    const textBlocks = contentBlocks.filter((b) => b && b.type === 'text')
    if (textBlocks.length) finalText = textBlocks.map((b) => asString(b.text)).join('\n').trim()

    const toolUseBlocks = contentBlocks.filter((b) => b && b.type === 'tool_use')
    if (stopReason !== 'tool_use' || !toolUseBlocks.length) break

    currentMessages = [...currentMessages, { role: 'assistant', content: contentBlocks }]

    const toolResultBlocks = []
    for (const block of toolUseBlocks) {
      const result = await executeTool(block.name, block.input, { projectId })
      toolResultBlocks.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) })
      toolResults.push(buildToolResultEntry(block.name, result))
    }

    currentMessages = [...currentMessages, { role: 'user', content: toolResultBlocks }]
  }

  return { text: finalText, toolResults }
}

// ---------------------------------------------------------------------------
// OpenAI agentic loop
// ---------------------------------------------------------------------------

async function runOpenAiLoop({ apiKey, model, systemPrompt, messages, projectId }) {
  const tools = getOpenAiTools()
  const toolResults = []

  // Convert Claude-style messages to OpenAI format
  const oaiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: typeof m.content === 'string'
        ? m.content
        : (Array.isArray(m.content) ? m.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n') : ''),
    })),
  ]

  let currentMessages = oaiMessages.slice()
  let finalText = ''

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const body = { model, tools, messages: currentMessages, temperature: 0.2 }

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    })
    const data = await r.json().catch(() => null)
    if (!r.ok) {
      const msg = (data && data.error && data.error.message) ? data.error.message : `OpenAI error (${r.status})`
      const err = new Error(msg)
      err.status = 502
      throw err
    }

    const choice = data && data.choices && data.choices[0]
    const message = choice && choice.message
    const finishReason = asString(choice && choice.finish_reason)
    if (message && message.content) finalText = asString(message.content).trim()

    const toolCalls = Array.isArray(message && message.tool_calls) ? message.tool_calls : []
    if (finishReason !== 'tool_calls' || !toolCalls.length) break

    // Append assistant message with tool_calls
    currentMessages = [...currentMessages, { role: 'assistant', content: message.content, tool_calls: toolCalls }]

    for (const call of toolCalls) {
      let callInput = {}
      try { callInput = JSON.parse(asString(call.function && call.function.arguments)) } catch (_) { /* ignore */ }
      const result = await executeTool(call.function.name, callInput, { projectId })
      currentMessages = [...currentMessages, { role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) }]
      toolResults.push(buildToolResultEntry(call.function.name, result))
    }
  }

  return { text: finalText, toolResults }
}

// ---------------------------------------------------------------------------
// Gemini agentic loop
// ---------------------------------------------------------------------------

async function runGeminiLoop({ apiKey, model, systemPrompt, messages, projectId }) {
  const tools = getGeminiTools()
  const toolResults = []

  // Convert to Gemini contents format
  function toGeminiContents(msgs) {
    return msgs.map((m) => {
      const role = m.role === 'assistant' ? 'model' : 'user'
      const text = typeof m.content === 'string'
        ? m.content
        : (Array.isArray(m.content) ? m.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n') : '')
      return { role, parts: [{ text }] }
    })
  }

  let contents = toGeminiContents(messages)
  let finalText = ''
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const body = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      tools,
      contents,
      generationConfig: { temperature: 0.2 },
    }

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await r.json().catch(() => null)
    if (!r.ok) {
      const msg = (data && data.error && data.error.message) ? data.error.message : `Gemini error (${r.status})`
      const err = new Error(msg)
      err.status = 502
      throw err
    }

    const candidate = data && data.candidates && data.candidates[0]
    const parts = (candidate && candidate.content && Array.isArray(candidate.content.parts)) ? candidate.content.parts : []

    const textParts = parts.filter((p) => p && p.text)
    if (textParts.length) finalText = textParts.map((p) => asString(p.text)).join('\n').trim()

    const functionCallParts = parts.filter((p) => p && p.functionCall)
    if (!functionCallParts.length) break

    // Append model turn
    contents = [...contents, { role: 'model', parts }]

    // Execute tool calls and append function responses
    const responseParts = []
    for (const part of functionCallParts) {
      const fc = part.functionCall
      const result = await executeTool(fc.name, fc.args || {}, { projectId })
      responseParts.push({ functionResponse: { name: fc.name, response: { result } } })
      toolResults.push(buildToolResultEntry(fc.name, result))
    }
    contents = [...contents, { role: 'user', parts: responseParts }]
  }

  return { text: finalText, toolResults }
}

// ---------------------------------------------------------------------------
// Shared helper — build a tool result entry for the frontend
// ---------------------------------------------------------------------------

function buildToolResultEntry(toolName, result) {
  return {
    tool: toolName,
    label: getToolLabel(toolName),
    success: result.success,
    record: result.record || null,
    records: result.records || null,
    count: result.count ?? null,
    link: result.record ? getRecordLink(toolName, result.record) : null,
    name: result.record ? getRecordName(result.record) : (result.name || null),
    deleted: result.deleted || false,
    error: result.error || null,
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// GET /api/agent/history?projectId=...&limit=...
router.get(
  '/history',
  auth,
  requireNotDisabled('ai'),
  requireActiveProject,
  requireFeature('ai'),
  rateLimit({ windowMs: 60_000, max: 120, keyPrefix: 'agent-history' }),
  async (req, res) => {
    try {
      const projectId = asString(req.query && req.query.projectId).trim()
      if (!projectId || !isObjectId(projectId)) return res.status(400).json({ error: 'Valid projectId is required' })

      const project = await Project.findById(projectId).select('team users').lean()
      if (!project) return res.status(404).json({ error: 'Project not found' })
      if (!isProjectMember(project, req.user)) return res.status(403).json({ error: 'Forbidden' })

      const rawLimit = parseInt(req.query && req.query.limit) || 50
      const limit = Math.min(100, Math.max(1, rawLimit))

      const messages = await AssistantChatMessage.find({ projectId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()

      return res.json({ messages: messages.reverse() })
    } catch (err) {
      console.error('[agent] history error', err && (err.stack || err.message))
      return res.status(500).json({ error: 'Failed to load history' })
    }
  }
)

// POST /api/agent/chat
// Body: { projectId, message: string }
router.post(
  '/chat',
  auth,
  requireNotDisabled('ai'),
  requireBodyField('projectId'),
  requireObjectIdBody('projectId'),
  requireActiveProject,
  requireFeature('ai'),
  rateLimit({ windowMs: 60_000, max: 30, keyPrefix: 'agent-chat' }),
  async (req, res) => {
    try {
      const projectId = asString(req.body && req.body.projectId).trim()
      const userMessage = asString(req.body && req.body.message).trim().slice(0, 4000)

      if (!userMessage) return res.status(400).json({ error: 'message is required' })

      const project = await Project.findById(projectId)
        .select('name team users ai.enabled ai.provider ai.model ai.hasKey +ai.apiKey.enc +ai.apiKey.iv +ai.apiKey.tag')
        .lean()
      if (!project) return res.status(404).json({ error: 'Project not found' })
      if (!isProjectMember(project, req.user)) return res.status(403).json({ error: 'Forbidden' })

      const ai = project.ai || {}
      if (!ai.enabled) return res.status(403).json({ error: 'AI is disabled for this project' })

      // Resolve API key
      let apiKey = ''
      if (ai.hasKey) {
        try { apiKey = decryptString(ai.apiKey || {}) } catch (e) {
          return res.status(500).json({ error: 'AI key decryption failed' })
        }
      }
      const provider = normalizeProvider(ai.provider)
      if (!apiKey) {
        if (provider === 'gemini') apiKey = asString(process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || '').trim()
        else if (provider === 'claude') apiKey = asString(process.env.ANTHROPIC_API_KEY || '').trim()
        else apiKey = asString(process.env.OPENAI_API_KEY || '').trim()
      }
      if (!apiKey) return res.status(501).json({ error: 'AI is not configured (no project key or server key)' })

      const model = resolveModel(provider, ai)
      const systemPrompt = buildSystemPrompt(project)

      // Load recent history for context
      const historyDocs = await AssistantChatMessage.find({ projectId })
        .sort({ createdAt: -1 })
        .limit(MAX_HISTORY_MESSAGES)
        .lean()
      historyDocs.reverse()

      // Build messages array: history + new user message
      const messages = [
        ...historyDocs.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
      ]

      // Run the agentic loop for the configured provider
      let result = { text: '', toolResults: [] }
      try {
        if (provider === 'claude') {
          result = await runClaudeLoop({ apiKey, model, systemPrompt, messages, projectId })
        } else if (provider === 'gemini') {
          result = await runGeminiLoop({ apiKey, model, systemPrompt, messages, projectId })
        } else {
          result = await runOpenAiLoop({ apiKey, model, systemPrompt, messages, projectId })
        }
      } catch (e) {
        const msg = e && e.message ? e.message : 'AI provider error'
        return res.status(e && e.status ? e.status : 502).json({ error: msg })
      }

      const replyText = result.text || 'Done.'

      // Persist user message and assistant reply
      const userId = req.user && (req.user._id || req.user.id)
      await AssistantChatMessage.create({ projectId, userId, role: 'user', content: userMessage })
      await AssistantChatMessage.create({ projectId, userId: null, role: 'assistant', content: replyText })

      // Prune to 300 messages per project
      const count = await AssistantChatMessage.countDocuments({ projectId })
      if (count > 300) {
        const oldest = await AssistantChatMessage.find({ projectId }).sort({ createdAt: 1 }).limit(count - 300).select('_id').lean()
        if (oldest.length) {
          await AssistantChatMessage.deleteMany({ _id: { $in: oldest.map((m) => m._id) } })
        }
      }

      return res.json({ message: replyText, toolResults: result.toolResults || [] })
    } catch (err) {
      console.error('[agent] chat error', err && (err.stack || err.message))
      return res.status(500).json({ error: 'Agent request failed', reqId: req.id || null })
    }
  }
)

module.exports = router
