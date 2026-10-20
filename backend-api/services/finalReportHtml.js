/**
 * HTML template builder for the Cx Final Report PDF pipeline.
 *
 * Takes a FinalReport (loaded from Mongo), a Project, and a map of
 * section data (refreshed from the data-source providers) and returns
 * a self-contained HTML string ready for Puppeteer to render.
 *
 * Kept in its own file (separate from the Puppeteer driver) so the
 * template can be unit-tested without spinning up a browser.
 */

const fs = require('fs')
const path = require('path')
const sanitizeHtml = require('sanitize-html')

function asString(v) {
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}

// ---------------------------------------------------------------------------
// Brand typography: IBM Plex (the app-wide report font), embedded as base64
// @font-face so Puppeteer renders offline with no asset server. Files are
// latin subsets (~60KB each); the CSS is built once per process.
// ---------------------------------------------------------------------------
let fontCssCache = null
function buildFontCss() {
  if (fontCssCache !== null) return fontCssCache
  const dir = path.join(__dirname, '..', 'assets', 'fonts', 'IBMPlex')
  const faces = [
    ['IBMPlexSans-Regular.ttf', 'IBM Plex Sans', 400, 'normal'],
    ['IBMPlexSans-Italic.ttf', 'IBM Plex Sans', 400, 'italic'],
    ['IBMPlexSans-SemiBold.ttf', 'IBM Plex Sans', 600, 'normal'],
    ['IBMPlexSans-SemiBoldItalic.ttf', 'IBM Plex Sans', 600, 'italic'],
    ['IBMPlexMono-Regular.ttf', 'IBM Plex Mono', 400, 'normal'],
  ]
  try {
    fontCssCache = faces
      .map(([file, family, weight, style]) => {
        const b64 = fs.readFileSync(path.join(dir, file)).toString('base64')
        return `@font-face{font-family:'${family}';font-weight:${weight};font-style:${style};src:url(data:font/ttf;base64,${b64}) format('truetype');}`
      })
      .join('\n')
  } catch (e) {
    fontCssCache = '' // fall back to the system stack below
  }
  return fontCssCache
}

function escapeHtml(s) {
  return asString(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDate(d) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch (_) {
    return ''
  }
}

function safeProse(html) {
  // Strip anything not on the allow-list. Same shape as the description
  // sanitizer used elsewhere in the app; tables/blockquotes/lists allowed.
  return sanitizeHtml(asString(html), {
    allowedTags: [
      'p', 'div', 'span', 'br', 'strong', 'em', 'u', 's', 'a',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'blockquote', 'hr', 'code', 'pre',
    ],
    allowedAttributes: {
      a: ['href', 'name', 'target'],
      td: ['colspan', 'rowspan', 'style'],
      th: ['colspan', 'rowspan', 'style'],
      table: ['style'],
      div: ['style'],
      span: ['style'],
    },
  })
}

// =========================================================================
// Per-data-source HTML renderers (mirror src/components/finalReport/DataSectionTable.vue).
// Each takes the section's refreshed payload and returns an HTML fragment.
// =========================================================================

function tableOpen() {
  return '<table class="data-table">'
}

function emptyRow(colspan, message) {
  return `<tr><td colspan="${colspan}" class="empty-row">${escapeHtml(message)}</td></tr>`
}

function renderProjectDescription(data) {
  if (!data) return '<p class="muted">No project metadata available.</p>'
  const meta = [
    data.client && `<strong>Client:</strong> ${escapeHtml(data.client)}`,
    data.location && `<strong>Location:</strong> ${escapeHtml(data.location)}`,
    data.buildingType && `<strong>Building type:</strong> ${escapeHtml(data.buildingType)}`,
    data.startDate && `<strong>Start:</strong> ${formatDate(data.startDate)}`,
    data.endDate && `<strong>End:</strong> ${formatDate(data.endDate)}`,
  ]
    .filter(Boolean)
    .join(' &nbsp;·&nbsp; ')
  const desc = data.description
    ? `<p>${escapeHtml(data.description).replace(/\n/g, '<br>')}</p>`
    : '<p class="muted">No project description provided.</p>'
  return `<div class="meta-row">${meta}</div>${desc}`
}

function renderRevisions(data) {
  const rows = data && Array.isArray(data.rows) ? data.rows : []
  if (!rows.length) {
    return `${tableOpen()}<thead><tr><th>Version</th><th>Summary</th><th>Reviser</th><th>Date</th></tr></thead><tbody>${emptyRow(4, 'No revisions recorded.')}</tbody></table>`
  }
  const body = rows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.versionLabel || '—')}</td><td>${escapeHtml(r.summary || '—')}</td><td>${escapeHtml(r.reviser || '—')}</td><td>${formatDate(r.date)}</td></tr>`,
    )
    .join('')
  return `${tableOpen()}<thead><tr><th>Version</th><th>Summary</th><th>Reviser</th><th>Date</th></tr></thead><tbody>${body}</tbody></table>`
}

function renderOpr(data) {
  const rows = data && Array.isArray(data.rows) ? data.rows : []
  if (!rows.length) {
    return `${tableOpen()}<thead><tr><th class="r w-rank">Rank</th><th>Item</th><th>Score</th><th>Category</th></tr></thead><tbody>${emptyRow(4, 'No active OPR items.')}</tbody></table>`
  }
  const body = rows
    .map(
      (r) =>
        `<tr><td class="r">${escapeHtml(r.rank)}</td><td>${escapeHtml(r.text)}</td><td class="r">${escapeHtml(r.score)}</td><td>${escapeHtml(r.category)}</td></tr>`,
    )
    .join('')
  return `${tableOpen()}<thead><tr><th class="r w-rank">Rank</th><th>Item</th><th class="r w-score">Score</th><th class="w-cat">Category</th></tr></thead><tbody>${body}</tbody></table>`
}

function renderTasks(data) {
  const rows = data && Array.isArray(data.rows) ? data.rows : []
  if (!rows.length) {
    return `${tableOpen()}<thead><tr><th>WBS</th><th>Milestone</th><th>Start</th><th>End</th><th>%</th><th>Status</th></tr></thead><tbody>${emptyRow(6, 'No tasks defined for this project.')}</tbody></table>`
  }
  const body = rows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.wbs || '—')}</td><td>${escapeHtml(r.name)}</td><td>${formatDate(r.start)}</td><td>${formatDate(r.end)}</td><td class="r">${escapeHtml(r.percentComplete)}%</td><td>${escapeHtml(r.status)}</td></tr>`,
    )
    .join('')
  return `${tableOpen()}<thead><tr><th class="w-wbs">WBS</th><th>Milestone</th><th>Start</th><th>End</th><th class="r">%</th><th>Status</th></tr></thead><tbody>${body}</tbody></table>`
}

