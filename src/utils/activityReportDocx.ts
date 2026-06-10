// Builds a Microsoft Word (.docx) version of the Activity report, mirroring the
// same sections as the PDF (downloadActivityPdf in ActivityEdit.vue) but as real,
// editable text + tables + images rather than a flattened canvas image.
//
// The component prepares plain data (strings + image data URLs) and calls
// generateActivityDocxBlob(); the heavy lifting of HTML assembly lives here so it
// can be unit-tested without the Vue/report context. Conversion uses
// @turbodocx/html-to-docx (browser build) which turns an HTML string into a docx.

export interface DocxImage {
  dataUrl?: string
  width?: number
  height?: number
}

export interface DocxIssueRow {
  number?: string | number
  type?: string
  source?: string
  title?: string
  description?: string // already plain text
  recommendation?: string
  status?: string
}

export interface DocxEquipmentRow {
  tag?: string
  title?: string
  status?: string
  manufacturer?: string
  condition?: string
  location?: string
  photos?: DocxImage[]
  issues?: DocxIssueRow[]
}

export interface DocxAttachment {
  filename?: string
  image?: DocxImage // present for image attachments
}

export interface DocxChecklistItem {
  done: 'yes' | 'no' | 'na' | 'unknown'
  question: string
  notes?: string
}
export interface DocxChecklist {
  title: string
  items: DocxChecklistItem[]
}
export interface DocxFptRow {
  step?: string
  expected?: string
  actual?: string
}
export interface DocxFunctionalTest {
  title: string
  status?: 'PASS' | 'FAIL' | null
  description?: string
  notes?: string
  rows?: DocxFptRow[]
}
export interface DocxComponent {
  header: string
  type?: string
  status?: string
  attributes?: Array<{ key: string; value: string }>
  notes?: string
}
export interface DocxSignature {
  name: string
  role?: string
  title?: string
  date?: string
  image?: DocxImage
}
export interface DocxEquipmentReportIncludes {
  info?: boolean
  attributes?: boolean
  components?: boolean
  photos?: boolean
  checklists?: boolean
  fpt?: boolean
  signatures?: boolean
  issues?: boolean
  attachments?: boolean
}
// A full per-equipment report (mirrors generateEquipmentPdf in equipmentReport.ts).
export interface DocxEquipmentReport {
  tag?: string
  title?: string
  type?: string
  system?: string
  status?: string
  spaceName?: string
  descriptionHtml?: string
  attributes?: Array<{ key: string; value: string }>
  components?: DocxComponent[]
  photos?: DocxImage[]
  checklists?: DocxChecklist[]
  functionalTests?: DocxFunctionalTest[]
  signatures?: DocxSignature[]
  issues?: DocxIssueRow[]
  attachments?: DocxAttachment[]
  include?: DocxEquipmentReportIncludes
}

export interface ActivityDocxData {
  include: {
    coverPage?: boolean
    toc?: boolean
    info?: boolean
    description?: boolean
    photos?: boolean
    issues?: boolean
    attachments?: boolean
    equipmentList?: boolean
    equipmentReports?: boolean
  }
  activityName: string
  activityType?: string
  startDate?: string
  endDate?: string
  location?: string
  projectName?: string
  descriptionHtml?: string
  cover?: { title?: string; subtitle?: string; byLine?: string; jumbotron?: DocxImage | null }
  photos?: DocxImage[]
  equipment?: DocxEquipmentRow[]
  equipmentReports?: DocxEquipmentReport[]
  issues?: DocxIssueRow[]
  attachments?: DocxAttachment[]
  logos?: { client?: DocxImage | null; cxa?: DocxImage | null }
}

function esc(v: any): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Inline-styled table cell — html-to-docx honours inline border/padding styles.
const TD = 'style="border:1px solid #444; padding:4px 6px; vertical-align:top; font-size:11px;"'
const TH = 'style="border:1px solid #444; padding:4px 6px; vertical-align:top; font-size:11px; background:#f3f4f6; font-weight:bold; text-align:left;"'
const TABLE = 'style="width:100%; border-collapse:collapse; margin:6px 0 12px;"'

