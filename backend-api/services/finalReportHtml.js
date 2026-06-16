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

const sanitizeHtml = require('sanitize-html')

function asString(v) {
  return typeof v === 'string' ? v : v == null ? '' : String(v)
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

function renderIssues(data) {
  const rows = data && Array.isArray(data.rows) ? data.rows : []
  if (!rows.length) {
    return '<p class="muted">No issues recorded on this project.</p>'
  }
  const body = rows
    .map(
      (r) =>
        `<tr><td class="r">${r.number ?? '—'}</td><td><strong>${escapeHtml(r.title)}</strong>${r.resolution ? `<div class="preview pass-text">Resolved: ${escapeHtml(r.resolution)}</div>` : ''}</td><td><span class="pill ${severityClass(r.severity)}">${escapeHtml(r.severity || '—')}</span></td><td>${escapeHtml(r.status || '—')}</td><td>${escapeHtml(r.system || '—')}</td><td>${escapeHtml(r.dateFound || '—')}</td><td>${escapeHtml(r.closedDate || '—')}</td></tr>`,
    )
    .join('')
  return `${tableOpen()}<thead><tr><th class="r w-rank">#</th><th>Issue</th><th class="w-sev">Severity</th><th class="w-status">Status</th><th class="w-sys">System</th><th class="w-date">Date Found</th><th class="w-date">Closed</th></tr></thead><tbody>${body}</tbody></table>`
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
  return `${tableOpen()}<thead><tr><th>Tag</th><th>Name</th><th>System</th><th class="r">Total</th><th class="r">Pass</th><th class="r">Fail</th><th class="r">N/A</th><th class="r">Pending</th><th>Signed</th></tr></thead><tbody>${body}</tbody></table>`
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
  return `${tableOpen()}<thead><tr><th>Tag</th><th>Name</th><th>System</th><th class="r">Total</th><th class="r">Complete</th><th class="r">Partial</th><th class="r">Not Started</th><th class="r">%</th></tr></thead><tbody>${body}</tbody></table>`
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

const DATA_RENDERERS = {
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
  return `
    <section class="cover">
      <div class="cover-brand">
        ${logo ? `<img class="cover-logo" src="${escapeHtml(logo)}" alt="" />` : ''}
      </div>
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
    body = renderDataSection(section.dataSource, sectionData)
  }
  return `<section class="section" id="${anchor}"><h1 class="section-title">${escapeHtml(section.title)}</h1>${body}</section>`
}

function buildStyles() {
  return `
    @page { size: letter; margin: 0.85in 0.7in 0.85in 0.7in; }
    @page :first { margin: 0; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 11pt;
      color: #1f2937;
      line-height: 1.4;
      margin: 0;
    }
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

    /* ----- TOC ----- */
    .toc { page-break-after: always; padding-top: 0.2in; }
    .toc-list { list-style: none; padding-left: 0; counter-reset: tocnum; }
    .toc-list li { padding: 0.35em 0; border-bottom: 1px dotted #cbd5e1; }
    .toc-list a { color: #1f2937; text-decoration: none; }
    .toc-num { color: #94a3b8; font-variant-numeric: tabular-nums; display: inline-block; min-width: 1.6em; }

    /* ----- Sections ----- */
    .section { page-break-before: always; padding-top: 0.2in; }
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
    .data-table .r { text-align: right; }
    .data-table .empty-row { text-align: center; color: #6b7280; font-style: italic; padding: 1.2em; }
    .data-table .w-rank { width: 3em; }
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
    .section ul, .section ol { padding-left: 1.3em; }
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
function buildHeaderTemplate(projectName, projectNumber) {
  return `<div style="font-size:8pt; width:100%; padding:0 0.7in; color:#475569; display:flex; justify-content:space-between; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
    <span style="font-weight:600; color:#1e3a8a;">cxma</span>
    <span>${escapeHtml(projectName)}</span>
    <span>${escapeHtml(projectNumber || '')}</span>
  </div>`
}

function buildFooterTemplate(reportTitle) {
  return `<div style="font-size:8pt; width:100%; padding:0 0.7in; color:#94a3b8; display:flex; justify-content:space-between; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
    <span>${escapeHtml(reportTitle || 'Cx Final Report')}</span>
    <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
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
function buildReportHtml({ report, project, sectionData }) {
  const sections = Array.isArray(report.sections) ? [...report.sections] : []
  // Sort by `order` for deterministic output regardless of save order.
  sections.sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
  const sectionsHtml = sections
    .filter((s) => s.enabled !== false)
    .map((s) => renderSection(s, sectionData && sectionData[s.key]))
    .join('')
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Final Cx Report — ${escapeHtml((project && project.name) || '')}</title>
<style>${buildStyles()}</style>
</head>
<body>
${renderCover(project || {}, report)}
${renderToc(sections)}
${sectionsHtml}
</body>
</html>`
}

module.exports = {
  buildReportHtml,
  buildHeaderTemplate,
  buildFooterTemplate,
  // Exported for tests / debugging
  _renderers: DATA_RENDERERS,
}