function renderCommissionedSystems(data) {
  const rows = data && Array.isArray(data.rows) ? data.rows : []
  if (!rows.length) {
    return `${tableOpen()}<thead><tr><th>System</th><th>Qty</th><th>PFPT %</th><th>BAS %</th><th>TAB %</th><th>FPT %</th></tr></thead><tbody>${emptyRow(6, 'No commissioned systems recorded.')}</tbody></table>`
  }
  const body = rows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.system)}</td><td class="r">${r.quantity}</td><td class="r">${r.pfptPct}%</td><td class="r">${r.basPct}%</td><td class="r">${r.tabPct}%</td><td class="r">${r.fptPct}%</td></tr>`,
    )
    .join('')
  return `${tableOpen()}<thead><tr><th>Commissioned System</th><th class="r">Qty</th><th class="r">PFPT %</th><th class="r">BAS %</th><th class="r">TAB %</th><th class="r">FPT %</th></tr></thead><tbody>${body}</tbody></table>`
}

function renderActivitiesByPhase(data) {
  const groups = data && Array.isArray(data.groups) ? data.groups : []
  const nonEmpty = groups.filter((g) => Array.isArray(g.rows) && g.rows.length)
  if (!nonEmpty.length) return '<p class="muted">No activities recorded.</p>'
  return nonEmpty
    .map((g) => {
      const body = g.rows
        .map(
          (r) =>
            `<tr><td>${formatDate(r.startDate)}</td><td>${escapeHtml(r.type)}</td><td><strong>${escapeHtml(r.name)}</strong>${r.descriptionPreview ? `<div class="preview">${escapeHtml(r.descriptionPreview)}</div>` : ''}</td><td>${escapeHtml(r.milestone || '—')}</td><td class="r">${r.issueCount}</td></tr>`,
        )
        .join('')
      return `<h3 class="phase-heading">${escapeHtml(g.label)} <span class="muted">· ${g.rows.length}</span></h3>${tableOpen()}<thead><tr><th>Date</th><th>Type</th><th>Activity</th><th>Milestone</th><th class="r">Issues</th></tr></thead><tbody>${body}</tbody></table>`
    })
    .join('')
}

function oprStatusLabel(s) {
  switch (asString(s).toLowerCase()) {
    case 'pass': return 'Verified'
    case 'fail': return 'Deviation'
    case 'na': return 'N/A'
    default: return 'Unverified'
  }
}

function renderOprCoverage(data) {
  const rows = data && Array.isArray(data.rows) ? data.rows : []
  const summary = data
    ? `<div class="summary-pills"><span class="pill pill-pass">✓ Verified · ${data.verifiedCount || 0}</span><span class="pill pill-fail">✗ Deviation · ${data.failedCount || 0}</span><span class="pill pill-na">N/A · ${data.naCount || 0}</span><span class="pill pill-unverified">Unverified · ${data.unverifiedCount || 0}</span></div>`
    : ''
  if (!rows.length) {
    return `${summary}<p class="muted">No active OPR items. Run an OPR Workshop session to populate.</p>`
  }
  const body = rows
    .map((r) => {
      const linkSummary = r.links && r.links.length
        ? `<div class="preview">Verified by: ${r.links.map((l) => `${escapeHtml(l.contextLabel || l.contextType)}${l.targetLabel ? ` → ${escapeHtml(l.targetLabel)}` : ''}`).join(', ')}</div>`
        : ''
      const status = oprStatusLabel(r.overallStatus)
      const statusClass = `pill-${asString(r.overallStatus).toLowerCase() === 'pass' ? 'pass' : asString(r.overallStatus).toLowerCase() === 'fail' ? 'fail' : asString(r.overallStatus).toLowerCase() === 'na' ? 'na' : 'unverified'}`
      return `<tr><td class="r">${r.rank}</td><td><strong>${escapeHtml(r.text)}</strong>${linkSummary}</td><td>${escapeHtml(r.category)}</td><td class="r">${r.totalLinks}</td><td><span class="pill ${statusClass}">${escapeHtml(status)}</span></td></tr>`
    })
    .join('')
  return `${summary}${tableOpen()}<thead><tr><th class="r w-rank">Rank</th><th>OPR Item</th><th class="w-cat">Category</th><th class="r">Links</th><th class="w-status">Status</th></tr></thead><tbody>${body}</tbody></table>`
}

function renderOprDeviations(data) {
  const rows = data && Array.isArray(data.rows) ? data.rows : []
  if (!rows.length) {
    return '<p class="muted">No OPR deviations recorded — every linked verification is pass or N/A.</p>'
  }
  const body = rows
    .map((r) => {
      const failures = (r.failures || [])
        .map((f) => `<div class="failure-row">${escapeHtml(f.contextLabel || f.contextType)} — ${escapeHtml(f.targetLabel || f.targetType)}${f.notes ? ` · ${escapeHtml(f.notes)}` : ''}</div>`)
        .join('')
      return `<tr><td class="r">${r.rank}</td><td><strong>${escapeHtml(r.text)}</strong>${failures}</td><td>${escapeHtml(r.category)}</td><td class="r">${r.failLinks}</td></tr>`
    })
    .join('')
  return `${tableOpen()}<thead><tr><th class="r w-rank">Rank</th><th>OPR Item Not Meeting Requirements</th><th class="w-cat">Category</th><th class="r">Failures</th></tr></thead><tbody>${body}</tbody></table>`
}

function renderScopedSystems(data) {
  const rows = data && Array.isArray(data.rows) ? data.rows : []
  if (!rows.length) {
    return `${tableOpen()}<thead><tr><th>Tag</th><th>Name</th><th>System</th><th class="r"># Checklists</th><th class="r"># FPTs</th><th>Status</th></tr></thead><tbody>${emptyRow(6, 'No equipment in project scope.')}</tbody></table>`
  }
  const body = rows
    .map((r) => {
      const status = asString(r.status)
      const statusClass = status.toLowerCase() === 'complete' ? 'pill-pass' : status.toLowerCase() === 'in progress' ? 'pill-progress' : 'pill-unverified'
      return `<tr><td>${escapeHtml(r.tag || '—')}</td><td>${escapeHtml(r.name || '—')}</td><td>${escapeHtml(r.system || '—')}</td><td class="r">${r.checklistsCount}</td><td class="r">${r.fptsCount}</td><td><span class="pill ${statusClass}">${escapeHtml(status)}</span></td></tr>`
    })
    .join('')
  return `${tableOpen()}<thead><tr><th>Tag</th><th>Name</th><th>System</th><th class="r"># Checklists</th><th class="r"># FPTs</th><th class="w-status">Status</th></tr></thead><tbody>${body}</tbody></table>`
}