function img(image?: DocxImage | null, maxW = 600): string {
  const src = image && image.dataUrl ? String(image.dataUrl) : ''
  if (!src) return ''
  // Constrain width; html-to-docx reads width/height from the style attribute.
  let w = maxW
  let h: number | null = null
  if (image && image.width && image.height) {
    const ratio = image.height / image.width
    w = Math.min(maxW, image.width)
    h = Math.round(w * ratio)
  }
  const dim = h ? `width:${w}px; height:${h}px;` : `width:${w}px;`
  return `<img src="${src}" style="${dim}" />`
}

function coverSection(d: ActivityDocxData): string {
  const c = d.cover || {}
  const parts: string[] = []
  if (c.title) parts.push(`<h1 style="text-align:center; font-size:28px; margin:0 0 8px;">${esc(c.title)}</h1>`)
  if (c.subtitle) parts.push(`<p style="text-align:center; font-size:16px; color:#374151; margin:0 0 8px;">${esc(c.subtitle)}</p>`)
  if (c.jumbotron && c.jumbotron.dataUrl) parts.push(`<p style="text-align:center;">${img(c.jumbotron, 600)}</p>`)

  const meta: string[] = []
  if (d.projectName) meta.push(`<strong>Project:</strong> ${esc(d.projectName)}`)
  if (d.activityType) meta.push(`<strong>Type:</strong> ${esc(d.activityType)}`)
  const dateRange = [d.startDate, d.endDate].filter(Boolean).join(' – ')
  if (dateRange) meta.push(`<strong>Dates:</strong> ${esc(dateRange)}`)
  if (d.location) meta.push(`<strong>Location:</strong> ${esc(d.location)}`)
  if (c.byLine) meta.push(`<strong>By:</strong> ${esc(c.byLine)}`)
  if (meta.length) parts.push(`<p style="text-align:center; font-size:12px; margin-top:12px;">${meta.join('<br />')}</p>`)

  // Page break after the cover.
  parts.push('<p style="page-break-after:always;"></p>')
  return parts.join('\n')
}

function tocSection(d: ActivityDocxData): string {
  const inc = d.include || {}
  const items: string[] = []
  if (inc.info) items.push('Info')
  if (inc.description) items.push('Description')
  if (inc.photos) items.push('Photos')
  if (inc.equipmentList && (d.equipment || []).length) items.push('Equipment List')
  if (inc.issues) items.push('Issues')
  if (inc.equipmentReports && (d.equipment || []).length) items.push('Equipment Reports')
  if (inc.attachments) items.push('Attachments')
  if (!items.length) return ''
  return `<h2>Contents</h2><ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`
}

function infoSection(d: ActivityDocxData): string {
  const rows: Array<[string, string]> = []
  if (d.activityType) rows.push(['Type', d.activityType])
  if (d.startDate) rows.push(['Start', d.startDate])
  if (d.endDate) rows.push(['End', d.endDate])
  if (d.location) rows.push(['Location', d.location])
  if (d.projectName) rows.push(['Project', d.projectName])
  if (!rows.length) return ''
  const body = rows
    .map(([k, v]) => `<tr><td ${TD}><strong>${esc(k)}</strong></td><td ${TD}>${esc(v)}</td></tr>`)
    .join('')
  return `<h2>Info</h2><table ${TABLE}>${body}</table>`
}

function descriptionSection(d: ActivityDocxData): string {
  const html = String(d.descriptionHtml || '').trim()
  if (!html) return ''
  // Strip the invisible Cx Plan marker divs so they don't render.
  const cleaned = html.replace(/<div\s+data-cx-plan-marker=[^>]*>\s*<\/div>/gi, '')
  return `<h2>Description</h2>${cleaned}`
}

function photosSection(d: ActivityDocxData): string {
  const photos = (d.photos || []).filter((p) => p && p.dataUrl)
  if (!photos.length) return ''
  const imgs = photos.map((p) => `<span style="display:inline-block; margin:4px;">${img(p, 260)}</span>`).join('')
  return `<h2>Photos</h2><p>${imgs}</p>`
}

