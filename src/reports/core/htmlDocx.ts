// Shared HTML -> .docx conversion on @turbodocx/html-to-docx (browser build).
// Extracted from utils/activityReportDocx.ts so any report can produce an
// editable Word document from an HTML string.
//
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

export interface HtmlDocxOptions {
  /** Extra html-to-docx options merged over the defaults. */
  [key: string]: any
}

/** Convert report HTML (+ header/footer HTML) into a Word .docx Blob. */
export async function convertHtmlToDocxBlob(html: string, header: string, footer: string, extraOptions: HtmlDocxOptions = {}): Promise<Blob> {
  const htmlToDocx = await loadHtmlToDocx()
  const options = {
    orientation: 'portrait' as const,
    // US Letter (twips), matching the PDF reports.
    pageSize: { width: 12240, height: 15840 },
    margins: { top: 720, right: 720, bottom: 720, left: 720 },
    header: true,
    footer: true,
    pageNumber: true,
    // Match the PDF reports — IBM Plex Sans as the document default (Word falls
    // back to a clean sans for anyone who doesn't have it installed).
    font: 'IBM Plex Sans',
    table: { row: { cantSplit: true } },
    ...extraOptions,
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
