/**
 * Final Cx Report PDF generation pipeline.
 *
 * Flow:
 *   1. Load the FinalReport + Project
 *   2. Run every enabled data section's provider to get fresh data
 *   3. Build a single HTML document via finalReportHtml.js
 *   4. Render the HTML to PDF using Puppeteer (already used for the
 *      Office document preview converter — see utils/docsPreview.js)
 *   5. Upload the PDF to Azure Blob at a stable per-project path
 *   6. Return { blobName, blobUrl, sizeBytes }
 *
 * Stays synchronous for v1 (the caller controls timeout). A real
 * 500+ page report can take 30-60 seconds — the route signals that
 * to the user via a loading toast.
 */

const crypto = require('crypto')

const FinalReport = require('../models/finalReport')
const Project = require('../models/project')
const { fetchDataSource, fetchDocumentsSectionPdfFiles } = require('../utils/finalReportDataSources')
const { buildReportHtml, buildHeaderTemplate, buildFooterTemplate } = require('./finalReportHtml')
const { generateBlobSasUrl, blobExists } = require('../utils/blobSas')
const { launchBrowser } = require('../utils/puppeteerLauncher')

/**
 * Refresh every enabled data section. Returns a map keyed by section.key
 * that the HTML template can look up directly. Errors per-section don't
 * abort the whole render — the template will substitute a friendly
 * "failed to render" note instead.
 */
async function fetchAllSectionData(report) {
  const sections = Array.isArray(report.sections) ? report.sections : []
  const out = {}
  await Promise.all(
    sections.map(async (s) => {
      if (s.enabled === false) return
      if (s.type !== 'data' || !s.dataSource) return
      try {
        const data = await fetchDataSource(s.dataSource, {
          projectId: String(report.projectId),
          config: s.dataConfig || {},
        })
        out[s.key] = data
      } catch (e) {
        out[s.key] = { __error: e.message || String(e) }
      }
    }),
  )
  return out
}

/**
 * Render an HTML string to a PDF Buffer using Puppeteer.
 * Mirrors the launch args used by docsPreview.js for consistency.
 */
async function renderHtmlToPdfBuffer(html, { headerHtml, footerHtml }) {
  let browser
  try {
    browser = await launchBrowser()
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load', timeout: 60000 })
    const buf = await page.pdf({
      format: 'letter',
      printBackground: true,
      // Margins set in the body HTML's `@page` rules, but puppeteer
      // also needs explicit values for header/footer to slot in.
      margin: { top: '0.85in', right: '0.7in', bottom: '0.85in', left: '0.7in' },
      displayHeaderFooter: true,
      headerTemplate: headerHtml || '<div></div>',
      footerTemplate: footerHtml || '<div></div>',
      // Phase 5: navigable PDF — document outline (bookmarks) from the
      // heading structure, tagged so the TOC's in-document anchors become
      // working link annotations.
      tagged: true,
      outline: true,
      // Honor CSS @page sizes so the Issues Log's landscape named page works;
      // every other page keeps the letter-portrait default declared in CSS.
      preferCSSPageSize: true,
    })
    await page.close()
    return Buffer.from(buf)
  } catch (e) {
    const detail = (e && e.message) ? String(e.message) : ''
    const looksLikeLaunchProblem = /Failed to launch the browser process|Browser was not found|executable|ENOENT|spawn/i.test(detail)
    const err = new Error('PDF rendering failed')
    err.status = looksLikeLaunchProblem ? 503 : 500
    err.code = looksLikeLaunchProblem ? 'PDF_RENDERER_UNAVAILABLE' : 'PDF_RENDERER_FAILED'
    if (looksLikeLaunchProblem) {
      err.hint = 'Puppeteer could not launch Chromium on this host. On Azure App Service, ensure Chromium is bundled with the backend deploy (puppeteer downloads its own Chrome on install).'
    }
    err.cause = e
    throw err
  } finally {
    try { if (browser) await browser.close() } catch (_) { /* ignore */ }
  }
}