function renderEquipment(data) {
  const groups = data && Array.isArray(data.groups) ? data.groups : []
  if (!groups.length) return '<p class="muted">No equipment on this project yet.</p>'
  return groups
    .map((g) => {
      const body = g.rows
        .map(
          (r) =>
            `<tr><td>${escapeHtml(r.tag)}</td><td>${escapeHtml(r.title)}</td><td>${escapeHtml(r.type)}</td><td>${escapeHtml(r.status)}</td><td>${escapeHtml(r.location || '—')}</td></tr>`,
        )
        .join('')
      return `<h3 class="phase-heading">${escapeHtml(g.system)} <span class="muted">· ${g.rows.length}</span></h3>${tableOpen()}<thead><tr><th>Tag</th><th>Title</th><th>Type</th><th>Status</th><th>Location</th></tr></thead><tbody>${body}</tbody></table>`
    })
    .join('')
}

function severityClass(sev) {
  switch (asString(sev).toLowerCase()) {
    case 'critical': return 'pill-fail'
    case 'high': return 'pill-warn'
    case 'medium': return 'pill-progress'
    case 'low': return 'pill-pass'
    default: return 'pill-unverified'
  }
}

/**
 * Issues Log column registry — labels + cell rendering per key. Which
 * columns render (and in what order) comes from the provider's resolved
 * data.columns (section dataConfig). Keep keys in sync with
 * utils/finalReportDataSources.js and the editor's column picker.
 */
const ISSUE_COLUMNS = {
  number: { label: '#', th: 'r w-rank', cell: (r) => `<td class="r">${r.number ?? '—'}</td>` },
  title: { label: 'Title', cell: (r) => `<td><strong>${escapeHtml(r.title || '—')}</strong></td>` },
  description: { label: 'Description', cell: (r) => `<td>${escapeHtml(r.description || '—')}</td>` },
  type: { label: 'Type', cell: (r) => `<td>${escapeHtml(r.type || '—')}</td>` },
  severity: { label: 'Priority', th: 'w-sev', cell: (r) => `<td><span class="pill ${severityClass(r.severity)}">${escapeHtml(r.severity || '—')}</span></td>` },
  status: { label: 'Status', th: 'w-status', cell: (r) => `<td>${escapeHtml(r.status || '—')}</td>` },
  system: { label: 'System', th: 'w-sys', cell: (r) => `<td>${escapeHtml(r.system || '—')}</td>` },
  location: { label: 'Location', cell: (r) => `<td>${escapeHtml(r.location || '—')}</td>` },
  foundBy: { label: 'Found By', cell: (r) => `<td>${escapeHtml(r.foundBy || '—')}</td>` },
  dateFound: { label: 'Date Found', th: 'w-date', cell: (r) => `<td>${escapeHtml(r.dateFound || '—')}</td>` },
  assignedTo: { label: 'Assigned To', cell: (r) => `<td>${escapeHtml(r.assignedTo || '—')}</td>` },
  dueDate: { label: 'Due', th: 'w-date', cell: (r) => `<td>${escapeHtml(r.dueDate || '—')}</td>` },
  closedBy: { label: 'Closed By', cell: (r) => `<td>${escapeHtml(r.closedBy || '—')}</td>` },
  closedDate: { label: 'Closed', th: 'w-date', cell: (r) => `<td>${escapeHtml(r.closedDate || '—')}</td>` },
  recommendation: { label: 'Recommendation', cell: (r) => `<td>${escapeHtml(r.recommendation || '—')}</td>` },
  resolution: { label: 'Resolution', cell: (r) => `<td>${escapeHtml(r.resolution || '—')}</td>` },
}
const DEFAULT_ISSUE_COLUMN_KEYS = [
  'number', 'title', 'description', 'type', 'severity', 'status', 'system',
  'location', 'dateFound', 'assignedTo', 'closedDate', 'recommendation', 'resolution',
]

