// Shared report typography — the single source of truth for fonts, the type scale,
// and colors used by EVERY generated report (PDF via jsPDF, the html2canvas
// Description capture, and the Word export). Standardizing here is what makes the
// reports look consistent and on-brand across the AEC industry.
//
// Font: IBM Plex Sans (text) + IBM Plex Mono (tags / IDs / numeric data), embedded
// from a latin + engineering-symbol subset at /fonts/IBMPlex/. The jsPDF embed
// mirrors the established addFileToVFS/addFont pattern from
// src/components/reports/IssuePdfReport.vue.
//
// Approved scale (SemiBold headings, 9.5pt body) and accent (#0F172A — the cxma app
// background) are locked; tweak the constants here to restyle every report at once.

import type { jsPDF } from 'jspdf'

const FONT_BASE = '/fonts/IBMPlex'

// file -> jsPDF (family, style). SemiBold is registered as the "bold" style so all
// existing bold headings/emphasis render in Plex SemiBold (refined, not too heavy).
const FONT_FILES: Array<{ file: string; family: string; style: string }> = [
  { file: 'IBMPlexSans-Regular.ttf', family: 'IBMPlexSans', style: 'normal' },
  { file: 'IBMPlexSans-Italic.ttf', family: 'IBMPlexSans', style: 'italic' },
  { file: 'IBMPlexSans-SemiBold.ttf', family: 'IBMPlexSans', style: 'bold' },
  { file: 'IBMPlexSans-SemiBoldItalic.ttf', family: 'IBMPlexSans', style: 'bolditalic' },
  { file: 'IBMPlexMono-Regular.ttf', family: 'IBMPlexMono', style: 'normal' },
]

export const SANS = 'IBMPlexSans'
export const MONO = 'IBMPlexMono'

// ---------------------------------------------------------------------------
// jsPDF font embedding (base64 fetched once, registered per-doc)
// ---------------------------------------------------------------------------
let base64Cache: Record<string, string> | null = null
let loadPromise: Promise<Record<string, string> | null> | null = null

async function loadFontBase64(): Promise<Record<string, string> | null> {
  if (base64Cache) return base64Cache
  if (loadPromise) return loadPromise
  loadPromise = (async () => {
    try {
      const out: Record<string, string> = {}
      for (const { file } of FONT_FILES) {
        const res = await fetch(`${FONT_BASE}/${file}`)
        if (!res.ok) throw new Error(`font fetch failed: ${file}`)
        const bytes = new Uint8Array(await res.arrayBuffer())
        let bin = ''
        for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i])
        out[file] = btoa(bin)
      }
      base64Cache = out
      return out
    } catch {
      return null
    }
  })()
  return loadPromise
}

/**
 * Embed IBM Plex Sans + Mono into a jsPDF doc. Returns true on success; on failure
 * the caller's text simply falls back to jsPDF's built-in Helvetica (no throw).
 * Call once near the top of each generator, before drawing text.
 */