/** Download a blob's bytes via a short-lived read SAS URL. */
async function downloadBlobBuffer(blobName) {
  const sas = await generateBlobSasUrl({ blobName, permissions: 'r', expiresInSec: 300 })
  const res = await fetch(sas.url)
  if (!res.ok) {
    const err = new Error(`Blob download failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return Buffer.from(await res.arrayBuffer())
}

/** Append every page of a PDF buffer onto a pdf-lib document. */
async function appendPdfBuffer(merged, buffer) {
  const { PDFDocument } = require('pdf-lib')
  const src = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const pages = await merged.copyPages(src, src.getPageIndices())
  for (const p of pages) merged.addPage(p)
}

/**
 * Render the report in SEGMENTS when it contains documents sections (Phase
 * 5d): each documents section's PDF files are merged in right after the
 * segment that ends with it, so the stated section order is honored. Page
 * numbers are stamped post-merge (continuous across the inserted documents);
 * Chromium's per-segment numbers are omitted. Trade-off: the merged PDF has
 * no outline (pdf-lib drops it) — reports without documents sections keep
 * the single-render path with bookmarks + Chromium numbering.
 */
async function renderSegmentedPdf({ report, project, sectionData, headerHtml }) {
  const { PDFDocument, StandardFonts, rgb } = require('pdf-lib')
  const byOrder = (a, b) => Number(a.order || 0) - Number(b.order || 0)
  const enabled = (Array.isArray(report.sections) ? [...report.sections] : [])
    .sort(byOrder)
    .filter((s) => s.enabled !== false)

  // Split at each documents section (the section itself closes its segment).
  const segments = []
  let current = []
  for (const s of enabled) {
    current.push(s)
    if (s.type === 'data' && s.dataSource === 'documents') {
      segments.push({ sections: current, docsSection: s })
      current = []
    }
  }
  if (current.length) segments.push({ sections: current, docsSection: null })

  const footerHtml = buildFooterTemplate('Cx Final Report', { omitPageNumbers: true })
  const merged = await PDFDocument.create()
  const reportObj = report.toObject ? report.toObject() : report

  for (let i = 0; i < segments.length; i++) {
    const html = buildReportHtml({
      report: reportObj,
      project,
      sectionData,
      sectionsOverride: segments[i].sections,
      includeFrontMatter: i === 0,
      tocSections: enabled,
    })
    const buf = await renderHtmlToPdfBuffer(html, { headerHtml, footerHtml })
    await appendPdfBuffer(merged, buf)
    if (segments[i].docsSection) {
      const pdfFiles = await fetchDocumentsSectionPdfFiles(String(report.projectId), segments[i].docsSection)
      for (const f of pdfFiles) {
        try {
          const bytes = await downloadBlobBuffer(f.blobName)
          await appendPdfBuffer(merged, bytes)
        } catch (e) {
          // A missing/corrupt attachment never aborts the report.
          console.error('[final-report] skipping unmergeable document', f && f.originalName, e && e.message)
        }
      }
    }
  }

  // Continuous page numbers across report pages AND inserted documents.
  const font = await merged.embedFont(StandardFonts.Helvetica)
  const total = merged.getPageCount()
  for (let i = 0; i < total; i++) {
    const page = merged.getPage(i)
    const { width } = page.getSize()
    const label = `Page ${i + 1} of ${total}`
    const textWidth = font.widthOfTextAtSize(label, 8)
    page.drawText(label, { x: width - 50.4 - textWidth, y: 22, size: 8, font, color: rgb(0.58, 0.64, 0.72) })
  }
  const out = await merged.save()
  return Buffer.from(out)
}

/**
 * Upload a Buffer to Azure Blob using a short-lived SAS URL.
 * Mirrors the upload step in docsPreview.uploadFileToBlob but works
 * directly off a Buffer (no temp file needed).
 */
async function uploadBufferToBlob(blobName, buffer, contentType) {
  const sas = await generateBlobSasUrl({
    blobName,
    permissions: 'cw', // create + write
    expiresInSec: 600,
  })
  const res = await fetch(sas.url, {
    method: 'PUT',
    headers: {
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': contentType,
      'Content-Length': String(buffer.length),
    },
    body: buffer,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const err = new Error(`Blob upload failed (${res.status})`)
    err.status = res.status
    err.body = String(text).slice(0, 4000)
    throw err
  }
  // sas.blobUrl is the base URL without the SAS query — what we persist.
  return { blobUrl: sas.blobUrl, blobName }
}

/**
 * Main entry. Loads the report, runs every data section, renders HTML,
 * renders PDF, uploads to blob, returns metadata.
 *
 * @param {string} projectId
 * @param {object} [opts]
 * @param {boolean} [opts.persistOnReport=false] - if true, also update
 *   the latest release's pdfBlobUrl (used by the lock-final auto-PDF path)
 * @returns {Promise<{ blobName, blobUrl, sizeBytes, generatedAt }>}
 */
async function generateFinalReportPdf(projectId, opts = {}) {
  if (!projectId) {
    const err = new Error('projectId is required')
    err.status = 400
    throw err
  }

  const report = await FinalReport.findOne({ projectId })
  if (!report) {
    const err = new Error('Final Report not found for this project')
    err.status = 404
    throw err
  }
  const project = await Project.findById(projectId).lean()
  if (!project) {
    const err = new Error('Project not found')
    err.status = 404
    throw err
  }

  const sectionData = await fetchAllSectionData(report)
  const headerHtml = buildHeaderTemplate(project.name || '', project.number || '')

  const hasDocumentsSections = (report.sections || []).some(
    (s) => s.enabled !== false && s.type === 'data' && s.dataSource === 'documents',
  )
  let buffer
  if (hasDocumentsSections) {
    buffer = await renderSegmentedPdf({ report, project, sectionData, headerHtml })
  } else {
    const html = buildReportHtml({ report: report.toObject ? report.toObject() : report, project, sectionData })
    const footerHtml = buildFooterTemplate('Cx Final Report')
    buffer = await renderHtmlToPdfBuffer(html, { headerHtml, footerHtml })
  }

  // Stable path per project + per generation; the latest one is kept
  // forever via Release.pdfBlobUrl, intermediate "preview" generations
  // can be GC'd later by a cleanup job if storage grows unbounded.
  const uuid = crypto.randomUUID()
  const blobName = `final-reports/${projectId}/${uuid}.pdf`
  const { blobUrl } = await uploadBufferToBlob(blobName, buffer, 'application/pdf')

  // Sanity check the blob is actually there before returning.
  try {
    const sasRead = await generateBlobSasUrl({ blobName, permissions: 'r', expiresInSec: 60 })
    const head = await blobExists(sasRead.url)
    if (!head.exists) {
      const err = new Error('Blob upload reported success but the object is not retrievable')
      err.status = 502
      throw err
    }
  } catch (_) { /* head failure is non-fatal */ }

  // Optionally persist on the latest release record (used when the
  // lock-final transition is generating the immutable PDF).
  if (opts.persistOnReport && Array.isArray(report.releases) && report.releases.length) {
    const latest = report.releases[report.releases.length - 1]
    if (latest && !latest.pdfBlobUrl) {
      latest.pdfBlobUrl = blobUrl
      try { await report.save() } catch (_) { /* best-effort */ }
    }
  }

  return {
    blobName,
    blobUrl,
    sizeBytes: buffer.length,
    generatedAt: new Date().toISOString(),
  }
}

module.exports = {
  generateFinalReportPdf,
  // exposed for tests
  _buildReportHtml: buildReportHtml,
  _fetchAllSectionData: fetchAllSectionData,
}