function renderIssues(data) {
  const rows = data && Array.isArray(data.rows) ? data.rows : []
  if (!rows.length) {
    return '<p class="muted">No issues recorded on this project.</p>'
  }
  const keys = (Array.isArray(data.columns) && data.columns.length ? data.columns : DEFAULT_ISSUE_COLUMN_KEYS)
    .filter((k) => ISSUE_COLUMNS[k])
  const head = keys
    .map((k) => `<th${ISSUE_COLUMNS[k].th ? ` class="${ISSUE_COLUMNS[k].th}"` : ''}>${escapeHtml(ISSUE_COLUMNS[k].label)}</th>`)
    .join('')
  const body = rows
    .map((r) => `<tr>${keys.map((k) => ISSUE_COLUMNS[k].cell(r)).join('')}</tr>`)
    .join('')
  // The comprehensive set is wide — render dense; the section page itself is
  // landscape (see renderSection / the landscape named page).
  return `<table class="data-table dense"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
}

function entityLabel(d) {
  return [d.tag, d.name].filter(Boolean).join(' — ') || 'Item'
}

function passPill(state, label) {
  const cls = state === 'pass' ? 'pill-pass' : state === 'fail' ? 'pill-fail' : 'pill-na'
  return `<span class="pill ${cls}">${escapeHtml(label)}</span>`
}

/** The actual FPT evidence: every test with its steps / result tables. */
function renderFptDetails(details) {
  if (!Array.isArray(details) || !details.length) return ''
  const blocks = details.map((d) => {
    const tests = (d.tests || []).map((t) => {
      const numberBit = t.number != null ? `#${t.number} ` : ''
      const statusPill = t.pass === 'pass' ? passPill('pass', 'PASS') : t.pass === 'fail' ? passPill('fail', 'FAIL') : ''
      let body = ''
      if (t.description) body += `<p class="small">${escapeHtml(t.description)}</p>`
      if (t.notes) body += `<p class="small muted">Notes: ${escapeHtml(t.notes)}</p>`
      if (Array.isArray(t.steps) && t.steps.length) {
        const rows = t.steps
          .map((s) => `<tr><td>${escapeHtml(s.step || '—')}</td><td>${escapeHtml(s.expected || '—')}</td><td>${escapeHtml(s.actual || '—')}</td><td>${s.pass === 'pass' ? '<span class="pass-text">PASS</span>' : s.pass === 'fail' ? '<span class="fail-text">FAIL</span>' : '—'}</td></tr>`)
          .join('')
        body += `<table class="data-table dense"><thead><tr><th>Step</th><th>Expected</th><th>Actual</th><th class="w-sev">Result</th></tr></thead><tbody>${rows}</tbody></table>`
      } else if (t.table && Array.isArray(t.table.columns) && t.table.columns.length) {
        const head = t.table.columns.map((c) => `<th>${escapeHtml(c.name || c.key)}</th>`).join('')
        const rows = (t.table.rows || [])
          .map((r) => `<tr>${t.table.columns.map((c) => {
            const cell = r[c.key] || { text: '', state: 'none' }
            const cls = cell.state === 'pass' ? ' class="pass-text"' : cell.state === 'fail' ? ' class="fail-text"' : ''
            return `<td${cls}>${escapeHtml(cell.text || '—')}</td>`
          }).join('')}</tr>`)
          .join('')
        body += `<table class="data-table dense"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`
      }
      return `<h4 class="evidence-sub">${escapeHtml(numberBit)}${escapeHtml(t.name)} ${statusPill}</h4>${body}`
    }).join('')
    return `<h3 class="evidence-title">${escapeHtml(entityLabel(d))}</h3>${tests}`
  }).join('')
  return `<h2 class="evidence-heading">Test Detail</h2>${blocks}`
}

function renderFptResults(data) {
  const rows = data && Array.isArray(data.rows) ? data.rows : []
  if (!rows.length) return '<p class="muted">No FPTs recorded.</p>'
  const body = rows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.tag || '—')}</td><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.system || '—')}</td><td class="r">${r.total}</td><td class="r pass-text">${r.pass}</td><td class="r fail-text">${r.fail}</td><td class="r muted">${r.na}</td><td class="r warn-text">${r.pending}</td><td>${r.hasSignatures ? '✓' : '—'}</td></tr>`,
    )
    .join('')
  const summary = `${tableOpen()}<thead><tr><th>Tag</th><th>Name</th><th>System</th><th class="r">Total</th><th class="r">Pass</th><th class="r">Fail</th><th class="r">N/A</th><th class="r">Pending</th><th>Signed</th></tr></thead><tbody>${body}</tbody></table>`
  return summary + renderFptDetails(data && data.details)
}

/** The actual checklist evidence: every section's questions/answers/notes. */
function renderChecklistDetails(details) {
  if (!Array.isArray(details) || !details.length) return ''
  const doneCell = (done) => {
    if (done === 'done') return '<td class="pass-text" style="text-align:center;">✓</td>'
    if (done === 'na') return '<td class="muted" style="text-align:center;">N/A</td>'
    return '<td class="muted" style="text-align:center;">—</td>'
  }
  const blocks = details.map((d) => {
    const sections = (d.sections || []).map((sec) => {
      const rows = (sec.questions || [])
        .map((q) => `<tr>${doneCell(q.done)}<td>${escapeHtml(q.text || '—')}</td><td>${escapeHtml(q.notes || '')}</td></tr>`)
        .join('')
      const pill = sec.isComplete ? passPill('pass', 'Complete') : ''
      return `<h4 class="evidence-sub">${escapeHtml(sec.title)} ${pill}</h4><table class="data-table dense"><thead><tr><th class="w-done">Done</th><th>Question</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table>`
    }).join('')
    return `<h3 class="evidence-title">${escapeHtml(entityLabel(d))}</h3>${sections}`
  }).join('')
  return `<h2 class="evidence-heading">Checklist Detail</h2>${blocks}`
}

function renderChecklistSummary(data) {
  const rows = data && Array.isArray(data.rows) ? data.rows : []
  if (!rows.length) return '<p class="muted">No construction checklists recorded yet.</p>'
  const body = rows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.tag || '—')}</td><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.system || '—')}</td><td class="r">${r.totalSections}</td><td class="r pass-text">${r.completeSections}</td><td class="r warn-text">${r.partialSections}</td><td class="r muted">${r.notStarted}</td><td class="r">${r.completionPct}%</td></tr>`,
    )
    .join('')
  const summary = `${tableOpen()}<thead><tr><th>Tag</th><th>Name</th><th>System</th><th class="r">Total</th><th class="r">Complete</th><th class="r">Partial</th><th class="r">Not Started</th><th class="r">%</th></tr></thead><tbody>${body}</tbody></table>`
  return summary + renderChecklistDetails(data && data.details)
}