function equipmentListSection(d: ActivityDocxData): string {
  const eq = d.equipment || []
  if (!eq.length) return ''
  const head = `<tr><th ${TH}>Tag</th><th ${TH}>Title</th><th ${TH}>Status</th><th ${TH}>Manufacturer</th><th ${TH}>Condition</th></tr>`
  const rows = eq
    .map(
      (e) =>
        `<tr><td ${TD}>${esc(e.tag || '—')}</td><td ${TD}>${esc(e.title || '—')}</td><td ${TD}>${esc(e.status || '—')}</td><td ${TD}>${esc(e.manufacturer || '—')}</td><td ${TD}>${esc(e.condition || '—')}</td></tr>`,
    )
    .join('')
  return `<h2>Equipment List</h2><table ${TABLE}>${head}${rows}</table>`
}

function issuesTable(issues: DocxIssueRow[]): string {
  if (!issues.length) return ''
  const head = `<tr><th ${TH}>#</th><th ${TH}>Type</th><th ${TH}>Source</th><th ${TH}>Title</th><th ${TH}>Description</th><th ${TH}>Recommendation</th><th ${TH}>Status</th></tr>`
  const rows = issues
    .map((it) => {
      const isClosed = String(it.status || '').toLowerCase().startsWith('closed')
      const rowStyle = isClosed ? ' style="background:#ececec;"' : ''
      const num = it.number != null ? `#${esc(it.number)}` : '—'
      return `<tr${rowStyle}><td ${TD}>${num}</td><td ${TD}>${esc(it.type || '—')}</td><td ${TD}>${esc(it.source || '—')}</td><td ${TD}>${esc(it.title || '—')}</td><td ${TD}>${esc(it.description || '—')}</td><td ${TD}>${esc(it.recommendation || '—')}</td><td ${TD}>${esc(it.status || 'Open')}</td></tr>`
    })
    .join('')
  return `<table ${TABLE}>${head}${rows}</table>`
}

function issuesSection(d: ActivityDocxData): string {
  const issues = d.issues || []
  if (!issues.length) return ''
  return `<h2>Issues</h2>${issuesTable(issues)}`
}

// Equipment Reports: a full per-equipment report mirroring generateEquipmentPdf
// (Info, Description, Attributes, Components, Photos, Checklists, Functional Tests,
// Signatures, Issues, Attachments) as editable text/tables/images.
function eqInfoHtml(r: DocxEquipmentReport): string {
  const rows: Array<[string, string]> = []
  if (r.tag) rows.push(['Tag', r.tag])
  if (r.title) rows.push(['Title', r.title])
  if (r.type) rows.push(['Type', r.type])
  if (r.system) rows.push(['System', r.system])
  if (r.status) rows.push(['Status', r.status])
  if (r.spaceName) rows.push(['Space', r.spaceName])
  if (!rows.length) return ''
  const body = rows.map(([k, v]) => `<tr><td ${TD}><strong>${esc(k)}</strong></td><td ${TD}>${esc(v)}</td></tr>`).join('')
  return `<h4>Info</h4><table ${TABLE}>${body}</table>`
}

function eqAttributesHtml(r: DocxEquipmentReport): string {
  const attrs = (r.attributes || []).filter((a) => a && (String(a.key || '').trim() || String(a.value || '').trim()))
  if (!attrs.length) return ''
  const body = attrs.map((a) => `<tr><td ${TD}><strong>${esc(a.key)}</strong></td><td ${TD}>${esc(a.value)}</td></tr>`).join('')
  return `<h4>Attributes</h4><table ${TABLE}>${body}</table>`
}