export async function ensureReportFonts(doc: jsPDF): Promise<boolean> {
  const all = await loadFontBase64()
  if (!all) return false
  try {
    for (const { file, family, style } of FONT_FILES) {
      doc.addFileToVFS(file, all[file])
      doc.addFont(file, family, style)
    }
    return true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Color tokens (RGB). accent = #0F172A (cxma app background).
// ---------------------------------------------------------------------------
export const COLORS = {
  text: [26, 26, 26],
  muted: [90, 90, 90],
  hairline: [208, 208, 208],
  headerTint: [242, 244, 247],
  pass: [21, 128, 61],
  fail: [185, 28, 28],
  accent: [15, 23, 42],
  white: [255, 255, 255],
} as const
export type ColorToken = keyof typeof COLORS

export function setColor(doc: jsPDF, token: ColorToken): void {
  const c = COLORS[token]
  doc.setTextColor(c[0], c[1], c[2])
}
export function setFill(doc: jsPDF, token: ColorToken): void {
  const c = COLORS[token]
  doc.setFillColor(c[0], c[1], c[2])
}
export function setDraw(doc: jsPDF, token: ColorToken): void {
  const c = COLORS[token]
  doc.setDrawColor(c[0], c[1], c[2])
}

// ---------------------------------------------------------------------------
// Type scale — each setter applies family + style + size in one call and returns
// the point size (handy for line-height math). Sizes in pt.
// ---------------------------------------------------------------------------
export const SIZES = {
  coverTitle: 26,
  coverSubtitle: 13,
  runningTitle: 16,
  h1: 13,
  h2: 11,
  h3: 10,
  h4: 9,
  h5: 8,
  body: 9.5,
  caption: 8.5,
  tableHeader: 8.5,
  tableCell: 9,
  footer: 8,
} as const

function set(doc: jsPDF, family: string, style: string, size: number): number {
  doc.setFont(family, style)
  doc.setFontSize(size)
  return size
}

export const coverTitle = (d: jsPDF) => set(d, SANS, 'bold', SIZES.coverTitle)
export const coverSubtitle = (d: jsPDF) => set(d, SANS, 'normal', SIZES.coverSubtitle)
export const runningTitle = (d: jsPDF) => set(d, SANS, 'bold', SIZES.runningTitle)
export const h1 = (d: jsPDF) => set(d, SANS, 'bold', SIZES.h1)
export const h2 = (d: jsPDF) => set(d, SANS, 'bold', SIZES.h2)
export const h3 = (d: jsPDF) => set(d, SANS, 'bold', SIZES.h3)
export const h4 = (d: jsPDF) => set(d, SANS, 'bold', SIZES.h4)
export const h5 = (d: jsPDF) => set(d, SANS, 'bold', SIZES.h5)
export const body = (d: jsPDF) => set(d, SANS, 'normal', SIZES.body)
export const bodyBold = (d: jsPDF) => set(d, SANS, 'bold', SIZES.body)
export const italic = (d: jsPDF) => set(d, SANS, 'italic', SIZES.body)
export const caption = (d: jsPDF) => set(d, SANS, 'normal', SIZES.caption)
export const tableHeader = (d: jsPDF) => set(d, SANS, 'bold', SIZES.tableHeader)
export const tableCell = (d: jsPDF) => set(d, SANS, 'normal', SIZES.tableCell)
export const mono = (d: jsPDF, size: number = SIZES.tableCell) => set(d, MONO, 'normal', size)
export const footer = (d: jsPDF) => set(d, SANS, 'normal', SIZES.footer)

/** Family-only setter for existing call sites that manage their own size. */
export function useSans(doc: jsPDF, weight: 'normal' | 'bold' | 'italic' | 'bolditalic' = 'normal'): void {
  doc.setFont(SANS, weight)
}
export function useMono(doc: jsPDF): void {
  doc.setFont(MONO, 'normal')
}

// ---------------------------------------------------------------------------
// Web rendering (html2canvas Description / Tasks) + Word export
// ---------------------------------------------------------------------------
export const REPORT_FONT_STACK = "'IBM Plex Sans', system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
export const REPORT_MONO_STACK = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
export const REPORT_FONT_NAME = 'IBM Plex Sans'

let webFontInjected = false
function injectWebFontFace(): void {
  if (webFontInjected || typeof document === 'undefined') return
  const css = `
@font-face{font-family:'IBM Plex Sans';font-weight:400;font-style:normal;font-display:swap;src:url('${FONT_BASE}/IBMPlexSans-Regular.ttf') format('truetype');}
@font-face{font-family:'IBM Plex Sans';font-weight:400;font-style:italic;font-display:swap;src:url('${FONT_BASE}/IBMPlexSans-Italic.ttf') format('truetype');}
@font-face{font-family:'IBM Plex Sans';font-weight:600;font-style:normal;font-display:swap;src:url('${FONT_BASE}/IBMPlexSans-SemiBold.ttf') format('truetype');}
@font-face{font-family:'IBM Plex Sans';font-weight:600;font-style:italic;font-display:swap;src:url('${FONT_BASE}/IBMPlexSans-SemiBoldItalic.ttf') format('truetype');}
@font-face{font-family:'IBM Plex Mono';font-weight:400;font-style:normal;font-display:swap;src:url('${FONT_BASE}/IBMPlexMono-Regular.ttf') format('truetype');}
`
  const style = document.createElement('style')
  style.setAttribute('data-report-fonts', '')
  style.textContent = css
  document.head.appendChild(style)
  webFontInjected = true
}

/**
 * Ensure the report web fonts are injected AND actually loaded before an
 * html2canvas capture (otherwise the capture rasterizes the fallback font).
 */
export async function ensureWebReportFontLoaded(): Promise<void> {
  injectWebFontFace()
  const fonts = (typeof document !== 'undefined' && (document as any).fonts) || null
  if (!fonts) return
  try {
    await Promise.all([
      fonts.load("400 12px 'IBM Plex Sans'"),
      fonts.load("600 12px 'IBM Plex Sans'"),
      fonts.load("italic 400 12px 'IBM Plex Sans'"),
      fonts.load("400 12px 'IBM Plex Mono'"),
    ])
    await fonts.ready
  } catch {
    /* best-effort */
  }
}
