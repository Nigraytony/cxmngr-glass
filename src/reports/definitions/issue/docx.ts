// Word (.docx) renderer for the Issue Detail report. Consumes the SAME
// IssueReportModel as pdf.ts so the two formats cannot drift, honors the
// same section toggles, and keeps the deliberate fill-in blocks (ruled
// lines render as bottom-bordered cells Word users can type over).
import { loadPhoto } from '../../core/images'
import { convertHtmlToDocxBlob } from '../../core/htmlDocx'
import type { IssueReportModel } from './model'

const SLATE = '#0f172a'
const INK = '#1e293b'
const MUTED = '#64748b'
const HAIRLINE = '#cbd5e1'
const ZEBRA = '#f8fafc'
const EMERALD = '#10b981'
const RED = '#b91c1c'
const RED_BG = '#fee2e2'
const GREEN = '#15803d'
const SEV: Record<string, { text: string; bg: string }> = {
  Critical: { text: '#ffffff', bg: RED },
  High: { text: RED, bg: RED_BG },
  Medium: { text: '#b45309', bg: '#fef3c7' },
  Low: { text: '#475569', bg: '#f1f5f9' },
}

export function esc(v: any): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const td = (inner: string, style = '') => `<td style="border:0; vertical-align:top; padding:4px 6px; ${style}">${inner}</td>`
const h2 = (text: string, rightNote = '') => `<table style="width:100%; border:0; margin-top:14px;"><tr>
  ${td(`<h2 style="color:${SLATE}; font-size:15px; margin:0;">${esc(text)}</h2>`, 'padding-left:0;')}
  ${rightNote ? td(`<p style="font-size:9px; color:${MUTED}; text-align:right; margin:0;">${esc(rightNote)}</p>`, 'padding-right:0;') : ''}
</tr></table>`
const small = (text: string) => `<p style="font-size:9px; color:${MUTED}; margin:0 0 6px;">${esc(text)}</p>`
// A writable rule: paragraph bottom-borders do NOT survive the html-to-docx
// conversion, but table-cell borders do — each line is a one-cell table
// whose cell draws only its bottom border.
const ruleLine = () => `<table style="width:98%; border-collapse:collapse;"><tr><td style="border-bottom:1px solid ${MUTED}; padding:16px 2px 0;">&nbsp;</td></tr></table>`
const ruled = (label: string, lines = 1) => `<p style="font-size:9px; color:${MUTED}; margin:6px 0 0;">${esc(label)}</p>` +
  Array.from({ length: lines }, ruleLine).join('')

async function photoTag(src: string | undefined, widthPx: number, maxEdge = 1200): Promise<string> {
  if (!src) return ''
  try {
    const img = await loadPhoto(src, { maxEdge })
    if (!img.dataUrl) return ''
    const w = img.width || widthPx
    const h = img.height || widthPx
    const outW = Math.min(widthPx, w)
    const outH = Math.round(outW * (h / Math.max(1, w)))
    return `<img src="${img.dataUrl}" width="${outW}" height="${outH}" />`
  } catch (e) {
    return ''
  }
}

export interface IssueDocxOptions {
  project?: any
  sections?: Record<string, boolean>
  logos?: { client?: string; cxa?: string }
}