function eqComponentsHtml(r: DocxEquipmentReport): string {
  const comps = r.components || []
  if (!comps.length) return ''
  const blocks = comps
    .map((c) => {
      const meta: string[] = []
      if (c.type) meta.push(`<strong>Type:</strong> ${esc(c.type)}`)
      if (c.status) meta.push(`<strong>Status:</strong> ${esc(c.status)}`)
      const metaHtml = meta.length ? `<p style="font-size:11px; margin:2px 0;">${meta.join(' &bull; ')}</p>` : ''
      const attrs = (c.attributes || []).filter((a) => a && a.key)
      const attrHtml = attrs.length
        ? `<p style="font-size:11px; margin:2px 0 2px 10px;">${attrs.map((a) => `${esc(a.key)}: ${esc(a.value)}`).join('<br />')}</p>`
        : ''
      const notesHtml = c.notes ? `<p style="font-size:11px; margin:2px 0 2px 10px;"><em>Notes:</em> ${esc(c.notes)}</p>` : ''
      return `<p style="font-size:12px; margin:4px 0 0;"><strong>${esc(c.header)}</strong></p>${metaHtml}${attrHtml}${notesHtml}`
    })
    .join('')
  return `<h4>Components</h4>${blocks}`
}

function eqPhotosHtml(r: DocxEquipmentReport): string {
  const photos = (r.photos || []).filter((p) => p && p.dataUrl)
  if (!photos.length) return ''
  const imgs = photos.map((p) => `<span style="display:inline-block; margin:4px;">${img(p, 240)}</span>`).join('')
  return `<h4>Photos</h4><p>${imgs}</p>`
}

function doneMark(done: DocxChecklistItem['done']): string {
  if (done === 'yes') return '&#9745;' // ☑
  if (done === 'na') return 'N/A'
  return '&#9744;' // ☐
}

function eqChecklistsHtml(r: DocxEquipmentReport): string {
  const lists = (r.checklists || []).filter((s) => s && (s.items || []).length)
  if (!lists.length) return ''
  const sections = lists
    .map((s) => {
      const head = `<tr><th ${TH} width="8%">Done</th><th ${TH}>Question</th><th ${TH} width="33%">Notes</th></tr>`
      const rows = s.items
        .map((it) => `<tr><td ${TD}>${doneMark(it.done)}</td><td ${TD}>${esc(it.question || '—')}</td><td ${TD}>${esc(it.notes || '')}</td></tr>`)
        .join('')
      return `<p style="font-size:12px; margin:4px 0 0;"><strong>${esc(s.title || 'Section')}</strong></p><table ${TABLE}>${head}${rows}</table>`
    })
    .join('')
  return `<h4>Checklists</h4>${sections}`
}

function eqFunctionalTestsHtml(r: DocxEquipmentReport): string {
  const tests = r.functionalTests || []
  if (!tests.length) return ''
  const blocks = tests
    .map((t) => {
      const statusHtml = t.status
        ? `<p style="font-size:11px; margin:2px 0;"><strong>Status:</strong> <span style="color:${t.status === 'PASS' ? '#15803d' : '#b91c1c'};">${esc(t.status)}</span></p>`
        : ''
      const descHtml = t.description ? `<p style="font-size:11px; margin:2px 0 2px 10px;"><em>Description:</em> ${esc(t.description)}</p>` : ''
      const notesHtml = t.notes ? `<p style="font-size:11px; margin:2px 0 2px 10px;"><em>Notes:</em> ${esc(t.notes)}</p>` : ''
      const rows = (t.rows || []).filter((x) => x)
      let tableHtml = ''
      if (rows.length) {
        const head = `<tr><th ${TH}>Step</th><th ${TH}>Expected</th><th ${TH}>Actual</th></tr>`
        const body = rows.map((x) => `<tr><td ${TD}>${esc(x.step || '')}</td><td ${TD}>${esc(x.expected || '')}</td><td ${TD}>${esc(x.actual || '')}</td></tr>`).join('')
        tableHtml = `<table ${TABLE}>${head}${body}</table>`
      }
      return `<p style="font-size:12px; margin:6px 0 0;"><strong>${esc(t.title)}</strong></p>${statusHtml}${descHtml}${notesHtml}${tableHtml}`
    })
    .join('')
  return `<h4>Functional Tests</h4>${blocks}`
}