function renderTrainingSessions(data) {
  const rows = data && Array.isArray(data.rows) ? data.rows : []
  if (!rows.length) return '<p class="muted">No training sessions recorded yet.</p>'
  return rows
    .map((s) => {
      const attendees = (s.attendees && s.attendees.length)
        ? `<table class="data-table"><thead><tr><th>Name</th><th>Company</th><th>Email</th><th>Role</th></tr></thead><tbody>${s.attendees.map((a) => `<tr><td>${escapeHtml(a.name || '—')}</td><td>${escapeHtml(a.company || '—')}</td><td>${escapeHtml(a.email || '—')}</td><td>${escapeHtml(a.role || '—')}</td></tr>`).join('')}</tbody></table>`
        : '<p class="muted small">No attendees recorded — see linked sign-in sheet attachments.</p>'
      return `<div class="training-card"><h4>${escapeHtml(s.topic || s.name)}</h4><p class="muted small">${formatDate(s.date)}${s.location ? ` · ${escapeHtml(s.location)}` : ''} · ${s.attendeeCount} attendee${s.attendeeCount === 1 ? '' : 's'}${s.attachmentCount ? ` · ${s.attachmentCount} sign-in sheet${s.attachmentCount === 1 ? '' : 's'}` : ''}</p>${attendees}</div>`
    })
    .join('')
}

function renderRecommendations(data) {
  const groups = data && Array.isArray(data.groups) ? data.groups : []
  if (!groups.length) return '<p class="muted">No recommendations yet.</p>'
  return groups
    .map((g) => {
      const body = g.rows
        .map(
          (r) =>
            `<tr><td class="r">${r.number ?? '—'}</td><td><strong>${escapeHtml(r.title)}</strong></td><td>${escapeHtml(r.recommendation)}</td><td>${escapeHtml(r.status || '—')}</td></tr>`,
        )
        .join('')
      return `<h3 class="phase-heading">${escapeHtml(g.system)} <span class="muted">· ${g.rows.length}</span></h3>${tableOpen()}<thead><tr><th class="r w-rank">#</th><th>Issue</th><th>Recommendation</th><th class="w-status">Status</th></tr></thead><tbody>${body}</tbody></table>`
    })
    .join('')
}

function renderWarrantyReview(data) {
  const rows = data && Array.isArray(data.rows) ? data.rows : []
  if (!rows.length) return '<p class="muted">No occupancy-phase activities yet.</p>'
  return rows
    .map(
      (r) =>
        `<div class="training-card"><h4>${escapeHtml(r.name)}</h4><p class="muted small">${escapeHtml(r.type)} · ${formatDate(r.date)}${r.location ? ` · ${escapeHtml(r.location)}` : ''}</p>${r.descriptionPreview ? `<p>${escapeHtml(r.descriptionPreview)}</p>` : ''}</div>`,
    )
    .join('')
}

function renderTeam(data) {
  if (!data) return '<p class="muted">No team data.</p>'
  const ca = data.commissioningAgent
  const caBlock = ca && (ca.firstName || ca.lastName || ca.company)
    ? `<div class="cxa-block"><strong>Commissioning Agent:</strong> ${escapeHtml([ca.firstName, ca.lastName].filter(Boolean).join(' ') || '—')}${ca.company ? ` · ${escapeHtml(ca.company)}` : ''}${ca.email ? ` · ${escapeHtml(ca.email)}` : ''}${ca.phone ? ` · ${escapeHtml(ca.phone)}` : ''}</div>`
    : ''
  const rows = Array.isArray(data.rows) ? data.rows : []
  if (!rows.length) {
    return `${caBlock}<p class="muted">No team members on this project.</p>`
  }
  const body = rows
    .map(
      (r) =>
        `<tr><td><strong>${escapeHtml([r.firstName, r.lastName].filter(Boolean).join(' ') || '—')}</strong></td><td>${escapeHtml(r.email || '—')}</td><td>${escapeHtml(r.company || '—')}</td><td>${escapeHtml(r.role || '—')}</td></tr>`,
    )
    .join('')
  return `${caBlock}${tableOpen()}<thead><tr><th>Name</th><th>Email</th><th>Company</th><th>Role</th></tr></thead><tbody>${body}</tbody></table>`
}

