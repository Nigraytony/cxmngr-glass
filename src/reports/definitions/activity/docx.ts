// Word (.docx) renderer for the redesigned Activity report. Consumes the SAME
// ActivityReportModel as pdf.ts (built in model.ts) so the two outputs cannot
// drift, and emits Word-friendly HTML converted via core/htmlDocx. Styling
// mirrors the PDF's slate + emerald system within what Word honors reliably
// (inline colors, table borders/shading; no flex/absolute positioning).
import { loadPhoto } from '../../core/images'
import { convertHtmlToDocxBlob } from '../../core/htmlDocx'
import type { ActivityReportModel, ContentBlock, RichRun, SessionVM, SeverityBucket } from './model'

const SLATE = '#0f172a'
const INK = '#1e293b'
const MUTED = '#64748b'
const HAIRLINE = '#cbd5e1'
const ZEBRA = '#f8fafc'
const EMERALD = '#10b981'
const AMBER = '#b45309'
const AMBER_BG = '#fef3c7'
const GREEN = '#15803d'
const SEV: Record<SeverityBucket, { text: string; bg: string }> = {
  High: { text: '#b91c1c', bg: '#fee2e2' },
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
const h2 = (text: string) => `<h2 style="color:${SLATE}; font-size:17px; margin:18px 0 6px;">${esc(text)}</h2>`
const h3 = (text: string) => `<h3 style="color:${SLATE}; font-size:13px; margin:12px 0 4px;">${esc(text)}</h3>`
const small = (text: string) => `<p style="font-size:9px; color:${MUTED}; margin:0 0 6px;">${esc(text)}</p>`
const sevChip = (s: SeverityBucket) => `<span style="font-weight:bold; font-size:9px; color:${SEV[s].text}; background-color:${SEV[s].bg};">&nbsp;${s.toUpperCase()}&nbsp;</span>`

export function runsHtml(runs: RichRun[]): string {
  return runs.map((r) => {
    let t = esc(r.text)
    if (r.italic) t = `<em>${t}</em>`
    if (r.bold) t = `<strong>${t}</strong>`
    if (r.accent) t = `<span style="color:${AMBER}; font-weight:bold;">${t}</span>`
    else if (r.green) t = `<span style="color:${GREEN}; font-weight:bold;">${t}</span>`
    return t
  }).join('')
}

/** Flat depth-tagged blocks -> nested, editable Word lists + paragraphs. */
export function blocksHtml(blocks: ContentBlock[]): string {
  let out = ''
  let i = 0
  const renderList = (depth: number): string => {
    let listHtml = ''
    let tag: 'ul' | 'ol' | null = null
    const flush = () => {
      if (tag && listHtml) out2 += `<${tag} style="margin:2px 0 6px;">${listHtml}</${tag}>`
      listHtml = ''
      tag = null
    }
    let out2 = ''
    while (i < blocks.length) {
      const b = blocks[i]
      if (b.kind !== 'bullet' || b.depth < depth) break
      if (b.depth > depth) {
        // nested run belongs inside the previous <li>
        const nested = renderList(b.depth)
        listHtml = listHtml.replace(/<\/li>$/, `${nested}</li>`) || `<li>${nested}</li>`
        continue
      }
      const wantTag = b.marker === '•' ? 'ul' : 'ol'
      if (tag && tag !== wantTag) flush()
      tag = wantTag
      listHtml += `<li style="font-size:11px;">${runsHtml(b.runs)}</li>`
      i++
    }
    flush()
    return out2
  }
  while (i < blocks.length) {
    const b = blocks[i]
    if (b.kind === 'bullet') {
      out += renderList(b.depth)
    } else if (b.kind === 'subheading') {
      out += `<p style="font-weight:bold; color:${SLATE}; font-size:11.5px; margin:8px 0 2px;">${esc(b.text)}</p>`
      i++
    } else {
      out += `<p style="font-size:11px; margin:3px 0;">${runsHtml(b.runs)}</p>`
      i++
    }
  }
  return out
}

function sessionBodyHtml(sess: SessionVM): string {
  if (sess.blocks && sess.blocks.length) return blocksHtml(sess.blocks)
  // structured-session bullets
  const items = sess.bullets.map((b) => {
    let t = ''
    if (b.lead) t += `<strong>${esc(b.lead)}</strong> `
    t += esc(b.text)
    if (b.closed) t += ` <span style="color:${GREEN}; font-weight:bold;">Closed</span>`
    if (b.ref) t += ` <span style="color:${AMBER}; font-weight:bold;">${esc(b.ref)}</span>`
    return `<li style="font-size:11px;">${t}</li>`
  }).join('')
  return items ? `<ul style="margin:2px 0 6px;">${items}</ul>` : ''
}

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

export interface ActivityDocxBuildOptions {
  project?: any
  sections?: { minutes?: boolean; issues?: boolean; equipment?: boolean; photos?: boolean }
  photoLogLimit?: number
  logos?: { client?: string; cxa?: string }
}

/** Build the redesigned report HTML (exported for unit tests). */
export async function buildActivityDocxHtml(model: ActivityReportModel, opts: ActivityDocxBuildOptions = {}): Promise<{ html: string; header: string; footer: string }> {
  const on = (k: keyof NonNullable<ActivityDocxBuildOptions['sections']>) => opts.sections?.[k] !== false
  const parts: string[] = []
  let sectionNo = 1

  // ---- 1. Cover + summary ------------------------------------------------
  {
    const logoCells = `
      <table style="width:100%; border:0;"><tr>
        ${td(opts.logos?.client ? `<img src="${opts.logos.client}" width="120" />` : `<strong style="color:${SLATE};">${esc(opts.project?.client || '')}</strong>`, 'text-align:left;')}
        ${td(opts.logos?.cxa ? `<img src="${opts.logos.cxa}" width="120" />` : '', 'text-align:right;')}
      </tr></table>`
    const eyebrow = `<p style="color:${EMERALD}; font-weight:bold; font-size:10px; letter-spacing:1px; margin:10px 0 2px;">${esc(model.eyebrow)}</p>`
    const title = `<h1 style="color:${SLATE}; font-size:26px; margin:0 0 4px;">${esc(model.title)}</h1>`
    const subtitle = `<p style="color:${MUTED}; font-size:12px; margin:0 0 10px;">${esc(model.subtitle)}</p>`
    const hero = model.heroPhoto ? await photoTag(model.heroPhoto.dataUrl, 640, 1600) : ''
    const heroCap = model.heroPhoto?.caption ? small(`Fig. 1 — ${model.heroPhoto.caption}`) : ''
    const metaCells = model.metaStrip.map(m => td(
      `<p style="font-size:8.5px; color:${MUTED}; margin:0;">${esc(m.label)}</p>
       <p style="font-size:10.5px; color:${SLATE}; font-weight:bold; margin:1px 0 0;${m.mono ? ' font-family:Consolas,monospace;' : ''}">${esc(m.value)}</p>`,
      `border:1px solid ${HAIRLINE};`,
    )).join('')
    const kpiCells = model.kpis.map(k => td(
      `<p style="font-size:18px; font-weight:bold; color:${k.warn ? AMBER : SLATE}; margin:0;">${esc(k.value)}</p>
       <p style="font-size:8.5px; color:${MUTED}; margin:1px 0 0;">${esc(k.label)}</p>`,
      `background-color:${k.warn ? AMBER_BG : ZEBRA};`,
    )).join('')
    const nextVisit = model.nextVisit ? small(`Next site visit: ${model.nextVisit}`) : ''
    const summary = model.summaryItems.length
      ? `<h2 style="color:${SLATE}; font-size:14px; margin:12px 0 4px;">Summary of findings</h2>
         <ol style="margin:2px 0 8px;">${model.summaryItems.map(s => `<li style="font-size:11px;">${esc(s)}</li>`).join('')}</ol>`
      : ''
    parts.push(`${logoCells}${eyebrow}${title}${subtitle}${hero}${heroCap}
      <table style="width:100%; border-collapse:collapse; margin:8px 0;"><tr>${metaCells}</tr></table>
      <table style="width:100%; border-collapse:collapse; margin:4px 0 8px;"><tr>${kpiCells}</tr></table>
      ${nextVisit}${summary}
      <p style="page-break-after:always;">&nbsp;</p>`)
  }

  // ---- 2. Meeting minutes + action items --------------------------------
  if (on('minutes') && model.sessions.length) {
    sectionNo++
    const rows = model.sessions.map(sess => `<tr>
      ${td(`<p style="font-weight:bold; color:${SLATE}; font-size:11px; margin:0;">${esc(sess.name)}</p>` +
        sess.meta.map(m => `<p style="font-size:9px; color:${MUTED}; margin:1px 0 0;">${esc(m)}</p>`).join(''),
        `width:28%; border-top:1px solid ${HAIRLINE};`)}
      ${td(sessionBodyHtml(sess), `border-top:1px solid ${HAIRLINE};`)}
    </tr>`).join('')
    parts.push(`${h2(`${sectionNo}. Meeting minutes`)}<table style="width:100%; border-collapse:collapse;">${rows}</table>`)
  }
  if (model.actionItems.length) {
    if (!(on('minutes') && model.sessions.length)) { sectionNo++; parts.push(h2(`${sectionNo}. Action items`)) }
    else parts.push(h3('Action items'))
    const head = ['ID', 'Action', 'Owner', 'Due', 'Ref'].map(hd => `<th style="background-color:${SLATE}; color:#ffffff; font-size:9px; text-align:left; padding:4px 6px; border:0;">${hd}</th>`).join('')
    const rows = model.actionItems.map(ai => `<tr>
      <td style="border-bottom:1px solid ${HAIRLINE}; padding:4px 6px; font-family:Consolas,monospace; font-size:10px; color:${ai.done ? MUTED : SLATE};">${esc(ai.id)}</td>
      <td style="border-bottom:1px solid ${HAIRLINE}; padding:4px 6px; font-size:10.5px; color:${ai.done ? MUTED : INK};">${esc(ai.action)}</td>
      <td style="border-bottom:1px solid ${HAIRLINE}; padding:4px 6px; font-size:10.5px;">${esc(ai.owner || '—')}</td>
      <td style="border-bottom:1px solid ${HAIRLINE}; padding:4px 6px; font-size:10.5px;">${esc(ai.due || '—')}</td>
      <td style="border-bottom:1px solid ${HAIRLINE}; padding:4px 6px; font-size:9.5px; color:${MUTED};">${esc(ai.ref)}</td>
    </tr>`).join('')
    parts.push(`<table style="width:100%; border-collapse:collapse;"><tr>${head}</tr>${rows}</table>`)
  }

  // ---- 3. Issues log ------------------------------------------------------
  if (on('issues') && (model.issues.length || model.observations.length)) {
    sectionNo++
    const cts = model.issueCounts
    const note = [cts.high ? `${cts.high} High` : '', cts.medium ? `${cts.medium} Medium` : '', cts.low ? `${cts.low} Low` : ''].filter(Boolean).join(' · ')
    parts.push(h2(`${sectionNo}. Issues log${note ? ` — ${note}` : ''}`))
    parts.push(small('All open issues on equipment in this activity’s scope, plus issues linked directly to the activity. Full history in the project issues log.'))
    for (const iss of model.issues) {
      const thumb = (!iss.sameAs && iss.photoSrc) ? await photoTag(iss.photoSrc, 140, 480) : ''
      parts.push(`<table style="width:100%; border-collapse:collapse; margin:0 0 2px;"><tr>
        ${td(`<p style="font-family:Consolas,monospace; font-weight:bold; color:${SLATE}; font-size:11px; margin:0;">#${esc(iss.number)}</p>
              <p style="margin:2px 0 0;">${sevChip(iss.severity)}</p>
              <p style="font-size:9px; color:${MUTED}; margin:2px 0 0;">${esc(iss.status)}</p>`, `width:12%; border-top:1px solid ${HAIRLINE};`)}
        ${td(`<p style="font-weight:bold; color:${SLATE}; font-size:11px; margin:0;">${esc([iss.tag, iss.title].filter(Boolean).join(' · '))}</p>
              <p style="font-size:10.5px; margin:2px 0 0;">${esc(iss.description)}</p>
              ${iss.recommendation ? `<p style="font-size:10.5px; margin:2px 0 0;"><strong>Fix:</strong> ${esc(iss.recommendation)}</p>` : ''}
              <p style="font-size:9px; color:${MUTED}; margin:2px 0 0;">${esc(iss.metaLine)}</p>`, `border-top:1px solid ${HAIRLINE};`)}
        ${thumb ? td(thumb, `width:20%; border-top:1px solid ${HAIRLINE}; text-align:right;`) : ''}
      </tr></table>`)
    }
    if (model.observations.length) {
      parts.push(`<table style="width:100%; border-collapse:collapse; margin:6px 0;"><tr>
        ${td(`<p style="font-weight:bold; color:${SLATE}; font-size:10.5px; margin:0;">Observation (not a deficiency)</p>` +
          model.observations.map(o => `<p style="font-size:10.5px; margin:3px 0 0;">${esc(o)}</p>`).join(''),
          `background-color:${ZEBRA}; border:1px solid ${HAIRLINE}; padding:6px 8px;`)}
      </tr></table>`)
    }
  }

  // ---- 4. Equipment status ------------------------------------------------
  if (on('equipment') && model.equipmentRows.length) {
    sectionNo++
    parts.push(h2(`${sectionNo}. Equipment status`))
    parts.push(small('Prefunctional checklist (PFC) progress as of this visit.'))
    const head = ['Tag', 'Equipment', 'Make / model', 'PFC', 'FPT', 'Issues'].map(hd => `<th style="background-color:${SLATE}; color:#ffffff; font-size:9px; text-align:left; padding:4px 6px; border:0;">${hd.toUpperCase()}</th>`).join('')
    const rows = model.equipmentRows.map(r => {
      const issColor = r.openIssues > 0 ? SEV[r.worstSeverity || 'Low'].text : MUTED
      return `<tr>
        <td style="border-bottom:1px solid ${HAIRLINE}; padding:4px 6px; font-family:Consolas,monospace; font-size:10px; color:${SLATE};">${esc(r.tag || '—')}</td>
        <td style="border-bottom:1px solid ${HAIRLINE}; padding:4px 6px; font-size:10.5px;">${esc(r.name || '—')}</td>
        <td style="border-bottom:1px solid ${HAIRLINE}; padding:4px 6px; font-size:10px; color:${MUTED};">${esc(r.makeModel || '—')}</td>
        <td style="border-bottom:1px solid ${HAIRLINE}; padding:4px 6px; font-size:10.5px;">${r.pfcTotal > 0 ? `${r.pfcDone}/${r.pfcTotal}` : '—'}</td>
        <td style="border-bottom:1px solid ${HAIRLINE}; padding:4px 6px; font-size:10.5px;">${r.fptTotal > 0 ? `${r.fptDone}/${r.fptTotal}` : '—'}</td>
        <td style="border-bottom:1px solid ${HAIRLINE}; padding:4px 6px; font-size:10.5px; font-weight:bold; color:${issColor};">${r.openIssues}</td>
      </tr>`
    }).join('')
    parts.push(`<table style="width:100%; border-collapse:collapse;"><tr>${head}</tr>${rows}</table>`)
    if (model.remainingByTrade.length) {
      parts.push(h3('Remaining PFC items by trade'))
      for (const t of model.remainingByTrade) {
        const shown = t.items.slice(0, 6)
        const suffix = t.count > shown.length ? ` · +${t.count - shown.length} more` : ''
        parts.push(`<p style="font-size:10.5px; margin:2px 0;"><strong>${esc(t.trade)} (${t.count})</strong> — ${esc(shown.join('; '))}${esc(suffix)}</p>`)
      }
    }
  }

  // ---- 5. Photo log -------------------------------------------------------
  const figStart = model.heroPhoto ? 2 : 1
  const logPhotos = model.photos.slice(model.heroPhoto ? 1 : 0, (model.heroPhoto ? 1 : 0) + (opts.photoLogLimit ?? 6))
  if (on('photos') && logPhotos.length) {
    sectionNo++
    parts.push(h2(`${sectionNo}. Photo log`))
    let grid = ''
    for (let i = 0; i < logPhotos.length; i += 2) {
      const cell = async (p: typeof logPhotos[number] | undefined, fig: number) => {
        if (!p) return td('')
        const img = await photoTag(p.dataUrl, 300)
        const chips = [
          ...p.tags.map(t => `<span style="font-family:Consolas,monospace; font-size:8.5px; background-color:${ZEBRA}; color:${SLATE};">&nbsp;${esc(t)}&nbsp;</span>`),
          ...p.issueRefs.map(r => `<span style="font-size:8.5px; font-weight:bold; background-color:${SEV.High.bg}; color:${SEV.High.text};">&nbsp;${esc(r)}&nbsp;</span>`),
        ].join(' ')
        return td(`${img}<p style="margin:3px 0 0;"><strong style="font-size:9.5px; color:${SLATE};">Fig. ${fig}</strong> ${chips}</p>${p.caption ? `<p style="font-size:9.5px; margin:1px 0 0;">${esc(p.caption)}</p>` : ''}`, 'width:50%;')
      }
      grid += `<tr>${await cell(logPhotos[i], figStart + i)}${await cell(logPhotos[i + 1], figStart + i + 1)}</tr>`
    }
    parts.push(`<table style="width:100%; border-collapse:collapse;">${grid}</table>`)
  }

  // ---- 6. Attendance, revision & sign-off ---------------------------------
  sectionNo++
  if (model.attendees.length) {
    parts.push(h2(`${sectionNo}. Attendance & distribution`))
    parts.push(small('● present · ○ distribution only'))
    const half = Math.ceil(model.attendees.length / 2)
    const cols = [model.attendees.slice(0, half), model.attendees.slice(half)]
    const colHtml = (list: typeof model.attendees) => list.map(a =>
      `<p style="font-size:10.5px; margin:2px 0; color:${a.present ? INK : MUTED};">${a.present ? '●' : '○'} <strong style="color:${a.present ? SLATE : MUTED};">${esc(a.name)}</strong> <span style="font-size:9px; color:${MUTED};">${esc(a.org)}</span></p>`,
    ).join('')
    parts.push(`<table style="width:100%; border:0;"><tr>${td(colHtml(cols[0]), 'width:50%;')}${td(colHtml(cols[1]), 'width:50%;')}</tr></table>`)
  }
  parts.push(h3('Revision & sign-off'))
  {
    const head = ['Rev', 'Date', 'Description', 'By'].map(hd => `<th style="background-color:${SLATE}; color:#ffffff; font-size:9px; text-align:left; padding:4px 6px; border:0;">${hd.toUpperCase()}</th>`).join('')
    const rows = model.revisionRows.map(r => `<tr>${[r.rev, r.date, r.description, r.by].map(v => `<td style="border-bottom:1px solid ${HAIRLINE}; padding:4px 6px; font-size:10.5px;">${esc(v)}</td>`).join('')}</tr>`).join('')
    parts.push(`<table style="width:100%; border-collapse:collapse; margin:0 0 18px;"><tr>${head}</tr>${rows}</table>`)
    const sig = (who: string) => td(
      `<p style="border-top:1px solid ${SLATE}; margin:24px 4px 0; padding-top:3px; font-weight:bold; font-size:10px; color:${SLATE};">${esc(who)}</p><p style="font-size:9px; color:${MUTED}; margin:1px 4px 0;">Date</p>`,
      'width:50%;',
    )
    parts.push(`<table style="width:100%; border:0;"><tr>${sig(model.preparedBy ? `Prepared by — ${model.preparedBy}` : 'Prepared by')}${sig(model.reviewedBy ? `Reviewed by — ${model.reviewedBy}` : 'Reviewed by')}</tr></table>`)
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${parts.filter(Boolean).join('\n')}</body></html>`
  const header = `<table style="width:100%; border:0;"><tr>
    ${td(opts.logos?.client ? `<img src="${opts.logos.client}" width="80" />` : '', 'text-align:left; width:25%;')}
    ${td(`<p style="font-size:9px; font-weight:bold; color:${SLATE}; text-align:center; margin:0;">${esc(model.runningTitle)}</p>`, 'text-align:center;')}
    ${td(opts.logos?.cxa ? `<img src="${opts.logos.cxa}" width="80" />` : '', 'text-align:right; width:25%;')}
  </tr></table>`
  // The converter appends its PAGE field right after the footer text, so the
  // label ends with "· Page " to read "· Page 1" instead of "…datePAGE".
  const footer = `<p style="font-size:9px; color:${MUTED};">${esc(model.footerLabel)} · Page&#160;</p>`
  return { html, header, footer }
}

export async function generateActivityReportDocx(model: ActivityReportModel, opts: ActivityDocxBuildOptions = {}): Promise<Blob> {
  const { html, header, footer } = await buildActivityDocxHtml(model, opts)
  return convertHtmlToDocxBlob(html, header, footer)
}