function eqSignaturesHtml(r: DocxEquipmentReport): string {
  const sigs = r.signatures || []
  if (!sigs.length) return ''
  const blocks = sigs
    .map((s) => {
      const imgHtml = s.image && s.image.dataUrl ? `<br />${img(s.image, 200)}` : ''
      const who = s.role ? `<strong>${esc(s.role)}:</strong> ${esc(s.name)}` : `<strong>${esc(s.name)}</strong>`
      const titleHtml = s.title ? `<br />${esc(s.title)}` : ''
      const dateHtml = s.date ? `<br /><span style="font-size:10px; color:#555;">${esc(s.date)}</span>` : ''
      return `<td ${TD} width="50%">${who}${titleHtml}${dateHtml}${imgHtml}</td>`
    })
  // Two signatures per row.
  const rows: string[] = []
  for (let i = 0; i < blocks.length; i += 2) {
    rows.push(`<tr>${blocks[i]}${blocks[i + 1] || `<td ${TD}></td>`}</tr>`)
  }
  return `<h4>Signatures</h4><table ${TABLE}>${rows.join('')}</table>`
}

function oneEquipmentReportHtml(r: DocxEquipmentReport): string {
  const inc = r.include || {}
  const heading = [r.tag, r.title].filter(Boolean).join(' — ') || 'Equipment'
  const parts: string[] = [`<h3>${esc(heading)}</h3>`]
  if (inc.info !== false) parts.push(eqInfoHtml(r))
  if (inc.info !== false && r.descriptionHtml && r.descriptionHtml.trim()) {
    parts.push(`<h4>Description</h4>${r.descriptionHtml}`)
  }
  if (inc.attributes !== false) parts.push(eqAttributesHtml(r))
  if (inc.components !== false) parts.push(eqComponentsHtml(r))
  if (inc.photos !== false) parts.push(eqPhotosHtml(r))
  if (inc.checklists !== false) parts.push(eqChecklistsHtml(r))
  if (inc.fpt !== false) parts.push(eqFunctionalTestsHtml(r))
  if (inc.signatures) parts.push(eqSignaturesHtml(r))
  if (inc.issues !== false && (r.issues || []).length) parts.push(`<h4>Issues</h4>${issuesTable(r.issues as DocxIssueRow[])}`)
  if (inc.attachments !== false && (r.attachments || []).length) {
    const list = (r.attachments || []).map((a) => `<li>${esc(a.filename || 'Attachment')}</li>`).join('')
    const images = (r.attachments || [])
      .filter((a) => a.image && a.image.dataUrl)
      .map((a) => `<p><em>${esc(a.filename || 'Attachment')}</em><br />${img(a.image, 480)}</p>`)
      .join('')
    parts.push(`<h4>Attachments</h4><ul>${list}</ul>${images}`)
  }
  return parts.filter(Boolean).join('\n')
}

function equipmentReportsSection(d: ActivityDocxData): string {
  const reports = d.equipmentReports || []
  if (!reports.length) return ''
  const blocks = reports.map(oneEquipmentReportHtml).join('<p style="page-break-after:always;"></p>')
  return `<h2>Equipment Reports</h2>${blocks}`
}

function attachmentsSection(d: ActivityDocxData): string {
  const atts = d.attachments || []
  if (!atts.length) return ''
  const list = atts.map((a) => `<li>${esc(a.filename || 'Attachment')}</li>`).join('')
  const images = atts
    .filter((a) => a.image && a.image.dataUrl)
    .map((a) => `<p><em>${esc(a.filename || 'Attachment')}</em><br />${img(a.image, 600)}</p>`)
    .join('')
  return `<h2>Attachments</h2><ul>${list}</ul>${images}`
}