export async function buildIssueDocxHtml(model: IssueReportModel, opts: IssueDocxOptions = {}): Promise<{ html: string; header: string; footer: string }> {
  const on = (k: string) => opts.sections?.[k] !== false
  const parts: string[] = []
  const closedVerified = model.closed && model.verified

  // ---- Page 1: header block, title, chips, facts, condition, action -----
  parts.push(`<table style="width:100%; border:0;"><tr>
    ${td(opts.logos?.client ? `<img src="${opts.logos.client}" width="110" />` : '', 'text-align:left; width:30%;')}
    ${td(`<p style="font-weight:bold; color:${SLATE}; font-size:12px; margin:0;">${esc(model.projectName)}</p>
          <p style="font-size:9px; color:${MUTED}; margin:1px 0 0;">${esc([model.clientName, model.projectNo ? `Project ${model.projectNo}` : ''].filter(Boolean).join(' · '))}</p>`)}
    ${td(opts.logos?.cxa ? `<img src="${opts.logos.cxa}" width="110" /><p style="font-size:8px; color:${MUTED}; margin:1px 0 0;">Commissioning Authority</p>` : '', 'text-align:right; width:30%;')}
  </tr></table>`)

  parts.push(`<p style="color:${EMERALD}; font-weight:bold; font-size:10px; letter-spacing:1px; margin:10px 0 2px;">${esc(model.eyebrow)}</p>`)
  const sev = SEV[closedVerified ? 'Low' : model.priority] || SEV.Low
  const priChip = closedVerified
    ? `<span style="font-weight:bold; font-size:10px; color:${GREEN}; background-color:#d1fae5;">&nbsp;CLOSED&nbsp;</span>`
    : `<span style="font-weight:bold; font-size:10px; color:${sev.text}; background-color:${sev.bg};">&nbsp;${esc(model.priority.toUpperCase())}&nbsp;</span>`
  const statusChip = closedVerified ? '' : ` <span style="font-weight:bold; font-size:10px; color:${SLATE};">[${esc(model.statusLabel)}]</span>`
  // Chips + due line on their own full-width right-aligned line (a narrow
  // side cell wraps badly in Word); the title gets the full width below.
  const dueInline = model.dueLine
    ? ` &nbsp;·&nbsp; <span style="font-weight:bold; font-size:10px; color:${model.dueLine.red ? RED : MUTED};">${esc(model.dueLine.text)}</span>`
    : ''
  parts.push(`<p style="text-align:right; margin:0 0 3px;">${priChip}${statusChip}${dueInline}</p>`)
  parts.push(`<h1 style="font-size:20px; margin:0 0 4px;"><span style="font-family:Consolas,monospace; color:${MUTED};">#${esc(model.number)}</span> <span style="color:${SLATE};">${esc(model.title)}</span></h1>`)

  if (model.lifeSafetyNote) {
    parts.push(`<table style="width:100%; border-collapse:collapse; margin:6px 0;"><tr>
      ${td(`<p style="margin:0; font-size:10.5px; color:#7f1d1d;"><strong style="color:${RED};">Life safety.</strong> ${esc(model.lifeSafetyNote)}</p>`, `background-color:${RED_BG}; padding:6px 8px;`)}
    </tr></table>`)
  }

  // Facts grid (3 per row, empty cells skipped)
  {
    const filled = model.facts.filter(f => String(f.value || '').trim())
    let grid = ''
    for (let i = 0; i < filled.length; i += 3) {
      const row = filled.slice(i, i + 3)
      grid += '<tr>' + row.map(f => td(
        `<p style="font-size:8.5px; color:${MUTED}; margin:0;">${esc(f.label)}</p>
         <p style="font-size:10.5px; color:${SLATE}; font-weight:bold; margin:1px 0 0;${f.mono ? ' font-family:Consolas,monospace;' : ''}">${esc(f.value)}</p>`,
        `border:1px solid ${HAIRLINE}; width:33%;`,
      )).join('') + '</tr>'
    }
    if (grid) parts.push(`<table style="width:100%; border-collapse:collapse; margin:8px 0;">${grid}</table>`)
  }

  if (on('condition') && model.condition) {
    parts.push(h2('Condition observed'))
    parts.push(`<p style="font-size:11px; margin:3px 0;">${esc(model.condition)}</p>`)
  }

  if (on('requiredAction') && model.requiredAction.length) {
    parts.push(h2('Required action'))
    if (model.requiredAction.length === 1) {
      parts.push(`<p style="font-size:11px; margin:3px 0;">${esc(model.requiredAction[0])}</p>`)
    } else {
      parts.push(`<ol style="margin:2px 0 6px;">${model.requiredAction.map(a => `<li style="font-size:11px;">${esc(a)}</li>`).join('')}</ol>`)
    }
    if (model.referenceLine) parts.push(small(`Reference: ${model.referenceLine}`))
  }

  if (on('oprItems') && model.oprItems.length) {
    parts.push(h2('Related OPR items'))
    for (const o of model.oprItems) {
      parts.push(`<p style="font-size:10.5px; margin:2px 0;"><span style="font-family:Consolas,monospace; color:${MUTED};">${esc(o.ref)}</span> ${esc(o.text)}${o.category ? ` <span style="color:${MUTED};">· ${esc(o.category)}</span>` : ''}</p>`)
    }
  }

  const verificationHtml = model.verification
    ? `<p style="font-weight:bold; font-size:11px; color:${closedVerified ? GREEN : SLATE}; margin:3px 0;">${esc(model.verification.outcomeLabel)}</p>`
      + (model.verification.notes ? `<p style="font-size:10.5px; margin:2px 0;">${esc(model.verification.notes)}</p>` : '')
      + small([`Verified by ${model.verification.verifiedBy || '—'}`, model.verification.verifiedDate].filter(Boolean).join(' · '))
    : ''
  if (on('verification') && closedVerified && verificationHtml) {
    parts.push(h2('CxA verification'))
    parts.push(verificationHtml)
  }

  if (on('photos') && model.photos.length) {
    parts.push(h2('Photos', model.photosNote))
    let grid = ''
    for (let i = 0; i < model.photos.length; i += 3) {
      const row = model.photos.slice(i, i + 3)
      const cells: string[] = []
      for (let k = 0; k < row.length; k++) {
        const p = row[k]
        const img = await photoTag(p.dataUrl, 210, 1200)
        cells.push(td(`${img}<p style="margin:2px 0 0;"><strong style="font-size:9px; color:${SLATE};">Fig. ${i + k + 1}</strong>${p.caption ? ` <span style="font-size:9px;">${esc(p.caption)}</span>` : ''}</p>`, 'width:33%;'))
      }
      grid += `<tr>${cells.join('')}</tr>`
    }
    parts.push(`<table style="width:100%; border-collapse:collapse;">${grid}</table>`)
  }

  // ---- Page 2: response, verification, history, comments, distribution --
  const respWanted = on('response') && (!!model.response || !closedVerified)
  const verWanted = on('verification') && !closedVerified
  const histWanted = on('history') && model.history.length > 0
  const comWanted = on('comments') && model.comments.length > 0
  const distWanted = on('distribution') && !!model.distribution
  if (respWanted || verWanted || histWanted || comWanted || distWanted) {
    parts.push('<p style="page-break-after:always;">&nbsp;</p>')
  }

  if (respWanted) {
    parts.push(h2('Contractor response'))
    if (model.response) {
      parts.push(`<p style="font-size:11px; margin:3px 0;">${esc(model.response.correctiveAction)}</p>`)
      parts.push(small([
        model.response.completedDate ? `Completed ${model.response.completedDate}` : '',
        model.response.respondedBy ? `By ${model.response.respondedBy}` : '',
      ].filter(Boolean).join(' · ') || 'Recorded in cxma'))
    } else {
      parts.push(small('To be completed by the assigned party and returned to the CxA, or entered directly in cxma.'))
      parts.push(`<table style="width:100%; border-collapse:collapse;"><tr>
        ${td(ruled('Corrective action taken', 3), `border:1px solid ${HAIRLINE};`)}
      </tr><tr>
        ${td(ruled('Date completed'), `border:1px solid ${HAIRLINE}; width:33%;`)}
        ${td(ruled('Name · company'), `border:1px solid ${HAIRLINE}; width:34%;`)}
        ${td(ruled('Signature'), `border:1px solid ${HAIRLINE}; width:33%;`)}
      </tr></table>`)
    }
  }

  if (verWanted) {
    parts.push(h2('CxA verification'))
    if (verificationHtml) {
      parts.push(verificationHtml)
    } else {
      parts.push(`<table style="width:100%; border-collapse:collapse;"><tr>
        ${td(`<p style="font-size:10.5px; margin:0;">☐ Verified, issue closed &nbsp;&nbsp; ☐ Not resolved, remains open &nbsp;&nbsp; ☐ Accepted by Owner as-is</p>`, `border:1px solid ${HAIRLINE};`)}
      </tr><tr>
        ${td(ruled('Verification notes / back-check', 2), `border:1px solid ${HAIRLINE};`)}
      </tr><tr>
        ${td(ruled('Verified by'), `border:1px solid ${HAIRLINE}; width:50%;`)}
        ${td(ruled('Date'), `border:1px solid ${HAIRLINE}; width:50%;`)}
      </tr></table>`)
    }
  }

  if (histWanted) {
    parts.push(h2('History'))
    parts.push(small('Plain-language summary of the change log. Repeated edits within an hour are combined; saves with no changes are hidden.'))
    const rows = model.history.map(hr => {
      const color = hr.red ? RED : (hr.bold ? SLATE : INK)
      return `<tr>
        <td style="border-bottom:1px solid ${HAIRLINE}; padding:4px 6px; font-size:9px; color:${hr.red ? RED : MUTED}; width:20%;${hr.red ? ' font-weight:bold;' : ''}">${esc(hr.date)}</td>
        <td style="border-bottom:1px solid ${HAIRLINE}; padding:4px 6px; font-size:10px; color:${color};${(hr.bold || hr.red) ? ' font-weight:bold;' : ''}">${esc(hr.text)}</td>
        <td style="border-bottom:1px solid ${HAIRLINE}; padding:4px 6px; font-size:9px; color:${MUTED}; text-align:right; width:15%;">${esc(hr.by)}</td>
      </tr>`
    }).join('')
    parts.push(`<table style="width:100%; border-collapse:collapse;">${rows}</table>`)
  }

  if (comWanted) {
    parts.push(h2('Comments'))
    for (const cm of model.comments) {
      parts.push(`<p style="font-size:10px; margin:4px 0 0;"><strong style="color:${SLATE};">${esc([cm.author || 'Comment', cm.date].filter(Boolean).join(' · '))}</strong></p>`)
      parts.push(`<p style="font-size:10.5px; margin:1px 0 0;">${esc(cm.text)}</p>`)
    }
  }

  if (distWanted) {
    parts.push(`<p style="font-size:10px; margin:10px 0 0;"><strong style="color:${SLATE};">Distribution</strong> &nbsp; ${esc(model.distribution)}</p>`)
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${parts.filter(Boolean).join('\n')}</body></html>`
  const header = `<table style="width:100%; border:0;"><tr>
    ${td(opts.logos?.client ? `<img src="${opts.logos.client}" width="70" />` : '', 'text-align:left; width:22%;')}
    ${td(`<p style="font-size:9px; font-weight:bold; color:${SLATE}; text-align:center; margin:0;">${esc(model.runningTitle)}</p>`, 'text-align:center;')}
    ${td(opts.logos?.cxa ? `<img src="${opts.logos.cxa}" width="70" />` : '', 'text-align:right; width:22%;')}
  </tr></table>`
  // The converter appends its PAGE field right after the footer text, so the
  // label ends with "· Page " to read "· Page 1" instead of "…cxma1".
  const footer = `<p style="font-size:9px; color:${MUTED};">${esc(model.footerLabel)} · Page&#160;</p>`
  return { html, header, footer }
}

export async function generateIssueReportDocx(model: IssueReportModel, opts: IssueDocxOptions = {}): Promise<Blob> {
  const { html, header, footer } = await buildIssueDocxHtml(model, opts)
  return convertHtmlToDocxBlob(html, header, footer)
}
