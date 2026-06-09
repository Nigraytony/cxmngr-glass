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
const multer = require('multer')
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

// Bumped from 8 — full-project scaffolds from a PDF (spaces → systems →
// templates → equipment → tasks) routinely need 12–20 iterations; 8 was
// silently truncating mid-build, leaving records partially created and
// the model's final text claiming it had finished when it hadn't.
const MAX_TOOL_ITERATIONS = 25
const MAX_HISTORY_MESSAGES = 20 // how many prior turns to include in context
// Bumped from 8192. A single fully-populated template (dozens of attributes,
// components, checklist questions and multi-step functional tests) is a large
// JSON tool call that routinely exceeded 8192 output tokens — the provider
// returned stop_reason "max_tokens" with a TRUNCATED, invalid tool call that
// either silently did nothing or created a partial record. 16384 gives a
// single record room to land; genuine overflow is now caught explicitly below.
const MAX_TOKENS = 16384
// When the model still hits the output ceiling mid-response, retry by asking it
// to split the work into smaller create_* + update_* calls (capped to avoid
// looping forever on a single oversized request).
const MAX_TRUNCATION_RETRIES = 2
// Per-call ceiling on a single provider HTTP request. Bounds a hung or slow
// provider call so one iteration can't sit silently long enough to trip an
// upstream idle timeout (or wedge the request forever). Overridable via env.
const PROVIDER_CALL_TIMEOUT_MS = Number(process.env.AGENT_PROVIDER_TIMEOUT_MS) || 120_000
// SSE keepalive — emitted while a provider call is in flight so the streamed
// connection keeps sending bytes (a long single call sends nothing on its own)
// and never goes idle long enough for Azure's ~230s HTTP ceiling to cut it.
const SSE_HEARTBEAT_MS = 15_000
const TRUNCATION_NUDGE =
  'Your previous response hit the output token limit and was cut off before it completed. ' +
  'None of the tool calls in that truncated response were executed — do NOT assume any record ' +
  'was created or updated. Redo the work in smaller steps: create the record first with the ' +
  'core fields, attributes and components, then add checklists and functional tests in one or ' +
  'more follow-up update_* calls. Continue now.'
const MAX_PDF_FILES = 3
const MAX_PDF_BYTES = 10 * 1024 * 1024 // 10 MB per file

// Accepted attachment types. PDFs and images go to the model natively (document
// / image blocks); Office + text files are extracted to text server-side.
const ACCEPTED_FILE_RE = /\.(pdf|png|jpe?g|gif|webp|docx|xlsx|xls|csv|txt|md|json|log|tsv)$/i
const ACCEPTED_MIME = new Set([
  'application/pdf',
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/csv', 'text/plain', 'text/markdown', 'application/json', 'text/tab-separated-values',
])

const uploadFiles = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_BYTES, files: MAX_PDF_FILES },
  fileFilter: (_req, file, cb) => {
    const ok = ACCEPTED_MIME.has(file.mimetype) || ACCEPTED_FILE_RE.test(file.originalname || '')
    cb(ok ? null : new Error('Unsupported file type. Accepted: PDF, images, Word, Excel, CSV, and text files.'), ok)
  },
})

// Extracted-text cap per file so a huge spreadsheet/doc can't blow the context window.
const MAX_EXTRACTED_CHARS = 100_000

// Turn one uploaded file into Claude-shaped canonical content block(s):
//  - PDF       -> document block (sent to the model natively)
//  - image/*   -> image block (vision)
//  - .docx     -> mammoth text extraction -> text block
//  - .xls(x)   -> xlsx -> per-sheet CSV -> text block
//  - text-ish  -> utf8 -> text block
async function fileToBlocks(f) {
  const name = (f.originalname && String(f.originalname)) || 'file'
  const ext = (name.split('.').pop() || '').toLowerCase()
  const mime = String(f.mimetype || '').toLowerCase()
  const b64 = () => f.buffer.toString('base64')
  const textBlock = (label, text) => ({
    type: 'text',
    text: `--- Attached file: ${name} (${label}) ---\n${String(text || '').slice(0, MAX_EXTRACTED_CHARS)}\n--- end of ${name} ---`,
  })

  if (mime === 'application/pdf' || ext === 'pdf') {
    return [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64() }, filename: name }]
  }
  if (mime.startsWith('image/') || /^(png|jpe?g|gif|webp)$/.test(ext)) {
    const mediaType = mime.startsWith('image/') ? mime : (ext === 'jpg' ? 'image/jpeg' : `image/${ext}`)
    return [{ type: 'image', source: { type: 'base64', media_type: mediaType, data: b64() } }]
  }
  if (ext === 'docx' || mime.includes('wordprocessingml')) {
    try {
      const mammoth = require('mammoth')
      const { value } = await mammoth.extractRawText({ buffer: f.buffer })
      return [textBlock('Word document', value)]
    } catch (e) {
      return [textBlock('Word document — extraction failed', '')]
    }
  }
  if (ext === 'xlsx' || ext === 'xls' || mime.includes('spreadsheetml') || mime.includes('ms-excel')) {
    try {
      const XLSX = require('xlsx')
      const wb = XLSX.read(f.buffer, { type: 'buffer' })
      const sheets = wb.SheetNames.map((sn) => `# Sheet: ${sn}\n${XLSX.utils.sheet_to_csv(wb.Sheets[sn])}`).join('\n\n')
      return [textBlock('spreadsheet', sheets)]
    } catch (e) {
      return [textBlock('spreadsheet — extraction failed', '')]
    }
  }
  // csv / txt / md / json / log / tsv and anything else accepted -> plain text
  return [textBlock('text file', f.buffer.toString('utf8'))]
}