export function buildActivityReportHtml(d: ActivityDocxData): { html: string; header: string; footer: string } {
  const inc = d.include || {}
  const sections: string[] = []
  if (inc.coverPage) sections.push(coverSection(d))
  if (inc.toc) sections.push(tocSection(d))
  if (inc.info) sections.push(infoSection(d))
  if (inc.description) sections.push(descriptionSection(d))
  if (inc.photos) sections.push(photosSection(d))
  if (inc.equipmentList) sections.push(equipmentListSection(d))
  if (inc.issues) sections.push(issuesSection(d))
  if (inc.equipmentReports) sections.push(equipmentReportsSection(d))
  if (inc.attachments) sections.push(attachmentsSection(d))

  const body = sections.filter(Boolean).join('\n')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`

  // Branded header: client logo (left) + commissioning-agent logo (right).
  const logos = d.logos || {}
  const left = logos.client && logos.client.dataUrl ? img(logos.client, 120) : ''
  const right = logos.cxa && logos.cxa.dataUrl ? img(logos.cxa, 120) : ''
  const header =
    left || right
      ? `<table style="width:100%; border:0;"><tr><td style="border:0; text-align:left;">${left}</td><td style="border:0; text-align:right;">${right}</td></tr></table>`
      : `<p style="font-size:10px; color:#666;">${esc(d.activityName || 'Activity')}</p>`
  const footer = `<p style="font-size:9px; color:#666;">cxma — ${esc(d.activityName || 'Activity')}</p>`

  return { html, header, footer }
}

// Picking the right build is fiddly: the ESM/UMD builds pull Node-only APIs
// (fs/http, Node stream classes) that break in the browser, and the package's
// `browser` field is a self-contained IIFE that assigns to a local `var HTMLToDOCX`
// and exports nothing — so a normal `import` yields no function. The IIFE build IS
// browser-safe though (it returns a Blob when `global.Blob` exists). So we load its
// source text (Vite `?raw`) and evaluate it with `global` bound to `globalThis`,
// returning the function. The app has no CSP, so `new Function` is permitted.
type HtmlToDocxFn = (html: string, header: string, opts: any, footer: string) => Promise<any>
let cachedConverter: HtmlToDocxFn | null = null

async function loadHtmlToDocx(): Promise<HtmlToDocxFn> {
  if (cachedConverter) return cachedConverter
  // Load the self-contained IIFE build's source and evaluate it. We bind `global`
  // to globalThis and inject `Buffer`/`process` as scope variables — the build's
  // image-embedding path references a bare `Buffer` that is undefined in the
  // browser, so without this any report containing a photo/signature throws
  // "Buffer is not defined" and loses content. `buffer` is already a dependency.
  const raw: any = await import('@turbodocx/html-to-docx/dist/html-to-docx.browser.js?raw')
  const src = String(raw && (raw.default ?? raw))
  if (!src || typeof (globalThis as any).Blob === 'undefined') {
    throw new Error('Word converter unavailable in this environment')
  }
  let BufferImpl: any = (globalThis as any).Buffer
  if (typeof BufferImpl === 'undefined') {
    try {
      const bufMod: any = await import('buffer')
      BufferImpl = bufMod.Buffer || (bufMod.default && bufMod.default.Buffer)
    } catch (_) { /* leave undefined; text-only reports still work */ }
  }
  const processShim = (globalThis as any).process || { env: {}, browser: true, nextTick: (cb: any) => setTimeout(cb, 0) }
  // eslint-disable-next-line no-new-func
  const factory = new Function('global', 'Buffer', 'process', `${src}\n;return HTMLToDOCX;`)
  const fn = factory(globalThis, BufferImpl, processShim)
  if (typeof fn !== 'function') throw new Error('Word converter failed to load')
  cachedConverter = fn as HtmlToDocxFn
  return cachedConverter
}

export async function generateActivityDocxBlob(d: ActivityDocxData): Promise<Blob> {
  const { html, header, footer } = buildActivityReportHtml(d)
  const htmlToDocx = await loadHtmlToDocx()
  const options = {
    orientation: 'portrait' as const,
    margins: { top: 720, right: 720, bottom: 720, left: 720 },
    header: true,
    footer: true,
    pageNumber: true,
    table: { row: { cantSplit: true } },
  }
  const out: any = await htmlToDocx(html, header, options, footer)
  if (out instanceof Blob) return out
  // Buffer / Uint8Array / ArrayBuffer path — pass the view directly (don't use
  // .buffer, which for a pooled Buffer may include unrelated trailing bytes).
  const part = out instanceof ArrayBuffer ? new Uint8Array(out) : out
  return new Blob([part], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}