function formatBytes(n) {
  const b = Number(n || 0)
  if (!b) return '—'
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

/** Documents section (Phase 5d): lists the configured folder's files. */
function renderDocuments(data) {
  if (data && data.unconfigured) {
    return '<p class="muted">No Documents folder selected for this section yet.</p>'
  }
  const rows = (data && data.rows) || []
  const head = data && data.folderPath
    ? `<p class="meta-row">Folder: <strong>${escapeHtml(data.folderPath)}</strong></p>`
    : ''
  if (!rows.length) return `${head}<p class="muted">No documents in the selected folder.</p>`
  const body = rows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.contentType || '—')}</td><td class="r">${escapeHtml(formatBytes(r.sizeBytes))}</td><td>${r.isPdf ? '<span class="pill pill-progress">merged</span>' : '<span class="pill pill-na">listed</span>'}</td></tr>`,
    )
    .join('')
  const note = data && data.pdfCount
    ? '<p class="small muted">PDF documents are merged into the report immediately after this section.</p>'
    : ''
  return `${head}${tableOpen()}<thead><tr><th>Document</th><th>Type</th><th class="r">Size</th><th>In report</th></tr></thead><tbody>${body}</tbody></table>${note}`
}

const DATA_RENDERERS = {
  documents: renderDocuments,
  'project-description': renderProjectDescription,
  revisions: renderRevisions,
  opr: renderOpr,
  tasks: renderTasks,
  activities: renderActivitiesByPhase, // fallback if old activities source is referenced
  'activities-by-phase': renderActivitiesByPhase,
  'commissioned-systems': renderCommissionedSystems,
  'opr-coverage': renderOprCoverage,
  'opr-deviations': renderOprDeviations,
  'scoped-systems': renderScopedSystems,
  equipment: renderEquipment,
  issues: renderIssues,
  'fpt-results': renderFptResults,
  'checklist-summary': renderChecklistSummary,
  'training-sessions': renderTrainingSessions,
  recommendations: renderRecommendations,
  'warranty-review': renderWarrantyReview,
  team: renderTeam,
}

function renderDataSection(dataSource, data) {
  const renderer = DATA_RENDERERS[dataSource]
  if (!renderer) {
    return `<p class="muted">No renderer for data source <code>${escapeHtml(dataSource)}</code>.</p>`
  }
  try {
    return renderer(data)
  } catch (e) {
    return `<p class="muted">Failed to render ${escapeHtml(dataSource)}: ${escapeHtml(e.message || String(e))}</p>`
  }
}

// =========================================================================
// Cover, TOC, sections, and the outer document.
// =========================================================================

// Pick the cover logo per the report's cover.logoSource setting. Returns a data URI
// or URL (Puppeteer embeds both), or '' for none / when the chosen logo is missing.
function pickCoverLogo(project, cover) {
  const src = (cover && cover.logoSource) || 'commissioning_agent'
  if (src === 'none') return ''
  if (src === 'custom') return (cover && (cover.customLogoUrl || cover.ownerLogoBlobUrl)) || ''
  if (src === 'client') return (project && project.logo) || ''
  // default: commissioning agent
  return (project && project.commissioning_agent && project.commissioning_agent.logo) || ''
}

function renderCover(project, report) {
  const cover = report.cover || {}
  const title = cover.title || 'Commissioning Final Report'
  const subtitle = cover.subtitle || (project && project.client) || ''
  const projectName = (project && project.name) || ''
  const location = (project && project.location) || ''
  const ca = project && project.commissioning_agent
  const caName = ca ? [ca.firstName, ca.lastName].filter(Boolean).join(' ') : ''
  const caCompany = (ca && ca.company) || ''
  const generated = formatDate(new Date())
  const version = report.currentVersion ? `Version v${report.currentVersion}` : 'Draft'
  const logo = pickCoverLogo(project, cover)
  // Honor cover.showProjectImage (first project photo) — previously ignored.
  const projectPhoto = cover.showProjectImage !== false && project && Array.isArray(project.photos) && project.photos[0]
    ? String(project.photos[0])
    : ''
  return `
    <section class="cover">
      <div class="cover-brand">
        ${logo ? `<img class="cover-logo" src="${escapeHtml(logo)}" alt="" />` : ''}
      </div>
      ${projectPhoto ? `<div class="cover-photo-wrap"><img class="cover-photo" src="${escapeHtml(projectPhoto)}" alt="" /></div>` : ''}
      <div class="cover-body">
        <h1 class="cover-title">${escapeHtml(title)}</h1>
        <h2 class="cover-project">${escapeHtml(projectName)}</h2>
        ${subtitle ? `<p class="cover-subtitle">${escapeHtml(subtitle)}</p>` : ''}
        ${location ? `<p class="cover-meta">${escapeHtml(location)}</p>` : ''}
        <p class="cover-meta">${escapeHtml(generated)} &nbsp;·&nbsp; ${escapeHtml(version)}</p>
        ${caName ? `<p class="cover-cxa">Commissioning Authority<br><strong>${escapeHtml(caName)}</strong>${caCompany ? `<br>${escapeHtml(caCompany)}` : ''}</p>` : ''}
      </div>
    </section>
  `
}

/** Formal title page (opt-in): report title, project, version, date — no imagery. */
function renderTitlePage(project, report) {
  const cover = report.cover || {}
  const title = cover.title || 'Commissioning Final Report'
  const projectName = (project && project.name) || ''
  const subtitle = cover.subtitle || (project && project.client) || ''
  const version = report.currentVersion ? `Version v${report.currentVersion}` : 'Draft'
  const generated = formatDate(new Date())
  return `
    <section class="title-page">
      <h1>${escapeHtml(title)}</h1>
      ${projectName ? `<h2>${escapeHtml(projectName)}</h2>` : ''}
      ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
      <p class="muted">${escapeHtml(version)} &nbsp;·&nbsp; ${escapeHtml(generated)}</p>
    </section>
  `
}

function renderToc(sections) {
  const items = sections
    .filter((s) => s.enabled !== false && s.includeInToc !== false)
    .map((s, i) => `<li><span class="toc-num">${i + 1}.</span> <a href="#section-${escapeHtml(s.key)}">${escapeHtml(s.title)}</a></li>`)
    .join('')
  return `<section class="toc"><h1>Table of Contents</h1><ol class="toc-list">${items}</ol></section>`
}

function renderSection(section, sectionData) {
  const enabled = section.enabled !== false
  if (!enabled) return ''
  const anchor = `section-${section.key}`
  let body = ''
  if (section.type === 'prose') {
    body = section.contentHtml ? safeProse(section.contentHtml) : '<p class="muted">No content provided for this section.</p>'
  } else if (section.type === 'data') {
    // Phase 5: an edited copy (materialized + hand-edited) wins over live data.
    const edited = asString(section.editedHtml).trim()
    body = edited ? safeProse(edited) : renderDataSection(section.dataSource, sectionData)
  }
  // Optional divider/title page before the section; the section itself then
  // starts on the following page without needing its own break.
  const divider = section.titlePage
    ? `<section class="section-divider"><h1>${escapeHtml(section.title)}</h1></section>`
    : ''
  const classes = ['section']
  if (!section.titlePage && section.pageBreakBefore === true) classes.push('break-before')
  // The Issues Log renders landscape (comprehensive column set needs the
  // width); CSS named pages flip just this section's pages.
  if (section.type === 'data' && section.dataSource === 'issues') classes.push('section-landscape')
  const heading = section.showTitle === false ? '' : `<h1 class="section-title">${escapeHtml(section.title)}</h1>`
  return `${divider}<section class="${classes.join(' ')}" id="${anchor}">${heading}${body}</section>`
}

function buildStyles() {
  return `
    @page { size: letter; margin: 0.6in 0.7in 0.65in 0.7in; }
    @page :first { margin: 0; }
    /* Landscape named page for wide tabular sections (Issues Log). */
    @page landscape { size: letter landscape; margin: 0.6in 0.7in 0.65in 0.7in; }
    .section-landscape { page: landscape; page-break-before: always; }
    * { box-sizing: border-box; }
    body {
      font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 11pt;
      color: #1f2937;
      line-height: 1.4;
      margin: 0;
    }
    code, pre { font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace; }
    h1, h2, h3, h4 { color: #1e3a8a; font-weight: 600; margin: 0 0 0.4em; }
    h1 { font-size: 18pt; }
    h2 { font-size: 14pt; }
    h3.phase-heading { font-size: 12pt; margin-top: 1.2em; padding-bottom: 0.2em; border-bottom: 1px solid #cbd5e1; }
    p { margin: 0.4em 0; }
    .muted { color: #6b7280; }
    .small { font-size: 9pt; }

    /* ----- Cover ----- */
    .cover {
      page-break-after: always;
      height: 100vh;
      padding: 1in 1in;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: linear-gradient(180deg, #f8fafc 0%, #e0e7ff 100%);
    }
    .cover-brand { min-height: 90px; }
    .cover-logo { max-height: 110px; max-width: 320px; object-fit: contain; }
    .cover-body { margin-top: auto; }
    .cover-title { font-size: 32pt; color: #1e3a8a; margin-bottom: 0.3em; }
    .cover-project { font-size: 22pt; color: #1f2937; margin-bottom: 0.3em; font-weight: 600; }
    .cover-subtitle { font-size: 14pt; color: #475569; }
    .cover-meta { font-size: 12pt; color: #475569; margin: 0.2em 0; }
    .cover-cxa { margin-top: 2em; font-size: 11pt; color: #475569; }
    .cover-photo-wrap { margin: 0.5in 0 0; text-align: center; }
    .cover-photo { max-width: 100%; max-height: 4.2in; object-fit: contain; border-radius: 6px; }

    /* ----- Title page (opt-in, formal) ----- */
    .title-page {
      page-break-after: always;
      padding-top: 3in;
      text-align: center;
    }
    .title-page h1 { font-size: 26pt; color: #1e3a8a; margin-bottom: 0.4em; }
    .title-page h2 { font-size: 16pt; color: #1f2937; margin-bottom: 0.6em; }
    .title-page p { font-size: 12pt; color: #475569; }

    /* ----- Section divider/title pages (opt-in per section) ----- */
    .section-divider {
      page-break-before: always;
      page-break-after: always;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 8.5in;
    }
    .section-divider h1 { font-size: 24pt; color: #1e3a8a; text-align: center; border: none; }

    /* ----- TOC ----- */
    .toc { page-break-after: always; padding-top: 0.05in; }
    .toc-list { list-style: none; padding-left: 0; counter-reset: tocnum; }
    .toc-list li { padding: 0.35em 0; border-bottom: 1px dotted #cbd5e1; }
    .toc-list a { color: #1f2937; text-decoration: none; }
    .toc-num { color: #94a3b8; font-variant-numeric: tabular-nums; display: inline-block; min-width: 1.6em; }

    /* ----- Sections ----- */
    /* pageBreakBefore is honored per section (Phase 5); sections otherwise
       flow with a gap. Existing reports are migrated to break=true so their
       one-section-per-page look is preserved until the author changes it. */
    .section { padding-top: 0.05in; margin-top: 0.35in; }
    .section.break-before { page-break-before: always; margin-top: 0; }
    .section-title { border-bottom: 2px solid #1e3a8a; padding-bottom: 0.15em; margin-bottom: 0.6em; }

    /* ----- Tables ----- */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 0.6em 0 1em;
      font-size: 10pt;
    }
    .data-table th, .data-table td {
      border: 1px solid #cbd5e1;
      padding: 0.4em 0.55em;
      text-align: left;
      vertical-align: top;
    }
    .data-table thead th {
      background: #e0e7ff;
      color: #1e3a8a;
      font-weight: 600;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .data-table tbody tr:nth-child(even) { background: #f8fafc; }
    .data-table.dense { font-size: 8pt; }
    .data-table.dense th, .data-table.dense td { padding: 0.3em 0.4em; }
    .data-table.dense thead th { font-size: 7.5pt; }
    .data-table .r { text-align: right; }
    .data-table .empty-row { text-align: center; color: #6b7280; font-style: italic; padding: 1.2em; }
    .data-table .w-rank { width: 3em; }
    .data-table .w-done { width: 3.2em; }
    .data-table .w-cat  { width: 8em; }
    .data-table .w-wbs  { width: 6em; }
    .data-table .w-score{ width: 4em; }
    .data-table .w-sev  { width: 5em; }
    .data-table .w-status { width: 7em; }
    .data-table .w-sys  { width: 7em; }
    .data-table .w-date { width: 7em; }
    .preview { font-size: 9pt; color: #6b7280; margin-top: 0.2em; }
    .failure-row { font-size: 9pt; color: #991b1b; margin-top: 0.2em; }
    .pass-text { color: #065f46; }
    .fail-text { color: #991b1b; }
    .warn-text { color: #92400e; }
    .meta-row { font-size: 9pt; color: #475569; margin-bottom: 0.6em; }

    /* ----- Evidence detail (full checklists / FPTs after the summaries) ----- */
    .evidence-heading { font-size: 13pt; margin-top: 1.2em; padding-top: 0.4em; border-top: 1px solid #cbd5e1; page-break-after: avoid; }
    .evidence-title { font-size: 11.5pt; margin-top: 1em; page-break-after: avoid; }
    .evidence-sub { font-size: 10pt; margin: 0.8em 0 0.2em; page-break-after: avoid; }

    /* ----- Pills ----- */
    .pill {
      display: inline-block;
      padding: 0.1em 0.55em;
      border-radius: 999px;
      font-size: 8.5pt;
      border: 1px solid;
      white-space: nowrap;
    }
    .pill-pass { background: #d1fae5; color: #065f46; border-color: #10b981; }
    .pill-fail { background: #fee2e2; color: #991b1b; border-color: #ef4444; }
    .pill-warn { background: #fed7aa; color: #92400e; border-color: #f59e0b; }
    .pill-progress { background: #e0e7ff; color: #3730a3; border-color: #6366f1; }
    .pill-na { background: #f3f4f6; color: #6b7280; border-color: #d1d5db; }
    .pill-unverified { background: #fef3c7; color: #92400e; border-color: #f59e0b; }
    .summary-pills { display: flex; gap: 0.5em; margin: 0.5em 0 0.8em; flex-wrap: wrap; }

    /* ----- Training / warranty cards ----- */
    .training-card {
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 0.6em 0.8em;
      margin-bottom: 0.6em;
      page-break-inside: avoid;
    }
    .training-card h4 { color: #1e3a8a; font-size: 11pt; margin: 0 0 0.2em; }
    .cxa-block {
      background: #ecfdf5;
      border: 1px solid #6ee7b7;
      padding: 0.55em 0.8em;
      border-radius: 4px;
      margin-bottom: 0.8em;
      font-size: 10pt;
    }

    /* ----- Section content (prose) ----- */
    .section p, .section li { font-size: 11pt; }
    /* 2.2em so two-digit ordered-list markers ("10.", "17.") don't clip at
       the content edge — 1.3em truncated them to ".0." in print. */
    .section ul, .section ol { padding-left: 2.2em; }
    .section table {
      width: 100%;
      border-collapse: collapse;
      margin: 0.5em 0;
      font-size: 10pt;
    }
    .section th, .section td {
      border: 1px solid #cbd5e1;
      padding: 0.4em 0.55em;
      text-align: left;
      vertical-align: top;
    }
    .section th { background: #f3f4f6; font-weight: 600; }
  `
}

/**
 * Header / footer templates passed to puppeteer's page.pdf().
 * Puppeteer renders these on every page (except where suppressed via @page).
 * Built-in classes available: .pageNumber, .totalPages, .title, .date.
 *
 * Note: puppeteer renders headers/footers with a small default font and
 * doesn't inherit body styles, so we inline-style everything here.
 */
/**
 * Branded running header: client logo left, project name centered, CxA logo
 * right — matching the module reports' header. Logos must be DATA URIS: the
 * header renders in an isolated mini-document that cannot fetch URLs.
 */
function buildHeaderTemplate(projectName, logos = {}) {
  const img = (uri, align) => (uri
    ? `<img src="${uri}" style="height:0.26in; max-width:1.5in; object-fit:contain; object-position:${align};" />`
    : '<span></span>')
  return `<div style="font-size:8pt; width:100%; padding:0 0.7in; color:#475569; display:flex; justify-content:space-between; align-items:center; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
    <div style="width:1.6in; text-align:left;">${img(logos.leftLogoDataUri, 'left')}</div>
    <span style="font-size:8pt;">${escapeHtml(projectName)}</span>
    <div style="width:1.6in; text-align:right;">${img(logos.rightLogoDataUri, 'right')}</div>
  </div>`
}

function buildFooterTemplate(reportTitle) {
  // Page numbers are NOT rendered here: Chromium's injected .pageNumber /
  // .totalPages counters proved unreliable (rendered blank on some builds,
  // and restart per render in the segmented documents path). The PDF
  // pipeline stamps continuous "Page N of M" post-render via pdf-lib instead.
  return `<div style="font-size:8pt; width:100%; padding:0 0.7in; color:#94a3b8; display:flex; justify-content:space-between; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
    <span style="font-size:8pt;"><span style="font-weight:600; color:#1e3a8a;">cxma.io</span> | ${escapeHtml(reportTitle || 'Cx Final Report')}</span>
    <span></span>
  </div>`
}

// =========================================================================
// Public entry point
// =========================================================================

/**
 * Build the full HTML document for the Final Report.
 * @param {object} args
 * @param {object} args.report      - FinalReport mongoose doc (or POJO)
 * @param {object} args.project     - Project mongoose doc (or POJO)
 * @param {object} args.sectionData - Map of sectionKey -> data-source payload
 * @returns {string} self-contained HTML
 */
function buildReportHtml({ report, project, sectionData, sectionsOverride, includeFrontMatter = true, tocSections }) {
  const byOrder = (a, b) => Number(a.order || 0) - Number(b.order || 0)
  const all = Array.isArray(report.sections) ? [...report.sections] : []
  all.sort(byOrder)
  // Segmented rendering (Phase 5d) passes a subset as sectionsOverride while
  // the TOC keeps listing every enabled section of the whole report.
  const bodySections = Array.isArray(sectionsOverride) ? [...sectionsOverride].sort(byOrder) : all
  const sectionsHtml = bodySections
    .filter((s) => s.enabled !== false)
    .map((s) => renderSection(s, sectionData && sectionData[s.key]))
    .join('')
  const tocList = Array.isArray(tocSections) ? [...tocSections].sort(byOrder) : all
  const cover = report.cover || {}
  const coverHtml = includeFrontMatter && cover.enabled !== false ? renderCover(project || {}, report) : ''
  const titlePageHtml = includeFrontMatter && cover.titlePageEnabled === true ? renderTitlePage(project || {}, report) : ''
  const tocHtml = includeFrontMatter ? renderToc(tocList) : ''
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Final Cx Report — ${escapeHtml((project && project.name) || '')}</title>
<style>${buildFontCss()}
${buildStyles()}</style>
</head>
<body>
${coverHtml}
${titlePageHtml}
${tocHtml}
${sectionsHtml}
</body>
</html>`
}

/**
 * Render ONE data section's live data to HTML (Phase 5 "materialize"):
 * the exact markup the PDF would produce, handed to the editor as the
 * starting point for an edited copy.
 */
function renderDataSectionHtml(section, data) {
  return renderDataSection(section && section.dataSource, data)
}

module.exports = {
  buildReportHtml,
  buildHeaderTemplate,
  buildFooterTemplate,
  renderDataSectionHtml,
  // Exported for tests / debugging
  _renderers: DATA_RENDERERS,
}