// ---------------------------------------------------------------------------
// Helpers (shared with ai.js pattern)
// ---------------------------------------------------------------------------

function asString(v) {
  return typeof v === 'string' ? v : (v == null ? '' : String(v))
}

// Avatar mood tagging — the Agent UI shows a memoji whose expression matches
// this tag. Mirror the set in src/stores/ai.ts so frontend coercion agrees.
const ASSISTANT_MOODS = ['neutral', 'thinking', 'working', 'happy', 'surprised', 'sad', 'celebrating']
const MOOD_LINE_RE = /\s*\[mood:\s*([a-z]+)\s*\]\s*$/i

function extractMood(text) {
  const raw = asString(text)
  const m = raw.match(MOOD_LINE_RE)
  if (!m) return { message: raw.trim(), mood: 'neutral' }
  const tag = asString(m[1]).toLowerCase()
  const mood = ASSISTANT_MOODS.includes(tag) ? tag : 'neutral'
  return { message: raw.replace(MOOD_LINE_RE, '').trim(), mood }
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
  if (provider === 'claude') {
    const raw = asString(projectAi.model || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5').trim() || 'claude-sonnet-4-5'
    // Auto-upgrade retired Claude 3.x IDs to the current Sonnet
    if (/^claude-3/i.test(raw)) return 'claude-sonnet-4-5'
    return raw
  }
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
    'PDF drawing analysis & project scaffolding:',
    '  When the user uploads drawings (floor plans, equipment schedules, P&IDs, mechanical plans):',
    '  1. EXTRACT first — identify space hierarchy (building → floors → rooms/zones), all equipment with',
    '     tags and types, system groupings (HVAC, Plumbing, Electrical, Controls, etc.), and design parameters.',
    '  2. SUMMARISE your reading back to the user before building — confirm your interpretation in plain English.',
    '  3. CHECK current state with get_project_summary first. If records already exist, ASK before bulk-creating.',
    '  4. BUILD in this order:',
    '     a. Spaces — building first, then floors, then rooms/areas (set parentSpace to nest).',
    '     b. Systems — one per major system family.',
    '     c. Templates — call list_templates first; only create new ones for types not already defined.',
    '     d. Equipment — use apply_template_to_equipment for each item so checklists and FPTs are inherited;',
    '        link spaceId and system; set a free-text location for convenience.',
    '     e. Tasks — standard Cx phase tasks (Design Review, Submittal Review, Prefunctional, Functional Testing,',
    '        Seasonal Testing, Training, Closeout).',
    '  5. GAPS — if a tag is illegible, a system is ambiguous, or a drawing is incomplete, stop and ask one',
    '     focused question before proceeding.',
    '  6. BATCH sensibly — create all spaces first, then systems, then templates, then equipment. Tell the user',
    '     what you are about to do and how many records before a large batch.',
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
    'Functional test structure — IMPORTANT:',
    '  Every test MUST set kind to either "sequence" or "standard".',
    '  • kind = "sequence" — for CONTROL SEQUENCE tests (Cooling Mode, Heating Mode, Economizer, Occupied/Unoccupied',
    '    Changeover, Freeze Protection, Low-Limit Shutoff, Smoke/Fire Response, VAV Reset, etc.).',
    '    Provide rows: [{ step, expected, actual }]. This is the common kind — when in doubt, use sequence.',
    '  • kind = "standard" — only for POINTS / TABULAR verification (BAS Points Verification, Sensor Calibration,',
    '    Nameplate vs Design Table, Damper Stroke Test, etc.).',
    '    Provide columns: ["System Point","BAS","Field","Offset","Pass"] (or a custom header list) and',
    '    tableRows: [{ "System Point":"...", "BAS":"...", ... }] keyed by column name.',
    '  NEVER provide rows in sequence format on a standard test (and vice-versa) — the UI will render empty.',
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
    '  8. CRITICAL: Never describe a record as "created", "added", or "saved" unless the corresponding create_* /',
    '     apply_template_to_equipment tool actually returned success in this conversation. Do NOT compose a',
    '     summary that claims artifacts exist before the tool calls have actually been issued. If you announce',
    '     a build plan, the very next assistant turn must be the tool calls — not more prose.',
    '  9. Prefer batching: when you need to create N spaces, emit N tool_use blocks in a single response so they',
    '     all run in parallel. Same for systems, templates, equipment, and tasks. Sequential one-per-turn calls',
    '     can exhaust the iteration budget on large projects.',
    '  10. If you genuinely run out of room, end the turn with a clear status: "I created A, B, C. Reply',
    '      \'continue\' to keep going with D, E, F." — never pretend the work is finished.',
    '  11. To VERIFY equipment (e.g. the user asks "are you sure?" or "did that get created?"), call get_equipment',
    '      and report its actual content counts (attributes, components, checklist sections/questions, functional',
    '      tests). list_equipment only confirms a record exists, not that template content was applied. Never claim',
    '      something is verified without a tool result backing it.',
    '',
    'Editing a Cx Plan activity description (or any rich-text section bounded by markers):',
    '  Activities of type "Cx Plan" carry a long descriptionHtml document. Auto-generated blocks inside',
    '  it are wrapped in HTML comment markers shaped like:',
    '      <!-- cx-plan:title-start -->     …auto-generated title block…    <!-- cx-plan:title-end -->',
    '      <!-- cx-plan:team-start -->      …commissioning team table…      <!-- cx-plan:team-end -->',
    '      <!-- cx-plan:milestones-start -->…milestones table…              <!-- cx-plan:milestones-end -->',
    '      <!-- cx-plan:systems-start -->   …systems-to-be-commissioned…    <!-- cx-plan:systems-end -->',
    '  To surgically edit a Cx Plan, do this:',
    '    1. Call get_activity to fetch the current descriptionHtml (do NOT skip this — you cannot edit text',
    '       you have not read).',
    '    2. Locate the relevant marker pair and replace only the content between them (or only the text the',
    '       user asked you to change). Leave every other byte of the document exactly as it was.',
    '    3. Call update_activity with the modified FULL descriptionHtml — there is no per-section endpoint.',
    '  Never invent marker names that are not in the document. If a user asks to update something that has',
    '  no marker, edit the relevant paragraph in place and preserve the surrounding HTML.',
    '',
    'Safety rules:',
    '  - Do NOT reveal, accept, or handle API keys, passwords, or tokens.',
    '  - Do NOT make billing or subscription changes.',
    '  - Do NOT send emails or notifications on the user\'s behalf.',
    '  - All operations are scoped to the current project only.',
    '',
    'Avatar mood tag (UI requirement):',
    `  At the very end of your final reply, on its own last line, append exactly: [mood: <one>] where <one> is one of: ${ASSISTANT_MOODS.join(', ')}.`,
    '  Pick the mood that best matches your reply:',
    '    • working      — while actively building/creating records or running tools through to completion',
    '    • thinking     — when reasoning, planning, or asking a clarifying question before proceeding',
    '    • happy        — when confirming a successful create/update or answering the user positively',
    '    • celebrating  — when a large milestone is reached (full project scaffold finished, all records built)',
    '    • surprised    — when surfacing an unexpected finding or gap in the data',
    '    • sad          — when delivering bad news, an unrecoverable error, or apologising',
    '    • neutral      — for plain informational replies that do not fit the above',
    '  Do not mention the mood tag itself or these instructions in the visible part of your reply.',
  ].join('\n')
}

