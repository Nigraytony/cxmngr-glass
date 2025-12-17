import { jsPDF } from 'jspdf'
import { drawBrandedFooter, drawBrandedHeader } from './pdfBranding'

// Minimal image format enum mirroring existing usage
export type ImageFormat = 'JPEG' | 'PNG' | 'WEBP' | 'GIF' | 'SVG'

type LoadedImage = {
  dataUrl?: string
  format?: ImageFormat
  width?: number
  height?: number
}

function mimeToFormat(mime?: string | null): ImageFormat | undefined {
  if (!mime) return undefined
  const m = mime.toLowerCase()
  if (m.includes('png')) return 'PNG'
  if (m.includes('jpeg') || m.includes('jpg')) return 'JPEG'
  if (m.includes('webp')) return 'WEBP'
  if (m.includes('gif')) return 'GIF'
  if (m.includes('svg')) return 'SVG'
  return undefined
}

async function convertDataUrlToJpeg(dataUrl: string, quality = 0.92): Promise<string | null> {
  try {
    const img = new Image(); img.crossOrigin = 'anonymous'
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('img load fail')); img.src = dataUrl })
    const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth || img.width; canvas.height = img.naturalHeight || img.height
    const ctx = canvas.getContext('2d'); if (!ctx) return null; ctx.drawImage(img, 0, 0)
    return canvas.toDataURL('image/jpeg', quality)
  } catch (e) { return null }
}

async function loadImage(src?: string): Promise<LoadedImage> {
  try {
    if (!src) return {}
    let dataUrl: string | undefined
    let format: ImageFormat | undefined

    if (src.startsWith('data:')) {
      const mime = src.slice(5, src.indexOf(';'))
      format = mimeToFormat(mime)
      if (format === 'WEBP' || (mime && mime.toLowerCase().includes('svg'))) {
        const conv = await convertDataUrlToJpeg(src)
        if (conv) {
          dataUrl = conv
          format = 'JPEG'
        }
      }
      if (!dataUrl) {
        dataUrl = src
      }
    } else {
      const res = await fetch(src)
      if (!res.ok) return {}
      const blob = await res.blob()
      const rawDataUrl: string = await new Promise(resolve => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.readAsDataURL(blob)
      })
      format = blob.type ? mimeToFormat(blob.type) : undefined
      if (!format || format === 'WEBP' || blob.type.toLowerCase().includes('svg')) {
        const conv = await convertDataUrlToJpeg(rawDataUrl)
        if (conv) {
          dataUrl = conv
          format = 'JPEG'
        } else {
          dataUrl = rawDataUrl
        }
      } else {
        dataUrl = rawDataUrl
      }
    }

    if (!dataUrl) return {}

    // Measure intrinsic dimensions to allow aspect-ratio-preserving scaling
    const dims = await new Promise<{ width: number; height: number }>((resolve) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.naturalWidth || img.width || 0, height: img.naturalHeight || img.height || 0 })
      img.onerror = () => resolve({ width: 0, height: 0 })
      img.src = dataUrl as string
    })

    return {
      dataUrl,
      format,
      width: dims.width || undefined,
      height: dims.height || undefined,
    }
  } catch (e) {
    return {}
  }
}
function htmlToText(html: any): string {
  if (!html) return ''
  try {
    const tmp = document.createElement('div')
    tmp.innerHTML = String(html)
    const t = (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim()
    return t
  } catch (e) {
    return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  }
}
function splitText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth) as unknown as string[]
}
function passCellState(v: any): 'none' | 'pass' | 'fail' {
  const x = v
  if (x === true || x === 'true' || String(x) === '1') return 'pass'
  if (x === false || x === 'false' || String(x) === '0') return 'fail'
  const s = String(x ?? '').trim().toLowerCase()
  if (!s) return 'none'
  // Be tolerant of values like "PASS ✅", "Passed", "Fail (needs retest)", etc.
  if (s === 'yes' || s === 'ok' || s === 'success' || s.startsWith('pass') || s.includes(' pass')) return 'pass'
  if (s === 'no' || s === 'failed' || s.startsWith('fail') || s.includes(' fail')) return 'fail'
  return 'none'
}
function passLabel(state: 'none' | 'pass' | 'fail') { return state === 'pass' ? 'PASS' : state === 'fail' ? 'FAIL' : '—' }

export interface GenerateEquipmentPdfOptions {
  include?: Partial<Record<'info'|'attributes'|'components'|'photos'|'attachments'|'checklists'|'fpt'|'issues', boolean>>
  photoLimit?: number
}

