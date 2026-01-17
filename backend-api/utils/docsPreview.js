const fs = require('fs')
const fsp = require('fs/promises')
const os = require('os')
const path = require('path')
const crypto = require('crypto')

function asString(v) {
  return typeof v === 'string' ? v : (v == null ? '' : String(v))
}

function isOfficeDoc(contentType) {
  const ct = asString(contentType).trim().toLowerCase()
  return ct === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    || ct === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
}

function isDocx(contentType) {
  return asString(contentType).trim().toLowerCase()
    === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
}

function isXlsx(contentType) {
  return asString(contentType).trim().toLowerCase()
    === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
}

function requireOptional(name) {
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require(name)
  } catch (e) {
    const err = new Error(`Preview converter dependency "${name}" is not installed`)
    err.status = 503
    err.code = 'PREVIEW_DEP_MISSING'
    err.hint = `Install "${name}" on the backend (npm install ${name}) to enable Office previews.`
    err.cause = e
    throw err
  }
}

async function streamToFile(readable, outPath) {
  await new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(outPath)
    readable.pipe(ws)
    ws.on('finish', resolve)
    ws.on('error', reject)
    readable.on('error', reject)
  })
}

async function downloadBlobToTempFile(downloadUrl, filenameBase) {
  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'cxma-docs-'))
  const inputPath = path.join(tmpDir, filenameBase)
  const res = await fetch(downloadUrl)
  if (!res.ok) {
    const err = new Error(`Download failed (${res.status})`)
    err.status = res.status
    throw err
  }
  // Node fetch provides a web ReadableStream; convert to Node stream.
  const readable = res.body && typeof res.body.pipe === 'function'
    ? res.body
    : require('stream').Readable.fromWeb(res.body)
  await streamToFile(readable, inputPath)
  return { tmpDir, inputPath }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

async function docxToHtml(inputPath) {
  const mammoth = requireOptional('mammoth')
  try {
    const result = await mammoth.convertToHtml({ path: inputPath })
    return result && result.value ? String(result.value) : ''
  } catch (e) {
    const err = new Error('DOCX preview conversion failed')
    err.status = 500
    err.code = 'PREVIEW_DOCX_CONVERSION_FAILED'
    err.hint = 'Verify the file is a valid .docx and was uploaded with the correct Content-Type.'
    err.cause = e
    throw err
  }
}

async function xlsxToHtml(inputPath) {
  const XLSX = requireOptional('xlsx')
  try {
    const workbook = XLSX.readFile(inputPath, { cellDates: true })
    const sheetName = workbook.SheetNames && workbook.SheetNames.length ? workbook.SheetNames[0] : null
    const sheet = sheetName ? workbook.Sheets[sheetName] : null
    if (!sheet) return '<p>(No sheets)</p>'
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' })
    const maxRows = 200
    const maxCols = 40
    const slice = rows.slice(0, maxRows).map((r) => Array.isArray(r) ? r.slice(0, maxCols) : [])

    const thead = slice.length
      ? `<thead><tr>${slice[0].map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>`
      : ''
    const tbodyRows = slice.slice(1).map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')
    const tbody = `<tbody>${tbodyRows}</tbody>`
    const title = sheetName ? `<div class="meta">Sheet: ${escapeHtml(sheetName)}</div>` : ''
    return `${title}<table class="sheet">${thead}${tbody}</table>`
  } catch (e) {
    const err = new Error('XLSX preview conversion failed')
    err.status = 500
    err.code = 'PREVIEW_XLSX_CONVERSION_FAILED'
    err.hint = 'Verify the file is a valid .xlsx and was uploaded with the correct Content-Type.'
    err.cause = e
    throw err
  }
}

function wrapHtmlDocument(bodyHtml) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #111; }
      .meta { margin: 0 0 12px; color: #444; font-size: 12px; }
      table.sheet { border-collapse: collapse; width: 100%; font-size: 12px; }
      table.sheet th, table.sheet td { border: 1px solid #ddd; padding: 6px 8px; vertical-align: top; }
      table.sheet th { background: #f3f4f6; font-weight: 600; }
      p { line-height: 1.35; }
    </style>
  </head>
  <body>
    ${bodyHtml || '<p>(No content)</p>'}
  </body>
</html>`
}

async function renderHtmlToPdf(html, outPdfPath) {
  let puppeteer
  try {
    puppeteer = require('puppeteer')
  } catch (e) {
    const err = new Error('Preview converter is not available (Puppeteer is not installed)')
    err.status = 503
    err.code = 'PREVIEW_CONVERTER_UNAVAILABLE'
    err.hint = 'Install Puppeteer on the backend to enable Office previews.'
    err.cause = e
    throw err
  }
  let browser
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 })
    await page.pdf({
      path: outPdfPath,
      format: 'letter',
      printBackground: true,
      margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
    })
    await page.close()
  } catch (e) {
    const detail = (e && e.message) ? String(e.message) : ''
    const looksLikeLaunchProblem = /Failed to launch the browser process|Browser was not found|executable|ENOENT|spawn/i.test(detail)
    const err = new Error('Preview conversion failed')
    err.status = looksLikeLaunchProblem ? 503 : 500
    err.code = looksLikeLaunchProblem ? 'PREVIEW_CONVERTER_UNAVAILABLE' : 'PREVIEW_CONVERSION_FAILED'
    if (looksLikeLaunchProblem) {
      err.hint = 'Puppeteer could not launch Chromium on this host. Ensure Chromium is available (or Puppeteer can download it) and that required OS deps are installed.'
    }
    err.cause = e
    throw err
  } finally {
    try { if (browser) await browser.close() } catch (_) { /* ignore */ }
  }
}

async function uploadFileToBlob(uploadUrl, filePath, contentType) {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': asString(contentType || 'application/pdf'),
    },
    body: fs.createReadStream(filePath),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const err = new Error(`Upload failed (${res.status})`)
    err.status = res.status
    err.body = text.slice(0, 4000)
    throw err
  }
}

async function convertOfficeDocToPdfBlob({ downloadUrl, generateUploadUrl, projectId, fileId, contentType }) {
  const ext = isDocx(contentType) ? 'docx' : (isXlsx(contentType) ? 'xlsx' : 'bin')
  const filenameBase = `${fileId}-${crypto.randomUUID()}.${ext}`
  const { tmpDir, inputPath } = await downloadBlobToTempFile(downloadUrl, filenameBase)
  try {
    let bodyHtml = ''
    if (isDocx(contentType)) bodyHtml = await docxToHtml(inputPath)
    else if (isXlsx(contentType)) bodyHtml = await xlsxToHtml(inputPath)
    else bodyHtml = '<p>(Unsupported Office type)</p>'
    const html = wrapHtmlDocument(bodyHtml)
    const pdfPath = path.join(tmpDir, 'preview.pdf')
    await renderHtmlToPdf(html, pdfPath)
    const previewBlobName = `docs/${projectId}/previews/${fileId}.pdf`
    const upload = await generateUploadUrl(previewBlobName)
    await uploadFileToBlob(upload.url, pdfPath, 'application/pdf')
    return { previewBlobName, expiresAt: upload.expiresAt }
  } finally {
    try { await fsp.rm(tmpDir, { recursive: true, force: true }) } catch (_) { /* ignore */ }
  }
}

module.exports = {
  isOfficeDoc,
  convertOfficeDocToPdfBlob,
}