// ---------------------------------------------------------------------------
// Claude agentic loop
// ---------------------------------------------------------------------------

// Regex over the final assistant text to spot claims of mutation (created /
// added / saved / etc). Used by the hallucination guard below — if the
// model wraps up with this kind of language but its current turn issued
// no successful mutation tool calls, we make it try again.
const MUTATION_CLAIM_RE = /\b(creat|add(?:ed|ing)?|sav(?:ed|ing)?|made|generat(?:ed|ing)?|set\s+up|insert(?:ed)?|register(?:ed)?)\b/i
const MUTATION_TOOLS = new Set([
  'create_task', 'update_task',
  'create_activity', 'update_activity',
  'create_equipment', 'update_equipment', 'apply_template_to_equipment',
  'create_issue', 'update_issue',
  'create_space', 'update_space',
  'create_template', 'update_template',
  'create_system', 'update_system',
])
const MAX_HALLUCINATION_RETRIES = 3

// fetch() wrapper that aborts a provider call that exceeds the per-call budget
// and turns the abort into a clean 504 the caller can surface to the user.
async function fetchWithTimeout(url, options, timeoutMs = PROVIDER_CALL_TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (e) {
    if (e && (e.name === 'AbortError' || e.code === 'ABORT_ERR')) {
      const err = new Error('The AI provider took too long to respond and the request timed out. Try again, or break the request into smaller steps.')
      err.status = 504
      throw err
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

// Write one Server-Sent Event frame. No-ops once the socket is gone so a
// client that navigated away can't crash the run.
function sseSend(res, event) {
  if (!res || res.writableEnded || res.destroyed) return
  try {
    res.write(`data: ${JSON.stringify(event)}\n\n`)
    if (typeof res.flush === 'function') res.flush()
  } catch (_) { /* socket closed mid-write */ }
}

function sseComment(res, text) {
  if (!res || res.writableEnded || res.destroyed) return
  try { res.write(`: ${text}\n\n`) } catch (_) { /* ignore */ }
}

async function runClaudeLoop({ apiKey, model, systemPrompt, messages, projectId, emit, isAborted }) {
  const tools = getClaudeTools()
  const toolResults = []

  // Strip the non-standard `filename` field we attach to document blocks for
  // the OpenAI translator's use. Anthropic's request schema is strict and
  // returns 400 with `message.N.content.K.document.filename: Extra inputs are
  // not permitted` if we forward unknown fields on a document block.
  function sanitizeForClaude(content) {
    if (typeof content === 'string') return content
    if (!Array.isArray(content)) return content
    return content.map((b) => {
      if (!b || typeof b !== 'object') return b
      if (b.type === 'document') {
        // eslint-disable-next-line no-unused-vars
        const { filename, ...rest } = b
        return rest
      }
      return b
    })
  }
  let currentMessages = messages.map((m) => ({ ...m, content: sanitizeForClaude(m.content) }))
  let finalText = ''
  let hallucinationRetries = 0
  let truncationRetries = 0

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    if (isAborted && isAborted()) break
    if (emit) emit({ type: 'status', text: iteration === 0 ? 'Thinking…' : 'Working…' })
    const body = {
      model,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      tools,
      messages: currentMessages,
    }

    const r = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
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
    const turnText = textBlocks.map((b) => asString(b.text)).join('\n').trim()
    if (turnText) finalText = turnText

    const toolUseBlocks = contentBlocks.filter((b) => b && b.type === 'tool_use')

    // Truncation guard: the model hit the output token ceiling mid-response.
    // Any tool_use block in this turn is cut off — its input JSON is incomplete
    // and unsafe to execute (it would create a partial record), so we drop the
    // tool blocks entirely, keep only any complete text, and ask the model to
    // redo the work in smaller create_* + update_* steps.
    if (stopReason === 'max_tokens' && truncationRetries < MAX_TRUNCATION_RETRIES) {
      truncationRetries++
      const textOnly = contentBlocks.filter((b) => b && b.type === 'text')
      currentMessages = [
        ...currentMessages,
        { role: 'assistant', content: textOnly.length ? textOnly : [{ type: 'text', text: '(response truncated)' }] },
        { role: 'user', content: [{ type: 'text', text: TRUNCATION_NUDGE }] },
      ]
      continue
    }

    // Hallucination guard: the model is ending the turn (no tool calls) but
    // its text claims it just created / added / saved something. Reject the
    // turn, push a corrective user message back into the conversation, and
    // let the loop continue so the model can actually issue the tool calls.
    if (
      (stopReason !== 'tool_use' || !toolUseBlocks.length)
      && turnText
      && MUTATION_CLAIM_RE.test(turnText)
      && hallucinationRetries < MAX_HALLUCINATION_RETRIES
    ) {
      hallucinationRetries++
      currentMessages = [
        ...currentMessages,
        { role: 'assistant', content: contentBlocks },
        {
          role: 'user',
          content: [{
            type: 'text',
            text: 'STOP. Your last reply described records as created/added/saved but you did NOT call any create_* or apply_template_to_equipment tool in that response. Do not claim work that was not performed by a tool call. Either (a) call the appropriate tools now to actually perform the work, or (b) rewrite your reply without the claim. Do this immediately.',
          }],
        },
      ]
      continue
    }

    if (stopReason !== 'tool_use' || !toolUseBlocks.length) break

    currentMessages = [...currentMessages, { role: 'assistant', content: contentBlocks }]

    const toolResultBlocks = []
    let successfulMutationsThisTurn = 0
    if (emit) emit({ type: 'status', text: 'Running actions…' })
    for (const block of toolUseBlocks) {
      const result = await executeTool(block.name, block.input, { projectId })
      toolResultBlocks.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) })
      const entry = buildToolResultEntry(block.name, result)
      toolResults.push(entry)
      if (emit) emit({ type: 'tool', entry })
      if (result && result.success && MUTATION_TOOLS.has(block.name)) successfulMutationsThisTurn++
    }
    // Successful mutation work resets the hallucination budget so a model
    // that occasionally slips at the very end of a long, otherwise-correct
    // run doesn't get falsely accused.
    if (successfulMutationsThisTurn > 0) hallucinationRetries = 0

    currentMessages = [...currentMessages, { role: 'user', content: toolResultBlocks }]
  }

  return { text: finalText, toolResults }
}