export async function generateEquipmentPdf(eq: any, project: any, issuesById: Record<string, any>, spacesById: Record<string, any>, opts?: GenerateEquipmentPdfOptions): Promise<ArrayBuffer> {
  const include = { info: true, attributes: true, components: true, photos: true, attachments: true, checklists: true, fpt: true, issues: true, ...(opts?.include || {}) }
  const photoLimit = typeof opts?.photoLimit === 'number' ? opts.photoLimit : 6
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 12
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const bottomLimit = pageHeight - 26
  const pageDate = new Date().toLocaleDateString()
  let pageNo = 1
  let y = margin

  const clientImg = await loadImage(project?.logo)
  const cxaImg = await loadImage(project?.commissioning_agent?.logo)
  // Footer branding: icon + "cxma"
  let footerLogo = await loadImage('/brand/logo-2.png'); if (!footerLogo.dataUrl) footerLogo = await loadImage('/brand/logo-2.svg')
  if (!footerLogo.dataUrl) footerLogo = await loadImage('/brand/logo.png')
  if (!footerLogo.dataUrl) footerLogo = await loadImage('/brand/logo.svg')

  const drawFooter = () => {
    const prevFont = (doc as any).getFont ? (doc as any).getFont() : { fontName: 'helvetica', fontStyle: 'normal' }
    const prevSize = (doc as any).getFontSize ? (doc as any).getFontSize() : 9
    drawBrandedFooter(doc, {
      margin,
      pageWidth,
      pageHeight,
      pageNo,
      pageDate,
      footerLogo,
      leftLabel: `${eq.tag || eq.title || 'Equipment'} Report`,
      setBold: () => doc.setFont('helvetica', 'bold'),
      setNormal: () => doc.setFont('helvetica', 'normal'),
    })
    doc.setFont((prevFont as any).fontName || 'helvetica', (prevFont as any).fontStyle || 'normal'); doc.setFontSize(prevSize)
  }
  const drawHeader = () => {
    const prevFont = (doc as any).getFont ? (doc as any).getFont() : { fontName: 'helvetica', fontStyle: 'normal' }
    const prevSize = (doc as any).getFontSize ? (doc as any).getFontSize() : 9
    const headTitle = (eq && (eq.tag || eq.title)) ? (eq.tag || eq.title) : 'Equipment'
    const res = drawBrandedHeader(doc, {
      margin,
      pageWidth,
      title: `${headTitle} Report`,
      leftLogo: clientImg,
      rightLogo: cxaImg,
      logoH: 12,
      maxLogoW: 36,
      titleFontSize: 20,
      setTitleFont: () => doc.setFont('helvetica', 'bold'),
    })
    y = res.nextY
    doc.setFont((prevFont as any).fontName || 'helvetica', (prevFont as any).fontStyle || 'normal'); doc.setFontSize(prevSize)
  }
  const ensureSpace = (amount: number): boolean => { if (y + amount > bottomLimit) { drawFooter(); doc.addPage(); pageNo++; y = margin; drawHeader(); return true } return false }
  const sectionGap = (gap=6) => { ensureSpace(gap); y += gap }
  drawHeader()

  // Info
  if (include.info) {
    doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.text('Info', margin, y); y += 6; doc.setFont('helvetica','normal'); doc.setFontSize(12)
    const spaceName = (sid?: string) => { const s = sid ? spacesById[String(sid)] : null; return s ? (s.title || s.tag || '') : '' }
    const info: Array<[string,string]> = [ ['Tag', eq.tag||''], ['Title', eq.title||''], ['Type', eq.type||''], ['System', eq.system||''], ['Status', eq.status||''], ['Space', spaceName(eq.spaceId)] ]
    const colW = (pageWidth - margin*2)/2; let i=0
    for (const [label,value] of info) { const col = i%2; const row=Math.floor(i/2); const x= margin + col*colW; const yy = y + row*8; ensureSpace(11); doc.setTextColor(100); doc.text(label+':', x, yy); doc.setTextColor(0); const lines = splitText(doc, String(value||'—'), colW - 24); doc.text(lines, x+24, yy); i++ }
    const rows = Math.ceil(info.length/2); y += rows*8 + 2
    if (eq.description) { ensureSpace(14); doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.text('Description', margin, y); y += 6; doc.setFont('helvetica','normal'); doc.setFontSize(12); const lines = splitText(doc, htmlToText(eq.description), pageWidth - margin*2); for (const l of lines) { ensureSpace(7); doc.text(l, margin, y); y += 6 } }
  }
  // Attributes
  if (include.attributes) {
    const attrs: Array<{key:string;value:string}> = Array.isArray(eq.attributes) ? eq.attributes.filter((r:any)=> (String(r?.key||'').trim()||String(r?.value||'').trim())) : []
    if (attrs.length) { sectionGap(); ensureSpace(12); doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.text('Attributes', margin, y); y += 6; doc.setFont('helvetica','normal'); doc.setFontSize(12); for (const a of attrs) { const line = `${a.key}: ${a.value}`; const lines = splitText(doc, line, pageWidth - margin*2); for (const l of lines) { ensureSpace(7); doc.text(l, margin + 2, y); y += 6 } } }
  }
  // Components
  if (include.components) {
    const comps: any[] = Array.isArray(eq.components)? eq.components : []
    if (comps.length) { sectionGap(); ensureSpace(12); doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.text('Components', margin, y); y += 6; doc.setFont('helvetica','normal'); doc.setFontSize(12); const toPairs = (obj:any)=> { if(!obj) return []; if(Array.isArray(obj)) return obj.map((r:any)=> ({k:String(r?.key??r?.title??''), v:String(r?.value??'')})).filter((p:any)=>p.k); if(typeof obj==='object') return Object.entries(obj).map(([k,v])=> ({k:String(k), v:String(v??'')})); return [] }; for (const c of comps){ const header = `${c.tag ? c.tag + ' — ' : ''}${c.title || c.type || 'Component'}`; const hLines = splitText(doc, header, pageWidth - margin*2); doc.setFont('helvetica','bold'); for(const l of hLines){ ensureSpace(7); doc.text(l, margin+2, y); y +=5 } doc.setFont('helvetica','normal'); const metaBits: string[] = []; if(c.type) metaBits.push(`Type: ${c.type}`); if(c.status) metaBits.push(`Status: ${c.status}`); const meta = metaBits.join('  •  '); if(meta){ const mLines = splitText(doc, meta, pageWidth - margin*2 -4); for(const l of mLines){ ensureSpace(6); doc.text(l, margin+4, y); y +=5 } } const attrs = toPairs(c?.attributes); for(const p of attrs){ const txt = `${p.k}: ${p.v}`; const aLines = splitText(doc, txt, pageWidth - margin*2 -6); for(const l of aLines){ ensureSpace(6); doc.text(l, margin+6, y); y +=5 } } if(c.notes){ const nLines = splitText(doc, `Notes: ${c.notes}`, pageWidth - margin*2 -6); for(const l of nLines){ ensureSpace(6); doc.text(l, margin+6, y); y +=5 } } y +=3 } }
  }
  // Photos
  if (include.photos) {
    const phs: any[] = Array.isArray(eq.photos)? eq.photos : []
    const imgs: LoadedImage[] = []
    for (let p = 0; p < Math.min(photoLimit, phs.length); p++) {
      const src = phs[p]?.data || phs[p]?.url || phs[p]
      const imgRaw = await loadImage(src)
      if (imgRaw.dataUrl) imgs.push(imgRaw)
    }
    if (imgs.length) {
      sectionGap()
      ensureSpace(10)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text('Photos', margin, y)
      y += 4

      // Maintain aspect ratio while keeping 3 thumbnails per row.
      const gutter = 4
      const thumbW = (pageWidth - margin * 2 - gutter * 2) / 3
      let rowStart = 0
      while (rowStart < imgs.length) {
        const rowImgs = imgs.slice(rowStart, rowStart + 3)
        // Compute scaled heights for this row based on aspect ratio.
        const heights = rowImgs.map(img => {
          if (img.width && img.height && img.width > 0 && img.height > 0) {
            return thumbW * (img.height / img.width)
          }
          // Fallback aspect ratio if dimensions are missing.
          return thumbW * 0.75
        })
        const rowHeight = Math.max(...heights) + gutter
        // Ensure room for this row; if not, move to next page before drawing it.
        ensureSpace(rowHeight)

        rowImgs.forEach((img, idxInRow) => {
          const drawH = heights[idxInRow]
          const drawW = thumbW
          const x = margin + idxInRow * (thumbW + gutter)
          const yy = y
          try {
            doc.addImage(img.dataUrl!, img.format || 'JPEG', x, yy, drawW, drawH)
          } catch (e) {
            // ignore single image failures
          }
        })

        y += rowHeight
        rowStart += 3
      }
      y += 2
    }
  }
  // Checklists
  if (include.checklists) {
    const sections: any[] = Array.isArray(eq.checklists)? eq.checklists : []
    if (sections.length){ sectionGap(); ensureSpace(12); doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.text('Checklists', margin, y); y +=6; doc.setFont('helvetica','normal'); doc.setFontSize(12); for (const s of sections){ const title = String(s?.title || 'Section'); ensureSpace(7); doc.setFont('helvetica','bold'); doc.text(title, margin+1, y); y +=6; doc.setFont('helvetica','normal'); const items: any[] = Array.isArray(s?.questions)? s.questions : (Array.isArray(s?.items)? s.items : []); if(!items.length) continue; const totalW = pageWidth - margin*2 -2; const doneW = 12; const notesW = Math.max(28, Math.min(60, totalW*0.33)); const textW = totalW - doneW - notesW; const tableX = margin + 1; const drawChecklistHeader = () => { ensureSpace(9); doc.setFont('helvetica','bold'); const headerH = 7; doc.setFillColor(235,245,238); doc.rect(tableX,y,totalW,headerH,'F'); doc.rect(tableX,y,totalW,headerH); doc.line(tableX+doneW, y, tableX+doneW, y+headerH); doc.line(tableX+doneW+textW, y, tableX+doneW+textW, y+headerH); doc.text('Done', tableX+1.5, y+5); doc.text('Question', tableX+doneW+1.5, y+5); doc.text('Notes', tableX+doneW+textW+1.5, y+5); y += headerH; doc.setFont('helvetica','normal') }; drawChecklistHeader(); for (const it of items){ let doneTxt = '[ ]'; if (typeof it?.done !== 'undefined'){ doneTxt = it?.done ? '[x]' : '[ ]' } else if (typeof it?.answer !== 'undefined' && it?.answer !== null){ const ans = String(it.answer).toLowerCase(); doneTxt = ans === 'yes' ? '[x]' : (ans === 'na' ? 'N/A' : '[ ]') } const questionText = String(it?.question_text ?? it?.text ?? ''); const qLines = splitText(doc, questionText, textW - 3); const nLines = splitText(doc, String(it?.notes || ''), notesW - 3); const hLines = Math.max(1, qLines.length, nLines.length); const rowH = Math.max(8, hLines*5 + 2); if (ensureSpace(rowH + 2)){ drawChecklistHeader() } doc.rect(tableX, y, totalW, rowH); doc.line(tableX+doneW, y, tableX+doneW, y+rowH); doc.line(tableX+doneW+textW, y, tableX+doneW+textW, y+rowH); doc.text(doneTxt, tableX+1.5, y+5); for (let k=0;k<qLines.length;k++){ doc.text(qLines[k], tableX+doneW+1.5, y+5 + k*5) } for (let k=0;k<nLines.length;k++){ doc.text(nLines[k], tableX+doneW+textW+1.5, y+5 + k*5) } y += rowH } sectionGap(6) } }
  }
  // Functional Tests
  if (include.fpt) {
    const tests: any[] = Array.isArray(eq.functionalTests)? eq.functionalTests : []
    if (tests.length) {
      sectionGap(); ensureSpace(12); doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.text('Functional Tests', margin, y); y += 6; doc.setFont('helvetica','normal'); doc.setFontSize(12)
      for (const t of tests) {
        const number = (t?.number != null && t?.number !== undefined) ? `#${t.number} ` : ''
        const title = `${number}${String(t?.name || t?.title || 'Test')}`
        const lines = splitText(doc, title, pageWidth - margin * 2)
        doc.setFont('helvetica', 'bold')
        for (const l of lines) { ensureSpace(6); doc.text(l, margin + 1, y); y += 5 }
        doc.setFont('helvetica', 'normal')

        if (t?.pass === true || t?.pass === false) {
          const st = t.pass === true ? 'PASS' : 'FAIL'
          ensureSpace(5)
          // Color inline status line to match table semantics
          const norm = st.toLowerCase()
          if (norm === 'pass') doc.setTextColor(0, 128, 0)
          else if (norm === 'fail') doc.setTextColor(200, 0, 0)
          else doc.setTextColor(0)
          doc.text(`Status: ${st}`, margin + 2, y)
          doc.setTextColor(0)
          y += 5
        }

        if (t?.description) {
          const dLines = splitText(doc, `Description: ${String(t.description)}`, pageWidth - margin * 2 - 4)
          for (const l of dLines) { ensureSpace(6); doc.text(l, margin + 4, y); y += 5 }
        }
        if (t?.notes) {
          const nLines = splitText(doc, `Notes: ${String(t.notes)}`, pageWidth - margin * 2 - 4)
          for (const l of nLines) { ensureSpace(6); doc.text(l, margin + 4, y); y += 5 }
        }

        const hasSheetRows = Array.isArray(t?.rows) && t.rows.length && (t.kind === 'sheet')
        const tbl = t?.table && Array.isArray(t.table.columns) ? t.table : null
        let tableRendered = false

        if (hasSheetRows) {
          const totalW = pageWidth - margin * 2 - 2
          const cols = [{ key: 'step', name: 'Step' }, { key: 'expected', name: 'Expected' }, { key: 'actual', name: 'Actual' }]
          const colW = totalW / cols.length
          const tableX = margin + 1
          const drawSheetHeader = () => {
            ensureSpace(9); doc.setFont('helvetica', 'bold'); const headerH = 7; doc.setFillColor(235, 241, 250); doc.rect(tableX, y, totalW, headerH, 'F'); doc.rect(tableX, y, totalW, headerH)
            for (let i = 1; i < cols.length; i++) { const vx = tableX + i * colW; doc.line(vx, y, vx, y + headerH) }
            cols.forEach((c, idx) => { const x = tableX + idx * colW + 1.5; doc.text(String(c.name || ''), x, y + 5) })
            y += headerH; doc.setFont('helvetica', 'normal')
          }
          drawSheetHeader()
          for (const r of t.rows) {
            const s = splitText(doc, String(r?.step ?? ''), colW - 3)
            const e = splitText(doc, String(r?.expected ?? ''), colW - 3)
            const a = splitText(doc, String(r?.actual ?? ''), colW - 3)
            const hLines = Math.max(s.length, e.length, a.length)
            const rowH = Math.max(8, hLines * 5 + 2)
            if (ensureSpace(rowH + 2)) { drawSheetHeader() }
            doc.rect(tableX, y, totalW, rowH)
            for (let i = 1; i < cols.length; i++) { const vx = tableX + i * colW; doc.line(vx, y, vx, y + rowH) }
            const cells = [s, e, a]
            cells.forEach((lines, idx) => {
              const x = tableX + idx * colW + 1.5
              for (let k = 0; k < lines.length; k++) { doc.text(lines[k], x, y + 5 + k * 5) }
            })
            y += rowH
          }
          sectionGap(6); tableRendered = true
        } else if (tbl && Array.isArray(tbl.rows)) {
          const cols = tbl.columns as Array<{ key: string; name: string }>
          const rows = tbl.rows as Array<Record<string, any>>
          if (cols.length) {
            const totalW = pageWidth - margin * 2 - 2
            const baseW = totalW / cols.length
            const tableX = margin + 1
            const drawTableHeader = () => {
              ensureSpace(9); doc.setFont('helvetica', 'bold'); const headerH = 7; doc.setFillColor(235, 241, 250); doc.rect(tableX, y, totalW, headerH, 'F'); doc.rect(tableX, y, totalW, headerH)
              for (let i = 1; i < cols.length; i++) { const vx = tableX + i * baseW; doc.line(vx, y, vx, y + headerH) }
              cols.forEach((c, idx) => {
                const x = tableX + idx * baseW + 1.5
                const name = String(c.name || '')
                doc.text(name, x, y + 5)
              })
              y += headerH; doc.setFont('helvetica', 'normal')
            }
            drawTableHeader()
            for (const r of rows) {
              const prepared: string[][] = cols.map(c => {
                const isPassCol = !!(c.name && ['pass', 'result', 'status'].includes(String(c.name).toLowerCase()))
                const raw = isPassCol ? passLabel(passCellState(r[c.key])) : String(r[c.key] ?? '')
                return splitText(doc, raw, baseW - 3)
              })
              const hLines = prepared.reduce((m, lines) => Math.max(m, lines.length), 0)
              const rowH = Math.max(8, hLines * 5 + 2)
              if (ensureSpace(rowH + 2)) { drawTableHeader() }

              // Pre-fill PASS / FAIL cells with a light background tint
              cols.forEach((c, idx) => {
                const isPassCol = !!(c.name && ['pass', 'result', 'status'].includes(String(c.name).toLowerCase()))
                if (!isPassCol) return
                const state = passCellState((r as any)[c.key])
                if (state === 'none') return
                const cellX = tableX + idx * baseW
                if (state === 'pass') {
                  // Soft green background
                  doc.setFillColor(222, 247, 233)
                } else if (state === 'fail') {
                  // Soft red background
                  doc.setFillColor(254, 226, 226)
                }
                doc.rect(cellX, y, baseW, rowH, 'F')
              })

              // Draw table grid on top of backgrounds
              doc.rect(tableX, y, totalW, rowH)
              for (let i = 1; i < cols.length; i++) { const vx = tableX + i * baseW; doc.line(vx, y, vx, y + rowH) }

	              // Draw cell text, with PASS/FAIL colored accordingly
	              cols.forEach((c, idx) => {
	                const x = tableX + idx * baseW + 1.5
	                const centerX = tableX + idx * baseW + baseW / 2
	                const lines = prepared[idx]
	                const isPassCol = !!(c.name && ['pass', 'result', 'status'].includes(String(c.name).toLowerCase()))
	                for (let k = 0; k < lines.length; k++) {
	                  const txt = lines[k]
	                  if (isPassCol) {
	                    const norm = String(txt || '').trim().toLowerCase()
	                    if (norm.startsWith('pass')) doc.setTextColor(0, 128, 0)
	                    else if (norm.startsWith('fail')) doc.setTextColor(200, 0, 0)
	                    else doc.setTextColor(0)
	                  } else {
	                    doc.setTextColor(0)
	                  }
	                  if (isPassCol) {
	                    doc.text(txt, centerX, y + 5 + k * 5, { align: 'center' })
	                  } else {
	                    doc.text(txt, x, y + 5 + k * 5)
	                  }
	                }
	                doc.setTextColor(0)
	              })
              y += rowH
            }
            sectionGap(6); tableRendered = true
          }
        }
        if (!tableRendered) y += 2
      }
    }
  }

  // Issues (matches EquipmentEdit Issues tab behavior)
  if (include.issues) {
    const eqId = String((eq?.id || (eq as any)?._id) || '')
    const tag = String(eq?.tag || '')

    const seen = new Set<string>()
    const iss: any[] = []
    const pushIssue = (it: any) => {
      if (!it) return
      const iid = String((it && ((it as any).id || (it as any)._id)) || '')
      const key = iid || `${String((it as any).number ?? '')}|${String((it as any).type ?? '')}|${String((it as any).title ?? '').slice(0, 40)}`
      if (!key || seen.has(key)) return
      seen.add(key)
      iss.push(it)
    }

    // From equipment.issues refs (ids only; always use canonical store issues)
    const refs: any[] = Array.isArray(eq.issues) ? eq.issues : []
    for (const r of refs) {
      const iid = String(((r as any)?.id || (r as any)?._id) || r || '')
      if (iid && issuesById[iid]) pushIssue(issuesById[iid])
    }

    // Collect linked issue ids from functional tests/checklists (no inline objects)
    const linked = new Set<string>()
    try {
      const fpts: any[] = Array.isArray((eq as any).functionalTests) ? (eq as any).functionalTests : []
      for (const f of fpts) {
        const list = Array.isArray(f?.issues) ? f.issues : []
        for (const r of list) {
          const iid = String((r && ((r as any).id || (r as any)._id)) || r || '')
          if (iid) linked.add(iid)
        }
      }
      const chks: any[] = Array.isArray((eq as any).checklists) ? (eq as any).checklists : []
      for (const c of chks) {
        const items: any[] = Array.isArray(c?.questions) ? c.questions : (Array.isArray(c?.items) ? c.items : [])
        for (const q of items) {
          const list = Array.isArray(q?.issues) ? q.issues : []
          for (const r of list) {
            const iid = String((r && ((r as any).id || (r as any)._id)) || r || '')
            if (iid) linked.add(iid)
          }
        }
      }
    } catch (e) { /* ignore */ }

    for (const iid of linked) {
      if (issuesById[iid]) pushIssue(issuesById[iid])
    }

    // From project issues linked to this equipment (assetId) or matching its tag as location
    try {
      const allIssues = Object.values(issuesById || {}) as any[]
      for (const it of allIssues) {
        if (eqId && String((it as any)?.assetId || '') === eqId) pushIssue(it)
        else if (tag && String((it as any)?.location || '') === tag) pushIssue(it)
      }
    } catch (e) { /* ignore */ }

    if (iss.length) {
      sectionGap(); ensureSpace(12)
      doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.text('Issues', margin, y); y +=6
      doc.setFont('helvetica','normal'); doc.setFontSize(12)

      const totalW = pageWidth - margin*2 -2
      const numW = 16
      const typeW = Math.round(26 * 0.75)
      const sourceW = 20
      const titleW = Math.round(42 * 0.75)
      // Allocate more width to Recommendation (+10%) and reduce Description accordingly.
      const descW = Math.round((totalW - numW - typeW - sourceW - titleW) * 0.35)
      const recW = Math.round((totalW - numW - typeW - sourceW - titleW) * 0.45)
      const statusW = Math.round(24 * 0.75)
      const restW = totalW - numW - typeW - sourceW - titleW - descW - recW - statusW
      const finalDescW = descW + restW
      const tableX = margin + 1

      const drawIssuesHeader = () => {
        ensureSpace(9)
        doc.setFont('helvetica','bold')
        const headerH = 7
        doc.setFillColor(250,236,236)
        doc.rect(tableX, y, totalW, headerH, 'F')
        doc.rect(tableX, y, totalW, headerH)
        const colXs = [
          tableX,
          tableX + numW,
          tableX + numW + typeW,
          tableX + numW + typeW + sourceW,
          tableX + numW + typeW + sourceW + titleW,
          tableX + numW + typeW + sourceW + titleW + finalDescW,
          tableX + numW + typeW + sourceW + titleW + finalDescW + recW,
          tableX + numW + typeW + sourceW + titleW + finalDescW + recW + statusW,
        ]
        for (let i = 1; i < colXs.length; i++) { const vx = colXs[i]; doc.line(vx, y, vx, y + headerH) }
        doc.text('Number', tableX + 1.5, y + 5)
        doc.text('Type', tableX + numW + 1.5, y + 5)
        doc.text('Source', tableX + numW + typeW + 1.5, y + 5)
        doc.text('Title', tableX + numW + typeW + sourceW + 1.5, y + 5)
        doc.text('Description', tableX + numW + typeW + sourceW + titleW + 1.5, y + 5)
        doc.text('Recommendation', tableX + numW + typeW + sourceW + titleW + finalDescW + 1.5, y + 5)
        doc.text('Status', tableX + numW + typeW + sourceW + titleW + finalDescW + recW + 1.5, y + 5)
        y += headerH
        doc.setFont('helvetica','normal')
      }

      drawIssuesHeader()
      for (const it of iss) {
        const numTxt = (it.number != null && it.number !== undefined) ? `#${it.number}` : '—'
        const typeTxt = String(it.type || '—')
        const sourceTxt = String((it as any).__source || (it as any).source || tag || '—')
        const titleTxt = String(it.title || '—')
        const descTxt = htmlToText((it as any).description || (it as any).descriptionHtml || '—')
        const recTxt = htmlToText((it as any).recommendation || (it as any).recommendationText || (it as any).recommendation_text || '—')
        const statusTxt = String(it.status || 'Open')

        const numLines = splitText(doc, numTxt, numW - 3)
        const typeLines = splitText(doc, typeTxt, typeW - 3)
        const sourceLines = splitText(doc, sourceTxt, sourceW - 3)
        const titleLines = splitText(doc, titleTxt, titleW - 3)
        const descLines = splitText(doc, descTxt, finalDescW - 3)
        const recLines = splitText(doc, recTxt, recW - 3)
        const statusLines = splitText(doc, statusTxt, statusW - 3)
        const hLines = Math.max(1, numLines.length, typeLines.length, sourceLines.length, titleLines.length, descLines.length, recLines.length, statusLines.length)
        const rowH = Math.max(8, hLines * 5 + 2)
        if (ensureSpace(rowH + 2)) { drawIssuesHeader() }

        doc.rect(tableX, y, totalW, rowH)
        const colXs = [
          tableX,
          tableX + numW,
          tableX + numW + typeW,
          tableX + numW + typeW + sourceW,
          tableX + numW + typeW + sourceW + titleW,
          tableX + numW + typeW + sourceW + titleW + finalDescW,
          tableX + numW + typeW + sourceW + titleW + finalDescW + recW,
          tableX + numW + typeW + sourceW + titleW + finalDescW + recW + statusW,
        ]
        for (let i = 1; i < colXs.length; i++) { const vx = colXs[i]; doc.line(vx, y, vx, y + rowH) }

        let cx = tableX + 1.5
        const colLines = [numLines, typeLines, sourceLines, titleLines, descLines, recLines, statusLines]
        const colWidths = [numW, typeW, sourceW, titleW, finalDescW, recW, statusW]
        for (let col = 0; col < colLines.length; col++) {
          const lines = colLines[col]
          for (let k = 0; k < lines.length; k++) { doc.text(lines[k], cx, y + 5 + k * 5) }
          cx += colWidths[col]
        }
        y += rowH
      }
      sectionGap(6)
    }
  }
  // Attachments
  if (include.attachments) {
    const atts: any[] = Array.isArray(eq.attachments)? eq.attachments : []
    if (atts.length) {
      sectionGap(); ensureSpace(12);
      doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.text('Attachments', margin, y); y += 6; doc.setFont('helvetica','normal'); doc.setFontSize(12);
      for (let a = 0; a < Math.min(8, atts.length); a++) {
        const name = String(atts[a]?.filename || atts[a]?.url || 'Attachment')
        const lines = splitText(doc, name, pageWidth - margin*2)
        for (const l of lines) { ensureSpace(7); doc.text(l, margin + 2, y); y += 5 }
      }

      const isImage = (a: any) => { const type = String(a?.type || '').toLowerCase(); const name = String(a?.filename || a?.url || '').toLowerCase(); const ext = name.split('?')[0].split('#')[0].split('.').pop() || ''; return type.startsWith('image/') || ['png','jpg','jpeg','webp'].includes(ext) }
      const getDims = async (dataUrl: string): Promise<{ w: number; h: number }> => {
        return new Promise(res => {
          const img = new Image()
          img.onload = () => res({ w: img.naturalWidth || img.width, h: img.naturalHeight || img.height })
          img.onerror = () => res({ w: 0, h: 0 })
          img.src = dataUrl
        })
      }

      for (const a of atts) {
        if (!isImage(a)) continue
        const src = a?.url || a?.data
        const img = await loadImage(src)
        if (!img.dataUrl) continue
        drawFooter(); doc.addPage(); pageNo++; y = margin; drawHeader()
        const label = `Attachment: ${String(a?.filename || a?.url || '')}`
        doc.setFont('helvetica','bold'); doc.setFontSize(12); ensureSpace(8); doc.text(label, margin, y); y += 5; doc.setFont('helvetica','normal')
        const dims = await getDims(img.dataUrl)
        const maxW = pageWidth - margin*2; const maxH = bottomLimit - y
        let drawW = maxW, drawH = maxH
        if (dims.w > 0 && dims.h > 0) { const sc = Math.min(maxW / dims.w, maxH / dims.h); drawW = dims.w * sc; drawH = dims.h * sc }
        const imgX = margin + (maxW - drawW) / 2; const imgY = y + (maxH - drawH) / 2
        try {
          doc.addImage(img.dataUrl, img.format || 'JPEG', imgX, imgY, drawW, drawH)
        } catch (e) {
          /* ignore */
        }
        drawFooter()
      }
    }
  }

  drawFooter()
  // Merge PDF attachments
  try {
    const atts: any[] = include.attachments ? (Array.isArray(eq.attachments) ? eq.attachments : []) : []
    const pdfAtts = atts.filter((a: any) => { const type = String(a?.type || '').toLowerCase(); const name = String(a?.filename || a?.url || '').toLowerCase(); const ext = name.split('?')[0].split('#')[0].split('.').pop() || ''; return type.includes('pdf') || ext === 'pdf' })
    if (pdfAtts.length) {
      const { PDFDocument } = await import('pdf-lib')
      const baseBytes = doc.output('arraybuffer') as ArrayBuffer
      const merged = await PDFDocument.load(baseBytes)
      for (const a of pdfAtts) {
        const url = String(a?.url || '')
        if (!url) continue
        try {
          const res = await fetch(url)
          if (!res.ok) continue
          const buf = await res.arrayBuffer()
          const attPdf = await PDFDocument.load(buf)
          const pages = await merged.copyPages(attPdf, attPdf.getPageIndices())
          pages.forEach((p: any) => merged.addPage(p))
        } catch (e) {
          /* ignore */
        }
      }
      return await merged.save()
    }
  } catch (e) { /* ignore merge errors */ }
  return doc.output('arraybuffer') as ArrayBuffer
}