// ---------------------------------------------------------------------------
// OpenAI agentic loop
// ---------------------------------------------------------------------------

async function runOpenAiLoop({ apiKey, model, systemPrompt, messages, projectId, emit, isAborted }) {
  const tools = getOpenAiTools()
  const toolResults = []

  // Translate one message's content from the Claude-shaped canonical format
  // to OpenAI's chat-completions content shape. PDFs land as `type: 'file'`
  // blocks with `file_data` as a base64 data URL — supported on gpt-4o,
  // gpt-4o-mini, and o1.
  function toOpenAiContent(content) {
    if (typeof content === 'string') return content
    if (!Array.isArray(content)) return ''
    const parts = []
    for (const b of content) {
      if (!b) continue
      if (b.type === 'text') {
        parts.push({ type: 'text', text: asString(b.text) })
      } else if (b.type === 'document' && b.source && b.source.type === 'base64') {
        const mediaType = asString(b.source.media_type) || 'application/pdf'
        const data = asString(b.source.data)
        if (!data) continue
        parts.push({
          type: 'file',
          file: {
            filename: asString(b.filename) || 'document.pdf',
            file_data: `data:${mediaType};base64,${data}`,
          },
        })
      } else if (b.type === 'image' && b.source && b.source.type === 'base64') {
        const mediaType = asString(b.source.media_type) || 'image/png'
        const data = asString(b.source.data)
        if (!data) continue
        parts.push({ type: 'image_url', image_url: { url: `data:${mediaType};base64,${data}` } })
      }
    }
    // Collapse to a plain string when there's only a single text block —
    // keeps the wire format identical to the pre-PDF-support path so the
    // happy path is unchanged for text-only chats.
    if (parts.length === 1 && parts[0].type === 'text') return parts[0].text
    return parts
  }

  // Convert Claude-shaped messages to OpenAI format
  const oaiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: toOpenAiContent(m.content),
    })),
  ]

  let currentMessages = oaiMessages.slice()
  let finalText = ''
  let truncationRetries = 0

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    if (isAborted && isAborted()) break
    if (emit) emit({ type: 'status', text: iteration === 0 ? 'Thinking…' : 'Working…' })
    const body = { model, tools, messages: currentMessages, temperature: 0.2 }

    const r = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
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

    // Truncation guard — see runClaudeLoop. A 'length' finish means the
    // response (possibly mid tool_call) was cut off; don't execute the partial
    // call, ask for smaller steps instead.
    if (finishReason === 'length' && truncationRetries < MAX_TRUNCATION_RETRIES) {
      truncationRetries++
      currentMessages = [
        ...currentMessages,
        { role: 'assistant', content: asString(message && message.content) || '(response truncated)' },
        { role: 'user', content: TRUNCATION_NUDGE },
      ]
      continue
    }

    if (finishReason !== 'tool_calls' || !toolCalls.length) break

    // Append assistant message with tool_calls
    currentMessages = [...currentMessages, { role: 'assistant', content: message.content, tool_calls: toolCalls }]

    if (emit) emit({ type: 'status', text: 'Running actions…' })
    for (const call of toolCalls) {
      let callInput = {}
      try { callInput = JSON.parse(asString(call.function && call.function.arguments)) } catch (_) { /* ignore */ }
      const result = await executeTool(call.function.name, callInput, { projectId })
      currentMessages = [...currentMessages, { role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) }]
      const entry = buildToolResultEntry(call.function.name, result)
      toolResults.push(entry)
      if (emit) emit({ type: 'tool', entry })
    }
  }

  return { text: finalText, toolResults }
}

// ---------------------------------------------------------------------------
// Gemini agentic loop
// ---------------------------------------------------------------------------

async function runGeminiLoop({ apiKey, model, systemPrompt, messages, projectId, emit, isAborted }) {
  const tools = getGeminiTools()
  const toolResults = []

  // Translate one message's content to Gemini parts. PDFs become inline_data
  // blocks with mime_type=application/pdf — supported across the
  // gemini-1.5-* and gemini-2.0-* families.
  function toGeminiParts(content) {
    if (typeof content === 'string') return [{ text: content }]
    if (!Array.isArray(content)) return [{ text: '' }]
    const parts = []
    for (const b of content) {
      if (!b) continue
      if (b.type === 'text') {
        parts.push({ text: asString(b.text) })
      } else if ((b.type === 'document' || b.type === 'image') && b.source && b.source.type === 'base64') {
        const data = asString(b.source.data)
        if (!data) continue
        parts.push({
          inline_data: {
            mime_type: asString(b.source.media_type) || (b.type === 'image' ? 'image/png' : 'application/pdf'),
            data,
          },
        })
      }
    }
    return parts.length ? parts : [{ text: '' }]
  }

  // Convert Claude-shaped messages to Gemini contents format
  function toGeminiContents(msgs) {
    return msgs.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: toGeminiParts(m.content),
    }))
  }

  let contents = toGeminiContents(messages)
  let finalText = ''
  let truncationRetries = 0
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    if (isAborted && isAborted()) break
    if (emit) emit({ type: 'status', text: iteration === 0 ? 'Thinking…' : 'Working…' })
    const body = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      tools,
      contents,
      generationConfig: { temperature: 0.2 },
    }

    const r = await fetchWithTimeout(url, {
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
    const finishReason = asString(candidate && candidate.finishReason)
    const parts = (candidate && candidate.content && Array.isArray(candidate.content.parts)) ? candidate.content.parts : []

    const textParts = parts.filter((p) => p && p.text)
    if (textParts.length) finalText = textParts.map((p) => asString(p.text)).join('\n').trim()

    const functionCallParts = parts.filter((p) => p && p.functionCall)

    // Truncation guard — see runClaudeLoop. Drop the (possibly partial) turn
    // and ask the model to redo the work in smaller steps.
    if (finishReason === 'MAX_TOKENS' && truncationRetries < MAX_TRUNCATION_RETRIES) {
      truncationRetries++
      contents = [
        ...contents,
        { role: 'model', parts: textParts.length ? textParts : [{ text: '(response truncated)' }] },
        { role: 'user', parts: [{ text: TRUNCATION_NUDGE }] },
      ]
      continue
    }

    if (!functionCallParts.length) break

    // Append model turn
    contents = [...contents, { role: 'model', parts }]

    // Execute tool calls and append function responses
    const responseParts = []
    if (emit) emit({ type: 'status', text: 'Running actions…' })
    for (const part of functionCallParts) {
      const fc = part.functionCall
      const result = await executeTool(fc.name, fc.args || {}, { projectId })
      responseParts.push({ functionResponse: { name: fc.name, response: { result } } })
      const entry = buildToolResultEntry(fc.name, result)
      toolResults.push(entry)
      if (emit) emit({ type: 'tool', entry })
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

// Ground a replayed assistant turn in what its tool calls ACTUALLY did. The
// history store keeps only text, so without this the model sees its own past
// "✅ created…" prose with zero evidence of tool calls and learns to imitate
// the prose while skipping the tools — a self-reinforcing hallucination loop.
// Appending the real ledger (or an explicit "no tools were executed") breaks
// it. Older messages predate the toolResults field and get no note.
function groundAssistantContent(doc) {
  const content = asString(doc && doc.content)
  if (!doc || doc.role !== 'assistant' || !Array.isArray(doc.toolResults)) return content
  const tr = doc.toolResults
  if (!tr.length) {
    return `${content}\n\n[history note: NO tools were executed in this turn — nothing was created, updated, or deleted.]`
  }
  const parts = tr.slice(0, 40).map((t) => {
    const label = getToolLabel(t.tool) || asString(t.tool)
    const nm = t.name ? ` "${t.name}"` : ''
    return `${label}${nm} ${t.success ? '✓' : '✗ (failed)'}`
  })
  return `${content}\n\n[history note: tools actually executed this turn: ${parts.join(', ')}]`
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
// Accepts both application/json and multipart/form-data.
// JSON body:      { projectId, message }
// multipart form: projectId, message, files[] (up to 3 files, 10 MB each:
//                 PDF, images, Word/Excel, CSV, text)
router.post(
  '/chat',
  auth,
  requireNotDisabled('ai'),
  (req, res, next) => {
    const ct = asString(req.headers && req.headers['content-type']).toLowerCase()
    if (ct.startsWith('multipart/form-data')) {
      return uploadFiles.array('files', MAX_PDF_FILES)(req, res, (err) => {
        if (err) {
          const msg = err && err.message ? err.message : 'Upload failed'
          return res.status(400).json({ error: msg })
        }
        return next()
      })
    }
    return next()
  },
  requireBodyField('projectId'),
  requireObjectIdBody('projectId'),
  requireActiveProject,
  requireFeature('ai'),
  rateLimit({ windowMs: 60_000, max: 30, keyPrefix: 'agent-chat' }),
  async (req, res) => {
    // Hoisted so the catch can tear down a half-open SSE stream cleanly.
    let streaming = false
    let heartbeat = null
    try {
      const projectId = asString(req.body && req.body.projectId).trim()
      const userMessage = asString(req.body && req.body.message).trim().slice(0, 4000)
      const pdfFiles = Array.isArray(req.files) ? req.files.filter((f) => f && f.buffer) : []

      if (!userMessage && !pdfFiles.length) return res.status(400).json({ error: 'message is required' })

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

      // Provider-specific PDF size limits (per the provider docs):
      //   OpenAI:  32 MB total / 100 pages per request
      //   Gemini:  20 MB total per request (inline-data mode)
      //   Claude:  generous (validated by Anthropic at request time)
      // Our own upload cap is 30 MB total (3 files × 10 MB). The Gemini path
      // can therefore exceed its provider limit if the user uploads >20 MB
      // and is on Gemini — we let the provider's error surface through the
      // existing 502 catch rather than gating it here, but log a heads-up.
      const totalPdfBytes = pdfFiles.reduce((sum, f) => sum + (f && f.buffer ? f.buffer.length : 0), 0)
      if (pdfFiles.length && provider === 'gemini' && totalPdfBytes > 20 * 1024 * 1024) {
        console.warn('[agent] gemini PDF payload exceeds 20 MB; request may be rejected by the API')
      }

      // Load recent history for context
      const historyDocs = await AssistantChatMessage.find({ projectId })
        .sort({ createdAt: -1 })
        .limit(MAX_HISTORY_MESSAGES)
        .lean()
      historyDocs.reverse()

      // Build the new user turn. With PDFs attached, content is an array of
      // document blocks (Claude-shaped, used as the canonical intermediate
      // format) followed by the text message. Each provider loop transforms
      // these blocks to its native PDF format:
      //   - Claude: passed through as-is (it's already its native shape).
      //   - OpenAI: → { type: 'file', file: { filename, file_data: data:... } }
      //   - Gemini: → { inline_data: { mime_type, data } }
      // The non-standard `filename` field on each block is ignored by Claude
      // but used by the OpenAI mapper for the file.filename attribute.
      const messageText = userMessage || 'Please analyse the attached file(s).'
      let newUserContent = messageText
      if (pdfFiles.length) {
        const fileBlocks = []
        for (const f of pdfFiles) {
          try {
            const blocks = await fileToBlocks(f)
            for (const b of blocks) fileBlocks.push(b)
          } catch (e) {
            console.warn('[agent] failed to process attachment', f && f.originalname, e && e.message)
          }
        }
        newUserContent = [...fileBlocks, { type: 'text', text: messageText }]
      }

      const messages = [
        ...historyDocs.map((m) => ({ role: m.role, content: groundAssistantContent(m) })),
        { role: 'user', content: newUserContent },
      ]

      // Streaming vs buffered response. The frontend opts in with
      // `Accept: text/event-stream`. Everything above still answers with normal
      // JSON on error — we only switch the response to SSE here, right before
      // the (potentially minutes-long) agentic loop runs.
      streaming = asString(req.headers && req.headers.accept).includes('text/event-stream')
        || asString(req.query && req.query.stream) === '1'

      let aborted = false
      if (streaming) {
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
        res.setHeader('Cache-Control', 'no-cache, no-transform')
        res.setHeader('Connection', 'keep-alive')
        res.setHeader('X-Accel-Buffering', 'no') // ask nginx/Azure not to buffer the stream
        // Don't let Node's socket timeout cut a long build short — the
        // heartbeat below is what keeps the upstream proxy from idling out.
        if (typeof req.setTimeout === 'function') req.setTimeout(0)
        if (typeof res.setTimeout === 'function') res.setTimeout(0)
        res.flushHeaders()
        sseComment(res, 'open')
        heartbeat = setInterval(() => sseComment(res, 'ping'), SSE_HEARTBEAT_MS)
        // Client navigated away / closed the tab — stop spending on provider
        // calls between iterations (the in-flight call still finishes).
        req.on('close', () => { aborted = true })
      }
      const emit = streaming ? (ev) => sseSend(res, ev) : null

      // Run the agentic loop for the configured provider
      let result = { text: '', toolResults: [] }
      try {
        const loopOpts = { apiKey, model, systemPrompt, messages, projectId, emit, isAborted: () => aborted }
        if (provider === 'claude') {
          result = await runClaudeLoop(loopOpts)
        } else if (provider === 'gemini') {
          result = await runGeminiLoop(loopOpts)
        } else {
          result = await runOpenAiLoop(loopOpts)
        }
      } catch (e) {
        const msg = e && e.message ? e.message : 'AI provider error'
        if (heartbeat) { clearInterval(heartbeat); heartbeat = null }
        if (streaming) {
          sseSend(res, { type: 'error', error: msg })
          return res.end()
        }
        return res.status(e && e.status ? e.status : 502).json({ error: msg })
      }
      if (heartbeat) { clearInterval(heartbeat); heartbeat = null }

      const rawReplyText = result.text || 'Done.'
      const { message: replyText, mood } = extractMood(rawReplyText)

      // Persist user message and assistant reply. PDF content blocks are not
      // stored — we keep only the text portion so history stays compact.
      const userId = req.user && (req.user._id || req.user.id)
      const attachmentSuffix = pdfFiles.length ? ` (📎 ${pdfFiles.length} PDF${pdfFiles.length === 1 ? '' : 's'} attached)` : ''
      await AssistantChatMessage.create({
        projectId,
        userId,
        role: 'user',
        content: (userMessage || messageText) + attachmentSuffix,
      })
      // Persist a compact ledger of what actually ran so future turns replay
      // grounded in reality (see groundAssistantContent). Capped and stripped
      // of record payloads to keep history small.
      const persistedToolResults = (result.toolResults || []).slice(0, 50).map((t) => ({
        tool: asString(t && t.tool),
        name: asString((t && t.name) || ''),
        success: Boolean(t && t.success),
      }))
      await AssistantChatMessage.create({
        projectId,
        userId: null,
        role: 'assistant',
        content: replyText,
        toolResults: persistedToolResults,
      })

      // Prune to 300 messages per project
      const count = await AssistantChatMessage.countDocuments({ projectId })
      if (count > 300) {
        const oldest = await AssistantChatMessage.find({ projectId }).sort({ createdAt: 1 }).limit(count - 300).select('_id').lean()
        if (oldest.length) {
          await AssistantChatMessage.deleteMany({ _id: { $in: oldest.map((m) => m._id) } })
        }
      }

      if (streaming) {
        sseSend(res, { type: 'done', message: replyText, mood, toolResults: result.toolResults || [] })
        return res.end()
      }
      return res.json({ message: replyText, mood, toolResults: result.toolResults || [] })
    } catch (err) {
      console.error('[agent] chat error', err && (err.stack || err.message))
      if (heartbeat) { clearInterval(heartbeat); heartbeat = null }
      // If we've already switched to SSE, headers are flushed — surface the
      // failure as a stream event instead of a (now-impossible) JSON response.
      if (streaming || res.headersSent) {
        sseSend(res, { type: 'error', error: 'Agent request failed' })
        try { return res.end() } catch (_) { return undefined }
      }
      return res.status(500).json({ error: 'Agent request failed', reqId: req.id || null })
    }
  }
)

// Exposed for unit tests — the SSE wire format and the per-call timeout are the
// fragile new primitives worth testing without standing up the full route.
router._internals = { fetchWithTimeout, sseSend, sseComment }

module.exports = router
